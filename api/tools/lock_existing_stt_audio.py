"""이미 올라간 학습자 음성을 비공개로 되돌린다.

**코드를 고쳐도 예전 파일은 공개인 채로 남는다.** `ACL='public-read'` 로 올라간
객체는 그 ACL 을 계속 들고 있어서, 새 업로드만 비공개로 바꾸는 것으로는
이미 새어 있는 것을 막지 못한다. 이 스크립트가 그 뒷정리다.

    cd api && .venv/bin/python -m tools.lock_existing_stt_audio --dry-run
    cd api && .venv/bin/python -m tools.lock_existing_stt_audio

**학습자 음성 경로만 건드린다**(`korean/stt/shadow/`). TTS 로 만든 소리는 앱이
그대로 재생하므로 공개여야 한다 — 같이 잠그면 듣기 문제가 통째로 죽는다.

ACL 을 지우는 것만으로 부족할 수 있다. 버킷에 **공개 정책(bucket policy)** 이
걸려 있으면 객체 ACL 과 무관하게 공개다. 콘솔에서 Block Public Access 도 같이 봐라.
"""
import argparse
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from util import s3utils  # noqa: E402

PREFIX = f"{s3utils.DIR_ROOT}/stt/shadow/"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()

    # **어느 버킷을 건드리는지 먼저 찍는다.** 버킷은 S3_BUCKET 환경변수로 오고
    # 없으면 기본값(`pulley-mock`)이다 — 운영이 다른 버킷이면 그것을 안 준 채로 돌려도
    # 「본 것 0 · 공개였던 것 0」이 나오고, 그게 「깨끗하다」로 읽힌다.
    # 이 줄이 없으면 잘못된 버킷을 본 것을 알 길이 없다.
    print(f"버킷 {s3utils.BUCKET_NAME} · 지역 {s3utils.REGION} · 접두 {PREFIX}")
    if not os.getenv("S3_BUCKET"):
        print("  ⚠ S3_BUCKET 을 주지 않아 기본값을 쓴다 — 운영 버킷이 다르면 지금 헛것을 보고 있다")

    s3 = s3utils.s3
    seen = locked = failed = public = 0
    token = None
    while True:
        kw = {"Bucket": s3utils.BUCKET_NAME, "Prefix": PREFIX, "MaxKeys": 1000}
        if token:
            kw["ContinuationToken"] = token
        page = s3.list_objects_v2(**kw)
        for obj in page.get("Contents", []):
            seen += 1
            key = obj["Key"]
            try:
                grants = s3.get_object_acl(Bucket=s3utils.BUCKET_NAME, Key=key).get("Grants", [])
                isPublic = any(
                    (g.get("Grantee", {}).get("URI") or "").endswith("/AllUsers")
                    for g in grants
                )
            except Exception as e:
                failed += 1
                print(f"  ACL 못 읽음 {key} — {e!r}")
                continue
            if not isPublic:
                continue
            public += 1
            if a.dry_run:
                print(f"  공개 {key}")
                continue
            try:
                s3.put_object_acl(Bucket=s3utils.BUCKET_NAME, Key=key, ACL="private")
                locked += 1
            except Exception as e:
                failed += 1
                print(f"  잠그기 실패 {key} — {e!r}")
        if not page.get("IsTruncated"):
            break
        token = page.get("NextContinuationToken")

    print(f"본 것 {seen} · 공개였던 것 {public} · 잠근 것 {locked} · 실패 {failed}")
    if a.dry_run and public:
        print("--dry-run 이라 바꾸지 않았다. 그대로 다시 돌리면 잠근다")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
