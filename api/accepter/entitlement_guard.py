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
        token = ""
        if authorization and authorization.lower().startswith("bearer "):
            token = authorization.split(" ", 1)[1]
        userId, roles = _identity(token)

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


def _identity(token: str):
    """토큰에서 누구인지 읽는다. **못 읽으면 게스트로 본다.**

    여기서 403 을 내면 앱이 세션을 지운다(`app/src/api/api.ts`). 인증 실패와
    권한 없음은 다른 사실이므로 섞지 않는다 — 게스트로 보고 402 로 답한다.
    """
    if not token:
        return "anonymous", ["guest"]
    try:
        return (auth.getUserIdFrom(token) or "anonymous",
                auth.getRolesFrom(token) or ["guest"])
    except Exception:
        return "anonymous", ["guest"]


async def requireChapter(token: str, bookId: int, chapterSeq: int, menuType: str = ""):
    """그 과가 열려 있어야 통과한다. 아니면 402.

    **`Depends` 가 아니라 손으로 부른다.** 급·과가 요청 **몸**에 있는데,
    의존성이 몸을 또 선언하면 라우트마다 몸 모델이 둘이 되어 스키마가 흐려진다.
    부르는 자리에 한 줄로 두면 어느 라우트가 막히는지도 눈에 보인다.

    **`menuType` 을 반드시 넘겨라 — 자모가 번호 자리를 공유한다.**
    자모 과는 1급 seq 1~3 이고 일반 과는 seq 4 부터다. 그런데 무료 경계는
    따로 잡혀 있다(`FREE_JAMO_CHAPTERS = [1]` vs `FREE_CHAPTERS = {1:[4]}`).
    그래서 급·과만 보면 **무료인 자모 1과를 402 로 막는다.** 2026-08-27 에
    실제로 그럴 뻔했다 — 그때는 자모가 서버에 아무것도 안 써서 안 드러났는데,
    같은 날 다른 세션이 `useJamoActivityState` 로 쓰기를 붙이고 있었다.
    자모 여섯은 `menuType="jamo"` 를 보낸다(dev_spec §10).
    """
    userId, roles = _identity(token)
    try:
        ent = await entitlement.getEntitlement(userId, roles)
    except Exception as e:
        # 판정을 못 했으면 막는다 — 위 RequireGame 과 같은 이유다
        print(f"[entitlement-guard] 판정 실패 — {menuType or '교재'} {bookId}급 {chapterSeq}과 {e!r}")
        raise HTTPException(PAYMENT_REQUIRED, detail="구독이 필요한 콘텐츠입니다.")

    if menuType == "jamo":
        if chapterSeq in (ent.get("jamo_chapters") or []):
            return
        raise HTTPException(PAYMENT_REQUIRED, detail="구독이 필요한 콘텐츠입니다.")

    if bookId in (ent.get("books") or []):
        return
    if chapterSeq in ((ent.get("chapters") or {}).get(str(bookId)) or []):
        return
    raise HTTPException(PAYMENT_REQUIRED, detail="구독이 필요한 콘텐츠입니다.")
