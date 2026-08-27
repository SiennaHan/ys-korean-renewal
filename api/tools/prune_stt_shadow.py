"""보관 기간이 지난 학습자 음성과 그 기록을 지운다.

**저절로 돌지 않는다 — 크론에 걸어야 한다.** 요청 처리 중에 몰래 돌리면
언제 지워지는지 아무도 모르게 된다.

    cd api && .venv/bin/python -m tools.prune_stt_shadow --dry-run
    cd api && .venv/bin/python -m tools.prune_stt_shadow

기간은 `STT_SHADOW_RETENTION_DAYS` 로 준다. **0(기본)이면 아무것도 안 지운다** —
개인정보 처리방침에 적을 값이라 기획이 정하기 전에는 마음대로 지우지 않는다
(phase1/legal_draft_v1.html §03 제4조).
"""
import argparse
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from business import stt  # noqa: E402


async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--days", type=int, default=None, help="기본은 STT_SHADOW_RETENTION_DAYS")
    ap.add_argument("--limit", type=int, default=500, help="한 번에 볼 행 수")
    ap.add_argument("--dry-run", action="store_true", help="세기만 하고 지우지 않는다")
    a = ap.parse_args()

    result = await stt.pruneShadow(days=a.days, limit=a.limit, dryRun=a.dry_run)
    for k, v in result.items():
        print(f"{k}: {v}")
    # 지울 것이 남아 있으면 0 이 아닌 값으로 알린다 — 크론이 다시 부르게
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
