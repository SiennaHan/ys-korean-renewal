#!/usr/bin/env python3
"""v60 — 읽기 지문·문항(n5_read_answer_text · n5_read_answer_questions)을
세은의 「읽기지문_문제_세은.xlsx」(지문 · 선지 시트)로 **전량 교체**한다.

무엇이 바뀌나
    v59 의 읽기 지문 117행은 자체 창작 지문이었다(change_note 에 그렇게 적혀 있다).
    v60 은 교재 원문 지문 124편(1급 4과~8급 15과 · 1급 1~3과 없음 · 일곱 과는 지문 둘)과
    그 지문에 붙은 문항 472개로 바꾼다. **item_id 는 과별 001 부터 다시 매긴다**
    (기획 결정 2026-09-14). 그래서 RT-/RC- 번호와 정수 id 가 전부 딴 것을 가리키게 된다 —
    학습 기록·복습 큐·activity_state 의 read-answer 행은 지워야 한다(DEV 카드로 넘긴다).
    build-content.py 의 밀림 검사(renumbered)는 이 교체 1회에 한해 걸리는 것이 맞다.

앱 형식에 맞추기 위해 한 것 (read-answer.tsx · model.py 를 읽고 정했다)
    - 문항은 단일 선택이다(choice 2~4지 · ox). **정답이 둘 이상인 12문항은 하나만 고르게
      다시 썼다** — 4개 중 3개가 맞으면 「맞지 않는 것 고르기」, 그 밖은 정답 하나만 남기고
      선지를 4개로 줄였다. 오답이 모자라면 지문 근거로 하나 새로 썼다. 전부 MULTI 에 있고
      change_note 에 원문을 남긴다.
    - 발문은 두 자리로 가른다. **instruction_ko~vi 는 v59 의 유형별 고정 문구 2종**을 그대로
      쓴다(지문 카드 위에 붙는다). **question 은 질문 한 문장**이다 — 앞에 붙은 교재 지시문
      (「성과 이름을 쓰세요.」「읽은 내용과 같으면 O, 다르면 X 하세요.」)은 걷는다.
      「✓ 하십시오」「모두 고르십시오」「[01]을 읽고」 같은 지면용 표현은 화면에 맞게 바꾼다.
    - OX 는 v59 규약대로 selection1="X" · selection2="O" · answer_index 는 그 자리다.
      원문의 ◯/× 표기는 O/X 로 통일한다.
    - 길이 한도는 서버 모델(model.py)이다 — question 200 · selection 100 · instruction_ko 50 ·
      change_note 300. 넘으면 멈춘다(자기소개서 인용 문항 하나는 인용을 줄였다 — LONG_FIX).
    - review_status 는 전부 draft 다. 검수 도장은 사람이 찍는다(v56 사고 교훈).

돌리기
    python3 illust/build_v60.py                # 저장소 루트의 v59 + 읽기지문_문제_세은.xlsx
    python3 illust/build_v60.py --dry          # 원장을 안 만들고 변환 결과·검사만 찍는다

대상이 이미 있으면 멈춘다(build_v26 의 교훈).
"""
from __future__ import annotations

import argparse
import re
import sys
import unicodedata
from collections import Counter, OrderedDict
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parent.parent
SRC_LEDGER = ROOT / "글로벌_교재기반_콘텐츠_v59.xlsx"
SRC_SEEUN = ROOT / "읽기지문_문제_세은.xlsx"
OUT = ROOT / "글로벌_교재기반_콘텐츠_v60.xlsx"

TEXT_SHEET = "n5_read_answer_text"
Q_SHEET = "n5_read_answer_questions"
LOG_SHEET = "99_변경내역"

TEXT_HEAD = ["id", "book_id", "chapter", "type", "text", "item_id", "review_status",
             "source_page", "change_note", "hold_reason"]
Q_HEAD = ["id", "book_id", "text_id", "seq", "question", "type", "selection1", "selection2",
          "selection3", "selection4", "answer_index", "item_id", "review_status", "source_page",
          "change_note", "hold_reason", "instruction_ko", "instruction_en", "instruction_jp",
          "instruction_cn", "instruction_vi"]

# v59 가 쓰던 유형별 지시문 — 그대로 잇는다(5개 언어)
INSTR = {
    "choice": ("다음을 읽고 맞는 답을 고르세요.",
               "Read and choose the correct answer.",
               "次の文を読んで正しい答えを選びましょう。",
               "请阅读下文并选择正确答案。",
               "Hãy đọc đoạn văn sau và chọn câu trả lời đúng."),
    "ox": ("읽은 내용과 같으면 O, 다르면 X 하세요.",
           "Mark O if it matches what you read, X if not.",
           "読んだ内容と同じならO、違うならXを選びましょう。",
           "与读到的内容相符选O，不符选X。",
           "Chọn O nếu đúng với nội dung đã đọc, chọn X nếu không đúng."),
    # "맞는 답을 고르세요" 인데 실제로는 안 맞는/불가능한 것을 고르는 문항 — 지시문이
    # 방향과 모순된다(2026-09-14 지적). MULTI 에서 「뒤집은」 5문항 전용.
    "choice_exception": ("다음을 읽고 맞지 않는 것을 고르세요.",
                         "Read the following and choose the one that does NOT match.",
                         "次の文を読んで、内容と合わないものを選びましょう。",
                         "请阅读下文，选择与内容不符的选项。",
                         "Hãy đọc đoạn văn sau và chọn phương án KHÔNG đúng với nội dung."),
}

# 서버 모델(api/persistence/model.py KoReadQuestion)의 열 폭
LIMITS = {"question": 200, "selection": 100, "instruction_ko": 50, "change_note": 300}

NOTE_TEXT = "v60 세은 교재 원문 지문으로 전량 교체(2026-09-14) — 과제{task} · {kind} · p.{page}"
NOTE_Q = "v60 세은 문항으로 전량 교체(2026-09-14) — 원본유형 {orig} · {conv}"

O_LIKE = {"O", "◯", "○", "Ｏ"}
X_LIKE = {"X", "×", "✕", "Ｘ"}

# ── 발문 정리 ──────────────────────────────────────────────────────────────
# OX 발문: 「…같으면 O, 다르면 X (표) 하세요/하십시오.」 를 걷고 진술문만 남긴다
OX_LEAD = re.compile(
    r"^[^.?]*?(같으면|맞으면|일치하면)\s*[O◯○Ｏ]\s*,?\s*(다르면|틀리면)\s*[X×✕Ｘ][를을]?\s*(표\s*)?(하|선택하)(세요|십시오)\.?\s*")

# 규칙으로 못 가르는 발문 — 사람이 정한 것. 교재의 총괄 질문·활동 안내·저작 메모를 걷는다
PROMPT_FIX = {
    (10, "1-1"): "옷 가게 주인은 어때요?",                       # 「가게 주인이 어때요?」 총괄 질문 걷음
    (10, "1-2"): "편의점 주인은 어때요?",
    (84, "1-1"): "영화 제목으로 맞는 것을 고르십시오.",           # 「위 영화의 정보를 요약해 봅시다.」 활동 안내 걷음
    (91, "2-2"): "윗글에서 소개한 미래의 식생활(음식)로 알맞은 것을 고르십시오.",   # 「(‘…’ 외)」 저작 메모 걷음
    (91, "2-3"): "윗글에서 소개한 미래의 주거 생활(집)로 알맞은 것을 고르십시오.",
    (91, "2-5"): "윗글에서 소개한 그 밖의 미래 모습으로 알맞은 것을 고르십시오.",
}
# 4지선다 변환 문항 앞에 붙은 교재 지시문 한 문장 — 뒤에 진짜 질문이 따라올 때만 걷는다
LEAD_INSTR = re.compile(
    r"^([^.?!]{0,60}?(쓰세요|쓰십시오|하세요|하십시오|연결하세요|연결하십시오|고르세요|고르십시오|하시오|쓰시오))\.\s+(?=\S)")
# 지면용 표현 → 화면용
REWRITE = [
    (re.compile(r"맞는 것에 모두 ✓ 하십시오"), "맞는 것을 고르십시오"),
    (re.compile(r"맞는 것에 ✓ 하십시오"), "맞는 것을 고르십시오"),
    (re.compile(r"✓ 하십시오"), "고르십시오"),
    (re.compile(r"✓ 하세요"), "고르세요"),
    (re.compile(r"모두 고르십시오"), "고르십시오"),
    (re.compile(r"모두 찾으십시오"), "고르십시오"),
    (re.compile(r"찾으십시오"), "고르십시오"),
    (re.compile(r"\[(\d\d)\][을를] 읽고 "), r"[\1]의 내용과 "),
    (re.compile(r"\s+"), " "),
]
FORBIDDEN = re.compile(r"✓|모두 (고르|찾)|\[\d\d\][을를] 읽고|쓰세요|쓰십시오|연결하세요|연결하십시오|표 하")

# ── 정답이 둘 이상이던 12문항 — 사람이 다시 쓴 것 ───────────────────────────
# (지문ID, 문제번호) → dict(question, options=[(text, correct)], why)
# options 의 원문 순서를 되도록 지킨다. 새로 쓴 오답은 (text, False, "새 오답") 로 표시.
MULTI = {
    (2, "1"): dict(
        question="유리 씨는 무엇이 없어요?",
        options=[("가방", False), ("사전", True), ("교과서", False)],
        why="정답 2/3(가방·교과서) → 없는 것을 묻는 문항으로 뒤집음",
        instr_variant="exception"),
    (62, "3"): dict(
        question="유카 씨는 언제 언어 교환을 할 수 없습니까?",
        options=[("목요일 오후나 저녁", True), ("토요일 오전이나 오후", False), ("일요일 오전이나 오후", False)],
        why="정답 2/3(토·일) → 할 수 없는 때를 묻는 문항으로 뒤집음",
        instr_variant="exception"),
    (65, "1"): dict(
        question="읽은 내용과 맞는 것을 고르십시오.",
        options=[("학생들은 방에서만 컴퓨터를 사용할 수 있다.", False),
                 ("기숙사에 들어올 때 이불과 베개는 가지고 와야 한다.", False),
                 ("전화를 받을 때와 걸 때 휴게실에 있는 전화를 사용해야 한다.", False),
                 ("기숙사에서 나갈 때는 체크아웃 서류와 열쇠, 침구류를 반납해야 한다.", True)],
        why="정답 4/7 → 오답 셋 + 정답 하나(체크아웃)로 4지. 뺀 정답: 음식 조리·11시 반·고장 신고"),
    (68, "2"): dict(
        question="읽은 내용과 맞는 것을 고르십시오.",
        options=[("모든 코스는 월요일에 쉰다.", False),
                 ("다양한 언어로 안내를 받을 수 있다.", True),
                 ("예약 확인은 인터넷으로만 할 수 있다.", False),
                 ("도보 관광 코스를 안내를 받기 위해서는 돈을 내야 한다.", False)],
        why="정답 2/6 → 정답 하나(안내 언어)만 남기고 4지. 뺀 것: 3일 전 예약(정답) · 11명 이상 주말(오답)"),
    (71, "3"): dict(
        question="읽은 내용과 맞는 것을 고르십시오.",
        options=[("병원에서 약을 받을 수 있다.", False),
                 ("진료비는 현금으로 내야 한다.", False),
                 ("외국어를 할 수 있는 자원봉사자들이 있다.", True),
                 ("한 처방전으로 약을 여러 번 살 수 있다.", False, "새 오답")],
        why="정답 2/4 → 「일주일 안에 약」을 빼고 지문 근거(「한 처방전으로 여러 번 약을 살 수는 없습니다」)로 오답 하나 새로 씀"),
    (72, "2"): dict(
        question="아침을 먹지 않을 때 생기는 문제로 맞지 않는 것을 고르십시오.",
        options=[("아침을 굶는 어른은 배에 살이 찌기 쉽다.", False),
                 ("몸이 에너지를 쌓아놓으려고 하기 때문에 살이 찐다.", False),
                 ("어린이는 운동을 많이 하기 때문에 아침을 굶으면 살이 빠진다.", True)],
        why="정답 2/3 → 맞지 않는 것 고르기로 뒤집음",
        instr_variant="exception"),
    (73, "3"): dict(
        question="결혼식장에 어떻게 갑니까? 맞는 것을 고르십시오.",
        options=[("주말에는 자기 차를 가지고 간다.", False),
                 ("초록 색 7011번 버스를 타고 명동역 앞에서 내린다.", True),
                 ("파란 색 105번 버스를 타고 롯데 백화점 앞에서 내린다.", False),
                 ("지하철 4호선을 타고 가서 을지로입구역에서 내린다.", False, "새 오답")],
        why="정답 2/4 → 「2호선 을지로입구역 5번 출구」를 빼고 호선을 바꾼 오답(을지로입구역은 2호선) 하나 새로 씀"),
    (74, "2"): dict(
        question="읽은 내용과 맞는 것을 고르십시오.",
        options=[("유실물 센터는 24시간 문을 연다.", False),
                 ("제일 많이 잃어버리는 물건은 가방이다.", False),
                 ("유실물들은 일주일이 지나면 경찰서로 간다.", True),
                 ("1호선부터 9호선까지 9개의 유실물 센터가 있다.", False)],
        why="정답 3/6 → 오답 셋 + 정답 하나(일주일 뒤 경찰서)로 4지. 뺀 정답: 홈페이지 사진 · 역무실 신고"),
    (75, "1-2"): dict(
        question="[01]의 내용으로 알 수 없는 것을 고르십시오.",
        options=[("한국에 처음 왔다.", False),
                 ("이 사람은 휴대전화를 가지고 있다.", True),
                 ("출입국 사무소에서 짐 검사를 받았다.", False),
                 ("입국 수속과 짐 찾는 일 때문에 바빴다.", False)],
        why="정답 3/4 → 남은 하나(오답유형 지문미언급)를 「알 수 없는 것」으로 묻게 뒤집음",
        instr_variant="exception"),
    (85, "3"): dict(
        question="‘내 마음의 풍금’에 대한 설명으로 맞는 것을 고르십시오.",
        options=[("월요일에는 공연이 없다.", True),
                 ("평일에는 일본어 자막이 있다.", False),
                 ("이 뮤지컬은 영화로 만들어질 것이다.", False),
                 ("R석 표는 4만 원이다.", False, "새 오답")],
        why="정답 2/4 → 「많은 상을 받은 작품」을 빼고 좌석 값을 바꾼 오답(R석 6만 원·S석 4만 원) 하나 새로 씀"),
    (89, "2"): dict(
        question="위 광고의 내용과 같은 것을 고르십시오.",
        options=[("선풍기는 아주 크다.", False),
                 ("이 선풍기는 한 번 수리를 했다.", False),
                 ("이 선풍기는 2만 원보다 싸게 살 수도 있다.", True),
                 ("밥솥은 오래 썼기 때문에 싸게 파는 것이다.", False)],
        why="정답 2/5 → 「5시 이후 전화」를 빼고 4지"),
    (94, "2"): dict(
        question="1345에서 도움을 받을 수 없는 경우를 고르십시오.",
        options=[("한국 국적을 가질 수 있는 방법을 알고 싶다.", False),
                 ("외국 친구에게 한국 여행지를 추천하고 싶다.", True),
                 ("국제결혼을 했는데 문제가 좀 있다.", False),
                 ("경찰서에 전화하고 싶은데 한국말을 못한다.", False)],
        why="정답 4/6 → 받을 수 없는 경우 고르기로 뒤집고 4지. 뺀 것: 일상생활 불편(정답) · 여행 중 문제(오답)",
        instr_variant="exception"),
}

# question 200자 한도를 넘는 문항 — 인용을 줄였다
LONG_FIX = {
    (112, "3-2"): "다음은 자기소개서의 일부입니다. 무엇에 대한 내용입니까? "
                  "“첫 직장은 제약회사 연구소였지만 실험에만 집중하는 일은 저와 맞지 않아 사람을 상대하는 일을 찾다가 "
                  "모교 상담실에서 일하게 됐습니다. 계약이 끝나 쉬던 중 귀사의 의학상담사 모집에 지원하게 됐습니다.”",
}


def die(msg):
    sys.exit(f"❌ {msg}")


def norm(s):
    return unicodedata.normalize("NFC", str(s)).strip() if s is not None else ""


def clean_ws(s: str) -> str:
    """줄바꿈은 살리고 줄마다 양끝 공백만 걷는다"""
    lines = [re.sub(r"[ \t ]+", " ", ln).strip() for ln in str(s).replace("\r", "").split("\n")]
    while lines and not lines[-1]:
        lines.pop()
    return "\n".join(lines)


def load_seeun(path):
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    P = [r for r in wb["지문"].iter_rows(values_only=True)][1:]
    Q = [r for r in wb["선지"].iter_rows(values_only=True)][1:]
    P = [r for r in P if r[5] is not None]
    Q = [r for r in Q if r[4] is not None and r[10] is not None]
    return P, Q


def build(P, Q):
    """세은 두 시트 → (텍스트 행들, 문항 행들, 보고)"""
    report = {"lead_dropped": [], "ox_unmatched": [], "rewritten": [], "opt3": [], "notes": []}

    # 지문 — 급·과·지문ID 순. id = 지문ID + 1
    P = sorted(P, key=lambda r: (int(r[0]), int(r[1]), int(r[5])))
    texts, text_id_of, chap_of = [], {}, {}
    seq_in_ch = Counter()
    for r in P:
        book, ch, task, kind, page, pid, body = int(r[0]), int(r[1]), r[2], r[3], r[4], int(r[5]), r[6]
        seq_in_ch[(book, ch)] += 1
        tid = pid + 1
        text_id_of[pid] = tid
        chap_of[pid] = (book, ch, page)
        texts.append(OrderedDict(zip(TEXT_HEAD, [
            tid, book, ch, "읽기 지문", clean_ws(body), f"RT-{book}-{ch}-{seq_in_ch[(book, ch)]:03d}",
            "draft", int(page) if page is not None else None,
            NOTE_TEXT.format(task=task, kind=kind, page=page), None])))

    # 문항 — (지문ID, 문제번호) 로 묶는다. 시트 순서가 곧 문항 순서다
    groups = OrderedDict()
    for r in Q:
        groups.setdefault((int(r[4]), norm(r[5])), []).append(r)
    # 지문 순서 → 그 지문의 문항 순서
    order = sorted(groups, key=lambda k: (chap_of[k[0]][0], chap_of[k[0]][1], k[0],
                                          list(groups).index(k)))
    qrows, qid, seq_in_text, rc_in_ch = [], 0, Counter(), Counter()
    for key in order:
        rows = groups[key]
        pid, qno = key
        book, ch, page = chap_of[pid]
        first = rows[0]
        orig_type, conv, prompt = norm(first[6]) or "(빈 칸)", norm(first[7]) or "(빈 칸)", norm(first[8])
        opts = [(norm(r[10]), norm(r[11]) == "O") for r in rows]
        note_extra = ""

        if key in MULTI:
            spec = MULTI[key]
            question = spec["question"]
            opts = [(o[0], o[1]) for o in spec["options"]]
            qtype = "choice"
            note_extra = f" · 복수정답 재작성: {spec['why']} · 원문 발문 「{prompt}」"
            report["rewritten"].append((key, book, ch, prompt, spec))
        else:
            is_ox = len(opts) == 2 and {o[0] for o in opts} <= (O_LIKE | X_LIKE) \
                and any(o[0] in O_LIKE for o in opts) and any(o[0] in X_LIKE for o in opts)
            if is_ox:
                qtype = "ox"
                m = OX_LEAD.match(prompt)
                if m:
                    question = prompt[m.end():].strip()
                else:
                    question = prompt
                    report["ox_unmatched"].append((key, prompt))
                correct_is_o = next(o[1] for o in opts if o[0] in O_LIKE)
                opts = [("X", not correct_is_o), ("O", correct_is_o)]
            else:
                qtype = "choice"
                question = prompt
                m = LEAD_INSTR.match(question)
                if m and conv == "4지선다변환" and re.search(r"고르|\?", question[m.end():]):
                    report["lead_dropped"].append((key, m.group(1), question[m.end():]))
                    question = question[m.end():]
                if len(opts) == 3:
                    report["opt3"].append((key, book, ch))
        if key in PROMPT_FIX:
            note_extra += f" · 발문 정리(원문 「{prompt}」)"
            question = PROMPT_FIX[key]
        if key in LONG_FIX:
            note_extra += f" · 200자 한도로 인용을 줄임(원문 {len(question)}자)"
            question = LONG_FIX[key]
        for pat, rep in REWRITE:
            question = pat.sub(rep, question)
        question = question.strip()

        # 검사 — 하나라도 어긋나면 멈춘다
        n_correct = sum(1 for o in opts if o[1])
        if n_correct != 1:
            die(f"{key} 정답이 {n_correct}개다: {opts}")
        if not 2 <= len(opts) <= 4:
            die(f"{key} 선지가 {len(opts)}개다")
        if len({o[0] for o in opts}) != len(opts):
            die(f"{key} 선지 글이 겹친다(React key 충돌): {opts}")
        if any(o[0] == "" for o in opts):
            die(f"{key} 빈 선지가 있다")
        if not question:
            die(f"{key} 질문이 비었다")
        if FORBIDDEN.search(question):
            die(f"{key} 지면용 표현이 남았다: {question}")
        if len(question) > LIMITS["question"]:
            die(f"{key} question {len(question)}자 > {LIMITS['question']}: {question[:60]}…")
        for o in opts:
            if len(o[0]) > LIMITS["selection"]:
                die(f"{key} 선지 {len(o[0])}자 > {LIMITS['selection']}")

        qid += 1
        tid = text_id_of[pid]
        seq_in_text[tid] += 1
        rc_in_ch[(book, ch)] += 1
        sel = [o[0] for o in opts] + [None] * (4 - len(opts))
        answer_index = next(i for i, o in enumerate(opts) if o[1])
        note = NOTE_Q.format(orig=orig_type, conv=conv) + note_extra
        if len(note) > LIMITS["change_note"]:
            note = note[:LIMITS["change_note"] - 1] + "…"
        instr_key = "choice_exception" if key in MULTI and MULTI[key].get("instr_variant") == "exception" else qtype
        instr = INSTR[instr_key]
        if len(instr[0]) > LIMITS["instruction_ko"]:
            die("instruction_ko 가 50자를 넘는다")
        qrows.append(OrderedDict(zip(Q_HEAD, [
            qid, book, tid, seq_in_text[tid], question, qtype, *sel, answer_index,
            f"RC-{book}-{ch}-{rc_in_ch[(book, ch)]:03d}", "draft", None, note, None, *instr])))
    return texts, qrows, report


def print_report(texts, qrows, report):
    print(f"지문 {len(texts)}행 · 문항 {len(qrows)}행")
    print("유형:", dict(Counter(q["type"] for q in qrows)),
          "· 선지 수:", dict(Counter(sum(1 for k in ("selection1", "selection2", "selection3", "selection4") if q[k]) for q in qrows)),
          "· 정답 자리:", dict(Counter((q["type"], q["answer_index"]) for q in qrows)))
    print(f"\n— 앞 지시문을 걷은 문항 {len(report['lead_dropped'])}개")
    for key, lead, rest in report["lead_dropped"]:
        print(f"  {key}: 「{lead}.」 → {rest}")
    print(f"\n— OX 인데 지시문 패턴이 안 맞은 것 {len(report['ox_unmatched'])}개")
    for key, p in report["ox_unmatched"]:
        print(f"  {key}: {p}")
    fixed = [q for q in qrows if "발문 정리" in (q["change_note"] or "")]
    print(f"\n— 손으로 정리한 발문 {len(fixed)}개: {[q['item_id'] for q in fixed]}")
    print(f"\n— 3지선다로 남은 문항 {len(report['opt3'])}개: {[k for k, _, _ in report['opt3']]}")
    print(f"\n— 복수정답 재작성 {len(report['rewritten'])}개"
          f" (그중 예외형 지시문으로 바꾼 것 {sum(1 for *_, s in report['rewritten'] if s.get('instr_variant') == 'exception')}개)")
    for key, book, ch, prompt, spec in report["rewritten"]:
        tag = " [지시문 변경]" if spec.get("instr_variant") == "exception" else ""
        print(f"  {key} [{book}급{ch}과]{tag} {spec['why']}")
    # 의심 문항 — 문장이 둘 이상인데 아무것도 안 걷은 choice
    multi = [q for q in qrows if q["type"] == "choice" and len(re.findall(r"[.?!]\s+\S", q["question"])) >= 1]
    print(f"\n— 여전히 문장이 둘 이상인 choice 질문 {len(multi)}개 (사람이 훑어볼 것)")
    for q in multi:
        print(f"  {q['item_id']}: {q['question'][:110]}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry", action="store_true")
    ap.add_argument("--seeun", type=Path, default=SRC_SEEUN)
    ap.add_argument("--ledger", type=Path, default=SRC_LEDGER)
    ap.add_argument("--out", type=Path, default=OUT)
    args = ap.parse_args()

    P, Q = load_seeun(args.seeun)
    texts, qrows, report = build(P, Q)
    print_report(texts, qrows, report)
    if args.dry:
        return

    if args.out.exists():
        die(f"{args.out.name} 이 이미 있다 — 지우고 다시 돌려라")
    if not args.ledger.exists():
        die(f"{args.ledger.name} 이 없다")
    wb = openpyxl.load_workbook(args.ledger)
    for name, head, rows in ((TEXT_SHEET, TEXT_HEAD, texts), (Q_SHEET, Q_HEAD, qrows)):
        ws = wb[name]
        got = [norm(c.value) for c in ws[1]][:len(head)]
        if got != head:
            die(f"{name} 헤더가 v59 와 다르다: {got}")
        ws.delete_rows(2, ws.max_row)
        for r in rows:
            ws.append([r[h] for h in head])
    # 변경내역 — 맨 위(헤더 아래)에 블록을 얹는다
    log = wb[LOG_SHEET]
    n_new = sum(1 for _, _, _, _, s in report["rewritten"] if any(len(o) == 3 for o in s["options"]))
    entries = [
        ("v60", "교체", "n5_read_answer_text", None, "자체 창작 지문 117행", f"교재 원문 지문 {len(texts)}행",
         "세은 「읽기지문_문제_세은.xlsx」 지문 시트로 전량 교체. 1급 1~3과 없음(전과 같다). 2급10과·4급4·5·7·14과·5급3·12과는 지문 둘. "
         "item_id 는 과별 001 부터 다시 매김 — 옛 RT-/RC- 번호와 정수 id 는 딴 것을 가리킨다. review_status 전부 draft",
         "기획 결정 2026-09-14. 학습 기록·복습 큐·activity_state 의 read-answer 행은 개발자가 지운다(DEV 카드)"),
        ("v60", "교체", "n5_read_answer_questions", None, "383행", f"{len(qrows)}행",
         f"세은 선지 시트로 전량 교체. 유형 {dict(Counter(q['type'] for q in qrows))}. "
         "발문은 instruction_ko(v59 유형별 고정 문구 2종·5개 언어)와 question(질문 한 문장)으로 갈랐다 — "
         f"앞의 교재 지시문 {len(report['lead_dropped'])}건 걷음. ✓·모두·「[01]을 읽고」 같은 지면용 표현은 화면용으로 바꿈. "
         "OX 는 selection1=X·selection2=O 규약 유지, ◯/× 는 O/X 로",
         "앱은 단일 선택(read-answer.tsx) · 열 폭은 model.py(question 200 · selection 100)"),
        ("v60", "재작성", "n5_read_answer_questions", ", ".join(
            q["item_id"] for q in qrows if "복수정답 재작성" in (q["change_note"] or "")),
         "정답 2개 이상 12문항(선지 3~7개)", "정답 하나 · 선지 3~4개",
         f"4개 중 3개가 맞으면 「맞지 않는/없는 것 고르기」로 뒤집고, 그 밖은 정답 하나만 남기고 선지를 줄였다. 새로 쓴 오답 {n_new}개(지문 근거 있음). "
         "원문 발문과 이유는 각 행 change_note 에 있다",
         "앱이 복수 선택을 지원하지 않는다(기획 확정 2026-09-14)"),
        ("v60", "정리", "n5_read_answer_questions", "RC-8-4-*" if False else None, None, None,
         f"3지선다 원본 {len(report['opt3'])}문항은 3지로 둔다(앱은 빈 선지를 걷어 2~4지를 그린다). "
         "question 200자 한도를 넘는 1문항(8급 자기소개서 인용)은 인용을 줄였다", None),
    ]
    log.insert_rows(2, amount=len(entries) + 1)
    log.cell(row=2, column=1, value=f"v60   ({len(entries)}건)")
    for i, e in enumerate(entries, start=3):
        for j, v in enumerate(e, start=1):
            log.cell(row=i, column=j, value=v)
    wb.save(args.out)
    print(f"\n✅ {args.out.name} 썼다 — {TEXT_SHEET} {len(texts)}행 · {Q_SHEET} {len(qrows)}행 · {LOG_SHEET} 에 v60 블록 {len(entries)}건")


if __name__ == "__main__":
    main()
