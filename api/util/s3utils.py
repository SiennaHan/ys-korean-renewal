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
import boto3

BUCKET_NAME = "pulley-mock"
REGION = "ap-northeast-2"
DOMAIN = f"https://{BUCKET_NAME}.s3.{REGION}.amazonaws.com"

DIR_ROOT = "korean"

s3 = boto3.client('s3')
s3_res = boto3.resource('s3')

async def public_upload_to_s3(upload_file, s3_dirname, s3_filename, mimeType) :
    filename = DIR_ROOT + "/" + s3_dirname + "/" + s3_filename

    # 동기 boto3 호출을 스레드로 오프로드해 이벤트 루프 블로킹 방지
    def _put():
        obj = s3_res.Object(BUCKET_NAME, filename)
        obj.put(Body=upload_file, ACL='public-read', ContentType=mimeType)

    await asyncio.to_thread(_put)

    s3_url = f"{DOMAIN}/{filename}"
    return s3_url
