"""회원 탈퇴 — 계정과 그 계정이 만든 것을 지운다.

**무엇을 지우는지는 여기서 정하지 않는다.** `shared/withdrawal_scope.py` 가
정본이고 이 파일은 그 목록을 돌 뿐이다. 정책이 바뀌면 그쪽만 고친다.

정본 문서는 `phase1/legal_draft_v1.html` §03 제6조 — "열람·정정·삭제·처리정지를
요구할 수 있고 탈퇴할 수 있습니다". 전에는 그 문장을 적을 수가 없었다.
앱에 탈퇴하는 길이 없었기 때문이다(2026-08-27 까지 코드에 0곳).

**되돌릴 수 없다.** 그래서 비밀번호를 다시 받는다 — 토큰만 믿으면 남의 기기를
잠깐 만진 사람이 계정을 지울 수 있다.
"""
from business.auth_business import verifyPassword
from persistence import repo_user
from persistence.database import sessionScope
from shared import withdrawal_scope
from util import s3utils


async def _deleteObjects(urls):
    """저장소 파일을 지우고 **성공한 것의 주소만** 돌려준다.

    실패한 것은 행을 남겨야 한다 — 행을 먼저 지우면 주소를 잃어 파일만 살아남는다.
    """
    ok, failed = [], 0
    for url in urls:
        if not url:
            continue
        try:
            await s3utils.delete_object(url)
            ok.append(url)
        except Exception as e:
            failed += 1
            print(f"[withdraw] 파일 삭제 실패 — {url} {e!r}")
    return ok, failed


async def withdrawAccount(userId: str, password: str):
    """계정을 지운다. 지운 행 수를 표별로 돌려준다."""
    with sessionScope() as db:
        user = await repo_user.findById(int(userId), db)
        if not user:
            return None, "사용자를 찾을 수 없습니다."
        if not verifyPassword(password, user.password_hash):
            return None, "비밀번호가 올바르지 않습니다."
        # 세션 밖에서 읽으면 DetachedInstanceError 다 — 필요한 것만 값으로 뽑는다
        guestId = user.guest_id

    uid = str(userId)
    # 게스트로 쓰던 시절의 행이 남아 있을 수 있다. 가입할 때 옮기지만
    # **옮기는 목록이 표 아홉뿐**이라 나머지는 게스트 id 로 남는다(BLOCKERS).
    # 탈퇴는 그것까지 지운다 — 안 지우면 사람과 끊긴 채 데이터만 살아남는다.
    ids = [uid] + ([guestId] if guestId else [])

    deleted = {}
    fileFailed = 0

    # ── ① 음성. 파일 먼저, 그다음 행 ──
    A = withdrawal_scope.AUDIO_MODEL
    with sessionScope() as db:
        rows = db.query(A).filter(A.user_id.in_(ids)).all()
        targets = [(r.id, r.audio_url) for r in rows]
    okUrls, failed = await _deleteObjects([u for _, u in targets])
    fileFailed += failed
    okSet = set(okUrls)
    okIds = [i for i, u in targets if (not u) or (u in okSet)]
    with sessionScope() as db:
        n = db.query(A).filter(A.id.in_(okIds)).delete(synchronize_session=False) if okIds else 0
    deleted[A.__tablename__] = n

    # ── ② 문의. 캡처 파일 → 파일 행 → 문의 행 ──
    Q, F = withdrawal_scope.INQUIRY_MODEL, withdrawal_scope.INQUIRY_FILE_MODEL
    with sessionScope() as db:
        inquiryIds = [r.id for r in db.query(Q.id).filter(Q.user_id.in_(ids)).all()]
        keys = (
            [r.s3_key for r in db.query(F.s3_key).filter(F.inquiry_id.in_(inquiryIds)).all()]
            if inquiryIds else []
        )
    _, failed = await _deleteObjects(keys)
    fileFailed += failed
    with sessionScope() as db:
        if inquiryIds:
            deleted[F.__tablename__] = db.query(F).filter(
                F.inquiry_id.in_(inquiryIds)
            ).delete(synchronize_session=False)
            deleted[Q.__tablename__] = db.query(Q).filter(
                Q.id.in_(inquiryIds)
            ).delete(synchronize_session=False)
        else:
            deleted[F.__tablename__] = 0
            deleted[Q.__tablename__] = 0

    # ── ③ 나머지 표 ──
    with sessionScope() as db:
        for M in withdrawal_scope.PURGE_MODELS:
            deleted[M.__tablename__] = db.query(M).filter(
                M.user_id.in_(ids)
            ).delete(synchronize_session=False)

    # ── ④ 계정. 맨 마지막이다 ──
    # 앞이 실패해 예외로 빠져도 계정은 남아 다시 시도할 수 있다.
    # 계정을 먼저 지우면 남은 행을 누구 것인지 알 길이 없어진다.
    with sessionScope() as db:
        await repo_user.deleteUser(int(userId), db)
    deleted["ko_user"] = 1

    return {"deleted": deleted, "file_delete_failed": fileFailed}, None
