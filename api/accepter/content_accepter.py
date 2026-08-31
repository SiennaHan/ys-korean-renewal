"""교재 콘텐츠 — DEV-05

  GET /content/manifest                          과별 활동 개수. **본문 없음 · 무인증**
  GET /content/{bookId}/{chapterSeq}/{menuType}  본문. 잠긴 과면 402

**`manifest` 가 무인증인 것은 일부러다.** 목록 화면이 잠긴 과에도 자물쇠와
「몇 문항」을 그려야 한다. 수만으로는 콘텐츠가 새지 않는다.

**본문은 `requireChapter` 를 지난다** — 쓰기(`/activity/*` · `/learning-record`)에
이미 붙어 있는 그 가드다. 판정을 두 벌 만들지 않는다.
"""
from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordBearer

from accepter import auth
from accepter.base import makeError, makeResponse
from accepter.entitlement_guard import requireChapter
from business import content

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


@router.get("/manifest")
async def get_manifest():
    data, error = await content.manifest()
    if error:
        return makeError(error)
    return makeResponse(data)


@router.get("/{bookId}/{chapterSeq}/{menuType}", dependencies=[Depends(auth.JWTBearer())])
async def get_chapter_content(
    bookId: int, chapterSeq: int, menuType: str, token: str = Depends(oauth2_scheme)
):
    # **먼저 막고 나서 읽는다.** 판정 전에 조회하면 그 사이에 로그·타이밍으로 샌다
    await requireChapter(token, bookId, chapterSeq, menuType)
    data, error = await content.chapter(bookId, chapterSeq, menuType)
    if error:
        return makeError(error)
    return makeResponse(data)
