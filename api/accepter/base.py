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

class AdminSignupRequest(BaseModel):
    email: str
    password: str
    name: str

class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str


# ── School ──

class SchoolCreateRequest(BaseModel):
    school_code: str
    school_name: str
    class_levels: Optional[str] = None

class SchoolUpdateRequest(BaseModel):
    school_code: Optional[str] = None
    school_name: Optional[str] = None
    class_levels: Optional[str] = None


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