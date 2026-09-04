import asyncio
import io
from asyncio import sleep
from typing import List
from dotenv import load_dotenv
from openai import AsyncOpenAI, OpenAI, Timeout
from fastapi import HTTPException

from accepter.base import TranslateReq
from util import jsonutils

MODEL = "gpt-5.2"
STT_MODEL = "gpt-4o-transcribe"
TTS_MODEL = "gpt-4o-mini-tts"
ERROR503 = "OpenAI server is busy, try again later"

# OpenAI TTS 지원 화자 목록 (테스트용으로 노출). marin/cedar 는 OpenAI가 권장하는 최신 고품질 화자.
TTS_VOICES = ["marin", "cedar", "alloy", "ash", "ballad", "coral", "echo", "fable", "onyx", "nova", "sage", "shimmer", "verse"]

load_dotenv(override=True)

# **타임아웃 필수 — 없으면 SDK 기본값(무제한에 가깝다)에 맡겨진다**(DEV-12).
# gemini.py 의 `httpx.Timeout(60.0, connect=10.0)` 과 같은 값으로 맞췄다 —
# 이 저장소의 xternal 모듈들이 이미 공유하는 관례다. connect 10s(연결 자체가
# 안 되면 빨리 포기) · 그 밖(read·write·pool) 60s(한 청크를 못 받고 60초가
# 지나면 포기 — 스트리밍이면 "다음 토큰이 60초째 안 온다", 비스트리밍이면
# "응답을 60초째 못 받았다"는 뜻이라 두 경우 모두 같은 값으로 뜻이 선다).
#
# `max_retries=2`(SDK 기본값을 그대로 명시)는 연결 실패·429·5xx 같은 **응답을
# 아예 못 받은 상황**에서만 돈다 — 이미 받은 응답을 버리고 다시 묻는 것이
# 아니다. 그래서 "채팅 응답을 말없이 두 번 만들지 않는다" 를 어기지 않는다.
_TIMEOUT = Timeout(60.0, connect=10.0)
_MAX_RETRIES = 2


def _parseJsonLoose(text: str):
    """모델이 ```json 펜스로 감싸 보내도 파싱한다.

    **왜 필요한가** — `response_format={"type":"json_object"}` 를 주고 있지만 그것을
    지키지 않는 경로가 있다. 2026-09-04 에 사내 게이트웨이(Claude·Gemini)로 리포트를
    태워 보니 펜스를 붙여 보냈고, `jsonutils.to_json` 은 파싱 실패 시 **원문 문자열을
    그대로 돌려준다**. 판정 쪽은 `_normalizeCheckMission` 이 dict 아닌 것을 막지만
    (`business/chat.py`), **리포트는 그것을 삼켜 `ko_chat.report` 에 문자열을 캐시한다**
    — 총평이 영구 공백이 된다. 여기서 한 겹 벗겨 그 실패 모드를 없앤다.
    """
    if not isinstance(text, str):
        return text
    t = text.strip()
    if t.startswith("```"):
        t = t.split("\n", 1)[-1] if "\n" in t else t.removeprefix("```")
        t = t.removesuffix("```").strip()
    return jsonutils.to_json(t)


class _LazyOpenAI:
    """첫 호출 때 만든다 — 서버가 뜰 때 키를 요구하지 않게.

    전에는 `client = OpenAI()` 를 모듈 로드 때 했다. OpenAI SDK 는 키가 없으면
    생성자에서 던지므로 **OPENAI_API_KEY 가 없으면 서버 자체가 안 떴다**.
    학습 흐름(로그인·활동·기록 저장)은 이 키가 필요 없는데도 그랬다.
    이제 /chat/* 같이 실제로 쓰는 요청에서만 키를 요구한다.
    """

    _client = None

    def __getattr__(self, name):
        if _LazyOpenAI._client is None:
            _LazyOpenAI._client = OpenAI(timeout=_TIMEOUT, max_retries=_MAX_RETRIES)
        return getattr(_LazyOpenAI._client, name)


client = _LazyOpenAI()


class _LazyAsyncOpenAI:
    """`quest_stream` 전용 — **비동기 클라이언트라야 스트리밍이 이벤트 루프를 안 막는다.**

    동기 `client` 로 `for chunk in stream:` 을 돌리면(전에 그랬다) 토큰이
    오는 동안 **서버 전체가 멈춘다** — 그 대화 하나가 다른 모든 사용자의
    요청까지 막는다. `AsyncOpenAI` 는 `async for` 를 쓸 수 있어 기다리는
    동안 이벤트 루프가 다른 요청을 처리한다.
    """

    _client = None

    def __getattr__(self, name):
        if _LazyAsyncOpenAI._client is None:
            _LazyAsyncOpenAI._client = AsyncOpenAI(
                timeout=_TIMEOUT, max_retries=_MAX_RETRIES
            )
        return getattr(_LazyAsyncOpenAI._client, name)


asyncClient = _LazyAsyncOpenAI()


async def transcribe(audio_bytes: bytes, filename: str = "audio.webm") -> str:
    """OpenAI 음성 전사. STT shadow 비교용. 동기 SDK 호출을 스레드로 오프로드해 이벤트 루프 블로킹 방지."""
    def _call():
        buf = io.BytesIO(audio_bytes)
        buf.name = filename
        resp = client.audio.transcriptions.create(
            model=STT_MODEL,
            file=buf,
            language="ko",
            temperature=0,
        )
        return resp.text

    return await asyncio.to_thread(_call)


async def tts(text: str, voice: str = "marin") -> bytes:
    """OpenAI TTS 로 텍스트를 음성(mp3)으로 변환하는 함수"""
    def _call():
        response = client.audio.speech.create(
            model=TTS_MODEL,
            voice=voice,
            input=text,
            response_format="mp3",
        )
        return response.read()

    return await asyncio.to_thread(_call)

def create_ai_response(response: any) :
    return {"role": response.role, "content": response.content}

async def quest(chat_history: List[object]) :
    try :
        # 동기 SDK 호출을 스레드로 오프로드해 이벤트 루프 블로킹 방지
        # (블로킹 시 동시 요청, 특히 /tts/stream 이 pending 으로 멈춤)
        completion = await asyncio.to_thread(
            lambda: client.chat.completions.create(
                model=MODEL,
                messages=chat_history,
            )
        )
        return _parseJsonLoose(completion.choices[0].message.content)

    except Exception as e:
        print("Error in creating campaigns from openAI:", str(e))
        raise HTTPException(503, ERROR503)

async def quest_stream(chat_history: List[object]) :
    """미션 대화의 AI 응답 스트림. **`asyncClient` 를 쓴다** — 위 클래스 주석 참고.

    전에는 동기 `client` 로 `for chunk in stream:` 을 돌렸다. 토큰 하나하나가
    올 때마다 이벤트 루프가 그 자리에서 멈춰 **다른 모든 요청이 밀렸다** —
    대화가 길수록, 사용자가 많을수록 심해지는 종류의 문제다.
    """

    try :
        stream = await asyncClient.chat.completions.create(
            model=MODEL,
            messages=chat_history,
            stream=True
        )

        async for chunk in stream:
            if chunk.choices[0].delta.content is not None:
                yield chunk.choices[0].delta.content

    except Exception as e:
        print("Error in creating campaigns from openAI:", str(e))
        raise HTTPException(503, ERROR503)


def missionPrompt(missionListStr: str, scenario: str, userLevel: str, lang: str = "Korean", targetGrammar: str | None = None) :

    # 일단 이거 두 개는 제외
    # - Previous AI Question: "{Previous_AI_Line}"
    # - User Input: "{User_Input_Sentence}"

    intent = """# Role Definition
당신은 한국어 학습 앱의 **'심판(Referee)'**이자 **'언어 코치(Coach)'**입니다.
사용자의 발화를 분석하여 미션 달성 여부를 판단하고, 언어적 정확성을 냉정하게 평가하되 피드백은 부드럽게 전달하세요.

- User Level: """
    intent = intent + userLevel
    intent = intent + """
- Current Topic: """ + scenario
    intent = intent + """
- Mission List: """ + missionListStr
    intent = intent + """
- Target Grammar: """ + (targetGrammar or "(지정 없음)") + """
  ※ **이것은 완료 조건이 아닙니다.** 이 과에서 「쓸 수 있게 유도할」 문법이고,
    사용자가 쓰지 않았어도 뜻이 통하면 미션은 달성입니다.
    쓴 것이 보이면 `target_grammar_used` 를 true 로, 그 근거 표현을
    `target_grammar_evidence` 에 적으세요. 안 썼으면 false 와 빈 문자열입니다.
    **이 값으로 status 를 정하지 마세요** — 사후 피드백에서만 씁니다.
- Feedback Language: """ + lang + """ (아래 'feedback' 필드는 반드시 이 언어로 작성. 단 'recommend_example'은 항상 한국어)

# Analysis Guidelines

### Part 1. Mission & Logic Check
1. **Logic Validity:** 사용자의 말이 직전 질문에 대한 적절한 대답인지(동문서답 아님) 확인하세요.
2. **Mission Completion:**
   - 문법이 틀려도 **의미가 통하면 달성(Success)**입니다.
   - **Mission List**의 키워드 의도를 달성했는지 확인하세요.
   - 한 문장 안에서 여러 미션을 동시에 달성할 필요는 없으며, 순서도 상관없습니다.

### Part 2. Detailed Linguistic Analysis (True/False 판정)
아래의 엄격한 기준에 따라 4가지 항목을 평가하세요.

**1. is_context_natural (내용/맥락)**
   - 질문의 의도에 맞지 않거나, 흐름이 끊기면 `false`
   - **단답형 금지:** 서술어 없이 명사만 말한 경우 `false` (예: "이름이 뭐예요?" -> "김철수")
   - **문장 완결성:** "~요", "~니다" 등 문장을 끝맺는 어미가 없으면 `false`
   - **높임법:** 상황에 맞지 않게 반말을 사용했으면 `false`

**2. is_vocabulary_natural (어휘)**
   - 상황이나 문맥에 어울리지 않는 단어를 사용했으면 `false`

**3. is_pronunciation_correct (표기/맞춤법)**
   - **이 항목은 발음을 판정하지 않습니다.** 소리는 별도의 음향 평가가 잽니다.
     여기서는 **글로 적힌 형태**만 봅니다.
   - 오타가 있거나 철자가 틀렸으면 `false`
   - **필수 체크:** '되요(X) -> 돼요(O)', '할게요(O) -> 할께요(X)'와 같은 용언의 활용 실수를 엄격히 잡으세요.
   - **자소 분리:** 글자가 구성되지 않고 낱자로 쪼개진 경우(예: ㅎㅏㄴㄱㅜㄱ) `false`
   - **[예외]:** 띄어쓰기 오류는 무시합니다. 감정 표현(ㅋㅋ, ㅎㅎ)은 `true`로 인정합니다.

**4. is_grammar_correct (문법)**
   - 조사, 어미 활용, 어순이 틀렸거나 주어-서술어 호응이 안 맞으면 `false`

### Part 3. Final Correction Status (종합 판단)
위의 상세 평가를 종합하여 다음 3가지 중 하나로 결정하세요.

**1. Error:**
   - **`is_logic_valid`가 `false`인 경우 — 무조건 Error입니다.** 직전 질문에 대한
     대답이 아니면(동문서답·주제 이탈) 문법과 철자가 완벽해도 Error로 처리하세요.
     **이것이 다른 어떤 판정보다 앞섭니다.** 묻는 말에 답하지 않은 것은 틀린 것입니다.
   - `is_grammar_correct`가 `false`이거나, `is_pronunciation_correct`가 `false`인 경우.
   - 명백한 문법/철자 오류가 있는 경우.

**2. Tip:**
   - **`is_logic_valid`가 `true`인 것이 전제입니다.** 동문서답은 Tip 이 아니라 Error 입니다.
   - 문법과 철자는 정확하지만(`true`), **상황에 더 적절한 자연스러운 표현이 확실히 있는 경우.**
   - **[중요]** 사용자의 문장이 이미 충분히 자연스럽다면, 굳이 다른 표현을 제안하지 말고 `Perfect`로 처리하세요. (과잉 교정 금지)
   - 반말/존댓말 실수가 있는 경우.

**3. Perfect:**
   - `is_logic_valid`가 `true`이고 4가지 항목이 모두 `true`이며, 문맥상 흠잡을 데 없이
     자연스러운 경우.

### Part 4. Feedback Generation (Coach 역할)
1. **Feedback:**
   - **반드시 위 'Feedback Language'에 지정된 언어로 작성하세요.** (학습자의 모국어로 설명. 예로 드는 한국어 표현·단어만 한국어 그대로 인용)
   - 전문 용어(자소 분리, 피동문 등)를 절대 쓰지 마세요.
   - "조금 어색해요", "이렇게 말하면 더 좋아요"처럼 부드럽게 조언하세요.
   - **[Self-Correction Rule]:** 당신이 제안하는 문장이 한국어 맞춤법(국립국어원 표준)에 완벽하게 맞는지 검증하세요.
     - 예: 받침 유무에 따른 '이에요/예요', '이/가', '은/는' 구분을 철저히 지키세요. (저가(X)->제가(O))
   - 잘했을 경우(Perfect)에는 빈 문자열(`""`)을 출력하세요.
   - **[동문서답일 때]** `is_logic_valid`가 `false`면 **고칠 문장을 알려주는 것이
     아니라 방향만 권고하세요** — 「지금은 이런 주제로 이야기하고 있어요. 그것과
     관련된 내용으로 말해 보세요」처럼 무엇에 대해 말해야 하는지만 알려 줍니다.
     **대신 말할 문장을 지어 주지 마세요** — 학습자가 스스로 주제로 돌아와야 합니다.

2. **Recommend Example (교정 예시):**
   - **Status**가 `Error`나 `Tip`일 때만 작성하세요.
   - **단, `is_logic_valid`가 `false`면 빈 문자열(`""`)을 출력하세요.** 동문서답은
     문장을 고쳐서 해결되는 것이 아니라 **무엇에 대해 말할지**가 틀린 것입니다.
     예시 문장을 주면 학습자가 그것을 그대로 베끼고, 주제로 돌아오는 연습이 사라집니다.
   - 사용자의 원래 의도를 해치지 않는 범위 내에서 가장 자연스러운 문장 1개를 제시하세요.
     **원문에서 실제로 고쳐야 할 곳만 바꾸세요** — 멀쩡한 부분을 다시 쓰거나,
     직전 AI 대사를 그대로 옮기지 마세요.

# Output Format (JSON Only)
반드시 아래 JSON 형식을 준수하세요. (주석은 포함하지 마세요.)

{
  "is_logic_valid": true,
  "completed_missions": ["달성한_키워드"],
  "status": "error",
  "is_context_natural": true,
  "is_vocabulary_natural": true,
  "is_pronunciation_correct": false,
  "is_grammar_correct": true,
  "feedback": "사람들과 부딪힐 때는 '되요'가 아니라 '돼요'라고 써야 해요.",
  "recommend_example": "사람들하고 부딪히게 돼요.",
  "target_grammar_used": false,
  "target_grammar_evidence": ""
}"""

    return intent


# **여기에 옛 판본 프롬프트가 통째로 떠 있었다(77줄).** 변수에 대입되지 않은
# 문자열 리터럴이라 아무도 안 읽는데, 위 `missionPrompt` 바로 아래에 붙어 있어서
# 읽는 사람이 어느 쪽이 정본인지 알 길이 없었다. 살아 있는 것과 규칙도 달랐다 —
# 죽은 쪽은 `tip` 을 「is_context_natural/is_vocabulary_natural 이 false」로,
# 살아 있는 쪽은 「문법·철자는 맞지만 더 자연스러운 표현이 있는 경우」로 정의했다.
# 2026-09-03 에 걷었다. 옛 판을 보려면 `git log -S` 로 이 커밋을 찾아라.

async def check_mission(missionStr: str, scenario: str, level: str,  chatHistory: List[object],
                        lang: str = "Korean", targetGrammar: str | None = None) :
    intent = missionPrompt(missionStr, scenario, level, lang, targetGrammar)

    # `print("mission prompt=>", intent)` 이 있었다 — 매 호출마다 프롬프트 전문
    # (수천 자)을 표준출력에 흘렸다. 2026-09-03 에 걷었다.

    checkMsg = {"role": "system", "content": intent}

    completeHistory = chatHistory
    completeHistory.insert(0, checkMsg)

    try :
        # 동기 SDK 호출을 스레드로 오프로드해 이벤트 루프 블로킹 방지
        completion = await asyncio.to_thread(
            lambda: client.chat.completions.create(
                model=MODEL,
                messages=completeHistory,
                response_format = {"type":"json_object"}
            )
        )
        return _parseJsonLoose(completion.choices[0].message.content)

    except Exception as e:
        errMsg = f'Error in [generating an image] from openAI: {str(e)}'
        print(errMsg)
        raise HTTPException(status_code=590, detail=errMsg)


class CheckMission :
	is_context_natural: bool
	is_vocabulary_natural: bool
	is_grammar_correct: bool
	is_pronunciation_correct: bool
	completed_missions: str
	feedback: str
	recommend_example: str
	description: str
	is_all_natural: bool



def reportPrompt(lang: str = "Korean") :
    intent = """너는 한국어 대화 품질 검토 모델이다.
사용자의 대화 평가목록을 검토한 후 다음 4가지로 평가 항목으로 분류하고 요약내용을 아래의 JSON 포맷으로 작성한다.
대화 평가목록의 feedback에 내용이 없으면, 모든 항목에 대해 잘했다는 의미이다.
각 항목별 요약 내용은 50자 이내로 한다.

[평가 항목]
1. context_natural: 
 - 질문 의도에 맞게 대답하고 대화를 주도했는가? (단답형 회피는 감점)
 - **[동문서답] `[기계가 센 것]` 의 동문서답 횟수를 반드시 반영하세요.** 그 수는
   기계가 센 것이므로 **다시 세지 말고 그대로 쓰세요.**
   1회 이상이면 몇 번이었는지 짚고 「묻는 말에 먼저 답하기」를 권하세요.
   **0회면 언급하지 마세요** — 없었던 문제를 꺼내면 잘한 것이 지워집니다.
2. vocabulary_natural (어휘): 
 - 상황에 맞는 적절한 단어를 사용했는가?
3. pronunciation_correct:
 - **음향 발음 점수(pron_score, 0~100)와 취약 낱말이 주어지면 그것을 기준으로 평가하세요.**
   점수가 낮았던 낱말을 짚어 주고 무엇을 연습하면 좋을지 한 마디 덧붙이세요.
 - **주어지지 않았으면 빈 문자열을 내세요.** 키보드로 입력했거나 측정하지 못한 경우입니다.
   맞춤법으로 대신 평가하지 마세요 — 그것은 이 축이 아닙니다.
4. grammar_correct: 
 - 조사, 어미 활용, 어순이 정확한가?

[응답 JSON 포맷]
- 반드시 아래 형식 그대로 JSON으로만 출력한다.
{
    "context_natural": 내용 평가 요약,
    "vocabulary_natural": 어휘 평가 요약,
    "pronunciation_correct": 발음 및 맞춤법 평가 요약,
    "grammar_correct": 문법 평가 요약
}"""
    intent = intent + """

[언어 규칙] 위 4개 요약 값(문자열)은 반드시 """ + lang + """(으)로 작성한다. (JSON 키 이름은 영문 그대로 유지)"""
    return intent

async def create_report(answerList: List[object], lang: str = "Korean") :
    intent = reportPrompt(lang)

    systemMsg = {"role": "system", "content": intent}

    index = 0
    offTopic = 0
    feedbackStr = "[대화 평가 목록]\n"
    # print("feedbackList=>", jsonable_encoder(answerList))

    # **번호가 전부 리터럴 `1.` 이었다** — `index` 를 세면서 안 썼다. 그래서 모델이
    # 발화 순서를 구분할 수 없었다(2026-09-03).
    #
    # 그리고 **이 블록이 Python 3.10·3.11 에서 죽고 있었다.** 겹따옴표 f-string 안에
    # 겹따옴표(`f"…{feedback["key"]}"`)는 3.12 전용 문법(PEP 701)이다. 실제 3.9 로
    # 재 보니 `407행 f-string: unmatched '['` 로 죽었다. CI 는 3.12 라 통과했다.
    # 같은 꼴을 같은 날 `screens-ref-build.py` 에서도 고쳤다.
    #
    # 키를 `[...]` 로 직접 색인하던 것도 `.get` 으로 바꿨다 — 모델이 키 하나만
    # 빠뜨리면 `KeyError` 로 리포트 생성이 통째로 죽었다.
    for aiAnswer in answerList:
        feedback = jsonutils.to_json(aiAnswer.answer)
        if not isinstance(feedback, dict):
            continue
        index += 1
        ctx = feedback.get("is_context_natural")
        voc = feedback.get("is_vocabulary_natural")
        pron = feedback.get("is_pronunciation_correct")
        gram = feedback.get("is_grammar_correct")
        why = feedback.get("feedback") or ""
        # **동문서답을 센다 — 기계가.** 판정 AI 는 매 발화에 `is_logic_valid` 를 내고
        # 있었는데 **아무도 읽지 않았다**(2026-09-04 확인: 기본값 3곳·타입 1곳·분기 0곳).
        # `false` 인 것만 센다 — 키가 없는 옛 행은 `None` 이라 세지 않는다(「건수 미상」).
        # **AI 에게 세라고 하지 않는다.** 세는 것은 기계가 정확하고, 프롬프트는 그
        # 숫자를 문장으로 옮기기만 하면 된다(어절 밀도에서 정한 것과 같은 원칙이다 —
        # `mission_chat_spec_v1.md` A-9).
        if feedback.get("is_logic_valid") is False:
            offTopic += 1
        feedbackStr += f"{index}. is_context_natural={ctx}"
        feedbackStr += f", is_vocabulary_natural={voc}"
        feedbackStr += f", is_pronunciation_correct={pron}"
        feedbackStr += f", is_grammar_correct={gram}"
        if feedback.get("is_logic_valid") is False:
            feedbackStr += ", off_topic=True"
        feedbackStr += "\n"
        # 음향 발음 점수 — 있을 때만 넣는다. 위 프롬프트가 「주어지지 않았으면
        # 빈 문자열을 내라」로 받으므로, 없는 발화는 그 축을 침묵한다
        pron = feedback.get("pron")
        if isinstance(pron, dict) and pron.get("measured"):
            weak = ", ".join(
                f"{w.get('text')}({w.get('score')})"
                for w in (pron.get("weakWords") or [])
                if w.get("text")
            )
            feedbackStr += f"pron_score={pron.get('score')}"
            feedbackStr += f", pron_weak_words=[{weak}]\n"
        feedbackStr += f"feedback={why}\n\n"

    # 기계가 센 합계 — 0 회일 때도 적는다. 안 적으면 모델이 「모르는 것」과
    # 「없는 것」을 구분할 수 없다.
    feedbackStr += f"[기계가 센 것] 동문서답: {offTopic}회 / 전체 {index}발화\n"

    userMsg = {"role": "user", "content": feedbackStr}

    completeHistory = []
    completeHistory.append(systemMsg)
    completeHistory.append(userMsg)

    try :
        # 동기 SDK 호출을 스레드로 오프로드해 이벤트 루프 블로킹 방지
        completion = await asyncio.to_thread(
            lambda: client.chat.completions.create(
                model=MODEL,
                messages=completeHistory,
                response_format = {"type":"json_object"}
            )
        )
        return _parseJsonLoose(completion.choices[0].message.content)

    except Exception as e:
        errMsg = f'Error in [generating an image] from openAI: {str(e)}'
        print(errMsg)
        raise HTTPException(status_code=590, detail=errMsg)


async def evaluate_speech(expected: str, actual: str):
    """롤플레이 발화 유사도 판정: 기대 문장 vs STT 결과"""
    prompt = f"""당신은 한국어 발음 평가 심판입니다.
사용자가 특정 한국어 문장을 따라 말해야 합니다.
음성인식(STT) 결과를 기대 문장과 비교하여 판정하세요.

[기대 문장]
{expected}

[사용자 발화 (STT 결과)]
{actual}

[판정 기준]
1. STT 특성상 띄어쓰기, 마침표, 미세한 조사 차이는 허용합니다.
2. 핵심 단어(명사, 동사, 형용사)가 기대 문장과 동일한 의미여야 합니다.
3. 완전히 다른 단어로 대체된 경우 불합격입니다. (예: "불고기" → "떡볶이")
4. 문장의 의미가 실질적으로 같으면 합격입니다.
5. 발화가 너무 짧거나 핵심 내용이 빠졌으면 불합격입니다.

반드시 아래 JSON 형식으로만 응답하세요:
{{"pass": true 또는 false, "reason": "짧은 판정 사유"}}"""

    try:
        completion = await asyncio.to_thread(
            lambda: client.chat.completions.create(
                model=MODEL,
                messages=[
                    {"role": "system", "content": "당신은 한국어 발화 평가 심판입니다. JSON으로만 응답하세요."},
                    {"role": "user", "content": prompt},
                ],
                response_format={"type": "json_object"},
            )
        )
        return _parseJsonLoose(completion.choices[0].message.content)
    except Exception as e:
        print("Error in evaluate_speech:", str(e))
        return {"pass": False, "reason": "평가 실패"}


async def translate(req: TranslateReq):
    prompt = f"Translate the following Korean text to {req.targetLang}: {req.text}"
    try:
        completion = await asyncio.to_thread(
            lambda: client.chat.completions.create(
                model=MODEL,
                messages=[
                    {"role": "system", "content": "You are a translation assistant."},
                    {"role": "user", "content": prompt},
                ]
            )
        )
        return {"translated": completion.choices[0].message.content}
    except Exception as e:
        # 실패하면 원문을 그대로 돌려준다 — 번역은 보조 기능이라 여기서
        # 막히면 안 된다. 화면은 이미 원문(한국어)을 들고 있다
        print("Error in translate:", str(e))
        return {"translated": req.text}


async def generate_roleplay_line(template: str, context: str = ""):
    """롤플레이 템플릿 문장을 자연스러운 한국어로 변환.
    [이름], [나라] 등 플레이스홀더를 채우고, / 로 구분된 대체 문장 중 하나를 선택."""
    prompt = f"""당신은 한국어 대화 생성기입니다.
아래 템플릿 문장을 자연스러운 한국어 대화 문장 1개로 만들어 주세요.

[템플릿]
{template}

[규칙]
1. [이름], [나라], [숫자] 등 대괄호 안의 플레이스홀더는 적절한 구체적 값으로 교체하세요.
2. " / " 로 구분된 대체 문장이 있으면 하나만 선택하세요.
3. "이에요/예요", "-어요/-아요" 같은 문법 변형은 선택한 단어에 맞게 하나만 사용하세요.
4. 결과는 자연스러운 한국어 1문장만 출력하세요. 설명이나 따옴표 없이 문장만 반환하세요.
{f"[이전 대화 맥락]{chr(10)}{context}" if context else ""}"""

    try:
        completion = await asyncio.to_thread(
            lambda: client.chat.completions.create(
                model=MODEL,
                messages=[
                    {"role": "system", "content": "한국어 대화 문장을 생성합니다. 문장만 반환하세요."},
                    {"role": "user", "content": prompt},
                ],
            )
        )
        text = completion.choices[0].message.content.strip().strip('"').strip("'")
        return {"text": text}
    except Exception as e:
        print("Error in generate_roleplay_line:", str(e))
        return {"text": template}


async def generate_scenario(turns: list):
    """시나리오 전체 턴을 한 번에 생성. 대화 맥락이 일관되도록 한 세트로 처리."""
    turn_lines = []
    for t in turns:
        role = "사용자" if t.get("speaker") == "user" else "AI"
        turn_lines.append(f"턴{t['turn_seq']} ({role}): {t['ko']}")
    turns_text = "\n".join(turn_lines)

    prompt = f"""당신은 한국어 대화 생성기입니다.
아래는 롤플레이 시나리오의 대화 턴 목록입니다.
각 턴의 템플릿을 자연스러운 한국어 대화로 변환해 주세요.

[대화 턴 목록]
{turns_text}

[규칙]
1. [이름], [나라], [숫자] 등 대괄호 안의 플레이스홀더는 적절한 구체적 값으로 교체하세요.
2. " / " 로 구분된 대체 문장이 있으면 대화 흐름에 맞게 하나만 선택하세요.
3. "이에요/예요", "-어요/-아요" 같은 문법 변형은 선택한 단어에 맞게 하나만 사용하세요.
4. 대화 전체의 맥락이 일관되어야 합니다. (예: 턴1에서 언급한 이름을 턴3에서도 동일하게 사용)
5. 플레이스홀더나 / 가 없는 턴은 그대로 반환하세요.

반드시 아래 JSON 형식으로만 응답하세요:
{{"turns": [{{"turn_seq": 1, "text": "변환된 문장"}}, {{"turn_seq": 2, "text": "변환된 문장"}}, ...]}}"""

    try:
        completion = await asyncio.to_thread(
            lambda: client.chat.completions.create(
                model=MODEL,
                messages=[
                    {"role": "system", "content": "한국어 대화 시나리오를 생성합니다. JSON으로만 응답하세요."},
                    {"role": "user", "content": prompt},
                ],
                response_format={"type": "json_object"},
            )
        )
        result = jsonutils.to_json(completion.choices[0].message.content)
        return result
    except Exception as e:
        print("Error in generate_scenario:", str(e))
        # fallback: 원본 텍스트 그대로 반환
        return {"turns": [{"turn_seq": t["turn_seq"], "text": t["ko"]} for t in turns]}


async def evaluate_speech_flexible(template: str, actual: str):
    """템플릿 기반 유연한 발화 평가: 플레이스홀더/대체문이 포함된 기대 문장 vs STT 결과"""
    prompt = f"""당신은 한국어 발음 평가 심판입니다.
학습자가 아래 템플릿에 해당하는 문장을 자유롭게 말해야 합니다.

[템플릿 문장]
{template}

[사용자 발화 (STT 결과)]
{actual}

[판정 기준]
1. 템플릿의 [이름], [나라], [숫자] 등 플레이스홀더 부분은 어떤 적절한 값이든 허용합니다.
2. " / " 로 구분된 대체 문장 중 어느 것이든 허용합니다.
3. "이에요/예요" 같은 문법 변형은 어느 쪽이든 허용합니다.
4. 템플릿의 고정 부분(플레이스홀더가 아닌 부분)은 의미가 일치해야 합니다.
5. STT 특성상 띄어쓰기, 마침표, 미세한 조사 차이는 허용합니다.
6. 발화가 너무 짧거나 핵심 내용이 빠졌으면 불합격입니다.

반드시 아래 JSON 형식으로만 응답하세요:
{{"pass": true 또는 false, "reason": "짧은 판정 사유"}}"""

    try:
        completion = await asyncio.to_thread(
            lambda: client.chat.completions.create(
                model=MODEL,
                messages=[
                    {"role": "system", "content": "한국어 발화 평가 심판입니다. JSON으로만 응답하세요."},
                    {"role": "user", "content": prompt},
                ],
                response_format={"type": "json_object"},
            )
        )
        return _parseJsonLoose(completion.choices[0].message.content)
    except Exception as e:
        print("Error in evaluate_speech_flexible:", str(e))
        return {"pass": False, "reason": "평가 실패"}