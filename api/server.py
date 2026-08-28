import os 
import uvicorn

from uvicorn.config import LOGGING_CONFIG
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# from slowapi import _rate_limit_exceeded_handler
# from slowapi.errors import RateLimitExceeded
# from slowapi.middleware import SlowAPIMiddleware

from accepter import chat_accepter, user_accepter, root_accepter, tts_accepter, dialog_accepter, stt_accepter, report_accepter, flashcard_accepter
from accepter import auth_accepter, admin_accepter, school_accepter, student_accepter, learning_record_accepter, signup_code_accepter
from accepter import dashboard_accepter, study_session_accepter, speech_accepter, game_progress_accepter
from accepter import spring_picnic_accepter, particle_sniper_accepter, card_sort_accepter, seoul_puzzle_accepter, vocashot_accepter
from accepter import qr_accepter
from accepter import activity_accepter, review_queue_accepter, entitlement_accepter, inquiry_accepter
from persistence.database import createAllTables

load_dotenv(override=True)

app = FastAPI(
    title="Korean common API Server",
    description="This system provides an API for communication with Korean A.I.",
    version="0.1.0",
)

origins = [
    "http://localhost",
    "http://localhost:8000",
    "http://localhost:8001",
    "http://localhost:3000",
    "http://localhost:3001",
    "https://korean.pulleyai.co.kr",
    "https://admin.korean.pulleyai.co.kr",
    "https://korean-five.vercel.app",
]

# app.state.limiter = limiter
# app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
# app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://([a-z0-9-]+\.)+pulleyai\.co\.kr|http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(
    root_accepter.router, tags=["root"], responses={404: {"description": "File Not found"}},
)

app.include_router(
    user_accepter.router, prefix="/user", tags=["user"], responses={404: {"description": "File Not found"}},
)

app.include_router(
    chat_accepter.router, prefix="/chat", tags=["chat"], responses={404: {"description": "File Not found"}},
)

app.include_router(
    dialog_accepter.router, prefix="/dialog", tags=["dialog"], responses={404: {"description": "File Not found"}},
)

app.include_router(
    flashcard_accepter.router, prefix="/flashcard", tags=["flashcard"], responses={404: {"description": "File Not found"}},
)

app.include_router(
    report_accepter.router, prefix="/report", tags=["report"], responses={404: {"description": "File Not found"}},
)

app.include_router(
    stt_accepter.router, prefix="/stt", tags=["stt"], responses={404: {"description": "File Not found"}},
)

app.include_router(
    tts_accepter.router,
    prefix="/tts",
    tags=["tts"],
    responses={404: {"description": "File Not found"}},
)

app.include_router(
    auth_accepter.router, prefix="/auth", tags=["auth"], responses={404: {"description": "Not found"}},
)

app.include_router(
    admin_accepter.router, prefix="/admin", tags=["admin"], responses={404: {"description": "Not found"}},
)

app.include_router(
    school_accepter.router, prefix="/school", tags=["school"], responses={404: {"description": "Not found"}},
)

app.include_router(
    student_accepter.router, prefix="/student", tags=["student"], responses={404: {"description": "Not found"}},
)

app.include_router(
    signup_code_accepter.router, prefix="/signup-code", tags=["signup-code"], responses={404: {"description": "Not found"}},
)

app.include_router(
    learning_record_accepter.router, prefix="/learning-record", tags=["learning-record"], responses={404: {"description": "Not found"}},
)

app.include_router(
    dashboard_accepter.router, prefix="/dashboard", tags=["dashboard"], responses={404: {"description": "Not found"}},
)

# 활동 상태와 다시 풀기 — dev_spec_v1 §2.1 · §2.3 · §3
app.include_router(
    activity_accepter.router, prefix="/activity", tags=["activity"], responses={404: {"description": "Not found"}},
)

app.include_router(
    review_queue_accepter.router, prefix="/review-queue", tags=["review-queue"], responses={404: {"description": "Not found"}},
)
app.include_router(
    entitlement_accepter.router, prefix="/entitlement", tags=["entitlement"], responses={404: {"description": "Not found"}},
)
app.include_router(
    inquiry_accepter.router, prefix="/inquiry", tags=["inquiry"], responses={404: {"description": "Not found"}},
)

app.include_router(
    study_session_accepter.router, prefix="/study-session", tags=["study-session"], responses={404: {"description": "Not found"}},
)

app.include_router(
    speech_accepter.router, prefix="/speech", tags=["speech"], responses={404: {"description": "Not found"}},
)

app.include_router(
    game_progress_accepter.router, prefix="/game-progress", tags=["game-progress"], responses={404: {"description": "Not found"}},
)

app.include_router(
    spring_picnic_accepter.router, prefix="/game-content/spring-picnic", tags=["game-content"], responses={404: {"description": "Not found"}},
)

app.include_router(
    particle_sniper_accepter.router, prefix="/game-content/particle-sniper", tags=["game-content"], responses={404: {"description": "Not found"}},
)

app.include_router(
    card_sort_accepter.router, prefix="/game-content/card-sort", tags=["game-content"], responses={404: {"description": "Not found"}},
)

app.include_router(
    seoul_puzzle_accepter.router, prefix="/game-content/seoul-puzzle", tags=["game-content"], responses={404: {"description": "Not found"}},
)

app.include_router(
    vocashot_accepter.router, prefix="/game-content/vocashot", tags=["game-content"], responses={404: {"description": "Not found"}},
)

app.include_router(
    qr_accepter.router, prefix="/qr", tags=["qr"], responses={404: {"description": "Not found"}},
)

# --- [TUTORUS] BEGIN --- 발음평가 도입 검증용. 제거 시 이 블록만 삭제하면 된다.
# .env 의 TUTORUS_KORPRON_URL 이 없으면 발음평가 라우터를 등록하지 않는다.
from xternal import tutorus as _tutorus

if _tutorus.PRONUNCIATION_ENABLED:
    from accepter import tutorus_accepter

    app.include_router(
        tutorus_accepter.router, prefix="/tutorus", tags=["tutorus"], responses={404: {"description": "Not found"}},
    )
    print("[TUTORUS] 발음평가 라우터 등록됨 (/tutorus)")
else:
    print("[TUTORUS] 발음평가 비활성 — KORPRON 설정 없음")
# --- [TUTORUS] END ---

# 서버 시작 시 누락된 테이블 자동 생성
createAllTables()

# start server
if __name__ == '__main__' :
    ADDRESS = os.environ.get('SERVER_ADDRESS')
    PORT = os.environ.get('SERVER_PORT')
    LOG_LEVEL = os.environ.get('LOG_LEVEL')
    
    print(f"[Started] {app.title}")
    
    LOGGING_CONFIG["formatters"]["access"]["fmt"] = '%(asctime)s %(levelprefix)s %(client_addr)s - "%(request_line)s" %(status_code)s'
    LOGGING_CONFIG["formatters"]["default"]["fmt"] = "%(asctime)s %(levelprefix)s %(message)s"

    uvicorn.run(app,
        # "__main__:app",
        host=ADDRESS,
        port=int(PORT),
        log_level=LOG_LEVEL,
        log_config=LOGGING_CONFIG,
        proxy_headers=True,
        forwarded_allow_ips="*",
        # workers=8
    )
