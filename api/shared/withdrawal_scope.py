"""탈퇴하면 무엇이 지워지나 — **경계는 이 파일 한 곳에만 있다.**

판정 코드는 이 목록을 돌 뿐 무엇을 지울지 정하지 않는다. 정책이 바뀌면
(예: "결제 기록은 5년 보존") 아래 표만 고친다. 값이 두 곳에 있으면 반드시
갈라진다 — `free_scope.py` 머리말과 같은 이유다.

정본은 `phase1/legal_draft_v1.html` §03 제4조·제6조다.

**왜 지금은 전부 지우나.** 남길 근거가 되는 표가 아직 하나도 없다:

  · 결제가 없다 → 전자상거래법의 보존의무가 걸리는 표가 없다
  · 학습 기록을 남길 근거는 "서비스 품질 개선" 인데 그 범위가 **미정**이다
    (legal_draft §01 의 「전량 보관」)
  · 개인정보 보호법의 기본은 목적을 다하면 **지체 없이 파기**다

그러니 지금 단계에서 안전한 기본값은 "다 지운다" 다. 결제가 붙으면 그때
`ko_payment` 를 예외로 두고 보존기간을 여기 적는다 — **그 전에는 예외가 없다.**

**빈칸 하나** — 탈퇴한 계정의 이메일로 다시 가입할 수 있게 할지는 기획이
정할 값이다. 지금은 행을 지우므로 **다시 가입할 수 있다.** 못 하게 하려면
지운 이메일의 해시를 따로 남겨야 하는데, 그것 자체가 개인정보를 남기는 일이라
근거가 필요하다.
"""
from persistence import model

# 지우는 순서대로. 음성(`ko_stt_shadow`)은 저장소 파일도 함께 지워야 해서
# 판정 코드가 따로 다룬다 — 여기에는 넣지 않는다.
PURGE_MODELS = [
    model.KoChatFeedback,
    model.KoChatMsg,
    model.KoChat,
    model.UserFlashcardWord,
    model.UserFlashcard,
    model.KoLearningRecord,
    model.KoReviewQueue,
    model.KoActivityState,
    model.KoStudySession,
    model.KoDailyActivity,
    model.KoGameProgress,
    model.KoErrorReport,
]

# 문의는 캡처 파일이 딸려 있어 순서가 있다 — 파일 → ko_inquiry_file → ko_inquiry
INQUIRY_MODEL = model.KoInquiry

# ── 저장소에 파일이 딸린 표 둘 ─────────────────────────────────
# **행을 지우기 전에 파일을 먼저 지운다.** 반대로 하면 주소를 잃어버려
# S3 에 파일만 남는다 — 지워야 할 것이 조용히 살아남는 쪽이 더 나쁘다
# (`business/stt.pruneShadow` 가 같은 규칙으로 돈다).
#
# 둘 다 **비공개 버킷**이지만 남으면 안 되는 것은 마찬가지다. 문의 캡처는
# 학습자가 자기 화면을 찍어 보낸 것이라 이름·이메일·학습 기록이 그대로 담긴다.

# 학습자 음성. `audio_url` 이 주소다
AUDIO_MODEL = model.KoSttShadow

# 문의에 붙인 화면 캡처. **user_id 가 없다** — `ko_inquiry.id` 로 매달려 있어서
# 문의를 지우기 전에 그 문의의 파일부터 찾아 지워야 한다
INQUIRY_FILE_MODEL = model.KoInquiryFile
