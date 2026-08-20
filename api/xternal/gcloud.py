import os
from google.cloud import texttospeech

from accepter.base import GoogleTtsName

# 1. 인증 설정: 다운로드한 JSON 키 파일 경로를 지정합니다.
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "key/korean-483509-9f4249b92e75.json"

# 클라이언트 인스턴스 생성
client = texttospeech.TextToSpeechClient()

def generateAudio(text: str, gender: GoogleTtsName):
    # API 호출 및 응답 수신
    response = client.synthesize_speech(
        input=texttospeech.SynthesisInput(
            text=text
        ), 
        voice=texttospeech.VoiceSelectionParams(
            language_code="ko-KR", 
            name=f'{gender.getVoice()}',
            # model_name="gemini-2.5-flash-tts"
        ), 
        audio_config=texttospeech.AudioConfig(
            audio_encoding=texttospeech.AudioEncoding.MP3
        ),
    )

    return response.audio_content

# 실행 예시
if __name__ == "__main__":
    gender = GoogleTtsName.male
    audio = generateAudio("안녕하세요. 이름이 뭐에요?.", gender)

    # 응답 결과를 파일로 저장
    filename = f"output_{gender.name}.mp3"
    with open(filename, "wb") as out:
        out.write(audio)