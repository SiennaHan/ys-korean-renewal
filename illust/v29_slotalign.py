# -*- coding: utf-8 -*-
"""미션↔슬롯 1:1 정합 — 21과 판정 결과.

순서 차이는 슬롯 재배열로 끝났고(persona_fix._reorder_slots), 남은 21과를
**목표 문법을 기준으로** 판정했다. 판정 원칙:

  슬롯이 목표 문법을 정확히 담고 미션이 못 담으면 → **미션을 슬롯에 맞춘다.**

11과가 그랬다. 대부분 한 문법이 두 요소를 한 문장에 담는데(`-는 대신에` 는 선택과
대안을, `-는다는 것이` 는 의도와 결과를, `-을 만하다` 는 상태와 판매 가능성을)
미션이 그것을 둘로 쪼개 놓아 슬롯 하나에 미션 둘이 대응했다.

손대지 않은 것: 2-11·4-08·7-14·8-10 — 라벨이 동의어 수준이고(차이↔예상과 다른 점)
1:1 매핑이 명확하다. 슬롯이 더 자세한 것은 정보이지 결함이 아니다.
"""

MISSION_ALIGN = {
 # 슬롯 '순서'=-어서(가서/만나서), '제한·강조'=만. 미션의 장소·시간은 문법과 무관했다.
 "MC-2-12-001": ("활동: Say what you did / 순서: Say what you did first and then"
                 " / 제한: Say you did only that, or only part of it",
                 "슬롯이 목표 문법을 담고 미션은 아니었다 — 순서=-어서, 제한=만"),
 # 슬롯 '이유'=-으니까, '금지·제한'=-지 말다. 미션의 장소는 문법과 무관했다.
 "MC-2-13-001": ("제안: Suggest where to go or what to do"
                 " / 이유: Explain why it is good or not / 금지: Say what you should not do",
                 "슬롯이 목표 문법을 담고 미션은 아니었다 — 이유=-으니까, 금지=-지 말다"),
 # 슬롯 1·3이 둘 다 '-을 수 있다' 로 겹쳐 슬롯 쪽도 온전하지 않았다. 상황(전화로
 # 통화 가능한지 묻기)에 맞게 '용건' 을 세우고 슬롯도 함께 고친다(SLOT_ALIGN).
 "MC-2-14-001": ("가능 여부: Ask if they can talk now"
                 " / 확인: Confirm something you believe is true"
                 " / 용건: Say why you called",
                 "슬롯 1·3이 둘 다 '-을 수 있다'로 겹쳐 있었다 — 확인=-지요?, "
                 "가능 여부=-을 수 있다 로 나누고 세 번째는 상황(전화 용건)으로"),
 # 미션에 '-지 그래요?' 가 떨어질 자리가 없었다. 슬롯 2 '제안' 이 그것이다.
 "MC-5-11-001": ("복장 예절: Explain why you can't wear that"
                 " / 제안: Suggest another outfit / 결정: Decide what to wear",
                 "미션의 '이유'가 '복장 예절'과 같은 것이어서 목표 문법 '-지 그래요?'가 "
                 "떨어질 자리가 없었다 — 슬롯 2 '제안'으로 바꿨다"),
 # 미션에 '-는 대로' 가 떨어질 자리가 없었다. 슬롯 3 '요청'(찾는 대로 연락) 이 그것.
 "MC-5-12-001": ("분실 상황: Explain when and where you lost it"
                 " / 겉모습: Describe the color, shape and what is inside"
                 " / 요청: Ask them to contact you as soon as they find it",
                 "미션이 겉모습·내용물을 둘로 쪼개 목표 문법 '-는 대로'가 떨어질 "
                 "자리가 없었다 — 슬롯대로 합치고 '요청'을 세웠다"),
 # 슬롯 1·2가 모두 간접화법이라 그 문법을 두 번 연습시킨다. 미션의 '추천'은 슬롯 1에 있다.
 "MC-6-03-001": ("전해 들은 정보: Report what you heard and recommend the place"
                 " / 상세 정보: Add more of what you heard about it"
                 " / 반응: Respond modestly or deny lightly",
                 "슬롯 1·2가 모두 간접화법이라 목표 문법을 두 번 쓰게 한다 — "
                 "미션의 '추천'은 슬롯 1에 이미 들어 있었다"),
 # '-는 대신에' 는 선택과 대안을 한 문장에 담는다(차를 가져가는 대신에 지하철을 타세요).
 # 미션이 둘로 쪼개 슬롯 하나에 미션 둘이 붙었다.
 "MC-6-05-001": ("선택: Say what you choose instead of what"
                 " / 이유: Explain why you recommend it"
                 " / 추가 장점: Add another benefit",
                 "'-는 대신에'가 선택과 대안을 한 문장에 담는데 미션이 둘로 쪼갰다"),
 # '-는다는 것이' 는 의도와 결과를 한 문장에 담는다(꼼꼼하게 한다는 것이 시간이 걸렸어요).
 "MC-6-09-001": ("불편: Apologize for the inconvenience you caused"
                 " / 의도: Explain what you meant to do and what happened instead"
                 " / 해결: Say how you will make up for it",
                 "'-는다는 것이'가 의도와 결과를 한 문장에 담는데 미션이 둘로 쪼갰다"),
 # '-을 만하다' 는 상태와 판매 가능성을 한 문장에 담는다(아직 깨끗해서 팔 만해요).
 "MC-6-11-001": ("물건 상태: Describe the condition and whether it is worth selling"
                 " / 가격: Suggest a price or how to get rid of it"
                 " / 확인: Show surprise or confirm what you heard",
                 "'-을 만하다'가 상태와 판매 가능성을 한 문장에 담는데 미션이 둘로 쪼갰다"),
 # 대화 흐름이 추측(-는 모양이다) → 준비(-어 놓다) → 거절 순이다. 미션 순서가 역이었다.
 "MC-6-12-001": ("추측 근거: Guess their situation from what you see"
                 " / 준비: Say what you already arranged"
                 " / 거절: Decline politely with your reason",
                 "대화 흐름(추측→준비→거절)과 미션 순서가 역이었다"),
 # '-다가 보면' 은 반복과 깨달음을 한 문장에 담는다(살다가 보면 적응하게 돼요).
 "MC-7-01-001": ("어려움 강조: Emphasize how hard it was"
                 " / 반복 경험: Say what happens if you keep at it"
                 " / 현재 상태: Say how you are now",
                 "'-다가 보면'이 반복과 깨달음을 한 문장에 담는데 미션이 둘로 쪼갰다"),
 # '아무리 -기로서니' 가 한계선과 기준을 한 문장에 담는다. 미션만 4개였다.
 "MC-8-01-001": ("변화: Acknowledge that attitudes seem to be changing"
                 " / 사회 인식: Say how social attitudes are shifting"
                 " / 한계선: State what should not be excused even so",
                 "'아무리 -기로서니'가 한계선과 기준을 한 문장에 담는데 미션이 4개였다"),
 # 슬롯이 4개인데 미션이 3개여서 '개인 의견' 슬롯이 남았다.
 "MC-8-05-001": ("현실: Describe the unavoidable situation"
                 " / 선택: Explain what could not be chosen"
                 " / 제약: Talk about what you cannot do even though you want to"
                 " / 개인 의견: Share your own view on it",
                 "슬롯 4 '개인 의견'에 대응하는 미션이 없었다"),
 # 라벨만 다르고 뜻이 같다 — 슬롯 쪽 표현으로 맞춘다.
 "MC-8-08-001": ("장점 인정: Acknowledge a positive point"
                 " / 문제 강조: Emphasize another issue"
                 " / 조건 제시: State a condition that doesn't change your view"
                 " / 개인 의견: Say what education should aim for",
                 "'개선 필요성'과 슬롯 '개인 의견'이 같은 것이었다"),
}

# 슬롯 쪽을 고쳐야 하는 것 — 2급은 '1) 라벨 슬롯 - 설명' 형식이다.
SLOT_ALIGN = {
 # 슬롯 1 '가능 여부'와 3 '능력 표현'이 둘 다 '-을 수 있다' 로 겹쳐 있었다.
 # 3번을 상황(전화 용건)으로 돌려 '-지요?' 와 '-을 수 있다' 가 각각 한 자리를 갖게 한다.
 "MC-2-14-001": ("이 대화에는 다음 의미 슬롯이 있다."
   "  1) 가능 여부 슬롯    - 지금 통화할 수 있는지 묻거나 말하기"
   "  2) 확인 슬롯    - 맞다고 생각하는 것을 상대에게 확인하기"
   "  3) 용건 슬롯    - 왜 전화했는지 말하기  ",
   "슬롯 1·3이 둘 다 '-을 수 있다'로 겹쳐 있었다"),
}
