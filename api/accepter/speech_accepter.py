from fastapi import APIRouter
from accepter.base import makeResponse, SpeechEvaluateRequest, GenerateLineRequest, GenerateScenarioRequest, EvaluateFlexibleRequest
from xternal import openai

router = APIRouter()


@router.post("/evaluate")
async def evaluate_speech(req: SpeechEvaluateRequest):
    result = await openai.evaluate_speech(req.expected, req.actual)
    return makeResponse(result)


@router.post("/generate-line")
async def generate_line(req: GenerateLineRequest):
    result = await openai.generate_roleplay_line(req.template, req.context)
    return makeResponse(result)


@router.post("/generate-scenario")
async def generate_scenario(req: GenerateScenarioRequest):
    result = await openai.generate_scenario(req.turns)
    return makeResponse(result)


@router.post("/evaluate-flexible")
async def evaluate_flexible(req: EvaluateFlexibleRequest):
    result = await openai.evaluate_speech_flexible(req.template, req.actual)
    return makeResponse(result)
