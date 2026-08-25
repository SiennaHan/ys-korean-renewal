# -*- coding: utf-8 -*-
"""ai_persona_prompt 수정 — 데이터 동기화 + 오염 제거 + 규칙 정정.

이 열은 원본에서 엑셀 셀을 함수처럼 끌어와 만든 완성 프롬프트다. 그래서 상황·첫
발화·미션 키워드·목표 문법이 **문자열로 박혀** 있고, 시트 값을 고쳐도 따라오지
않는다. v29 수정이 런타임에 먹으려면 이 열도 같이 고쳐야 한다.

BOOKS 로 대상 권을 정한다 — 급별로 진행하므로 한 번에 한 권씩 넓힌다.
"""
import re
import grammar_scope
from v29_slots import SLOT_FIX
from v29_slotalign import SLOT_ALIGN
from v29_nested_fix import NESTED_FIX, SLOT_ALIGN_2, LABEL_RENAME

# 데이터 동기화·오염 제거·규칙 정정은 전 권에 적용한다. v29에서 첫 발화를 고친 과가
# 6~8급에도 있어(8-6·8-11·8-12 등) 이 열을 안 맞추면 그 수정이 런타임에 안 먹는다.
# ⚠️ 미션 '검수'는 1~4급만 끝났다 — 여기서 하는 건 기계적 정합뿐이다.
BOOKS = {1, 2, 3, 4, 5, 6, 7, 8}
CONSTRAINT_BOOKS = {1, 2, 3, 4, 5}   # 제약 블록은 1~5급만 둔다(사용자 결정)

# 특수 높임 어휘가 어느 과에서 도입되는지 — 제약 블록의 [금지 어휘] 를 과 단위로 만든다.
HONORIFIC = ["뵙다", "여쭙다", "드시다", "계시다", "주무시다", "말씀하시다"]

# 목표 문법 노출 규칙 재작성.
# 원문은 "가르치려 하지 말고, 당신의 발화 속에서 자연스럽게 사용하세요." 였다.
# 집필 의도는 '문법을 설명하지 말고 학습자가 쓰도록 유도하라' 였지만, 문장이
# 'AI가 자기 발화에 쓰라'로도 읽힌다. 학습자가 먼저 쓸 기회를 뺏지 않도록 고친다.
# 부득이한 경우(그 문법 없이 대화가 열리지 않거나 역할상 AI만 쓰는 표현)는 허용한다.
GRAMMAR_RULE = (
    "    - 문법의 이름을 말하거나 설명하지 마세요. 가르치려 하지 마세요."
    "    - 이 문법은 **학습자가 먼저 쓴 뒤에** 쓰세요. 학습자가 아직 쓰지 않았다면,"
    " 그 문법이 대답에 나오도록 질문으로만 유도하세요."
    "    - 다만 그 문법 없이는 대화를 열 수 없거나, 역할상 당신만 쓸 수 있는 표현이라면"
    " 먼저 써도 됩니다(예: 손님이 아닌 점원의 높임말)."
    "    - 레벨 제약과 충돌하는 문법은 사용하지 않습니다."
    "    - 억지스럽다면 해당 문법은 생략해도 됩니다."
)


def _missions(mission_detail):
    """미션 목록을 프롬프트의 두 표기로 만든다."""
    out = []
    for m in str(mission_detail).split(" / "):
        lab, en = (m.split(":", 1) + [""])[:2]
        out.append((lab.strip(), en.strip().replace("&#13;", "")))
    em = "   ".join(f"- {l} ({e})" for l, e in out)     # [Mission Keywords] 쪽
    par = " ".join(f"- {l} ({e})" for l, e in out)      # Keywords (내부 메모) 쪽
    return em, par


def fix(persona, row, level1_block=None, per=None, learned_honorific=frozenset(), full=True):
    """persona 한 건을 시트 값에 맞춘다. 바뀐 항목 목록을 함께 돌려준다."""
    p, done = str(persona), []
    book = int(str(row["item_id"]).split("-")[1])

    if not full:
        # 슬롯 정합만 손본다 — 이 권은 아직 미션·프롬프트 검수를 하지 않았다.
        p2 = _reorder_slots(p, row["mission_detail"])
        if p2 != p: p, _ = p2, done.append("슬롯 순서")
        return p, done

    # 1) 상황 — **Situation:** 에서 옛 값을 캡처해 전역 치환한다.
    #    [Conversation Scenario] 쪽에도 같은 문장이 박혀 있어 한 번에 잡힌다.
    m = re.search(r"- \*\*Situation:\*\*\s*(.*?)\s*- \*\*Level:\*\*", p, re.S)
    sit = str(row["situation_ko"]).strip()
    if m and m.group(1).strip() != sit:
        p = p.replace(m.group(1).strip(), sit); done.append("상황")

    # 2) 첫 발화 — [Start Message]: / Start Message: / 'AI의 첫 번째 대사' 세 곳에
    #    같은 문장이 박혀 있으므로 전역 치환한다.
    m = re.search(r'Start Message\]?:\s*"([^"]*)"', p)
    fl = str(row["ai_first_line"]).strip()
    if m and m.group(1).strip() != fl:
        p = p.replace(m.group(1).strip(), fl); done.append("첫 발화")

    # 3) 미션 키워드 — 두 표기를 시트 값으로 다시 만든다.
    em, par = _missions(row["mission_detail"])
    p2 = re.sub(r"(\[Mission Keywords\]\s*).*?(?=\s{2,}(?:\[|\(이 항목은|---))",
                lambda x: x.group(1) + em, p, flags=re.S)
    p2 = re.sub(r"(Keywords \(내부 메모\):\s*).*?(?=\s{2,}6\. \*\*)",
                lambda x: x.group(1) + par, p2, flags=re.S)
    if p2 != p: p, _ = p2, done.append("미션")

    # 4) 목표 문법 — 시트의 target_grammar 는 두 문법이 공백으로 이어져 있어 어디서
    #    끊기는지 알 수 없다. 프롬프트 쪽 대괄호에는 옛 줄바꿈(&#13;)이 구분자로
    #    남아 있으므로, 다시 만들지 말고 오염만 벗긴다.
    p2 = re.sub(r"(핵심 문법:\s*\[)([^\]]*)(\])",
                lambda x: x.group(1) + x.group(2).replace("&#13;", "") + x.group(3), p)
    if p2 != p: p, _ = p2, done.append("문법 표기")

    # 5) 문법 노출 규칙 재작성
    m = re.search(r"(6\. \*\*Target Grammar Modeling[^\[]*\[[^\]]*\])(.*?)(?=\s{2,}7\. \*\*|\s{2,}# Closing)", p, re.S)
    if m and "학습자가 먼저 쓴 뒤에" not in m.group(2):
        p = p[:m.start(2)] + GRAMMAR_RULE + p[m.end(2):]; done.append("문법 노출 규칙")

    # 6) 레벨 — 1권 12~15과는 Context Level 과 제약 블록이 모두 2급으로 되어 있었다.
    m = re.search(r"\*\*Level:\*\*\s*(\d+)", p)
    if m and m.group(1) != str(book):
        p = p[:m.start(1)] + str(book) + p[m.end(1):]; done.append("Context Level")
    # 제약 블록을 과별 누적으로 다시 만든다. 손으로 쓴 급 단위 목록은 그 과의 목표
    # 문법을 스스로 금지하는 충돌이 있었다(grammar_scope 모듈 설명 참고).
    m = re.search(r"7\. \*\*(?:Strict )?Level \d+ (?:Constraints|Strategy)[^*]*\*\*.*?"
                  r"(?=\s{2,}# Closing Rule)", p, re.S)
    if per is not None and book in CONSTRAINT_BOOKS:
        ch = int(str(row["item_id"]).split("-")[2])
        src = m.group(0) if m else (level1_block or "")
        blk = constraint_block(book, ch, per, src, learned_honorific)
        if m:
            if "이 과까지 배운 것만" not in m.group(0):
                p = p[:m.start()] + blk + p[m.end():]; done.append("제약 블록")
        else:
            i = p.find("# Closing Rule")
            if i > 0:
                p = p[:i] + blk + "  " + p[i:]; done.append("제약 블록 신설")

    # 7) [Level] 라벨 — 1권 안에서 입문/초급으로 갈려 있었다. 뒤 문장의 과별
    #    설명(예: '쇼핑 표현을 중심으로')은 쓸모가 있으니 라벨만 통일한다.
    if book == 1:
        p2 = p.replace("[Level] 초급 (한국어능력시험 TOPIK 1급 수준)",
                       "[Level] 입문 단계 (한국어능력시험 1급보다 쉬운 수준)")
        if p2 != p: p, _ = p2, done.append("[Level] 라벨")

    # 8b) 슬롯 순서를 미션 순서에 맞춘다. 라벨은 건드리지 않는다 —
    #     슬롯 이름은 [Interaction Logic]·[AI Response Strategy] 에서도 참조되므로
    #     (92과 중 91과) 개명하면 그쪽까지 고쳐야 한다. 순서만 바꾸면 안전하다.
    p2 = _reorder_slots(p, row["mission_detail"])
    if p2 != p: p, _ = p2, done.append("슬롯 순서")

    # 8) [Slot Definition] — 미션과 1:1이 깨진 것을 맞춘다.
    iid = str(row["item_id"])
    SL = {**SLOT_FIX, **SLOT_ALIGN, **SLOT_ALIGN_2}
    if iid in SL:
        txt, _why = SL[iid]
        p2 = re.sub(r"(\[Slot Definition\]\s*).*?(?=※ 슬롯은)", lambda x: x.group(1) + txt, p, flags=re.S)
        if p2 != p: p, _ = p2, done.append("슬롯 정의")

    # 8c) 통짜 시나리오가 다른 과 것이거나 틀린 문법에 맞춰 있던 경우 — 전면 재작성.
    if iid in NESTED_FIX:
        p2 = re.sub(r"\[AI Role\].*?(?=- 대화 중 성별이 절대 바뀌어서는)",
                    NESTED_FIX[iid], p, flags=re.S)
        if p2 != p: p, _ = p2, done.append("시나리오 전면 재작성")

    # 8d) 슬롯 라벨을 미션 라벨에 맞춰 정확히 개명한다(다른 절 참조까지 함께).
    for old_s, new_s in LABEL_RENAME.get(iid, []):
        if old_s in p: p = p.replace(old_s, new_s); done.append("슬롯 라벨 개명")

    # 9) 남은 엔티티 오염
    if "&#13;" in p:
        p = p.replace("&#13;", ""); done.append("&#13;")
    return p, done


def level1_block_from(persona):
    """1급 제약 블록을 정상 과에서 떠 온다."""
    m = re.search(r"7\. \*\*Strict Level 1 Constraints:\*\*.*?(?=\s{2,}# Closing Rule)",
                  str(persona), re.S)
    return m.group(0) if m else None


def _section(block, name):
    """제약 블록에서 [이름] 절을 그대로 떠 온다. 없으면 빈 문자열."""
    m = re.search(r"(\[" + re.escape(name) + r"\].*?)(?=\s{2,}\[|\s{2,}# Closing|$)", block, re.S)
    return m.group(1).rstrip() if m else ""


def constraint_block(book, chapter, per, existing, learned_honorific):
    """과별 누적 제약 블록을 만든다.

    손으로 쓴 급 단위 목록을 과별 누적으로 바꾼다. 하지만 [금지 질문 유형]·[문장 구조]는
    교육적 판단이 담긴 것이라 그대로 살린다. [금지 어휘]의 특수 높임 줄만 과에 맞게 고친다.
    """
    cum = grammar_scope.cumulative(per, book, chapter)
    nxt = grammar_scope.upcoming(per, book, chapter, 4)
    parts = [f"7. **Level {book} Constraints (이 과까지 배운 것만):**"]
    parts.append("    [허용 문법 — 이 과까지 배운 것]")
    parts.append("    - " + ", ".join(f"'{g}'" for g in cum))
    ex = ("(예: " + ", ".join(f"'{g}'" for g in nxt) + ")") if nxt else ""
    if book <= 2:
        parts.append(f"    - 위 목록에 없는 문법은 쓰지 마세요. 뒤에서 배울 것{ex}은 아직 쓰지 마세요.")
    else:
        # 3급부터는 완전 금지가 아니라 상한선으로 둔다. 원래 'Level 3 Strategy' 가
        # 자연스러움을 허용했고, 누적 목록이 이미 55개를 넘어 여유가 있다.
        parts.append(f"    - 뒤 과나 상위 급에서 배울 문법으로 문장을 이끌지 마세요{ex}.")
        parts.append("    [자연스러움]")
        parts.append("    - 위 목록은 '학습자가 배운 문법' 이고 금지 목록이 아닙니다. 한국인이 "
                     "실제로 쓰는 자연스러운 표현은 쓰되, 아직 배우지 않은 문법을 새로 꺼내지는 마세요.")
        parts.append("    - '왜' 를 포함한 의문사 질문은 자유롭게 쓰세요.")
    parts.append("    [기본 표현 — 목록과 무관하게 사용 가능]")
    parts.append("    - 인사·응답: '안녕하세요', '네', '아니요', '고마워요', '죄송해요'")
    parts.append("    - 시간: '지금', '오늘', '내일', '어제', '매일'")

    q = _section(existing, "금지 질문 유형")
    if q: parts.append("    " + re.sub(r"\s{2,}", "    ", q))
    # [금지 어휘] 는 한 번만 낸다 — 특수 높임(과별)과 한자어 주의를 한 절에 합친다.
    todo = [w for w in HONORIFIC if w not in learned_honorific]
    lex = []
    if todo:
        lex.append("    - 특수 높임 어휘: " + ", ".join(f"'{w}'" for w in todo) + " 사용 금지")
    lex.append("    - 지나치게 어려운 전문 용어나 한자어는 피하세요."
               if book >= 3 else "    - 복잡한 한자어 최소화")
    parts.append("    [금지 어휘]"); parts += lex
    st = _section(existing, "문장 구조")
    if st:
        parts.append("    " + re.sub(r"\s{2,}", "    ", st))
    elif book >= 3:
        parts.append("    [문장 구조]")
        parts.append("    - 두 절까지 이어진 문장은 자연스럽게 쓰세요. 세 절 이상 이어지는 긴 문장은 피하세요.")
    return "".join(parts)


def _reorder_slots(p, mission_detail):
    """슬롯을 미션 순서로 다시 늘어놓는다. 라벨·설명은 그대로 옮긴다."""
    m = re.search(r"(\[Slot Definition\][^\d]*?)((?:\d\)\s.*?)+?)(?=※ 슬롯은)", p, re.S)
    if not m: return p
    head, body = m.group(1), m.group(2)
    # 'N) …' 단위로 자른다. 설명 안에 괄호가 있어도 번호로 끊으면 안전하다.
    parts = re.split(r"(?=\d\)\s)", body)
    items = [x for x in parts if re.match(r"\d\)\s", x)]
    if len(items) < 2: return p
    def z(x): return re.sub(r"\s", "", x)
    def label(it):
        t = re.sub(r"^\d\)\s*", "", it)
        return re.split(r"[\(\-]", t, 1)[0].strip()
    miss = [x.split(":", 1)[0].strip() for x in str(mission_detail).split(" / ")]
    order, used = [], set()
    for mi in miss:
        for j, it in enumerate(items):
            if j in used: continue
            if z(mi) in z(label(it)) or z(label(it)) in z(mi):
                order.append(j); used.add(j); break
    if len(order) != len(items): return p      # 짝이 안 맞으면 손대지 않는다
    if order == sorted(order): return p        # 이미 미션 순서다
    out = []
    for n, j in enumerate(order, 1):
        out.append(re.sub(r"^\d\)", f"{n})", items[j]))
    return p[:m.start(2)] + "".join(out) + p[m.end(2):]
