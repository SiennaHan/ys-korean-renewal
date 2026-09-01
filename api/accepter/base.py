from typing import List, Optional
from pydantic import BaseModel
from enum import Enum

CommonResponse = {
    "result" : True,
    "code": 200,
    "message" : "ok",
    "data" : None,
}

def makeResponse(data: object) :
  response = CommonResponse
  response["data"] = data
  return response

def makeError(message: str, code: int = 400) :
    return {
        "result" : False,
        "code": code,
        "message" : message,
        "data" : None,
    }

class ChatItem(BaseModel):
    dialogId: str
    chatId: Optional[int] = None
    msg: str
    lang: str = "Korean"  # 미션 피드백 생성 언어 (check/mission 에서만 사용)

class GuestSign(BaseModel):
    guestId: Optional[str] = None

class TranslateReq(BaseModel):
    text: str
    targetLang: str = 'English'

class ReportItem(BaseModel):
    category: str
    target_id: str
    error_code: Optional[str] = None
    error_msg: Optional[str] = None
    content: Optional[str] = None
    user_id: Optional[str] = None

class GoogleTtsName(Enum):
    female = 'female'
    male   = 'male'

    def getVoice(self):
        if self.value == 'female' :
            return 'ko-KR-Chirp3-HD-Aoede'
        else : 
            return 'ko-KR-Chirp3-HD-Enceladus'

# 제공사 무관 추상 성별 값. 실제 목소리 이름은 business.tts.resolveVoice 가 결정한다.
class TtsVoiceGender(Enum):
    female = 'female'
    male   = 'male'

class UserFlashcardRequest(BaseModel):
    bookId: int
    flashcardId: int
    cardType: str

class UserFlashcardWordRequest(BaseModel):
    flashcardId: int
    cardType: str
    cardId: str
    status: str

class UserFlashcardStatusRequest(BaseModel):
    flashcardId: int
    cardType: str
    status: str

class LoginRequest(BaseModel):
    email: str
    password: str

class MigrateRequest(BaseModel):
    guestId: str


# ── Admin Auth ──

class InquiryRequest(BaseModel):
    """문의 — 답장 주소를 본문에서 받는다. 게스트는 계정 이메일이 없다"""
    replyEmail: str
    topic: str
    message: str
    # 재현 정보 — bug·content 유형(세 칸 화면)에서만 온다. 나머지 유형은 안 보낸다
    actual: Optional[str] = None
    expected: Optional[str] = None
    lang: Optional[str] = None
    fromPath: Optional[str] = None
    # 화면 캡처. `data:image/png;base64,...` 꼴로 최대 3장.
    # png·jpeg·webp 만 받고 **매직 바이트로 다시 확인한다**
    files: Optional[List[str]] = None


class StudentSignupRequest(BaseModel):
    """학생 자체 회원가입 — access_and_pricing_v1 §08 의 1번 · §09 의 4단계

    `AdminSignupRequest` 와 모양이 같아 보이지만 **만드는 계정이 다르다** —
    저쪽은 `role="school_admin"` · `is_approved=False`(어학당 콘솔용)이고
    이쪽은 `role="student"` · 승인 없이 바로 활성이다. 한 모델로 합치면
    그 차이가 안 보여서 다음 사람이 잘못 부른다.
    """
    email: str
    password: str
    name: str
    # 둘러보다 가입하면 그동안 푼 것을 이 계정으로 옮긴다(§07 의 2번).
    # 없으면 그냥 새 계정이다
    guestId: Optional[str] = None


class AdminSignupRequest(BaseModel):
    email: str
    password: str
    name: str

class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str


class WithdrawRequest(BaseModel):
    """탈퇴는 되돌릴 수 없다 — 토큰만으로는 안 되고 비밀번호를 다시 받는다"""
    password: str


# ── School ──

class SchoolCreateRequest(BaseModel):
    school_code: str
    school_name: str
    class_levels: Optional[str] = None

class SchoolUpdateRequest(BaseModel):
    school_code: Optional[str] = None
    school_name: Optional[str] = None
    class_levels: Optional[str] = None


# ── SignupCode (기관 발급 코드) ──
#
# **날짜만 받는다.** 어드민은 "2026-11-30 까지" 를 뜻하고, 그것을 UTC 자정으로
# 저장하면 한국 시간 11월 30일 오전 9시에 막힌다. 그 날 끝까지로 바꾸는 일은
# business 한 곳에서만 한다(`signup_code_business.parseDayRange`).

class SignupCodeCreateRequest(BaseModel):
    school_code: Optional[str] = None   # school_admin 이 보내면 무시하고 자기 학교로 덮는다
    max_uses: int
    expires_on: str                     # "YYYY-MM-DD" — 그 날 끝까지
    starts_on: Optional[str] = None
    label: Optional[str] = None

class SignupCodeUpdateRequest(BaseModel):
    max_uses: Optional[int] = None
    expires_on: Optional[str] = None
    label: Optional[str] = None
    status: Optional[str] = None        # active | paused

class SignupCodeVerifyRequest(BaseModel):
    code: str

class StudentSignupWithCodeRequest(BaseModel):
    """기관 발급 코드로 가입 — `StudentSignupRequest` 에 `code` 가 붙은 것.

    **모델을 합치지 않는다.** `StudentSignupRequest` 는 `school_code` 를 비우는
    것이 계약이고 이쪽은 코드가 정한 학교를 채운다. 같은 모델로 두면 그 차이가
    안 보여서 다음 사람이 잘못 부른다 — `AdminSignupRequest` 와 가른 것과 같은 이유다.

    **`school_code` 는 받지 않는다.** 받으면 누구나 아무 학교 학생이 될 수 있다.
    """
    code: str
    email: str
    password: str
    name: str
    guestId: Optional[str] = None


# ── ClassLevel ──

class ClassLevelCreateRequest(BaseModel):
    label: str

class ClassLevelUpdateRequest(BaseModel):
    label: str


# ── Admin ──

class AdminCreateRequest(BaseModel):
    email: str
    password: str
    name: str
    role: str = "school_admin"
    school_code: Optional[str] = None

class AdminUpdateRequest(BaseModel):
    name: Optional[str] = None
    school_code: Optional[str] = None
    role: Optional[str] = None
    password: Optional[str] = None


# ── Student ──

class StudentItem(BaseModel):
    email: str
    password: str
    name: str
    phone: Optional[str] = None
    student_number: Optional[str] = None
    class_level: Optional[str] = None
    instructor: Optional[str] = None

class StudentBatchRequest(BaseModel):
    school_code: str
    students: List[StudentItem]

class StudentAccessRequest(BaseModel):
    """학교 이용 권한 끊기·되살리기. `ended=True` 가 학기 종료다.

    **`school_code` 를 받지 않는다** — 학교 관리자는 토큰의 학교로 고정된다.
    """
    student_ids: List[int]
    ended: bool

class StudentWithdrawRequest(BaseModel):
    """학생 탈퇴 — **되돌릴 수 없다.** 지우는 범위는 스스로 탈퇴할 때와 같다."""
    student_ids: List[int]

class StudentUpdateRequest(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    student_number: Optional[str] = None
    class_level: Optional[str] = None
    instructor: Optional[str] = None
    school_code: Optional[str] = None


# ── Learning Record ──

class LearningRecordRequest(BaseModel):
    bookId: int
    chapterSeq: int
    menuType: str
    questionId: int
    selectedAnswer: str
    isCorrect: bool
    # 자모만 1~6, 나머지 활동은 0 (dev_spec_v1 §2.1). 옛 클라이언트는 안 보내므로 기본 0 이다
    sub: int = 0
    # 건너뛴 문항. 오답과 다르게 세야 해서 따로 받는다 — 다시 풀기 이유가 skipped 가 된다
    skipped: bool = False
    # **다시 풀기 세션에서 온 것인가.** 서버는 이것을 알 수 없다 —
    # 같은 세션의 재시도와 다시 풀기 세션의 오답이 요청만 보면 똑같다.
    # 명세의 "재오답 → attempts += 1" 은 뒤쪽만 해당하므로 클라이언트가 말해야 한다
    # (dev_spec_v1 §2.3)
    review: bool = False


# ── 활동 상태 (dev_spec_v1 §2.1 · §3) ──

class ActivityEnterRequest(BaseModel):
    bookId: int
    chapterSeq: int
    menuType: str
    sub: int = 0
    totalItems: Optional[int] = None


class ActivityProgressRequest(BaseModel):
    bookId: int
    chapterSeq: int
    menuType: str
    sub: int = 0
    currentItemIndex: int


class ActivityCompleteRequest(BaseModel):
    bookId: int
    chapterSeq: int
    menuType: str
    sub: int = 0
    # 넘기지 않으면 기존 값을 그대로 둔다. 발음처럼 채점하지 않는 활동은
    # ko_learning_record 에 안 남아서 클라이언트가 아는 것이 더 정확하다
    answeredCount: Optional[int] = None
    gradedCount: Optional[int] = None
    correctCount: Optional[int] = None


# ── Game Progress ──

class GameProgressRequest(BaseModel):
    gameName: str
    stageId: str
    score: Optional[int] = None
    extra: Optional[dict] = None
    completed: bool = False


# ── Speech Evaluate ──

class SpeechEvaluateRequest(BaseModel):
    expected: str
    actual: str

class GenerateLineRequest(BaseModel):
    template: str
    context: str = ""

class GenerateScenarioRequest(BaseModel):
    turns: list  # [{"turn_seq": 1, "ko": "...", "speaker": "ai"|"user"}, ...]

class EvaluateFlexibleRequest(BaseModel):
    template: str
    actual: str