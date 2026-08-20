from sqlalchemy import Boolean, Column, Integer, String, DateTime, Text, func, ForeignKey
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
    __tablename__  = "ko_daily_activity"
    id             = Column(Integer,      nullable=False, primary_key=True, autoincrement=True)
    user_id        = Column(String(45),   nullable=False, index=True)
    activity_date  = Column(String(10),   nullable=False)
    study_seconds  = Column(Integer,      nullable=False, default=0)
    modules_done   = Column(Integer,      nullable=False, default=0)
    words_learned  = Column(Integer,      nullable=False, default=0)
    last_book_id   = Column(Integer,      nullable=True)
    last_chapter_seq = Column(Integer,    nullable=True)
    last_menu_type = Column(String(20),   nullable=True)
    created_at     = Column(DateTime,     nullable=False, default=func.utc_timestamp())
    updated_at     = Column(DateTime,     nullable=False, default=func.utc_timestamp(), onupdate=func.utc_timestamp())


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
