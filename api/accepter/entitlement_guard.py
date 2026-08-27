"""유료 콘텐츠 라우트를 막는다 — access_and_pricing_v1 §08 의 3번.

**앱의 자물쇠는 표시일 뿐이다.** 주소를 직접 치면 잠긴 것이 그대로 열렸다.
여기서 서버가 막는다.

## 왜 403 이 아니라 402 인가

이 저장소에서 **403 은 인증 실패**다 — `auth.JWTBearer` 가 토큰이 없거나
망가졌을 때 403 을 낸다. 그리고 앱은 401·403 을 받으면 **세션을 지운다**
(`app/src/api/api.ts`). 권한 없음으로 403 을 내면 **구독하지 않은 사람이
로그아웃된다.** 그건 다른 사실이므로 다른 코드를 쓴다 —
`402 Payment Required`. 앱은 402 에서 세션을 건드리지 않고 결제 안내를 띄운다.

## 무료 게임은 막지 않는다

보카샷·봄소풍은 로그인 없이도 무료다(§02). 그 라우트는 그대로 열려 있어야
맞다 — 게스트 토큰조차 없는 사람도 봐야 한다.
"""
from typing import Optional

from fastapi import Header, HTTPException

from accepter import auth
from business import entitlement

PAYMENT_REQUIRED = 402


def RequireGame(gameKey: str):
    """그 게임이 열려 있어야 통과한다. 아니면 402.

    토큰이 없거나 망가졌으면 **게스트로 본다** — 게스트의 열린 범위에
    유료 게임이 없으므로 결과는 같은 402 다. 여기서 403 을 내면 앱이
    세션을 지우므로, 인증 실패와 권한 없음을 섞지 않는다.
    """

    async def dep(authorization: Optional[str] = Header(None)):
        userId, roles = "anonymous", ["guest"]
        if authorization and authorization.lower().startswith("bearer "):
            token = authorization.split(" ", 1)[1]
            try:
                userId = auth.getUserIdFrom(token) or "anonymous"
                roles = auth.getRolesFrom(token) or ["guest"]
            except Exception:
                # 만료됐거나 망가진 토큰. 게스트로 본다
                userId, roles = "anonymous", ["guest"]

        try:
            ent = await entitlement.getEntitlement(userId, roles)
        except Exception as e:
            # **판정을 못 했으면 막는다.** 유료 콘텐츠라 여기서 열어 주면
            # 판정이 죽은 동안 통째로 새 나간다. 화면 쪽 잠금과 반대 방향이다 —
            # 그쪽은 표시일 뿐이라 열어 두는 것이 덜 나빴다
            print(f"[entitlement-guard] 판정 실패 — {gameKey} {e!r}")
            raise HTTPException(PAYMENT_REQUIRED, detail="구독이 필요한 콘텐츠입니다.")

        if gameKey not in (ent.get("games") or []):
            raise HTTPException(PAYMENT_REQUIRED, detail="구독이 필요한 콘텐츠입니다.")

    return dep
