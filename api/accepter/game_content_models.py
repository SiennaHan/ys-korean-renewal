"""Pydantic models for /game-content/* request bodies.

Convention:
- `Create` models: all fields required (FastAPI returns 422 if missing).
- `Update` models: all fields Optional; combined with `model_dump(exclude_unset=True)`
  for partial PATCH semantics.
- Custom validators reject obvious bad data: hex colors, level ranges, JSON shape.

Routes with path params for the PK (e.g. `/friends/{id}`) do NOT include the PK
in the Update model — the path param is the source of truth.
"""
from __future__ import annotations

import re
from typing import Optional, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


HEX_COLOR = re.compile(r"^#[0-9A-Fa-f]{6}$")


def _validateHex(v: str) -> str:
    if not HEX_COLOR.match(v):
        raise ValueError("색상은 #RRGGBB 형식이어야 합니다")
    return v


# ─── spring-picnic ──────────────────────────────────────


class _MultilingualHint(BaseModel):
    """Spring picnic question hint must cover the 5 student-facing languages."""

    model_config = ConfigDict(extra="forbid")
    ko: str
    en: str
    zh: str
    ja: str
    vi: str


class SpringPicnicFriendCreate(BaseModel):
    id: str = Field(..., min_length=1, max_length=20)
    face: str = Field(..., min_length=1, max_length=10)
    name: str = Field(..., min_length=1, max_length=50)
    bg: str
    cats: list[str] = Field(..., min_length=1)
    mission: str = Field(..., min_length=1, max_length=100)
    desc: str = Field(..., max_length=200)
    desc2: str = Field(..., max_length=200)
    sort_order: int = 0

    @field_validator("bg")
    @classmethod
    def _bgHex(cls, v):
        return _validateHex(v)


class SpringPicnicFriendUpdate(BaseModel):
    face: Optional[str] = Field(default=None, min_length=1, max_length=10)
    name: Optional[str] = Field(default=None, min_length=1, max_length=50)
    bg: Optional[str] = None
    cats: Optional[list[str]] = Field(default=None, min_length=1)
    mission: Optional[str] = Field(default=None, min_length=1, max_length=100)
    desc: Optional[str] = Field(default=None, max_length=200)
    desc2: Optional[str] = Field(default=None, max_length=200)
    sort_order: Optional[int] = None

    @field_validator("bg")
    @classmethod
    def _bgHex(cls, v):
        return _validateHex(v) if v is not None else v


class SpringPicnicQuestionCreate(BaseModel):
    id: str = Field(..., min_length=1, max_length=20)
    cat: str = Field(..., min_length=1, max_length=50)
    level: int = Field(..., ge=1, le=3)
    il: str = Field(..., min_length=1, max_length=10)
    hint: _MultilingualHint
    num: str = Field(..., min_length=1, max_length=50)
    tmpl: str = Field(..., min_length=1, max_length=200)
    tts: str = Field(..., min_length=1, max_length=200)
    correct: str = Field(..., min_length=1, max_length=50)
    wrong: list[str] = Field(..., min_length=1)
    sort_order: int = 0

    @field_validator("tmpl")
    @classmethod
    def _hasBlank(cls, v):
        if "___" not in v:
            raise ValueError("템플릿에 빈칸 표시 '___'가 있어야 합니다")
        return v


class SpringPicnicQuestionUpdate(BaseModel):
    cat: Optional[str] = Field(default=None, min_length=1, max_length=50)
    level: Optional[int] = Field(default=None, ge=1, le=3)
    il: Optional[str] = Field(default=None, min_length=1, max_length=10)
    hint: Optional[_MultilingualHint] = None
    num: Optional[str] = Field(default=None, min_length=1, max_length=50)
    tmpl: Optional[str] = Field(default=None, min_length=1, max_length=200)
    tts: Optional[str] = Field(default=None, min_length=1, max_length=200)
    correct: Optional[str] = Field(default=None, min_length=1, max_length=50)
    wrong: Optional[list[str]] = Field(default=None, min_length=1)
    sort_order: Optional[int] = None

    @field_validator("tmpl")
    @classmethod
    def _hasBlank(cls, v):
        if v is None:
            return v
        if "___" not in v:
            raise ValueError("템플릿에 빈칸 표시 '___'가 있어야 합니다")
        return v


# ─── particle-sniper ──────────────────────────────────────


class ParticleSniperLevelCreate(BaseModel):
    id: str = Field(..., min_length=1, max_length=20)
    summary: str = Field(..., min_length=1, max_length=500)
    color: str
    accent: str
    sort_order: int = 0

    @field_validator("color", "accent")
    @classmethod
    def _hex(cls, v):
        return _validateHex(v)


class ParticleSniperLevelUpdate(BaseModel):
    summary: Optional[str] = Field(default=None, min_length=1, max_length=500)
    color: Optional[str] = None
    accent: Optional[str] = None
    sort_order: Optional[int] = None

    @field_validator("color", "accent")
    @classmethod
    def _hex(cls, v):
        return _validateHex(v) if v is not None else v


class _ParticleQuestion(BaseModel):
    model_config = ConfigDict(extra="allow")
    sentence: str = Field(..., min_length=1)
    blank: str = Field(..., min_length=1)
    answer: str = Field(..., min_length=1)
    choices: list[str] = Field(..., min_length=2)
    sourceLesson: str = Field(..., min_length=1)


class ParticleSniperLessonCreate(BaseModel):
    level: str = Field(..., min_length=1, max_length=20)
    lesson_name: str = Field(..., min_length=1, max_length=20)
    new_particles: list[str]
    cumulative_particles: list[str]
    questions: list[_ParticleQuestion]
    sort_order: int = 0


class ParticleSniperLessonUpdate(BaseModel):
    level: Optional[str] = Field(default=None, min_length=1, max_length=20)
    lesson_name: Optional[str] = Field(default=None, min_length=1, max_length=20)
    new_particles: Optional[list[str]] = None
    cumulative_particles: Optional[list[str]] = None
    questions: Optional[list[_ParticleQuestion]] = None
    sort_order: Optional[int] = None


# ─── card-sort ──────────────────────────────────────


class CardSortCategoryCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    color: str
    sort_order: int = 0

    @field_validator("color")
    @classmethod
    def _hex(cls, v):
        return _validateHex(v)


class CardSortCategoryUpdate(BaseModel):
    color: Optional[str] = None
    sort_order: Optional[int] = None

    @field_validator("color")
    @classmethod
    def _hex(cls, v):
        return _validateHex(v) if v is not None else v


class CardSortVocabCreate(BaseModel):
    grade: str = Field(..., min_length=1, max_length=20)
    lesson: str = Field(..., min_length=1, max_length=20)
    new_categories: list[str]
    words: dict[str, list[str]]
    sort_order: int = 0


class CardSortVocabUpdate(BaseModel):
    grade: Optional[str] = Field(default=None, min_length=1, max_length=20)
    lesson: Optional[str] = Field(default=None, min_length=1, max_length=20)
    new_categories: Optional[list[str]] = None
    words: Optional[dict[str, list[str]]] = None
    sort_order: Optional[int] = None


class CardSortRareCreate(BaseModel):
    word: str = Field(..., min_length=1, max_length=50)
    category: str = Field(..., min_length=1, max_length=50)
    confusable_with: Optional[str] = Field(default=None, max_length=200)
    sort_order: int = 0


class CardSortRareUpdate(BaseModel):
    category: Optional[str] = Field(default=None, min_length=1, max_length=50)
    confusable_with: Optional[str] = Field(default=None, max_length=200)
    sort_order: Optional[int] = None


# ─── seoul-puzzle ──────────────────────────────────────


class _SeoulEntryMessage(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: Literal["friend", "self"]
    text: str = Field(..., min_length=1)
    # 언어별 번역. 화면의 🌐 가 앱 언어를 따라 고른다(en/ja/zh/vi — 한국어는 text 자체다).
    # 없어도 받는다 — 옛 데이터에는 이 키가 없고, 그때는 🌐 가 안 나온다.
    t: Optional[dict[str, str]] = None


class SeoulPuzzleLocationCreate(BaseModel):
    id: str = Field(..., min_length=1, max_length=30)
    name: str = Field(..., min_length=1, max_length=50)
    num: int = Field(..., ge=1)
    x: int
    y: int
    unit: str = Field(..., min_length=1, max_length=50)
    desc: str = Field(..., min_length=1, max_length=200)
    grammar: list[str]
    entryMessages: list[_SeoulEntryMessage]
    sort_order: int = 0


class SeoulPuzzleLocationUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=50)
    num: Optional[int] = Field(default=None, ge=1)
    x: Optional[int] = None
    y: Optional[int] = None
    unit: Optional[str] = Field(default=None, min_length=1, max_length=50)
    desc: Optional[str] = Field(default=None, min_length=1, max_length=200)
    grammar: Optional[list[str]] = None
    entryMessages: Optional[list[_SeoulEntryMessage]] = None
    sort_order: Optional[int] = None


class SeoulPuzzleStepCreate(BaseModel):
    location_id: str = Field(..., min_length=1, max_length=30)
    step_index: int = Field(..., ge=0)
    data: dict


class SeoulPuzzleStepUpdate(BaseModel):
    location_id: Optional[str] = Field(default=None, min_length=1, max_length=30)
    step_index: Optional[int] = Field(default=None, ge=0)
    data: Optional[dict] = None


# ─── vocashot ──────────────────────────────────────


class _VocashotVocabItem(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    category: Optional[str] = None
    image: Optional[str] = None
    english: Optional[str] = None
    answer: str = Field(..., min_length=1)
    wrong: list[str] = Field(default_factory=list)


class VocashotPresetCreate(BaseModel):
    id: str = Field(..., min_length=1, max_length=50)
    label: str = Field(..., min_length=1, max_length=100)
    vocab: list[_VocashotVocabItem]
    sort_order: int = 0


class VocashotPresetUpdate(BaseModel):
    label: Optional[str] = Field(default=None, min_length=1, max_length=100)
    vocab: Optional[list[_VocashotVocabItem]] = None
    sort_order: Optional[int] = None
