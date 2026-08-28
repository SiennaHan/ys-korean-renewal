"""탈퇴하면 무엇이 지워지나 — **경계는 이 파일 한 곳에만 있다.**

판정 코드는 이 목록을 돌 뿐 무엇을 지울지 정하지 않는다. 정책이 바뀌면
(예: "결제 기록은 5년 보존") 아래 표만 고친다. 값이 두 곳에 있으면 반드시
갈라진다 — `free_scope.py` 머리말과 같은 이유다.

정본은 `docs/legal_draft_v1.html` §03 제4조·제6조다.

**왜 지금은 전부 지우나.** 남길 근거가 되는 표가 아직 하나도 없다:

  · 결제가 없다 → 전자상거래법의 보존의무가 걸리는 표가 없다
  · 학습 기록을 남길 근거는 "서비스 품질 개선" 인데 그 범위가 **미정**이다
    (legal_draft §01 의 「전량 보관」)
  · 개인정보 보호법의 기본은 목적을 다하면 **지체 없이 파기**다

그러니 지금 단계에서 안전한 기본값은 "다 지운다" 다. 결제가 붙으면 그때
`ko_payment` 를 예외로 두고 보존기간을 여기 적는다.

**예외가 하나 있다 — 지우는 대신 사람만 지우는 표다.** `ANONYMIZE_MODELS`
(지금은 `ko_signup_code_use` 하나). 보존기간을 두는 것이 아니라 개인 연결을
끊는 것이라 위 논리와 어긋나지 않는다 — 까닭은 그 목록 위에 적었다.

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

# ── 지우지 않고 **개인 연결만 끊는** 표 ────────────────────────
#
# 행은 남기고 `user_id` 만 NULL 로 비운다. **위 표들과 규칙이 다르므로
# 여기 따로 적는다** — 목록을 하나로 합치면 "다 지운다" 가 거짓이 된다.
#
# 지금 여기 있는 것은 `ko_signup_code_use` 하나뿐이고, 기획이 2026-08-28 에
# 골랐다. 이유는 셋이다:
#
#   ① **그 표의 존재 이유가 바로 이 경우다.** 모델 docstring 이 따로 두는 까닭으로
#      「학생이 탈퇴하면 `ko_user` 행이 사라져 흔적이 없어진다」를 든다.
#      지우면 자기 존재 이유를 자기가 지운다
#   ② **좌석 회계가 영구히 어긋난다.** 탈퇴해도 자리는 안 돌려주므로
#      (`ko_signup_code.used_count` 는 1로 남는다 — BLOCKERS §10 의 확정)
#      행을 지우면 `countUses()` 가 0 을 내고 둘을 맞춰 볼 근거가 사라진다
#   ③ **남는 값이 개인정보가 아니다.** `code_id` · `school_code` · `used_at` 뿐이라
#      사람을 가리키지 않는다. 그래서 제4조의 파기 약속과 부딪히지 않는다 —
#      대신 조문에 그 한 줄을 적어 두었다(`legal_draft_v1.html` 제4조)
#
# **NULL 이지 0 이 아니다.** `uq_signup_code_user(code_id, user_id)` 가 걸려 있고
# MySQL 은 유니크 인덱스에서 NULL 을 서로 다른 값으로 본다. 묘비값을 쓰면 같은
# 코드로 가입한 둘째 탈퇴자가 중복키로 터진다.
#
# **여기에 표를 더할 때 확인할 것** — `user_id` 가 `nullable=True` 인가.
# 아니면 모델과 마이그레이션을 먼저 고쳐야 한다
# (`migration_signup_code_use_anonymize.sql` 이 그 예다).
ANONYMIZE_MODELS = [
    model.KoSignupCodeUse,
]

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
