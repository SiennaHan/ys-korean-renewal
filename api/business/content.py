"""교재 콘텐츠를 내주는 판정 — DEV-05 (PD-03 확정 2026-08-31)

지금까지 문항은 **앱 번들에 통째로 실려** 나갔다. 자물쇠는 화면에만 있어서
개발자 도구를 열 줄 아는 사람에게는 없는 것과 같았다. 이 층이 그 길을 바꾼다.

## 길이 둘이다 — 섞으면 안 된다

  `manifest`   과별로 **몇 개인지만.** 본문 없음. 권한을 안 본다
  `chapter`    본문. **`requireChapter` 를 지나야 온다**(accepter 가 건다)

`manifest` 가 권한을 안 보는 것은 일부러다. 목록 화면이 **잠긴 과에도 자물쇠와
「몇 문항」을 그려야** 하기 때문이다. 수만으로는 콘텐츠가 새지 않는다.

## 판정을 두 벌 만들지 않는다

권한은 `accepter.entitlement_guard.requireChapter` 하나가 본다 — 쓰기(`/activity/*`
· `/learning-record`)에 이미 붙어 있는 그것이다. 여기서 다시 판정하면 두 벌이 되고,
두 벌은 반드시 갈라진다.
"""
from persistence import repo_content
from persistence.database import sessionScope


async def manifest():
    """과별 활동 개수. 본문 없음 · 권한 없음."""
    with sessionScope() as db:
        return await repo_content.countAll(db), None


async def chapter(bookId: int, chapterSeq: int, menuType: str):
    """그 과의 그 활동 본문. **부르기 전에 `requireChapter` 를 지나야 한다.**"""
    if menuType not in repo_content.BUNDLES:
        return None, "없는 활동입니다."
    with sessionScope() as db:
        data = await repo_content.findChapter(bookId, chapterSeq, menuType, db)
    if data is None:
        return None, "없는 활동입니다."
    return data, None
