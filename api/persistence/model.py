from sqlalchemy import Boolean, Column, Integer, String, DateTime, Text, func, ForeignKey
from sqlalchemy import Index, SmallInteger, UniqueConstraint
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class KoChatDialog(Base) :
    __tablename__  = "ko_chat_dialog"
    id             = Column(Integer,      nullable=False, primary_key=True)
    book_id        = Column(Integer,      nullable=False, index=True)
    prompt         = Column(Text,         nullable=False)
    first_msg      = Column(String(500),  nullable=False)
    mission        = Column(String(500),  nullable=False)
    scenario       = Column(String(500),  nullable=False)
    level          = Column(String(10),  nullable=False)

class KoTtsCache(Base) :
    __tablename__  = "ko_tts_cache"
    # sha256(voice + "::" + text) — 텍스트/목소리가 바뀌면 키도 바뀌므로 캐시버스팅이 자동 처리됨
    hash           = Column(String(64),   nullable=False, primary_key=True)
    voice          = Column(String(20),   nullable=False)
    # 듣기 지문 라인은 최대 1309자(SENTENCE_TEXT_MAX 2000) — String(500)이면
    # strict MySQL 에서 upsert 가 DataError 로 실패해 캐시가 저장되지 않는다
    text           = Column(Text,         nullable=False)
    url            = Column(String(500),  nullable=False)
    created_at     = Column(DateTime,     nullable=False, default=func.utc_timestamp())
    updated_at     = Column(DateTime,     nullable=False, default=func.utc_timestamp(), onupdate=func.utc_timestamp())

class KoSttShadow(Base) :
    __tablename__  = "ko_stt_shadow"
    id             = Column(Integer,      nullable=False, primary_key=True, autoincrement=True)
    user_id        = Column(String(45),   nullable=True, index=True)
    audio_url      = Column(String(500),  nullable=True)
    openai_text    = Column(String(500),  nullable=True)
    openai_model   = Column(String(50),   nullable=True)
    rtzr_text      = Column(String(500),  nullable=True)
    rtzr_model     = Column(String(50),   nullable=True)
    tutorus_text   = Column(String(500),  nullable=True)
    tutorus_model  = Column(String(50),   nullable=True)
    openai_ms      = Column(Integer,      nullable=True)
    rtzr_ms        = Column(Integer,      nullable=True)
    tutorus_ms     = Column(Integer,      nullable=True)
    is_match       = Column(Boolean,      nullable=True)
    # 불일치 유형: match / ortho(표기·자소차이) / content(내용차이) / na(openai 실패)
    diff_kind      = Column(String(10),   nullable=True)
    openai_error   = Column(String(300),  nullable=True)
    rtzr_error     = Column(String(300),  nullable=True)
    tutorus_error  = Column(String(300),  nullable=True)
    created_at     = Column(DateTime,     nullable=False, default=func.utc_timestamp())

class KoChat(Base) :
    __tablename__  = "ko_chat"
    id             = Column(Integer,      nullable=False, primary_key=True, autoincrement=True)
    user_id        = Column(String(45),   nullable=False, index=True)
    book_id        = Column(Integer,      nullable=False, index=True)
    dialog_id      = Column(String(10),   nullable=False, default=False)
    idx            = Column(Integer,      nullable=False, default=False)
    summary        = Column(String(200),  nullable=False)
    created_at     = Column(DateTime,     nullable=False, default=func.utc_timestamp())
    updated_at     = Column(DateTime,     nullable=False, default=func.utc_timestamp(), onupdate=func.utc_timestamp())
    is_deleted     = Column(Boolean,      nullable=False, default=False)
    deleted_at     = Column(DateTime,     nullable=True)
    status         = Column(String(10),   nullable=True)
    report         = Column(String(2000), nullable=True)
    completed_missions = Column(String(200), nullable=True)

class KoChatMsg(Base) :
    __tablename__  = "ko_chat_msg"
    id             = Column(Integer,      nullable=False, primary_key=True, autoincrement=True)
    chat_id        = Column(Integer,      ForeignKey("ko_chat.id"), nullable=False)
    user_id        = Column(String(50),   nullable=False)
    question       = Column(String(5000), nullable=False)
    answer         = Column(String(5000), nullable=False)
    created_at     = Column(DateTime,     nullable=False, default=func.utc_timestamp())

class KoChatFeedback(Base) :
    __tablename__  = "ko_chat_feedback"
    id             = Column(Integer,      nullable=False, primary_key=True, autoincrement=True)
    chat_id        = Column(Integer,      ForeignKey("ko_chat.id"), nullable=False)
    user_id        = Column(String(50),   nullable=False)
    question       = Column(String(5000), nullable=False)
    answer         = Column(String(5000), nullable=False)
    created_at     = Column(DateTime,     nullable=False, default=func.utc_timestamp())

class KoErrorReport(Base) :
    __tablename__  = "ko_error_report"
    id             = Column(Integer,      nullable=False, primary_key=True, autoincrement=True)
    category       = Column(String(50),   nullable=False)
    target_id      = Column(String(10),   nullable=False)
    error_code     = Column(String(10),   nullable=True)
    error_msg      = Column(String(500),  nullable=True)
    content        = Column(String(500),  nullable=True)
    user_id        = Column(String(50),   nullable=True)
    created_at     = Column(DateTime,     nullable=False, default=func.utc_timestamp())


class UserFlashcard(Base) :
    __tablename__  = "ko_user_flashcard"
    id             = Column(Integer,      nullable=False, primary_key=True, autoincrement=True)
    user_id        = Column(String(45),   nullable=False, index=True)
    book_id        = Column(Integer,      nullable=False, index=True)
    flashcard_id   = Column(Integer,      nullable=False, index=True)
    card_type      = Column(String(2),    nullable=False, index=True)
    known          = Column(Integer,      nullable=False, default=0)
    unknown        = Column(Integer,      nullable=False, default=0)
    status         = Column(String(10),   nullable=False, default='new')
    updated_at     = Column(DateTime,     nullable=False, default=func.utc_timestamp(), onupdate=func.utc_timestamp())

class UserFlashcardWord(Base) :
    __tablename__  = "ko_user_flashcard_word"
    id             = Column(Integer,      nullable=False, primary_key=True, autoincrement=True)
    user_id        = Column(String(45),   nullable=False, index=True)
    flashcard_id   = Column(Integer,      nullable=False, index=True)
    card_type      = Column(String(2),    nullable=False, index=True)
    card_id        = Column(String(10),   nullable=False, index=True)
    status         = Column(String(10),   nullable=False)
    updated_at     = Column(DateTime,     nullable=False, default=func.utc_timestamp(), onupdate=func.utc_timestamp())


class KoClassLevel(Base) :
    __tablename__  = "ko_class_level"
    id             = Column(Integer,      nullable=False, primary_key=True, autoincrement=True)
    school_id      = Column(Integer,      nullable=False, index=True)
    label          = Column(String(50),   nullable=False)
    created_at     = Column(DateTime,     nullable=False, default=func.utc_timestamp())
    updated_at     = Column(DateTime,     nullable=False, default=func.utc_timestamp(), onupdate=func.utc_timestamp())


class KoSchool(Base) :
    __tablename__  = "ko_school"
    id             = Column(Integer,      nullable=False, primary_key=True, autoincrement=True)
    school_code    = Column(String(20),   nullable=False, unique=True, index=True)
    school_name    = Column(String(100),  nullable=False)
    class_levels   = Column(String(200),  nullable=True)
    created_at     = Column(DateTime,     nullable=False, default=func.utc_timestamp())
    updated_at     = Column(DateTime,     nullable=False, default=func.utc_timestamp(), onupdate=func.utc_timestamp())


class KoLearningRecord(Base) :
    __tablename__  = "ko_learning_record"
    id             = Column(Integer,      nullable=False, primary_key=True, autoincrement=True)
    user_id        = Column(String(45),   nullable=False, index=True)
    book_id        = Column(Integer,      nullable=False, index=True)
    chapter_seq    = Column(Integer,      nullable=False)
    menu_type      = Column(String(20),   nullable=False, index=True)
    question_id    = Column(Integer,      nullable=False)
    selected_answer = Column(String(50),  nullable=True)
    is_correct     = Column(Boolean,      nullable=False, default=False)
    created_at     = Column(DateTime,     nullable=False, default=func.utc_timestamp())
    updated_at     = Column(DateTime,     nullable=False, default=func.utc_timestamp(), onupdate=func.utc_timestamp())


class KoStudySession(Base) :
    __tablename__  = "ko_study_session"
    id             = Column(Integer,      nullable=False, primary_key=True, autoincrement=True)
    user_id        = Column(String(45),   nullable=False, index=True)
    session_date   = Column(String(10),   nullable=False)
    started_at     = Column(DateTime,     nullable=False, default=func.utc_timestamp())
    last_ping_at   = Column(DateTime,     nullable=False, default=func.utc_timestamp())
    duration_sec   = Column(Integer,      nullable=False, default=0)


class KoQrVisitor(Base) :
    __tablename__  = "ko_qr_visitor"
    fingerprint_hash = Column(String(64), nullable=False, primary_key=True)
    first_seen_at  = Column(DateTime,     nullable=False, default=func.utc_timestamp())


class KoQrScan(Base) :
    __tablename__  = "ko_qr_scan"
    id             = Column(Integer,      nullable=False, primary_key=True, autoincrement=True)
    tracking_id    = Column(String(36),   nullable=False, unique=True, index=True)
    scanned_at     = Column(DateTime,     nullable=False, default=func.utc_timestamp(), index=True)
    access_url     = Column(String(1000), nullable=False, default="unknown")
    ip_address     = Column(String(64),   nullable=False)
    geo_country    = Column(String(100),  nullable=True)
    geo_city       = Column(String(100),  nullable=True)
    user_agent     = Column(String(1000), nullable=False)
    fingerprint_hash = Column(String(64), nullable=False, index=True)
    is_unique      = Column(Boolean,      nullable=False, default=False, index=True)
    redirect_result = Column(String(30),  nullable=False, default="pending", index=True)


class KoDailyActivity(Base) :
    """하루 한 줄. 홈의 주간 학습 시간 · 스트릭 · 이어하기가 여기서 나온다.

    **행이 있다 ≠ 공부했다.** 이 행은 학습 세션 핑이 만든다 — 활동 화면에 들어가면
    즉시 한 번 돈다(`use-study-session-ping.ts`). 그래서 아무것도 안 풀고 열어만
    봐도 행이 생긴다. 스트릭이 이 행의 존재로 판정되던 때에는 **열기만 해도
    스트릭이 올랐다.** `responded` 가 그 둘을 가른다.
    """
    __tablename__  = "ko_daily_activity"
    id             = Column(Integer,      nullable=False, primary_key=True, autoincrement=True)
    user_id        = Column(String(45),   nullable=False, index=True)
    activity_date  = Column(String(10),   nullable=False)
    study_seconds  = Column(Integer,      nullable=False, default=0)
    modules_done   = Column(Integer,      nullable=False, default=0)
    words_learned  = Column(Integer,      nullable=False, default=0)
    # **그날 문항에 응답하고 채점 결과까지 봤나** — 스트릭의 기준이다
    # (기획 확정 2026-08-27 · shell_spec §1). 화면은 채점한 뒤에
    # `saveLearningRecord` 를 부르므로, 그 호출이 곧 "응답 + 결과 확인" 이다.
    # 건너뛰기는 학습 기록을 안 만들므로 여기도 안 켜진다.
    responded      = Column(Boolean,      nullable=False, default=False)
    last_book_id   = Column(Integer,      nullable=True)
    last_chapter_seq = Column(Integer,    nullable=True)
    last_menu_type = Column(String(20),   nullable=True)
    created_at     = Column(DateTime,     nullable=False, default=func.utc_timestamp())
    updated_at     = Column(DateTime,     nullable=False, default=func.utc_timestamp(), onupdate=func.utc_timestamp())
    __table_args__ = (
        # 하루 한 줄. `migration_dashboard.sql` 은 처음부터 이 키를 걸어 뒀는데
        # **모델에는 없어서**, DB 를 어떻게 만들었느냐에 따라 스키마가 갈렸다
        # (`createAllTables()` 로 만든 DB 에는 없었다 — 2026-08-27 실측).
        # 없으면 `ensureExists` 의 읽고-쓰기 사이에 요청이 겹쳐 하루가 두 줄이 되고,
        # 학습 시간이 두 줄로 갈려 주간 차트가 실제보다 적게 나온다.
        UniqueConstraint("user_id", "activity_date", name="uq_user_date"),
    )


class KoGameProgress(Base) :
    __tablename__  = "ko_game_progress"
    id             = Column(Integer,      nullable=False, primary_key=True, autoincrement=True)
    user_id        = Column(String(45),   nullable=False, index=True)
    game_name      = Column(String(50),   nullable=False, index=True)
    stage_id       = Column(String(50),   nullable=False)
    score          = Column(Integer,      nullable=True)
    extra_data     = Column(Text,         nullable=True)
    completed_at   = Column(DateTime,     nullable=True)
    created_at     = Column(DateTime,     nullable=False, default=func.utc_timestamp())
    updated_at     = Column(DateTime,     nullable=False, default=func.utc_timestamp(), onupdate=func.utc_timestamp())


class KoUser(Base) :
    __tablename__  = "ko_user"
    id             = Column(Integer,      nullable=False, primary_key=True, autoincrement=True)
    email          = Column(String(100),  nullable=False, unique=True, index=True)
    password_hash  = Column(String(200),  nullable=False)
    name           = Column(String(50),   nullable=False)
    role           = Column(String(20),   nullable=False, index=True)  # master_admin, school_admin, student
    school_code    = Column(String(20),   nullable=True, index=True)
    phone          = Column(String(20),   nullable=True)
    student_number = Column(String(20),   nullable=True)
    class_level    = Column(String(10),   nullable=True)
    instructor     = Column(String(50),   nullable=True)
    guest_id       = Column(String(50),   nullable=True, index=True)
    is_approved    = Column(Boolean,      nullable=False, default=False)
    is_active      = Column(Boolean,      nullable=False, default=True)
    created_at     = Column(DateTime,     nullable=False, default=func.utc_timestamp())
    updated_at     = Column(DateTime,     nullable=False, default=func.utc_timestamp(), onupdate=func.utc_timestamp())


class KoSignupCode(Base) :
    """기관 발급 코드 한 장. 학교가 어드민에서 찍고 학생이 앱에서 넣는다.

    **`ko_school.school_code` 와 다른 것이다.** 그쪽은 학교의 이름표라 안 바뀌고
    재사용되는데, 이 표의 `code` 는 수량과 기한이 붙은 일회성 배포물이다.
    그래서 표 이름을 `ko_school_code` 로 짓지 않았다 — 헷갈리면 사고가 난다.

    `code` 의 UNIQUE 가 두 일을 겸한다 — 학생 검증의 조회 경로이자
    발급 경합의 심판이다. 생성은 「조회하고 없으면 삽입」이 아니라
    **삽입해 보고 IntegrityError 면 다시 만든다.**
    """
    __tablename__     = "ko_signup_code"
    id                = Column(Integer,      nullable=False, primary_key=True, autoincrement=True)
    # 이름을 직접 준다 — `unique=True, index=True` 로 두면 SQLAlchemy 가
    # `ix_ko_signup_code_code` 를 만들고 마이그레이션 SQL 과 이름이 갈린다
    code              = Column(String(16),   nullable=False)
    school_code       = Column(String(20),   nullable=False)  # ko_school.school_code. FK 아님 — ko_user 와 같은 관례
    label             = Column(String(100),  nullable=True)   # 발급자 메모 — "2026 봄학기 1급 A반"
    max_uses          = Column(Integer,      nullable=False)
    used_count        = Column(Integer,      nullable=False, default=0)
    starts_at         = Column(DateTime,     nullable=True)   # NULL 이면 즉시 유효
    expires_at        = Column(DateTime,     nullable=False)  # 지나면 **입장만** 막는다
    status            = Column(String(10),   nullable=False, default="active")  # active | paused | revoked
    issued_by_user_id = Column(Integer,      nullable=False)
    issued_by_role    = Column(String(20),   nullable=False)  # 발급 당시 역할을 박제한다
    created_at        = Column(DateTime,     nullable=False, default=func.utc_timestamp())
    updated_at        = Column(DateTime,     nullable=False, default=func.utc_timestamp(), onupdate=func.utc_timestamp())
    __table_args__ = (
        # 학생 검증의 조회 경로이자 발급 경합의 심판이다
        UniqueConstraint("code", name="uq_signup_code_code"),
        # 어드민 목록은 늘 "우리 학교 것을 최신순" 이다. 두 칸 복합이라 정렬까지 덮는다
        Index("ix_signup_code_school", "school_code", "created_at"),
        Index("ix_signup_code_issuer", "issued_by_user_id"),
        # status 단독 인덱스는 만들지 않는다 — 값이 셋뿐이라 선택도가 없다
    )


class KoSignupCodeUse(Base) :
    """누가 언제 그 코드로 가입했나.

    **`used_count` 는 파생값이고 이 표가 정본이다.** 따로 두는 이유 셋 —
    ① `ko_user` 만 보면 엑셀로 등록된 학생과 코드로 가입한 학생이 구별되지 않는다
    ② 학생이 탈퇴하면 `ko_user` 행이 사라져 흔적이 없어진다
    ③ 카운터가 어긋났을 때 맞춰 볼 근거가 된다
    """
    __tablename__  = "ko_signup_code_use"
    id             = Column(Integer,      nullable=False, primary_key=True, autoincrement=True)
    code_id        = Column(Integer,      nullable=False)   # 인덱스는 아래에서 이름을 직접 준다
    user_id        = Column(Integer,      nullable=False)   # ko_user.id
    school_code    = Column(String(20),   nullable=False)   # 가입 당시 값의 스냅샷
    used_at        = Column(DateTime,     nullable=False, default=func.utc_timestamp())
    __table_args__ = (
        # 한 계정은 한 번만 쓴다. 논리적으로 하나여야 하는 것은 DB 가 지키게 한다
        UniqueConstraint("code_id", "user_id", name="uq_signup_code_user"),
        Index("ix_signup_code_use_code", "code_id"),
    )


class KoSignupCodeAttempt(Base) :
    """코드 시도 로그 — 무차별 대입을 막는 실체.

    **프로세스 메모리로는 못 센다.** `start.sh` 가 `gunicorn -w 4` 라
    한도가 실효 4배가 되고 배포마다 초기화된다.

    **시도한 코드 값은 저장하지 않는다.** 저장하면 이 표가 곧 유효 코드 목록의
    부분집합이 된다. 차단 판정과 공격 탐지에는 성패 여부만 있으면 된다.
    `ip_hash` 는 `business/qr_tracking.py` 의 `_hash`(HMAC-SHA256) 결과다.
    """
    __tablename__  = "ko_signup_code_attempt"
    id             = Column(Integer,      nullable=False, primary_key=True, autoincrement=True)
    ip_hash        = Column(String(64),   nullable=False)
    ok             = Column(Boolean,      nullable=False, default=False)
    tried_at       = Column(DateTime,     nullable=False, default=func.utc_timestamp())
    __table_args__ = (
        Index("ix_signup_code_attempt_ip_time", "ip_hash", "tried_at"),
    )


class KoSpringPicnicFriend(Base) :
    __tablename__  = "ko_spring_picnic_friend"
    id             = Column(String(20),   nullable=False, primary_key=True)
    face           = Column(String(10),   nullable=False)
    name           = Column(String(50),   nullable=False)
    bg             = Column(String(10),   nullable=False)
    cats           = Column(Text,         nullable=False)
    mission        = Column(String(100),  nullable=False)
    description    = Column(String(200),  nullable=False)
    description2   = Column(String(200),  nullable=False)
    sort_order     = Column(Integer,      nullable=False, default=0)
    created_at     = Column(DateTime,     nullable=False, default=func.utc_timestamp())
    updated_at     = Column(DateTime,     nullable=False, default=func.utc_timestamp(), onupdate=func.utc_timestamp())


class KoSpringPicnicQuestion(Base) :
    __tablename__  = "ko_spring_picnic_question"
    id             = Column(String(20),   nullable=False, primary_key=True)
    cat            = Column(String(50),   nullable=False, index=True)
    level          = Column(Integer,      nullable=False, index=True)
    il             = Column(String(10),   nullable=False)
    hint           = Column(Text,         nullable=False)
    num            = Column(String(50),   nullable=False)
    tmpl           = Column(String(200),  nullable=False)
    tts            = Column(String(200),  nullable=False)
    correct        = Column(String(50),   nullable=False)
    wrong          = Column(Text,         nullable=False)
    sort_order     = Column(Integer,      nullable=False, default=0)
    created_at     = Column(DateTime,     nullable=False, default=func.utc_timestamp())
    updated_at     = Column(DateTime,     nullable=False, default=func.utc_timestamp(), onupdate=func.utc_timestamp())


class KoParticleSniperLevel(Base) :
    __tablename__  = "ko_particle_sniper_level"
    id             = Column(String(20),   nullable=False, primary_key=True)
    summary        = Column(String(500),  nullable=False)
    color          = Column(String(10),   nullable=False)
    accent         = Column(String(10),   nullable=False)
    sort_order     = Column(Integer,      nullable=False, default=0)
    created_at     = Column(DateTime,     nullable=False, default=func.utc_timestamp())
    updated_at     = Column(DateTime,     nullable=False, default=func.utc_timestamp(), onupdate=func.utc_timestamp())


class KoParticleSniperLesson(Base) :
    __tablename__  = "ko_particle_sniper_lesson"
    id             = Column(Integer,      nullable=False, primary_key=True, autoincrement=True)
    level          = Column(String(20),   nullable=False, index=True)
    lesson_name    = Column(String(20),   nullable=False)
    new_particles  = Column(Text,         nullable=False)
    cumulative_particles = Column(Text,   nullable=False)
    questions      = Column(Text,         nullable=False)
    sort_order     = Column(Integer,      nullable=False, default=0)
    created_at     = Column(DateTime,     nullable=False, default=func.utc_timestamp())
    updated_at     = Column(DateTime,     nullable=False, default=func.utc_timestamp(), onupdate=func.utc_timestamp())


class KoCardSortCategory(Base) :
    __tablename__  = "ko_card_sort_category"
    name           = Column(String(50),   nullable=False, primary_key=True)
    color          = Column(String(10),   nullable=False)
    sort_order     = Column(Integer,      nullable=False, default=0)
    created_at     = Column(DateTime,     nullable=False, default=func.utc_timestamp())
    updated_at     = Column(DateTime,     nullable=False, default=func.utc_timestamp(), onupdate=func.utc_timestamp())


class KoCardSortVocab(Base) :
    __tablename__  = "ko_card_sort_vocab"
    id             = Column(Integer,      nullable=False, primary_key=True, autoincrement=True)
    grade          = Column(String(20),   nullable=False, index=True)
    lesson         = Column(String(20),   nullable=False)
    new_categories = Column(Text,         nullable=False)
    words          = Column(Text,         nullable=False)
    sort_order     = Column(Integer,      nullable=False, default=0)
    created_at     = Column(DateTime,     nullable=False, default=func.utc_timestamp())
    updated_at     = Column(DateTime,     nullable=False, default=func.utc_timestamp(), onupdate=func.utc_timestamp())


class KoCardSortRareExample(Base) :
    __tablename__  = "ko_card_sort_rare_example"
    word           = Column(String(50),   nullable=False, primary_key=True)
    category       = Column(String(50),   nullable=False)
    confusable_with = Column(String(200), nullable=True)
    sort_order     = Column(Integer,      nullable=False, default=0)
    created_at     = Column(DateTime,     nullable=False, default=func.utc_timestamp())
    updated_at     = Column(DateTime,     nullable=False, default=func.utc_timestamp(), onupdate=func.utc_timestamp())


class KoSeoulPuzzleLocation(Base) :
    __tablename__  = "ko_seoul_puzzle_location"
    id             = Column(String(30),   nullable=False, primary_key=True)
    name           = Column(String(50),   nullable=False)
    num            = Column(Integer,      nullable=False)
    x              = Column(Integer,      nullable=False)
    y              = Column(Integer,      nullable=False)
    unit           = Column(String(50),   nullable=False)
    description    = Column(String(200),  nullable=False)
    grammar        = Column(Text,         nullable=False)
    entry_messages = Column(Text,         nullable=False)
    sort_order     = Column(Integer,      nullable=False, default=0)
    created_at     = Column(DateTime,     nullable=False, default=func.utc_timestamp())
    updated_at     = Column(DateTime,     nullable=False, default=func.utc_timestamp(), onupdate=func.utc_timestamp())


class KoSeoulPuzzleStep(Base) :
    __tablename__  = "ko_seoul_puzzle_step"
    id             = Column(Integer,      nullable=False, primary_key=True, autoincrement=True)
    location_id    = Column(String(30),   nullable=False, index=True)
    step_index     = Column(Integer,      nullable=False)
    data           = Column(Text,         nullable=False)
    created_at     = Column(DateTime,     nullable=False, default=func.utc_timestamp())
    updated_at     = Column(DateTime,     nullable=False, default=func.utc_timestamp(), onupdate=func.utc_timestamp())


class KoVocashotPreset(Base) :
    __tablename__  = "ko_vocashot_preset"
    id             = Column(String(50),   nullable=False, primary_key=True)
    label          = Column(String(100),  nullable=False)
    vocab          = Column(Text,         nullable=False)
    sort_order     = Column(Integer,      nullable=False, default=0)
    created_at     = Column(DateTime,     nullable=False, default=func.utc_timestamp())
    updated_at     = Column(DateTime,     nullable=False, default=func.utc_timestamp(), onupdate=func.utc_timestamp())


class KoInquiry(Base) :
    """문의 — 학습자가 보내는 글. 슬랙으로도 꽂히지만 **정본은 이 표다.**

    전화를 두지 않는다(이용자 상당수가 국외다). 답장을 보내려면 이메일이
    있어야 하는데 **게스트는 계정이 없다** — 그래서 `reply_email` 을 따로 받는다.
    로그인한 사람은 계정 이메일이 기본으로 채워지지만 고칠 수 있다.
    """
    __tablename__  = "ko_inquiry"
    id             = Column(Integer,      nullable=False, primary_key=True, autoincrement=True)
    # 로그인 사용자면 user id, 게스트면 게스트 id. 익명 문의는 받지 않는다(토큰은 있다)
    user_id        = Column(String(50),   nullable=False, index=True)
    # 답장 받을 주소. 게스트도 답을 받으려면 적어야 한다
    reply_email    = Column(String(100),  nullable=False)
    # 화면에서 고른 갈래 — 결제 · 계정 · 학습 내용 · 오류 · 그 밖
    topic          = Column(String(30),   nullable=False, index=True)
    message        = Column(String(2000), nullable=False)
    # 어느 언어로 썼나. 답장을 그 언어로 하기 위해서다
    lang           = Column(String(5),    nullable=True)
    # 어느 화면에서 보냈나. 재현에 쓴다
    from_path      = Column(String(200),  nullable=True)
    # 슬랙에 꽂혔나. 실패해도 문의는 남는다 — 나중에 다시 보낼 수 있게 표시만 한다
    notified       = Column(Boolean,      nullable=False, default=False, index=True)
    status         = Column(String(20),   nullable=False, default="open", index=True)
    created_at     = Column(DateTime,     nullable=False, default=func.utc_timestamp(), index=True)


class KoInquiryFile(Base) :
    """문의에 붙인 화면 캡처.

    **비공개 S3 에 둔다.** 학습자가 자기 화면을 찍어 보내는 것이라 이름·이메일·
    학습 기록이 그대로 담길 수 있다. 공개 읽기로 두면 주소를 아는 사람이 다 본다
    (2026-08-27 에 음성에서 겪은 일이다 — BLOCKERS).

    `s3_key` 는 URL 이 아니라 **키**다. 볼 때 `s3utils.presign` 으로 짧게 사는
    주소를 만든다.
    """
    __tablename__  = "ko_inquiry_file"
    id             = Column(Integer,      nullable=False, primary_key=True, autoincrement=True)
    inquiry_id     = Column(Integer,      ForeignKey("ko_inquiry.id"), nullable=False, index=True)
    s3_key         = Column(String(300),  nullable=False)
    mime           = Column(String(50),   nullable=False)
    # 올린 크기(바이트). 나중에 보관 용량을 세거나 한도를 조절할 때 쓴다
    bytes          = Column(Integer,      nullable=False, default=0)
    created_at     = Column(DateTime,     nullable=False, default=func.utc_timestamp())


class KoActivityState(Base) :
    """활동 상태 — dev_spec_v1 §2.1

    전에는 활동 완료를 ko_learning_record 건수와 content_counts.TOTAL_QUESTIONS 를
    비교해 매번 계산했다. 명시 상태와 이어하기 위치가 필요해 별도 표로 올린다.

    **미학습은 행이 없는 것으로 표현한다** — state 에 'not_started' 를 두지 않는다
    (G2 §9: 화면에도 표기하지 않는다).

    sub 가 키에 있는 이유 — 자모는 menu_type 이 'jamo' 하나인데 하위활동이 여섯이다
    (/learn/jamo?sub=1~6). sub 가 없으면 여섯이 한 행을 공유해서 하나를 끝내면
    나머지도 완료로 보이고 이어하기 위치가 서로 덮인다. menu_type 을 jamo-1~6 으로
    쪼개지 않는 이유는 그러면 ko_learning_record·ko_daily_activity·content_counts 의
    키가 전부 여섯 배로 늘기 때문이다. **NULL 이 아니라 0 인 이유**는 MySQL 이
    UNIQUE 키에서 NULL 중복을 허용해서, NULL 로 두면 자모 아닌 활동의 유니크가
    무력해진다.

    "복습 권장" 은 컬럼이 아니다 — 완료의 하위 표시이므로 ko_review_queue 에 그
    활동 소속 항목이 남았는지로 판정한다. 상태를 두 곳에 쓰면 어긋난다.
    """
    __tablename__      = "ko_activity_state"
    id                 = Column(Integer,      nullable=False, primary_key=True, autoincrement=True)
    user_id            = Column(String(45),   nullable=False, index=True)
    book_id            = Column(Integer,      nullable=False)
    chapter_seq        = Column(Integer,      nullable=False)
    # 라우트는 개칭했지만 저장 값은 그대로다 — fill-blank · listen-answer · read-answer
    # (dev_spec §2.2. 값을 바꾸면 기존 학습 기록이 통째로 미아가 된다)
    menu_type          = Column(String(20),   nullable=False)
    state              = Column(String(16),   nullable=False, default="in_progress")
    sub                = Column(SmallInteger, nullable=False, default=0)
    current_item_index = Column(Integer,      nullable=False, default=0)
    total_items        = Column(Integer,      nullable=True)
    # 응답한 문항 수. 진행률의 분자. 정오답 무관하고 발음도 센다.
    # 건너뛴 문항과 녹음 없이 넘긴 발음 문항은 세지 않는다
    answered_count     = Column(Integer,      nullable=False, default=0)
    # 채점 대상 수. 정답률의 분모. 발음(자모 sub=1·3)과 플래시카드는 0 → 화면에 "—"
    graded_count       = Column(Integer,      nullable=False, default=0)
    # 첫 시도 기준. 재시도로 맞힌 것은 세지 않는다(셸 명세 S1 · BLOCKERS §6-c)
    correct_count      = Column(Integer,      nullable=False, default=0)
    completed_at       = Column(DateTime,     nullable=True)
    created_at         = Column(DateTime,     nullable=False, default=func.utc_timestamp())
    updated_at         = Column(DateTime,     nullable=False, default=func.utc_timestamp(), onupdate=func.utc_timestamp())

    __table_args__ = (
        UniqueConstraint(
            "user_id", "book_id", "chapter_seq", "menu_type", "sub", name="uq_state"
        ),
    )


class KoReviewQueue(Base) :
    """다시 풀기 목록 — dev_spec_v1 §2.3

    첫 시도 오답·건너뜀·"몰라요" 가 들어온다. **재시도로 맞혀도 남는다** — 예약도
    첫 시도 기준이다(셸 명세 S1).

    available_at 은 오답 다음 날 KST 00:00 이다. 홈 목록은 그 시각이 지난 것만 내고,
    결과 화면의 [다시 풀기] 는 이 값을 무시하고 바로 낸다 — 같은 날 재출제를 막는
    것은 홈 쪽뿐이다.
    """
    __tablename__  = "ko_review_queue"
    id             = Column(Integer,      nullable=False, primary_key=True, autoincrement=True)
    user_id        = Column(String(45),   nullable=False)
    book_id        = Column(Integer,      nullable=False)
    chapter_seq    = Column(Integer,      nullable=False)
    menu_type      = Column(String(20),   nullable=False)
    sub            = Column(SmallInteger, nullable=False, default=0)
    # Phase 1 은 기존 체계를 그대로 쓴다. item_id 이관은 Phase 2 다
    question_id    = Column(Integer,      nullable=False)
    # wrong | skipped | unknown(플래시카드 "몰라요")
    reason         = Column(String(16),   nullable=False)
    attempts       = Column(Integer,      nullable=False, default=1)
    available_at   = Column(DateTime,     nullable=False)
    created_at     = Column(DateTime,     nullable=False, default=func.utc_timestamp())
    updated_at     = Column(DateTime,     nullable=False, default=func.utc_timestamp(), onupdate=func.utc_timestamp())

    __table_args__ = (
        UniqueConstraint(
            "user_id", "book_id", "chapter_seq", "menu_type", "sub", "question_id",
            name="uq_queue",
        ),
        Index("ix_user_avail", "user_id", "available_at"),
    )
