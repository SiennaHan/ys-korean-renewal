set -e
cd "$(dirname "$0")"
S() { python3 capture.py "$1" "$2" --w "$3" ${4:+--lang "$4"} ${5:+--budget "$5"}; }
# 320 폭 — 요청서 §6 위험 상태
S activity__reading_long__320__ko  상태-감사-정본-아님--읽기-긴선택지 320
S activity__progress_many__320__ko 활동-컴포넌트--진행막대-16칸이상 320
S activity__speak_recorded__320__ko 활동-컴포넌트--자모발음-녹음완료 320
S activity__role_recorded__320__ko 활동-컴포넌트--롤플레잉-녹음완료 320
S activity__chat_recording__320__ko 상태-감사-정본-아님--미션대화-녹음중 320
S activity__readwrite__320__ko     활동-컴포넌트--단어읽고쓰기 320
S activity__result__320__ko        활동-컴포넌트--결과 320
# 영어 — 요청서 §6
S activity__speak_preparing__360__en 상태-감사-정본-아님--녹음-준비중 360 en
S activity__speak_finishing__360__en 상태-감사-정본-아님--녹음-마무리중 360 en
S activity__speak_recorded__360__en  활동-컴포넌트--자모발음-녹음완료 360 en
S activity__micdenied__360__en       활동-컴포넌트--마이크거부 360 en
S activity__result__360__en          활동-컴포넌트--결과 360 en
S activity__chat__360__en            활동-컴포넌트--미션대화 360 en
S activity__role_recorded__360__en   활동-컴포넌트--롤플레잉-녹음완료 360 en
