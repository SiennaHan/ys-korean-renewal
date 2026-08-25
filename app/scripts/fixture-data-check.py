#!/usr/bin/env python3
"""픽스처가 **실제 데이터와 같은 규약인지** 본다.

왜 필요한가 — 목업 대조(`parity:activity`)는 픽스처를 그려서 목업 캡처와 견준다.
그런데 **픽스처 값은 사람이 목업을 보고 손으로 적은 것**이다. 목업과 실제 데이터의
규약이 다르면, 픽스처는 목업 쪽에 맞고 대조는 계속 "모두 같다" 인데 **실제 화면만
깨진다.**

실제로 겪었다. 조사 스나이퍼 목업 문장은 `저는 한국어___공부해요` 인데 진짜
데이터는 `___` 를 한 번도 안 쓰고 `blank` 의 `[?]` 를 쓴다. 픽스처에 `blank` 가
아예 없었고, 화면은 정답이 든 `sentence` 를 그대로 그렸다 — 문제에 답이 보였다.
대조는 끝까지 통과였다(BLOCKERS.md).

**하는 일** — 진짜 씨드에서 불변식을 캐서 픽스처에 들이민다. 규칙을 손으로 적지
않고 **데이터에서 캐는** 이유는, 손으로 적으면 그것도 결국 사람이 지어낸 값이라
같은 함정에 빠지기 때문이다.

  ① 빠진 필드   — 모든 진짜 레코드에 있는 필드가 픽스처에 없다
  ② 없는 필드   — 픽스처에만 있고 진짜 레코드엔 없는 필드다
  ③ 타입        — 같은 필드인데 타입이 다르다
  ④ 표식        — 진짜 값 전부에 들어 있는 토막(`[?]` 같은 것)이 픽스처엔 없다
  ⑤ 관계        — 진짜 레코드에서 늘 성립하는 필드 간 포함관계가 깨졌다
  ⑥ 어휘        — 값이 닫힌 집합인 필드인데 픽스처가 그 집합에 없는 값을 쓴다

**안 보는 것** — 값이 그럴듯한지는 안 본다. 이 검사가 통과해도 "픽스처가 옳다" 는
뜻이 아니라 **"모양이 데이터와 어긋나지는 않는다"** 는 뜻뿐이다.

씨드는 서버 초기화용이고 앱은 API 에서 받는다. 씨드가 서버와 어긋나면 이 검사도
어긋난 것을 기준으로 삼는다 — `--live` 로 서버와 씨드의 모양을 맞춰 볼 수 있다.
"""

import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
SEED = ROOT / "api" / "seed_data"
FIXTURES = ROOT / "app" / ".parity-out" / "_fixtures.json"


def seed(name):
	return json.loads((SEED / name).read_text(encoding="utf-8"))


# ─── 픽스처 ↔ 진짜 레코드 짝짓기 ──────────────────────────────────────
#
# `records` 는 그 픽스처가 흉내 내는 **진짜 레코드들**을 준다.
# `exempt` 는 일부러 어긋낸 필드와 **그 이유**다 — 이유 없이는 넣지 않는다.


def ps_questions():
	out = []
	for f in sorted(SEED.glob("sentences_lv*.json")):
		for lesson in json.loads(f.read_text(encoding="utf-8")).values():
			out += lesson["questions"]
	return out


def ps_lessons():
	# 픽스처는 1급 과 목록을 흉내 낸다
	return list(seed("sentences_lv1.json").values())


def cs_cards():
	"""어휘 카드는 **씨드에 레코드로 없다** — card-sort.tsx 의 buildDeck() 이
	vocab.json 에서 조립한다. 그래서 여기서 같은 방식으로 만든다.

	베끼는 코드라 원본이 바뀌면 여기도 같이 바꿔야 한다. 그래도 손으로 적은
	기대값보다는 낫다 — 낱말·카테고리·급·과가 전부 진짜 씨드에서 온다.
	"""
	vocab = seed("vocab.json")
	rare = {e["word"] for e in vocab.get("rare", {}).get("examples", [])}
	out = []
	for grade, lessons in vocab.items():
		if grade == "rare":
			continue
		for lesson_key, lesson in lessons.items():
			for cat in lesson["new_categories"]:
				for word in lesson.get(cat, []):
					out.append(
						{
							"word": word,
							"category": cat,
							"grade": grade,
							"lesson": lesson_key,
							"isRare": word in rare,
						}
					)
	return out


ENTRIES = {
	"particle_sniper.question": {
		"출처": "sentences_lv*.json → 과 → questions[]",
		"records": ps_questions,
		"exempt": {},
	},
	"particle_sniper.level_meta": {
		"출처": "particle_sniper_levels.json (급 → 메타)",
		"records": lambda: list(seed("particle_sniper_levels.json").values()),
		"map": True,
		"exempt": {
			"accent": "화면이 안 읽는다 — 목업 캡처에도 이 값이 안 나온다",
		},
		# 목업이 7·8급을 자리표로 담았다. 픽스처는 목업 대조를 위해 목업을 따라야
		# 하므로 그대로 두고, **갈렸다는 사실을 여기 적는다.**
		"exempt_items": {
			"7급": "목업 문구가 자리표다 — 목업 '고급 조사 연습' · 진짜 '마다· 대로· 에 따라'",
			"8급": "목업 문구가 자리표다 — 목업 '심화 조사 연습' · 진짜 '조차· 로서· 으로서· 에 의하면'",
		},
	},
	"particle_sniper.lesson": {
		"출처": "sentences_lv1.json (과 → 과 정보)",
		"records": ps_lessons,
		"map": True,
		"exempt": {
			"cumulative_particles": "과 선택 화면이 안 읽는다 — new_particles 만 칩으로 그린다",
		},
	},
	"card_sort.card": {
		"출처": "vocab.json 을 buildDeck() 과 같은 방식으로 조립한 카드",
		"records": cs_cards,
		"exempt": {},
	},
	"spring_picnic.friend": {
		"출처": "spring_picnic_friends.json[]",
		"records": lambda: seed("spring_picnic_friends.json"),
		"exempt": {},
		# 친구는 4명뿐이라 어휘를 캘 표본이 안 된다. cats 가 문항의 cat 과 같은
		# 낱말이라는 것은 **선언**이고, 검사기가 진짜 친구들로 이 선언부터 확인한다.
		"vocab_from": {
			"cats": lambda: {q["cat"] for q in seed("spring_picnic_questions.json")}
		},
	},
	"spring_picnic.round": {
		"출처": "spring_picnic_questions.json[]",
		"records": lambda: seed("spring_picnic_questions.json"),
		"exempt": {},
	},
	"seoul_puzzle.location": {
		"출처": "seoul_puzzles.json → locations[]",
		"records": lambda: seed("seoul_puzzles.json")["locations"],
		"exempt": {
			"entryMessages": "장소 레코드에 없는 필드다 — 픽스처가 화면에 필요해서 덧붙였다",
		},
	},
}


# ─── 불변식 캐기 ──────────────────────────────────────────────────────


def has_symbol(s):
	"""한글·영문·숫자·공백만으로 된 토막은 표식으로 안 친다 — 우연히 겹친 말이다."""
	return any(not (c.isalnum() or c.isspace()) for c in s)


def common_marker(values):
	"""값 전부에 들어 있는 가장 긴 토막. 없으면 None."""
	values = [v for v in values if isinstance(v, str)]
	if len(values) < 3:
		return None  # 표본이 적으면 우연이다
	base = min(values, key=len)
	if len(base) > 200:
		return None
	for size in range(len(base), 1, -1):
		for i in range(len(base) - size + 1):
			piece = base[i : i + size]
			if has_symbol(piece) and all(piece in v for v in values):
				return piece
	return None


def mine(records, exempt, declared=None):
	"""진짜 레코드에서 불변식을 캔다."""
	records = [r for r in records if isinstance(r, dict) and r]
	fields = [set(r) for r in records]
	always = set.intersection(*fields) - set(exempt)
	known = set.union(*fields)

	types, markers = {}, {}
	for f in known:
		vals = [r[f] for r in records if f in r]
		ts = {type(v).__name__ for v in vals}
		types[f] = ts
		if ts == {"str"}:
			m = common_marker(vals)
			if m:
				markers[f] = m

	# 닫힌 어휘 — 값 가짓수가 적고 레코드는 많으면 "정해진 낱말" 로 본다.
	# 여기서 걸리는 것이 **픽스처가 지어낸 값**이다(`cat: "age"` 인데 진짜는 "나이").
	vocab = {}
	for f in known:
		vals = [r[f] for r in records if f in r]
		if types[f] == {"str"}:
			seen = set(vals)
		elif types[f] == {"list"} and all(
			all(isinstance(x, str) for x in v) for v in vals
		):
			seen = {x for v in vals for x in v}
		else:
			continue
		if len(vals) >= 6 and 0 < len(seen) <= len(vals) / 2 and len(seen) <= 20:
			vocab[f] = seen

	# 손으로 선언한 어휘 — 선언이 맞는지 **진짜 레코드로 먼저 확인**한다.
	# 확인 없이 받으면 이것도 사람이 지어낸 값이라 같은 함정이다.
	for f, build in (declared or {}).items():
		allowed = build()
		used = {x for r in records if f in r for x in
		        (r[f] if isinstance(r[f], list) else [r[f]])}
		if used - allowed:
			raise AssertionError(
				f"`{f}` 어휘 선언이 틀렸다 — 진짜 레코드가 쓰는 {sorted(used - allowed)} 가 선언 밖이다"
			)
		vocab[f] = allowed

	# 필드 간 포함관계 — 전부에서 성립할 때만 불변식으로 친다
	rel = []
	for a in known:
		for b in known:
			if a == b or types[a] != {"str"}:
				continue
			pairs = [(r[a], r[b]) for r in records if a in r and b in r]
			if len(pairs) < 3:
				continue
			if types[b] == {"str"} and all(x in y for x, y in pairs):
				rel.append((a, "⊂", b))
			elif types[b] == {"list"} and all(x in y for x, y in pairs):
				rel.append((a, "∈", b))
	return always, known, types, markers, rel, vocab


# ─── 대조 ─────────────────────────────────────────────────────────────


def check(key, fixture, spec):
	exempt = spec["exempt"]
	always, known, types, markers, rel, vocab = mine(spec["records"](), exempt, spec.get("vocab_from"))
	bad = []

	for f in sorted(always - set(fixture)):
		bad.append(f"빠진 필드 `{f}` — 진짜 레코드엔 전부 있다")
	for f in sorted(set(fixture) - known - set(exempt)):
		bad.append(f"없는 필드 `{f}` — 진짜 레코드엔 없다")
	for f in sorted(set(fixture) & known):
		t = type(fixture[f]).__name__
		if t not in types[f]:
			bad.append(f"타입 `{f}` — 픽스처 {t} · 진짜 {'/'.join(sorted(types[f]))}")
		elif f in markers and markers[f] not in fixture[f]:
			bad.append(
				f"표식 `{f}` — 진짜 값엔 전부 `{markers[f]}` 가 있는데 픽스처엔 없다"
				f" (픽스처: {fixture[f]!r})"
			)
	for f in sorted(set(fixture) & set(vocab)):
		used = fixture[f] if isinstance(fixture[f], list) else [fixture[f]]
		for v in used:
			if isinstance(v, str) and v not in vocab[f]:
				bad.append(
					f"어휘 `{f}` — {v!r} 는 진짜 데이터에 없는 값이다"
					f" (쓰이는 값: {', '.join(sorted(vocab[f])[:6])}…)"
				)
	for a, op, b in rel:
		if a in fixture and b in fixture and fixture[a] not in fixture[b]:
			bad.append(f"관계 `{a}` {op} `{b}` — 진짜 레코드에선 늘 성립한다")
	return bad


def main():
	if not FIXTURES.exists():
		print(f"★ {FIXTURES} 가 없다 — `pnpm parity:activity` 를 먼저 돌려라")
		return 1

	reg = json.loads(FIXTURES.read_text(encoding="utf-8"))
	fails, checked = 0, 0

	# 등록되지 않은 짝은 조용히 넘어가지 않는다 — 표가 낡으면 검사가 사라진다
	for key in sorted(set(ENTRIES) - set(reg)):
		print(f"★ `{key}` 는 표에 있는데 픽스처에 없다 — 등록이 지워졌나?")
		fails += 1
	for key in sorted(set(reg) - set(ENTRIES)):
		print(f"★ `{key}` 가 등록됐는데 짝지을 진짜 데이터가 표에 없다")
		fails += 1

	for key in sorted(set(reg) & set(ENTRIES)):
		spec = ENTRIES[key]
		for value in reg[key]:
			skip = spec.get("exempt_items", {})
			items = (
				[(k, v) for k, v in value.items() if k not in skip]
				if spec.get("map")
				else [(None, value)]
			)
			for _, item in items:
				if not isinstance(item, dict) or not item:
					continue  # 자리표(new Array(n).fill({}))는 내용이 없다
				checked += 1
				for msg in check(key, item, spec):
					print(f"★ {key} — {msg}")
					fails += 1
		for f, why in spec["exempt"].items():
			print(f"  · {key} `{f}` 면제 — {why}")
		for k, why in spec.get("exempt_items", {}).items():
			print(f"  · {key} [{k}] 면제 — {why}")

	print()
	if fails:
		print(f"레코드 {checked}건 중 {fails}건 어긋남 · 출처는 {SEED}")
		return 1
	print(f"레코드 {checked}건 — 진짜 데이터와 모양이 같다")
	return 0


if __name__ == "__main__":
	sys.exit(main())
