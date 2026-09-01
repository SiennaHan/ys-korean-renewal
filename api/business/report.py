"""표현클립 신고 저장 — clip_spec_v1 §05~§06 · DEV-02.

신고 단위는 영상이 아니라 **영상 구간**이다. 「발음이 잘 안 들려요」(audio_quality)는
그 구간을 검색 결과 하위로 내리는 재료가 되고, 「선정적·폭력적 내용」(inappropriate)은
영상 전체를 슬랙으로 알리는 재료가 된다 — **어느 쪽도 자동으로 숨기지 않는다**(되돌릴
사람이 없어서다, §05-6). 재생 불가(100·101·150)만 클라이언트가 검색 결과에서 뺀다.

**저장이 먼저, 슬랙은 그다음이다** — `business/inquiry.py` 와 같은 이유로, 슬랙이
죽어 있어도 신고를 잃으면 안 된다.
"""
from fastapi.encoders import jsonable_encoder
from accepter.base import ReportItem
from persistence.database import sessionScope
from persistence import repo_error_report
from xternal import slack


async def listReport(category: str):
    with sessionScope() as db:
        encoded_list = []
        chat_list = await repo_error_report.list(category, db)
        for chat in chat_list :
            encoded_list.append(jsonable_encoder(chat))

    return encoded_list

async def createReport(report: ReportItem, userId: str):
    """`userId` 는 인증 토큰에서 나온다 — 신고 본문의 `user_id` 는 더 이상 믿지 않는다."""
    with sessionScope() as db:
        saved = await repo_error_report.create(
            report.category,
            report.target_id,
            report.error_code,
            report.error_msg,
            report.content,
            report.segment_start,
            report.matched_line,
            userId,
            db,
        )
        encoded = jsonable_encoder(saved)
        # 슬랙 메시지의 「누적 신고 수」 — 방금 넣은 이 행도 포함해서 센다
        reportCount = await repo_error_report.countByTarget(report.target_id, db)

    # 여기부터는 실패해도 신고는 이미 저장돼 있다.
    if report.error_code == "inappropriate":
        try:
            payload = dict(encoded)
            payload["title"] = report.title
            payload["clip_category"] = report.clip_category
            payload["report_count"] = reportCount
            await slack.notifyClipReport(payload)
        except Exception as e:
            print(f"[report] 슬랙 알림 실패 — target[{report.target_id}] {e!r}")

    return encoded
