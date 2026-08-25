#!/usr/bin/env python3
"""미션대화 시나리오 117개가 글로벌 신판 과 주제와 맞는지 본다.

미션대화는 3주완성(구판) 기준으로 만들어졌다. 시나리오가 주제 수준으로
추상적이라("새로운 기술이 생활을 어떻게 바꾸는지 말해요") 본문 개정에는
잘 견디지만, 과 주제 자체가 갈린 곳은 어긋난다.

n5 읽기 지문에 썼던 것과 같은 방법 — 시나리오에서 주제어를 뽑아
그 과의 신판 본문·학습목표에 몇 개나 있는지 센다.

산출: verify/chat_vs_new.csv
"""
import os, re, csv, json, collections, unicodedata
from global_text import GlobalPdf

HERE = os.path.dirname(os.path.abspath(__file__))
BASE = "/Users/soohyeon/Documents/2606-yonsei3week_parse"
STOP = set("""이야기 대화 상황 연습 사람 우리 자신 이것 그것 저것 무엇 어떤 여러 모든 다른
말해요 나눠요 해요 이야기해요 소개해요 물어요 답해요 봐요 가지 정도 때문 경우 관련 대해
보고 함께 서로 그리고 하지만 그래서""".split())


def sq(t):
    t = unicodedata.normalize("NFC", str(t or ""))
    return re.sub(r"[\s.,·’‘“”\"'()\[\]?!~\-—:;/…]", "", t)


def keywords(t, n=14):
    ws = re.findall(r"[가-힣]{2,}", str(t or ""))
    c = collections.Counter(w for w in ws if w not in STOP)
    return [w for w, _ in sorted(c.items(), key=lambda kv: (-len(kv[0]), -kv[1]))[:n]]


def main():
    syl = collections.defaultdict(dict)
    for r in csv.DictReader(open(f"{HERE}/syllabus.csv")):
        syl[(int(r["book"]), int(r["chapter"]))][r["field"]] = r["value"]

    cd = list(csv.DictReader(open(f"{HERE}/gsheet/chat_dialog.csv")))
    out = []
    for b in range(1, 9):
        gp = GlobalPdf(f"{BASE}/(최종본)연세글로벌한국어_{b}급_본교재-최종(26.8.10).pdf")
        toc = json.load(open(f"{BASE}/work/book{b}/toc.json"))
        rng = {int(k): v for k, v in toc["ranges"].items()}
        for r in [x for x in cd if int(x["book_id"]) == b]:
            ch = int(r["chapter"])
            if ch not in rng:
                continue
            a, z = rng[ch]
            body = sq(" ".join(gp.text(p) for p in range(a, min(z, len(gp)) + 1)))
            s = syl.get((b, ch), {})
            goal = sq(s.get("학습 목표", "") + s.get("어휘", "") + s.get("과제", ""))
            kw = keywords(r["scenario"])
            if len(kw) < 3:
                continue
            hb = sum(1 for w in kw if sq(w) in body)
            hg = sum(1 for w in kw if sq(w) in goal)
            out.append(dict(id=r["id"], book=b, chapter=ch, 주제어=len(kw),
                            본문=hb, 학습목표=hg, 비율=round(hb / len(kw), 2),
                            scenario=r["scenario"],
                            학습목표문=s.get("학습 목표", "")[:52]))
    with open(f"{HERE}/verify/chat_vs_new.csv", "w", newline="") as f:
        wr = csv.DictWriter(f, fieldnames=list(out[0]))
        wr.writeheader()
        wr.writerows(sorted(out, key=lambda x: x["비율"]))
    ok = [o for o in out if o["비율"] >= 0.4]
    print(f"미션대화 {len(out)}개 — 신판 본문과 주제어 겹침")
    print(f"  40% 이상 {len(ok)} / 40% 미만 {len(out)-len(ok)}")
    print("\n■ 겹침이 낮은 것 (확인 필요)")
    for o in sorted(out, key=lambda x: x["비율"])[:16]:
        print(f"  {o['book']}권 {o['chapter']:>2}과 {o['id']:5s} {o['본문']}/{o['주제어']} ({o['비율']:.0%})")
        print(f"       시나리오: {o['scenario']}")
        print(f"       신판 목표: {o['학습목표문']}")
    print(f"\n-> verify/chat_vs_new.csv")


if __name__ == "__main__":
    main()
