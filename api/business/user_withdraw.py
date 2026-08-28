"""회원 탈퇴 — 계정과 그 계정이 만든 것을 지운다.

**무엇을 지우는지는 여기서 정하지 않는다.** `shared/withdrawal_scope.py` 가
정본이고 이 파일은 그 목록을 돌 뿐이다. 정책이 바뀌면 그쪽만 고친다.

정본 문서는 `docs/legal_draft_v1.html` §03 제6조 — "열람·정정·삭제·처리정지를
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
    """학생이 스스로 탈퇴한다. 비밀번호로 본인을 확인한다."""
    with sessionScope() as db:
        user = await repo_user.findById(int(userId), db)
        if not user:
            return None, "사용자를 찾을 수 없습니다."
        if not verifyPassword(password, user.password_hash):
            return None, "비밀번호가 올바르지 않습니다."
        # 세션 밖에서 읽으면 DetachedInstanceError 다 — 필요한 것만 값으로 뽑는다
        guestId = user.guest_id

    return await purgeAccount(userId, guestId)


async def withdrawByAdmin(userId: str):
    """관리자가 학생을 탈퇴시킨다 — **비밀번호를 확인하지 않는다.**

    관리자는 학생의 비밀번호를 모르므로 본인 확인을 할 수가 없다. 대신
    **누구를 지울 수 있는지를 부르는 쪽이 이미 가려 놓는다** —
    `student_business.checkStudentSchool` 이 학생 역할과 학교 소속을 본다.

    지우는 범위는 스스로 탈퇴할 때와 **똑같다**(`purgeAccount`). 학교가 지웠다고
    덜 지우면 개인정보가 남고, 더 지울 것도 없다.

    **기본은 이것이 아니라 접근 끊기다**(기획 2026-08-28) — 다음 학기에 재등록할
    학생의 풀이 데이터는 남겨 두는 것이 맞다. 이 길은 "너무 오래 안 들어온 학생을
    정리해야 할 때" 를 위한 것이다.
    """
    with sessionScope() as db:
        user = await repo_user.findById(int(userId), db)
        if not user:
            return None, "학생을 찾을 수 없습니다."
        if user.role != "student":
            return None, "학생만 탈퇴시킬 수 있습니다."
        guestId = user.guest_id

    return await purgeAccount(userId, guestId)


async def purgeAccount(userId: str, guestId: str = None):
    """계정과 그 계정이 만든 것을 지운다. 표별로 손댄 행 수를 돌려준다.

    **본인 확인은 여기서 하지 않는다** — 부르는 쪽이 이미 했다
    (`withdrawAccount` 는 비밀번호로, `withdrawByAdmin` 은 학교 소속으로).

    **한 갈래는 지우는 것이 아니다.** `ANONYMIZE_MODELS` 의 표는 행을 남기고
    `user_id` 만 비운다 — 돌려주는 `deleted` 에서 「(user_id 비움)」이 붙은
    항목이 그것이다. 세는 수의 뜻이 다르므로 이름으로 갈라 둔다.
    """
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
    #
    # **음성과 같은 규칙이다** — 저장소에서 못 지운 파일은 행을 남긴다. 처음에는
    # 여기만 실패해도 행을 지웠는데(2026-08-27 에 진짜 DB 로 굴려 보다 찾았다),
    # 그러면 열쇠를 아는 유일한 행이 사라져 **비공개 버킷에 캡처만 남는다.**
    # 남은 파일 행이 있으면 그 문의도 남긴다 — 외래키가 걸려 있고, 무엇보다
    # 어느 문의의 파일인지가 지워야 할 것을 다시 찾는 실마리다.
    Q, F = withdrawal_scope.INQUIRY_MODEL, withdrawal_scope.INQUIRY_FILE_MODEL
    with sessionScope() as db:
        inquiryIds = [r.id for r in db.query(Q.id).filter(Q.user_id.in_(ids)).all()]
        files = (
            [(r.id, r.inquiry_id, r.s3_key)
             for r in db.query(F).filter(F.inquiry_id.in_(inquiryIds)).all()]
            if inquiryIds else []
        )
    okKeys, failed = await _deleteObjects([k for _, _, k in files])
    fileFailed += failed
    okKeySet = set(okKeys)
    okFileIds = [fid for fid, _, key in files if (not key) or (key in okKeySet)]
    stuckInquiryIds = {qid for _, qid, key in files if key and key not in okKeySet}

    with sessionScope() as db:
        deleted[F.__tablename__] = (
            db.query(F).filter(F.id.in_(okFileIds)).delete(synchronize_session=False)
            if okFileIds else 0
        )
        goneIds = [i for i in inquiryIds if i not in stuckInquiryIds]
        deleted[Q.__tablename__] = (
            db.query(Q).filter(Q.id.in_(goneIds)).delete(synchronize_session=False)
            if goneIds else 0
        )

    # ── ③ 나머지 표 ──
    with sessionScope() as db:
        for M in withdrawal_scope.PURGE_MODELS:
            deleted[M.__tablename__] = db.query(M).filter(
                M.user_id.in_(ids)
            ).delete(synchronize_session=False)

    # ── ③-b 지우지 않고 사람만 지우는 표 ──
    #
    # **행은 남는다.** `ko_signup_code_use` 는 좌석 회계의 정본이고, 탈퇴해도
    # 자리를 안 돌려주기로 했으므로(§10) 행을 지우면 `used_count` 와 영구히
    # 어긋난다. 까닭 전부는 `withdrawal_scope.ANONYMIZE_MODELS` 위에 있다.
    #
    # **여기는 `ids` 를 쓰지 않는다.** 저 목록은 게스트 id 문자열이 섞여 있는데
    # 이 표의 `user_id` 만 Integer 다(나머지 열다섯은 String). 문자열을 섞어
    # `in_()` 하면 MySQL 이 조용히 0 으로 바꿔 **엉뚱한 행을 건드린다.**
    # 게스트는 코드로 가입할 수 없으니 애초에 게스트 id 로 된 행이 없다.
    with sessionScope() as db:
        for M in withdrawal_scope.ANONYMIZE_MODELS:
            deleted[f"{M.__tablename__} (user_id 비움)"] = db.query(M).filter(
                M.user_id == int(userId)
            ).update({"user_id": None}, synchronize_session=False)

    # ── ④ 계정. 맨 마지막이다 ──
    # 앞이 실패해 예외로 빠져도 계정은 남아 다시 시도할 수 있다.
    # 계정을 먼저 지우면 남은 행을 누구 것인지 알 길이 없어진다.
    with sessionScope() as db:
        await repo_user.deleteUser(int(userId), db)
    deleted["ko_user"] = 1

    return {"deleted": deleted, "file_delete_failed": fileFailed}, None
