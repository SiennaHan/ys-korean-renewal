# -*- coding: utf-8 -*-
"""3급 미션 영어 지시문 정정 4건.

3급 프롬프트는 1·2급보다 정교하다 — `[Slot Definition]`·`[AI Support Expressions]`·
`[Target Grammar – AI Internal Reference]` 를 갖추고 있고, 미션 한국어 라벨은
슬롯과 1:1로 묶여 있다(`※ Mission Keywords와 Slot Definition은 1:1로 대응된다`).
그래서 **한국어 라벨은 건드리지 않고 영어 지시문만 고친다.** 슬롯 정의가 정상이고
영어 지시만 어긋난 경우였다.
"""

MISSION_FIX_3 = {
 # 슬롯: '자신의 행동 약속 - 예: 제가 전화해 볼게요'. '~for someone' 은 무엇을 하는지
 # 가 빠져 '연락 방법'과 겹쳐 보였다. 목표 문법 '-을게요' 가 여기 떨어진다.
 "MC-3-02-001": ("연락 방법: Say how you contacted them or whether you did yet"
                 " / 이유: Explain briefly why contact is needed"
                 " / 약속: Say what you will do about it (call, text, or wait)",
                 "'약속: Say what you will do for someone' 이 무엇을 하는지 없어 "
                 "'연락 방법'과 겹쳐 보였다 — 슬롯 정의('제가 전화해 볼게요')에 맞춤"),

 # 슬롯은 '계획'(할 일)과 '휴식/활동'(구체적 행동)의 2단계인데, 영어 지시가 둘 다
 # 'what you are going to do' 로 읽혀 중복처럼 보였다. 2단계임을 지시에 드러낸다.
 "MC-3-07-001": ("계획: Say what you are going to do in the afternoon"
                 " / 이유: Explain why you chose that plan"
                 " / 활동: Describe the plan in detail — resting, meeting someone, shopping",
                 "'계획'과 '활동'의 영어 지시가 같아 보였다. 슬롯은 '할 일 → 구체적 "
                 "묘사'의 2단계이므로 그것이 드러나게 고쳤다"),

 # 과 제목 「쇼핑 장소 이야기하기」, [Lesson Context] '물건을 산 장소를 소개하고',
 # 슬롯 '물건을 산 장소'·'산 물건'·'그 장소에 간 이유', 첫 발화 '어디서 샀어요?'
 # — 전부 과거인데 영어 지시만 'want to buy / looking for' 로 미래였다.
 "MC-3-12-001": ("장소: Say where you bought it"
                 " / 물건: Say what you bought"
                 " / 목적: Explain why you chose that place (price, variety, convenience)",
                 "영어 지시만 미래시제('want to buy')로 어긋나 있었다 — 과 제목·"
                 "Lesson Context·슬롯·첫 발화가 모두 과거(산 장소)다"),

 # '이유: Explain why' 는 무엇의 이유인지가 없다. 슬롯은 '그 물건을 고른 이유'.
 "MC-3-13-001": ("물건: Talk about the item / 이유: Explain why you chose it"
                 " / 가격: Talk about the price",
                 "'이유: Explain why' 에 무엇의 이유인지가 없었다 — 슬롯 '그 물건을 고른 이유'"),
}
