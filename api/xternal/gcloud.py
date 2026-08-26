import os
from google.cloud import texttospeech

from accepter.base import GoogleTtsName

# 1. 인증 설정: 다운로드한 JSON 키 파일 경로를 지정합니다.
# setdefault 라 밖에서 GOOGLE_APPLICATION_CREDENTIALS 를 준 쪽이 이긴다 —
# 키 파일 위치가 배포마다 다를 수 있다.
os.environ.setdefault(
    "GOOGLE_APPLICATION_CREDENTIALS", "key/korean-483509-9f4249b92e75.json"
)


class _LazyTts:
    """첫 호출 때 만든다 — 서버가 뜰 때 자격증명 파일을 요구하지 않게.

    전에는 `client = TextToSpeechClient()` 를 모듈 로드 때 했다. 구글 SDK 는
    자격증명 파일이 없으면 생성자에서 던지므로, **key/*.json 이 없는 곳에서는
    서버가 안 떴다.** 그 파일은 .gitignore 대상이라 새로 받은 사람에게는 늘 없다.
    이제 실제로 음성을 만들 때만 요구한다.
    """

    _client = None

    def __getattr__(self, name):
        if _LazyTts._client is None:
            _LazyTts._client = texttospeech.TextToSpeechClient()
        return getattr(_LazyTts._client, name)


client = _LazyTts()

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