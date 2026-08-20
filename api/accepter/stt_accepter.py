from fastapi import Depends, APIRouter, BackgroundTasks
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel

from accepter import auth
from accepter.base import makeResponse
from business import stt as stt_business

router = APIRouter()

# 프런트가 이 엔드포인트에는 토큰을 보내지 않으므로 인증은 선택(있으면 user_id만 기록).
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token", auto_error=False)

class SttRequest(BaseModel) :
	base64sound: str

@router.post("/convert")
async def stt(
	req: SttRequest,
	background_tasks: BackgroundTasks,
	token: str = Depends(oauth2_scheme),
):
	user_id = None
	if token:
		try:
			user_id = auth.getUserIdFrom(token)
		except Exception:
			user_id = None

	result = await stt_business.transcribeWithShadow(
		user_id, req.base64sound, background_tasks
	)
	return makeResponse(result)

@router.get("/shadow/list")
async def shadow_list(
	limit: int = 50,
	offset: int = 0,
	kind: str = "all",
	token: str = Depends(auth.MasterAdminRequired()),
):
	return makeResponse(
		await stt_business.listShadow(limit, offset, kind)
	)
