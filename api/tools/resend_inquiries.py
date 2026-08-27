"""슬랙에 못 꽂힌 문의를 다시 보낸다.

웹훅이 죽어 있던 동안에도 문의는 DB 에 남는다(`notified=False`).
이 스크립트가 그것들을 다시 보낸다.

    cd api && SLACK_WEBHOOK_URL=… .venv/bin/python -m tools.resend_inquiries --dry-run
    cd api && SLACK_WEBHOOK_URL=… .venv/bin/python -m tools.resend_inquiries
"""
import argparse
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.encoders import jsonable_encoder  # noqa: E402

from persistence import repo_inquiry  # noqa: E402
from persistence.database import sessionScope  # noqa: E402
from xternal import slack  # noqa: E402


async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=100)
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()

    if not slack.isConfigured():
        print(f"{slack.WEBHOOK_ENV} 가 없다 — 보낼 곳이 없다")
        return 1

    with sessionScope() as db:
        pending = await repo_inquiry.listPending(db, a.limit)
        rows = []
        for r in pending:
            d = jsonable_encoder(r)
            # 캡처 키도 같이 싣는다 — 웹훅 경로가 링크를 만들 수 있게.
            # **바이트는 다시 보내지 않는다**(비공개 S3 에만 있고 여기서 굳이 내려받지 않는다)
            files = await repo_inquiry.listFiles(db, r.id)
            d["file_keys"] = [f.s3_key for f in files]
            d["file_attempts"] = len(files)
            rows.append(d)

    if a.dry_run:
        print(f"못 보낸 문의 {len(rows)}건")
        for r in rows:
            print(f"  #{r['id']} {r['topic']} {r['reply_email']} {r['created_at']}")
        return 0

    sent = failed = 0
    for r in rows:
        # 캡처 바이트는 다시 보내지 않는다 — 비공개 S3 에만 있고, 웹훅 경로면
        # 링크로 붙는다. 봇 토큰 경로에서는 첫 전송 때 이미 올라갔다
        sent, _ = await slack.notifyInquiry(r)
        if sent:
            with sessionScope() as db:
                await repo_inquiry.markNotified(db, r["id"])
            sent += 1
        else:
            failed += 1
    print(f"보낸 것 {sent} · 실패 {failed}")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
