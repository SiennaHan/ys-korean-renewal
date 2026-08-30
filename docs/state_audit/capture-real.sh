# 실제 제품 라우트 캡처. 비로그인 둘러보기로 열리는 것만 담는다.
# 언어는 앱 기본값(localStorage 없음 → en)이다.
set -e
cd "$(dirname "$0")"
R() { python3 capture.py "real__$1" x --app "$2" ${3:+--w "$3"}; }
J="/learn/jamo?level=1&lesson=1&group=1&sub="
R jamo_speak        "${J}1"
R jamo_combine      "${J}2"
R jamo_wordrep      "${J}3"
R jamo_readwrite    "${J}4"
R jamo_listen       "${J}5"
R jamo_combine3     "/learn/jamo?level=1&lesson=3&group=1&sub=6"
R chat_briefing     "/learn/mission-chat?level=1&lesson=4"
R role              "/learn/roleplay?level=1&lesson=4"
R flash             "/learn/flashcard?level=1&lesson=4"
R word              "/learn/word?level=1&lesson=4"
R read              "/learn/read?level=1&lesson=4"
R listen            "/learn/listen?level=1&lesson=4"
R grammar           "/learn/grammar?level=1&lesson=4"
R jamo_readwrite__320 "${J}4" 320
