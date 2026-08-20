from contextlib import contextmanager
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, scoped_session
from dotenv import load_dotenv
import os
import urllib.parse

load_dotenv(override=True)

user = os.environ.get('DB_USER')
password = os.environ.get('DB_PASSWORD')
encoded_password = urllib.parse.quote_plus(password) if password else ""

host = os.environ.get('DB_HOST')
port = os.environ.get('DB_PORT')
database = os.environ.get('DB_NAME')

echo = False
if os.environ.get('LOG_LEVEL') == "debug" :
    echo = True

DB_URL = f"mysql+mysqlconnector://{user}:{encoded_password}@{host}:{port}/{database}" #?zeroDateTimeBehavior=convertToNull&allowMultiQueries=true&serverTimezone=Asia/Seoul&useSSL=false&characterEncoding=utf8

ENGINE = create_engine(
    DB_URL,
    echo=echo,
    pool_size=30,
    pool_recycle=500,
    max_overflow=30,
    pool_pre_ping=True,
    connect_args={"connect_timeout": 5, "read_timeout": 10, "write_timeout": 10},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=ENGINE)


def createAllTables():
    """서버 시작 시 호출 — 존재하지 않는 테이블만 자동 생성 (기존 테이블 변경 없음).

    gunicorn 환경에서는 여러 워커가 동시에 호출하므로 MySQL의 GET_LOCK으로
    DDL을 직렬화한다. 락을 얻지 못한 워커는 잠시 대기 후 has_table만 수행하므로
    create_all은 사실상 no-op이 된다.

    추가 안전망: error 1684 (concurrent DDL) 발생 시 짧은 backoff로 재시도.
    """
    import time
    from persistence.model import Base

    LOCK_NAME = "koreanapi_ddl"
    LOCK_TIMEOUT_SEC = 30

    with ENGINE.connect() as conn:
        # 다른 워커가 DDL 중이면 여기서 대기
        conn.execute(text("SELECT GET_LOCK(:name, :t)"), {"name": LOCK_NAME, "t": LOCK_TIMEOUT_SEC})
        try:
            last_err = None
            for attempt in range(5):
                try:
                    Base.metadata.create_all(bind=ENGINE)
                    return
                except Exception as e:
                    last_err = e
                    # MySQL 1684: 다른 세션이 DDL 중. 짧게 대기 후 재시도.
                    if "1684" not in str(e):
                        raise
                    time.sleep(0.5 * (2 ** attempt))
            if last_err is not None:
                raise last_err
        finally:
            conn.execute(text("SELECT RELEASE_LOCK(:name)"), {"name": LOCK_NAME})

@contextmanager
def sessionScope():
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except:
        db.rollback()
        raise
    finally:
        db.close()