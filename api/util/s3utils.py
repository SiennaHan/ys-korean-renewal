"""
(mac) 
brew install awscli

(ubuntu)
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
aws --version

aws configure
ACCESS KEY: 
SECRET: 
region: ap-northeast-2
output format: json
"""
import asyncio
import base64
import os

import boto3

# 버킷은 환경에서 받는다. 기본값이 pulley-mock 인 것은 지금 그 버킷을 쓰고 있어서다 —
# **운영에서는 반드시 S3_BUCKET 을 따로 준다.** 이름이 mock 인 곳에 회원 음성이 쌓였다
BUCKET_NAME = os.getenv("S3_BUCKET", "pulley-mock")
REGION = os.getenv("S3_REGION", "ap-northeast-2")
DOMAIN = f"https://{BUCKET_NAME}.s3.{REGION}.amazonaws.com"

DIR_ROOT = "korean"

s3 = boto3.client('s3')
s3_res = boto3.resource('s3')


def _key_of(keyOrUrl: str) -> str:
    """키를 낸다. **옛 행은 공개 URL 이 들어 있어서** 둘 다 받아야 한다.

    2026-08-27 이전의 `ko_stt_shadow.audio_url` 은 `https://…/korean/stt/shadow/x.webm`
    꼴이고, 그 뒤로는 키(`korean/stt/shadow/x.webm`)만 넣는다.
    """
    if keyOrUrl.startswith("http://") or keyOrUrl.startswith("https://"):
        # 도메인 뒤부터가 키다. 버킷이 바뀌어도 경로는 같은 모양이다
        return keyOrUrl.split(".amazonaws.com/", 1)[-1].split("?", 1)[0]
    return keyOrUrl.lstrip("/")

async def public_upload_to_s3(upload_file, s3_dirname, s3_filename, mimeType) :
    filename = DIR_ROOT + "/" + s3_dirname + "/" + s3_filename

    # 동기 boto3 호출을 스레드로 오프로드해 이벤트 루프 블로킹 방지
    def _put():
        obj = s3_res.Object(BUCKET_NAME, filename)
        obj.put(Body=upload_file, ACL='public-read', ContentType=mimeType)

    await asyncio.to_thread(_put)

    s3_url = f"{DOMAIN}/{filename}"
    return s3_url


async def private_upload_to_s3(upload_file, s3_dirname, s3_filename, mimeType) -> str:
    """**주소를 알아도 못 듣게** 올린다. 학습자 음성이 이쪽이다.

    `public_upload_to_s3` 와 갈라 둔 이유 — 이 버킷에는 성격이 다른 둘이 같이 산다.
    TTS 로 만든 읽어 주는 소리는 앱이 그대로 재생하므로 공개여야 하고,
    **학습자가 녹음한 목소리는 공개면 안 된다.** 한 함수로 두었더니 뒤엣것까지
    `ACL='public-read'` 로 나갔다(2026-08-27 발견 — BLOCKERS).

    공개 URL 이 아니라 **키**를 낸다. 들으려면 `presign()` 으로 짧게 사는 주소를
    받아야 하고, 서버가 다시 읽을 때는 `object_bytes()` 를 쓴다.
    """
    key = DIR_ROOT + "/" + s3_dirname + "/" + s3_filename

    def _put():
        # ACL 을 주지 않는다 — 버킷 기본값(비공개)을 따른다
        s3_res.Object(BUCKET_NAME, key).put(Body=upload_file, ContentType=mimeType)

    await asyncio.to_thread(_put)
    return key


async def object_bytes(keyOrUrl: str) -> bytes:
    """비공개 객체를 서버가 읽는다. 옛 공개 URL 도 키로 바꿔 받는다."""
    key = _key_of(keyOrUrl)

    def _get():
        return s3.get_object(Bucket=BUCKET_NAME, Key=key)["Body"].read()

    return await asyncio.to_thread(_get)


def presign(keyOrUrl: str, seconds: int = 300) -> str:
    """짧게 사는 주소를 낸다 — 어드민이 들어 볼 때 쓴다. 기본 5분."""
    return s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": BUCKET_NAME, "Key": _key_of(keyOrUrl)},
        ExpiresIn=seconds,
    )


async def delete_object(keyOrUrl: str) -> None:
    """보관 기간이 지난 것을 지운다. 없는 키여도 조용히 넘어간다."""
    key = _key_of(keyOrUrl)

    def _del():
        s3.delete_object(Bucket=BUCKET_NAME, Key=key)

    await asyncio.to_thread(_del)
