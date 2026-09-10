"""권한 판정 — 한 곳에서만 한다 (access_and_pricing_v1 §04).

**앱은 권한을 계산하지 않는다.** 서버가 "열린 범위" 를 내고 앱은 그것만 믿는다.
출처가 무엇이든(무료 · 학교 계약 · 개인 결제) 앱이 받는 모양은 같으므로,
출처가 늘어도 앱은 고치지 않는다.

**2026-08-28 부터 기관 학생은 전 범위를 받는다.** 그 전에는 여기도 무료 범위를
냈다 — `ko_entitlement` 표가 없어 학교 계약을 담을 곳이 없다는 이유였고, 그래서
기관 학생이 받는 것은 안내 문구뿐이었다. 계약 학교는 모든 급을 준다는 확정
(기획 2026-08-28)이 나오면서 표 없이도 판정할 수 있게 됐다 — `school_code` 가
있으면 전 급이다. 값은 `shared/full_scope.py`.

개인 결제는 여전히 담을 곳이 없다. `purchase` 는 `ko_entitlement` 가 생긴 뒤다.

`source` 를 제대로 가르는 것은 그 전부터 지켜 온 규칙이다. §06 이 **기관 학생에게
결제 화면을 띄우면 안 된다** 고 못 박았기 때문이다 — 학교가 이미 낸 돈이다.

**되돌리는 길을 열어 두었다** — 환경변수 `SCHOOL_FULL_SCOPE=false` 면 전 범위를
끄고 예전처럼 무료 범위를 낸다. 이 변경은 전 학교의 전 학생에게 즉시 보이고
**엑셀로 등록된 기존 기관 학생에게도 그대로 적용되므로**, 배포 없이 되돌릴 수
있어야 한다(`xternal/tutorus.py` 의 `PRONUNCIATION_ENABLED` 와 같은 방식).
"""
import os
from datetime import datetime, timedelta, timezone

from fastapi.encoders import jsonable_encoder

from persistence import repo_user
from persistence.database import sessionScope
from shared import free_scope, full_scope

# 기본은 켜짐. 사고가 나면 `.env` 한 줄과 재시작으로 끈다
SCHOOL_FULL_SCOPE = os.environ.get("SCHOOL_FULL_SCOPE", "true").lower() in {"1", "true", "yes"}

# **런칭 이벤트 — 이 날까지 로그인한 사람 전원이 전 범위를 받는다** (기획 2026-09-04).
#
# 무료 체험이 아니다(그건 「없다」로 확정됐다). 토스페이먼츠 계약이 끝날 때까지는
# 어차피 결제를 열 수 없으니, 그 기간을 **런칭 이벤트로 알리는** 것이다.
#
# **`.env` 로 뺀 이유는 연장이다.** 심사가 늦거나 이벤트를 더 하기로 하면
# 「연장 공지」와 함께 이 값만 바꾼다 — **배포가 필요 없다.** `SCHOOL_FULL_SCOPE` 를
# 그렇게 만든 것과 같은 이유다(그 상수 주석).
#
# 날짜만 적는다(`YYYY-MM-DD`). **그 날 끝까지 준다** — 아래에서 하루를 더해
# 「10-31 이 지난 뒤」가 아니라 「11-01 이 되면」 끝나게 한다.
LAUNCH_EVENT_UNTIL = os.environ.get("LAUNCH_EVENT_UNTIL", "2026-10-31").strip()

# **기본은 꺼짐 — 운영 배포는 지금과 동일하게 동작한다.**
#
# 켜면 `master_admin`·`school_admin` 계정도 학생 앱에서 전 범위를 본다. 어드민
# 계정은 결제 없이 만들어지므로, 이게 없으면 관리자가 학생 화면을 확인하려 할 때
# 게스트와 똑같이 잠긴 것만 본다 — 콘텐츠를 QA 하려면 결국 실제 학생 계정을
# 빌려야 했다. 로컬 개발용 스위치라 `SCHOOL_FULL_SCOPE` 와 달리 기본값을 켜 두지
# 않는다 — 운영의 모든 관리자 계정이 그 순간 전 콘텐츠를 보게 되는 것은 이 칸
# 하나로 결정할 일이 아니다.
ADMIN_FULL_SCOPE = os.environ.get("ADMIN_FULL_SCOPE", "false").lower() in {"1", "true", "yes"}

# **계정을 지정해서 전 범위를 여는 목록.** 쉼표로 잇는다 —
# `FULL_SCOPE_EMAILS=admin@pulleyai.co.kr,qa@pulleyai.co.kr`. 기본은 빈 목록(=아무도 아님).
#
# **`ADMIN_FULL_SCOPE` 와 왜 따로 두나.** 그 스위치는 **역할 전체**를 연다 —
# 운영에서 켜면 그 순간 모든 `master_admin`·`school_admin` 이 전 콘텐츠를 본다.
# 기획이 정한 것은 「이 계정을 열어 준다」였는데(2026-09-01) 구현이 역할 스위치
# 하나였고, 그래서 **운영에서는 아무도 켜지 못했다** — 인계 목록에도 안 올라갔고
# 지정한 계정은 계속 잠긴 채였다(2026-09-09 에 기획자가 발견). 이 목록은 그
# 결정을 있는 그대로 옮긴 것이다: 열 계정만 열고 나머지는 그대로 둔다.
#
# **`.env` 한 줄이라 배포가 필요 없다** — `SCHOOL_FULL_SCOPE`·`LAUNCH_EVENT_UNTIL`
# 과 같은 이유다. 대소문자와 앞뒤 공백은 무시한다(사람이 손으로 적는 값이다).
FULL_SCOPE_EMAILS = {
    e.strip().lower()
    for e in os.environ.get("FULL_SCOPE_EMAILS", "").split(",")
    if e.strip()
}


def _utcNow():
    """**`util/timeutils.now()` 를 쓰지 마라** — 그쪽은 KST 라 9시간 어긋난다.
    DB 의 시각 칸은 전부 `UTC_TIMESTAMP()` 기본값이다."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _scope(source: str, *, books, chapters, jamoChapters, games, clips, expiresAt=None):
    """§04 의 7키. **모양은 여기 한 곳에만 있다.**

    앱이 엄격히 검증해서 키가 하나만 빠져도 응답을 통째로 거절하고
    잠금을 아예 그리지 않는다(`app/src/api/entitlement.ts`). 그래서 모양을
    두 곳에 적어 두면 한쪽만 고쳐졌을 때 화면이 조용히 비어 버린다.
    """
    return {
        "source": source,
        "books": list(books),
        "chapters": {str(k): list(v) for k, v in chapters.items()},
        "jamo_chapters": list(jamoChapters),
        "games": list(games),
        "clips": clips,
        "expires_at": expiresAt,
    }


def _schoolScope():
    """기관 학생 — 전 급 · 자모 전부 · 게임 전부.

    **`expires_at` 은 None 이다.** 코드의 기한을 여기 넣으면 학기 코드가
    만료되는 날 그 코드로 가입한 학생 전원이 잠긴다. 코드의 기한은
    **입장(가입)만** 막는다는 것이 확정 규칙이다. 학기 종료 시 접근 회수는
    따로 만든다.
    """
    return _scope(
        "school",
        books=full_scope.ALL_BOOKS,
        chapters={},          # 전 급이 열렸으니 예외 목록은 뜻이 없다
        jamoChapters=full_scope.ALL_JAMO_CHAPTERS,
        games=full_scope.ALL_GAMES,
        clips=full_scope.ALL_CLIPS,
    )


def _eventEndsAt():
    """이벤트가 끝나는 순간(UTC naive). 설정이 비었거나 꼴이 틀리면 `None` — **이벤트 없음**.

    **날짜 다음 날 0시**다. `LAUNCH_EVENT_UNTIL=2026-10-31` 이면 10-31 하루를 온전히
    주고 11-01 0시에 끝난다 — 「10월 31일까지」를 사람 말 그대로 받는다.

    **시간대는 UTC 로 본다.** 이 파일의 다른 판정(`accessEndedAt <= _utcNow()`)이
    전부 그렇고, 한 곳만 KST 로 바꾸면 같은 표의 두 칸이 서로 다른 시계를 쓴다.
    그래서 한국 기준으로는 **11월 1일 오전 9시**에 끝난다 — 알고 두는 것이다.
    시간대를 통째로 바로잡는 것은 `DEV-19` 이고 세 곳을 같이 고쳐야 한다.
    """
    if not LAUNCH_EVENT_UNTIL:
        return None
    try:
        day = datetime.strptime(LAUNCH_EVENT_UNTIL, "%Y-%m-%d")
    except ValueError:
        # 꼴이 틀리면 **이벤트를 켜지 않는다.** 잘못 적은 값으로 전 범위를 여는 것이
        # 안 여는 것보다 나쁘다 — 되돌리려면 배포가 필요해진다
        print(f"LAUNCH_EVENT_UNTIL 을 못 읽었다(무시한다): {LAUNCH_EVENT_UNTIL!r}")
        return None
    return day + timedelta(days=1)


def _eventScope(endsAt):
    """런칭 이벤트 — 전 급 · 자모 전부 · 게임 전부. `_schoolScope()` 와 같은 범위다.

    **`source` 를 `event` 로 새로 만들었다.** `school` 로 내면 MY 의 구독 카드가
    「학교를 통해 이용 중」이라고 **거짓말한다**(`components/main/my/subscription-card.tsx`).
    `purchase` 로 내면 「구독 이용 중」이라 역시 거짓이고 결제 안내로 가는 길도 막힌다.
    **앱의 `EntitlementSource` 에 넷째 값을 같이 더했다** — 안 더하면 `asEntitlement`
    가 응답을 통째로 거절해 **오히려 전부 잠긴 것처럼 보인다**(아래 `ADMIN_FULL_SCOPE`
    주석이 그 사고를 적어 뒀다).

    `expires_at` 은 이벤트가 끝나는 순간이다 — 앱이 「언제까지」를 말할 수 있게.
    """
    return _scope(
        "event",
        books=full_scope.ALL_BOOKS,
        chapters={},
        jamoChapters=full_scope.ALL_JAMO_CHAPTERS,
        games=full_scope.ALL_GAMES,
        clips=full_scope.ALL_CLIPS,
        expiresAt=jsonable_encoder(endsAt),
    )


def _freeScope(source: str, expiresAt=None):
    """무료 범위를 §04 의 모양으로 낸다. 열린 범위는 출처와 무관하게 같은 꼴이다."""
    return _scope(
        source,
        books=free_scope.FREE_BOOKS,
        chapters=free_scope.FREE_CHAPTERS,
        jamoChapters=free_scope.FREE_JAMO_CHAPTERS,
        games=free_scope.FREE_GAMES,
        clips=free_scope.FREE_CLIPS,
        expiresAt=expiresAt,
    )


async def getEntitlement(userId: str, roles: list[str] | None = None):
    """게스트 토큰도 받는다 — 무료 범위가 서버에서 오므로 경계를 바꿀 때 앱을 다시 내보내지 않는다.

    `userId` 는 JWT 의 `sub` 다. 게스트면 게스트 id 가 들어온다(로그인 사용자의
    id 와 같은 자리를 쓴다). 그래서 **roles 로 먼저 가른다** — 게스트 토큰은
    `["guest"]` 를 들고 있다. sub 문자열의 모양(`guest-` 접두어)으로 가르면
    `local-guest` 처럼 손으로 만든 게스트 id 를 놓친다.
    """
    if roles and "guest" in roles:
        return _freeScope("guest")

    # 로그인 토큰의 sub 는 `str(user.id)` 다(`user_business.signJwt`). 게스트 id 는
    # 숫자가 아니므로, roles 가 비어 있는 토큰이 와도 여기서 한 번 더 걸린다 —
    # 문자열을 그대로 넘기면 조회가 조용히 빈손으로 돌아온다
    if not str(userId).isdigit():
        return _freeScope("guest")

    # 로그인했다. 학교 소속이면 결제를 권하지 않는다.
    # **필드는 세션 안에서 꺼낸다** — 블록을 나온 뒤 user.role 을 읽으면
    # DetachedInstanceError 다(실제로 500 이 났다). 필요한 것만 값으로 뽑는다
    with sessionScope() as db:
        user = await repo_user.findById(int(userId), db)
        role = user.role if user else None
        schoolCode = user.school_code if user else None
        accessEndedAt = user.access_ended_at if user else None
        # 지정 목록 대조용. 여기서 꺼내야 한다 — 블록 밖에서 읽으면 위와 같은 사고다
        email = (user.email or "") if user else ""

    if role is None:
        # 토큰은 멀쩡한데 계정이 없다(지워졌거나 다른 DB 다). 무료만 내준다
        return _freeScope("guest")

    # **지정한 계정은 무조건 전 범위다** — 다른 어떤 분기보다 앞선다(2026-09-09).
    #
    # **학교 분기보다 위에 둔다.** 아래로 내리면 그 계정이 어쩌다 `school_code` 를
    # 갖고 있을 때(엑셀 등록·기관 코드 가입) 학기 종료 분기에 먼저 걸려 **무료
    # 범위로 떨어진다.** 이 목록은 사람이 손으로 적은 예외이므로 예외가 이긴다.
    #
    # `_schoolScope()` 를 그대로 재쓴다 — 「전 급 · 자모 전부 · 게임 전부」는 이미
    # 있는 모양이고, 판정을 한 벌 더 만들면 갈라진다. **`source` 도 새로 만들지
    # 않는다**(`ADMIN_FULL_SCOPE` 분기와 같은 이유): 앱의 `EntitlementSource` 가
    # 닫힌 유니언이라 모르는 값을 내면 `asEntitlement` 가 응답을 통째로 거절하고,
    # `isChapterOpen` 이 `!ent` 를 먼저 보므로 **오히려 전부 잠긴 것처럼 보인다.**
    # 그래서 이 계정의 MY 는 「학교를 통해 이용 중」으로 보이고 결제를 권하지 않는다 —
    # 콘텐츠를 확인하려고 여는 계정이므로 그것이 방해가 되지 않는다.
    if email and email.strip().lower() in FULL_SCOPE_EMAILS:
        return _schoolScope()

    # **이벤트가 켜져 있나** — 아래 두 분기가 같이 본다. 여기서 한 번만 잰다.
    #
    # 2026-09-10 에 올라왔다: 「이벤트 기간에는 **로그인한 계정이면 다 열려야 한다**」.
    # 전에는 이 판정이 함수 맨 아래에만 있어서, 위쪽 분기에서 먼저 돌아가는 계정
    # (학기가 끝난 기관 학생)이 **이벤트 기간인데도 무료 범위로 떨어졌다.**
    eventEndsAt = _eventEndsAt()
    eventOn = bool(eventEndsAt and _utcNow() < eventEndsAt)

    if role == "student" and schoolCode:
        # 학교가 등록했거나 기관 코드로 들어온 학생이다. **계약 학교는 모든 급**
        # (기획 2026-08-28). 조건이 `school_code` 하나뿐이라 **엑셀로 등록된
        # 기존 학생에게도 그대로 적용된다** — 백필도 마이그레이션도 없다.
        #
        # 전에는 여기서도 `_freeScope("school")` 을 냈다. 범위는 무료와 같고
        # source 만 달라 앱이 「학교에 문의」를 띄우게 하는 용도였다.
        #
        # **학기가 끝났으면 무료 범위로 내려간다**(기획 2026-08-28). 어드민이
        # `access_ended_at` 을 찍으면 **다음 요청부터 즉시** 걸린다 —
        # `is_active` 를 쓰면 로그인만 막히고 이미 발급된 토큰은 30일을 더 산다.
        #
        # **`source` 는 여전히 `school` 이다.** 앱이 결제를 권하지 않고
        # 「학교에 문의」를 띄우게 하려는 것이고(§06), `expires_at` 이 과거라는 것으로
        # 「학기가 끝났다」를 판정한다. 지난 학기 기록은 계정에 그대로 남아 보인다.
        #
        # **이벤트 기간에는 학기가 끝났어도 전 범위다**(기획 2026-09-10). 다만
        # **`source` 는 `school` 그대로 둔다** — `event` 로 바꾸면 이벤트가 끝날 때
        # 기관 학생에게 개인 결제 안내가 뜬다(§06 위반). 이벤트가 끝나면 이 줄이
        # 저절로 옛 동작으로 돌아간다: 다시 「학기가 끝났어요」다.
        if accessEndedAt and accessEndedAt <= _utcNow():
            if eventOn:
                return _schoolScope()
            return _freeScope("school", expiresAt=jsonable_encoder(accessEndedAt))
        # `SCHOOL_FULL_SCOPE` 를 꺼 두었더라도 이벤트 기간에는 연다 — 같은 이유다.
        return _schoolScope() if (SCHOOL_FULL_SCOPE or eventOn) else _freeScope("school")

    # **관리자 계정 — `ADMIN_FULL_SCOPE` 가 켜져 있을 때만.** 기본은 꺼짐이므로
    # 운영에서는 이 줄에 닿지 않는다(위 상수 주석). `_schoolScope()` 를 그대로
    # 재쓴다 — 「전 급 · 자모 전부 · 게임 전부」는 학교 계약과 같은 모양이고,
    # 판정을 한 벌 더 만들면 갈라진다.
    #
    # **`source` 를 새로 만들지 않는다 — `school` 그대로 낸다.** 앱의
    # `EntitlementSource` 는 `"guest" | "school" | "purchase"` 로 닫혀 있다
    # (`app/src/api/entitlement.ts`). 여기서 넷째 값을 내면 `asEntitlement` 가
    # 응답 전체를 거절해 `entitlement` 가 `null` 이 되고, `isChapterOpen` 은
    # `!ent` 를 먼저 보므로 **오히려 전부 잠긴 것처럼 보인다** — 이 스위치의
    # 목적과 정반대다. 앱을 고치지 않고 서버 스위치 하나로 끝내려면 이미 있는
    # 값만 써야 한다
    if ADMIN_FULL_SCOPE and role in ("master_admin", "school_admin"):
        return _schoolScope()

    # **런칭 이벤트 기간이면 개인 계정도 전 범위다** (기획 2026-09-04).
    #
    # **기관 학생은 이 위에서 이미 갈렸다** — 그쪽은 `source:"school"` 그대로 둔다.
    # 범위는 어차피 같고(전 급), §06 이 「기관 학생에게 개인 결제 화면을 띄우면
    # 안 된다」로 정했기 때문이다. `event` 로 바꾸면 이벤트가 끝날 때 학교 학생에게
    # 결제 안내가 뜬다 — 학교가 이미 낸 돈이다.
    #
    # **게스트는 받지 않는다.** 위쪽 세 분기에서 이미 `_freeScope("guest")` 로
    # 돌아갔다. 게스트까지 열면 가입할 이유가 없어지고 **학습 기록이 계정에 붙지
    # 않는다** — §06 이 「계정 없이 결제하면 기기를 바꿀 때 잃는다」로 정한 것과 같은
    # 이유다. 게스트는 무료 범위를 보고, 앱이 「로그인하면 이벤트가 열린다」를 말한다.
    # **뒤집으려면 이 판정을 함수 맨 위로 올리면 된다 — 한 줄이다.**
    if eventOn:
        return _eventScope(eventEndsAt)

    # 개인 계정. 결제가 없으므로 아직 무료 범위다 — 잠긴 것을 누르면 결제로 간다
    return _freeScope("guest")
