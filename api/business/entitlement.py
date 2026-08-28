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
from datetime import datetime, timezone

from fastapi.encoders import jsonable_encoder

from persistence import repo_user
from persistence.database import sessionScope
from shared import free_scope, full_scope

# 기본은 켜짐. 사고가 나면 `.env` 한 줄과 재시작으로 끈다
SCHOOL_FULL_SCOPE = os.environ.get("SCHOOL_FULL_SCOPE", "true").lower() in {"1", "true", "yes"}


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
    # DetachedInstanceError 다(실제로 500 이 났다). 필요한 둘만 값으로 뽑는다
    with sessionScope() as db:
        user = await repo_user.findById(int(userId), db)
        role = user.role if user else None
        schoolCode = user.school_code if user else None
        accessEndedAt = user.access_ended_at if user else None

    if role is None:
        # 토큰은 멀쩡한데 계정이 없다(지워졌거나 다른 DB 다). 무료만 내준다
        return _freeScope("guest")

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
        if accessEndedAt and accessEndedAt <= _utcNow():
            return _freeScope("school", expiresAt=jsonable_encoder(accessEndedAt))
        return _schoolScope() if SCHOOL_FULL_SCOPE else _freeScope("school")

    # 개인 계정. 결제가 없으므로 아직 무료 범위다 — 잠긴 것을 누르면 결제로 간다
    return _freeScope("guest")
