# -*- coding: utf-8 -*-
"""1급 미션 키워드 정정 + 프롬프트 수정.

전량 대조를 1급부터 시작한다. 미션 라벨·지시에서 세 종류가 나왔다:
 (1) 라벨과 영어 지시가 뒤바뀐 것 — 1-4, 1-5
 (2) 두 미션이 사실상 같은 것 — 1-6, 1-13, 1-14
 (3) HTML 엔티티 오염 — 1-9
(2)는 셋 다 교재 어휘·상황이 요구하는 요소가 대신 빠져 있었다. 중복을 지우고
그 자리를 교재가 요구하는 것으로 채운다.
"""

MISSION_FIX = {
 # 라벨↔지시 뒤바뀜. 대화 순서(인사→이름→직업)에 맞게 라벨을 바로잡는다.
 "MC-1-04-001": ("인사: Say hello. / 이름: Say what your name is. / 직업: Say what your job is.",
                 "라벨과 영어 지시가 뒤바뀌어 있었다(이름↔인사)"),
 "MC-1-05-001": ("인사: Say hello. / 이름: Say what your name is. / 나라: Say what your nationality is.",
                 "라벨과 영어 지시가 뒤바뀌어 있었다(이름↔인사)"),

 # '누구의 것(Express possession)'과 '사람(Talk about who something belongs to)'이
 # 같은 것을 두 번 말했다. 목표 문법 '이/그/저'가 떨어질 미션이 없었으므로 그 자리에 넣는다.
 # 교재 듣기: '이것이 영주 씨 가방이에요?' / '저것은 영주 씨 볼펜이에요?'
 "MC-1-06-001": ("물건: Talk about things around you"
                 " / 누구의 것: Express possession (mine, yours, his/her)"
                 " / 가리키기: Point out which one you mean (this, that, that over there)",
                 "'사람'이 '누구의 것'과 중복이었다. 목표 문법 '이/그/저'가 떨어질 "
                 "자리가 없었으므로 그 자리에 넣었다"),

 # '&#13;' 오염 제거.
 "MC-1-09-001": ("고향: Talk about your hometown / 날씨: Describe the weather"
                 " / 어떻다: Describe what the place is like(beautiful, quiet, busy, etc.)",
                 "'날씨' 지시문에 HTML 엔티티 &#13; 가 붙어 있었다"),

 # '활동(Say what you want to do)'과 '계획(Say what you want to do in the future)'이
 # 중복. 상황이 '주말에 만날 약속을 해요'인데 날짜·요일 미션이 없었다 —
 # 어휘가 요일·월·며칠로 가득하고 교재 듣기도 '이번 수요일이 몇 월 며칠이에요?'로 묻는다.
 "MC-1-13-001": ("장소: Say where you want to go / 활동: Say what you want to do"
                 " / 날짜: Say what day or date you will meet",
                 "'계획'이 '활동'과 중복이었다. 상황이 '약속을 해요'인데 날짜 미션이 "
                 "없었다 — 어휘 요일·월·며칠, 교재 듣기 '몇 월 며칠이에요?'"),

 # '물건(Say what you buy)'과 '사다(Talk about buying things)'가 중복.
 # 어휘에 싸다·비싸다·값이 있는데 값 미션이 없었다.
 "MC-1-14-001": ("장소: Talk about places you go to shop or visit / 물건: Say what you buy"
                 " / 값: Say if things are cheap or expensive",
                 "'사다'가 '물건'과 중복이었다. 어휘 '싸다·비싸다·값'이 향하는 "
                 "값 미션이 없었으므로 그 자리에 넣었다"),
}
