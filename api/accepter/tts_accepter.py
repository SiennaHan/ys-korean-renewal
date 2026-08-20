import time
from typing import List, Literal

from fastapi import Depends, APIRouter, HTTPException
from fastapi.responses import Response, StreamingResponse
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel

from accepter import auth
from accepter.base import makeResponse
from business import tts as tts_business
from xternal import gemini

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# TTS 호출은 매번 유료 외부 API(Gemini/OpenAI) + S3 업로드를 유발한다. 게스트 토큰으로도
# 호출 가능하고 rate limit 이 없으므로, 최소한 입력 길이를 제한해 비용성 남용을 막는다.
# 상한은 정당한 콘텐츠(단어 최대 15자, 듣기 라인 최대 1309자)를 넉넉히 수용하도록 잡았다.
WORD_TEXT_MAX = 50
SENTENCE_TEXT_MAX = 2000
LISTEN_MAX_LINES = 50

def _checkTextLen(text: str, limit: int) -> None:
	if len(text or "") > limit:
		raise HTTPException(status_code=400, detail=f"텍스트가 너무 깁니다(최대 {limit}자).")

# 미션챗 AI 메시지·AI 롤플레이용 — 공통 캐시(Gemini + S3)에서 음성 URL 반환
class TTSGenerateRequest(BaseModel):
	text: str
	voice: str  # 성별: "female" | "male" (내부에서 provider 목소리로 변환)

@router.post("/generate", dependencies=[Depends(auth.JWTBearer())])
async def generate(req: TTSGenerateRequest):
	_checkTextLen(req.text, SENTENCE_TEXT_MAX)
	return makeResponse(await tts_business.generateAudio(req.text, req.voice))


# 단어(고립 어휘) 학습·플래시카드용 — **조회 전용**.
# 음원은 사전생성 배치(tools/pregen_word_audio.py)로만 채우고, 이 경로는 외부 TTS 를
# 호출하지 않는다. 미생성 단어는 url=None 이 나가고 프런트는 재생을 건너뛴다.
class TTSWordRequest(BaseModel):
	text: str
	voice: str = "female"

@router.post("/word", dependencies=[Depends(auth.JWTBearer())])
async def getWord(req: TTSWordRequest):
	_checkTextLen(req.text, WORD_TEXT_MAX)
	return makeResponse(await tts_business.getWordAudio(req.text, req.voice))


# 미션챗 실시간 스트리밍 — Gemini streamGenerateContent 의 raw PCM(24kHz·모노·16bit)을
# 그대로 흘려보낸다. 캐시/S3 없음(동적). 프런트는 Web Audio로 첫 청크부터 재생.
class TTSStreamRequest(BaseModel):
	text: str
	voice: str  # 성별: "female" | "male"

async def _logFirstChunk(source):
	"""첫 오디오 청크까지 걸린 시간을 로그 — 남은 지연이 Gemini TTFB인지 우리 쪽인지 분리 측정용"""
	start = time.monotonic()
	first = True
	async for chunk in source:
		if first:
			first = False
			print(f"[tts/stream] first audio chunk: {time.monotonic() - start:.3f}s")
		yield chunk

@router.post("/stream", dependencies=[Depends(auth.JWTBearer())])
async def stream(req: TTSStreamRequest):
	_checkTextLen(req.text, SENTENCE_TEXT_MAX)
	voiceName = tts_business.resolveVoice(req.voice, 0)
	return StreamingResponse(
		_logFirstChunk(gemini.gemini_tts_stream(req.text, voiceName)),
		media_type="audio/pcm",
		# 리버스 프록시(nginx)의 proxy_buffering 이 첫 청크를 잡아두지 않도록 방어
		headers={"X-Accel-Buffering": "no", "Cache-Control": "no-cache"},
	)


# 듣고 질문에 답하기 — 지시문 + 발화 라인들의 음성 URL 을 순서대로 반환
class ListenLine(BaseModel):
	text: str
	speaker: str
	voice: str  # 라인 성별: "female" | "male"

class ListenAudioRequest(BaseModel):
	lines: List[ListenLine]
	question: str = ""  # 지시문은 음성 생성 안 함(화면 표시만). 하위호환용으로만 수용.
	# 캐시 무시 재생성 (음성 재생성 배치 generate_tts_samples.py 용).
	# 게스트 토큰으로도 호출 가능하지만 텍스트 길이·라인 수 제한은 동일하게 적용된다.
	force: bool = False

@router.post("/listen/audio", dependencies=[Depends(auth.JWTBearer())])
async def listenAudio(req: ListenAudioRequest):
	if len(req.lines) > LISTEN_MAX_LINES:
		raise HTTPException(status_code=400, detail=f"라인이 너무 많습니다(최대 {LISTEN_MAX_LINES}개).")
	for line in req.lines:
		_checkTextLen(line.text, SENTENCE_TEXT_MAX)
	lines = [line.model_dump() for line in req.lines]
	return makeResponse(await tts_business.getListenAudio(lines, req.force))


TTS_MEDIA_TYPE = {
	"openai": "audio/mpeg",
	"gemini": "audio/wav",
}

class TTSTestRequest(BaseModel):
	provider: Literal["gemini", "openai"]
	text: str
	voice: str

@router.get("/test/voices", dependencies=[Depends(auth.MasterAdminRequired())])
async def testVoices():
	return makeResponse(tts_business.VOICES)

@router.post("/test", dependencies=[Depends(auth.MasterAdminRequired())])
async def ttsTest(req: TTSTestRequest):
	audio = await tts_business.convertTtsTest(req.provider, req.text, req.voice)
	return Response(content=audio, media_type=TTS_MEDIA_TYPE[req.provider])
