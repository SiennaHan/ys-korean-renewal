"""권한 판정 — 한 곳에서만 한다 (access_and_pricing_v1 §04).

**앱은 권한을 계산하지 않는다.** 서버가 "열린 범위" 를 내고 앱은 그것만 믿는다.
출처가 무엇이든(무료 · 학교 계약 · 개인 결제) 앱이 받는 모양은 같으므로,
출처가 늘어도 앱은 고치지 않는다.

지금 단계(§09 의 2번)에서는 **늘 무료 범위만 낸다.** `ko_entitlement` 표가
아직 없어서 학교 계약도 개인 결제도 담을 곳이 없다.

다만 `source` 는 지금부터 제대로 가른다. §06 이 **기관 학생에게 결제 화면을
띄우면 안 된다** 고 못 박았기 때문이다 — 학교가 이미 낸 돈이다. 로그인한
사용자의 `role`·`school_code` 를 보고 `school` 을 내면 앱이 결제 대신
「학교에 문의」를 띄운다. 여기서 `guest` 로 뭉개면 그 규칙이 첫날부터 깨진다.
"""
from fastapi.encoders import jsonable_encoder

from persistence import repo_user
from persistence.database import sessionScope
from shared import free_scope


def _freeScope(source: str, expiresAt=None):
    """무료 범위를 §04 의 모양으로 낸다. 열린 범위는 출처와 무관하게 같은 꼴이다."""
    return {
        "source": source,
        "books": list(free_scope.FREE_BOOKS),
        "chapters": {str(k): list(v) for k, v in free_scope.FREE_CHAPTERS.items()},
        "jamo_chapters": list(free_scope.FREE_JAMO_CHAPTERS),
        "games": list(free_scope.FREE_GAMES),
        "clips": free_scope.FREE_CLIPS,
        "expires_at": expiresAt,
    }


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

    if role is None:
        # 토큰은 멀쩡한데 계정이 없다(지워졌거나 다른 DB 다). 무료만 내준다
        return _freeScope("guest")

    if role == "student" and schoolCode:
        # **학교 계약 범위는 아직 담을 곳이 없다**(ko_entitlement 미착수).
        # 그래서 지금 내주는 범위는 무료와 같다 — 다만 source 가 school 이라
        # 앱이 결제 화면 대신 「학교에 문의」를 띄운다(§06).
        return _freeScope("school")

    # 개인 계정. 결제가 없으므로 아직 무료 범위다 — 잠긴 것을 누르면 결제로 간다
    return _freeScope("guest")
