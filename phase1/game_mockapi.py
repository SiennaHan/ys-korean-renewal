"""게임 화면을 띄우기 위한 최소 가짜 API. seed_data 를 그대로 낸다."""
import json, os, re
from http.server import BaseHTTPRequestHandler, HTTPServer

# 저장소가 추적하는 씨드를 읽는다. 전에는 추적되지 않는 사본을 가리켰고,
# 그쪽은 6급에 멈춰 있어서 **이 목 API 를 띄운 사람만 6급까지 보였다**.
import os.path as _p
SEED = _p.join(_p.dirname(_p.abspath(__file__)), '..', 'api', 'seed_data')

# 게임 진행 — 서버는 upsert 에서 max() 로 최고 점수를 유지한다. 같게 흉내낸다.
# {game_name: {stage_id: row}}
GAME_PROGRESS = {}
# ── 대화(미션대화) ────────────────────────────────────────────────────
# 실서버가 없으면 이 화면은 아무것도 못 그린다. 계약(apiType.ts 의
# KoChatMissionResponse · MsgResponse · ChatResponse · CheckMission)대로
# 최소한만 낸다 — 감사 캡처를 위해서다. 대화 내용은 앱의 dialog 데이터가 아니라
# 여기 고정 문장이다.
CHAT_MSGS = {}          # {dialog_id: {'msgs': [...], 'feedbacks': [...]}}
CHAT_SEQ = {'id': 100}  # 메시지 id 발번
CHAT_FIRST = '안녕하세요. 저는 영주예요.'
CHAT_REPLIES = [
    '반가워요! 이름이 뭐예요?',
    '아, 그렇군요. 무슨 일을 하세요?',
    '멋지네요. 오늘 만나서 반가웠어요.',
]
def load(n): return json.load(open(os.path.join(SEED,n),encoding='utf-8'))

def sniper_sentences():
    out={}
    for f in sorted(os.listdir(SEED)):
        m=re.match(r'sentences_lv(\d+)\.json$', f)
        if m: out[f'{m.group(1)}급']=load(f)
    return out

def seoul():
    d=load('seoul_puzzles.json')
    return d if isinstance(d,dict) and 'locations' in d else {'locations':[], 'puzzles':d}

ROUTES={
 '/game-content/spring-picnic/friends':   lambda: load('spring_picnic_friends.json'),
 '/game-content/spring-picnic/questions': lambda: load('spring_picnic_questions.json'),
 '/game-content/particle-sniper/levels':  lambda: load('particle_sniper_levels.json'),
 '/game-content/particle-sniper/sentences': sniper_sentences,
 '/game-content/card-sort/categories':    lambda: load('card_sort_categories.json'),
 '/game-content/card-sort/vocab':         lambda: load('vocab.json'),
 '/game-content/card-sort/rare':          lambda: load('vocab.json').get('rare',[]),
 '/game-content/seoul-puzzle':            seoul,
 '/game-content/vocashot/presets':        lambda: [],
}

class H(BaseHTTPRequestHandler):
    def _send(self, obj, code=200):
        b=json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header('Content-Type','application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin','*')
        self.send_header('Access-Control-Allow-Headers','*')
        self.send_header('Access-Control-Allow-Methods','GET,POST,PATCH,DELETE,OPTIONS')
        self.send_header('Content-Length',str(len(b)))
        self.end_headers(); self.wfile.write(b)
    def do_OPTIONS(self): self._send({})

    # PATCH·DELETE 가 없으면 파이썬 기본 핸들러가 501 을 내고 CORS 머리말도
    # 안 붙어서 브라우저에는 "Failed to fetch" 로만 보인다. 실제로 활동
    # 진행 저장(PATCH /activity/progress)이 그렇게 조용히 죽고 있었다.
    # 본문을 읽어 버리고(안 읽으면 다음 요청이 밀린다) 빈 성공을 돌려준다.
    def _drain(self):
        n = int(self.headers.get('Content-Length', 0))
        if n:
            self.rfile.read(n)

    def do_PATCH(self):
        self._drain(); self._send({})

    def do_PUT(self):
        self._drain(); self._send({})

    def do_DELETE(self):
        self._drain(); self._send({})
    def do_POST(self):
        # /capture/<name> : 목업에서 렌더된 마크업을 파일로 받는다.
        # 마크업을 손으로 옮겨 적다 틀리는 일을 없애기 위한 통로다.
        if self.path.rstrip('/') == '/game-progress':
            n = int(self.headers.get('Content-Length', 0))
            body = json.loads(self.rfile.read(n) or b'{}')
            game, stage = body.get('gameName',''), body.get('stageId','')
            rows = GAME_PROGRESS.setdefault(game, {})
            prev = rows.get(stage)
            score = body.get('score')
            # 최고 점수 유지 — 실서버의 max() 와 같다
            if prev and prev.get('score') is not None and score is not None:
                score = max(prev['score'], score)
            rows[stage] = {
                'id': len(rows) + 1, 'user_id': 'local', 'game_name': game,
                'stage_id': stage, 'score': score,
                'extra_data': None, 'extra': body.get('extra'),
                'completed_at': '2026-08-19T00:00:00' if body.get('completed') else None,
                'created_at': '2026-08-19T00:00:00', 'updated_at': '2026-08-19T00:00:00',
            }
            return self._send({'result':True,'code':200,'message':None,'data':rows[stage]})

        # 대화 — 사람이 한 말을 담고 다음 봇 대사를 낸다
        if self.path.rstrip('/') == '/chat/json':
            n = int(self.headers.get('Content-Length', 0))
            body = json.loads(self.rfile.read(n) or b'{}')
            did = body.get('dialogId') or body.get('dialog_id') or 'd'
            box = CHAT_MSGS.setdefault(did, {'msgs': [], 'feedbacks': []})
            CHAT_SEQ['id'] += 1
            box['msgs'].append({'id': CHAT_SEQ['id'], 'chat_id': 1, 'is_bot': False,
                                'msg': body.get('msg', ''), 'user_id': 'local'})
            reply = CHAT_REPLIES[min(len(box['msgs']) // 2, len(CHAT_REPLIES) - 1)]
            CHAT_SEQ['id'] += 1
            box['msgs'].append({'id': CHAT_SEQ['id'], 'chat_id': 1, 'is_bot': True,
                                'msg': reply, 'user_id': 'bot'})
            return self._send({'result':True,'code':200,'message':None,
                               'data': {'chat_id': 1, 'answer': reply}})
        # 미션 판정 — 말할 때마다 하나씩 채운다. 셋을 다 채우면 종료로 넘어간다
        if self.path.rstrip('/') == '/chat/check/mission':
            n = int(self.headers.get('Content-Length', 0))
            body = json.loads(self.rfile.read(n) or b'{}')
            did = body.get('dialogId') or 'd'
            done = CHAT_MSGS.setdefault(did, {'msgs': [], 'feedbacks': []})
            k = len([m for m in done['msgs'] if not m['is_bot']])
            order = ['인사', '이름', '직업']
            return self._send({'result':True,'code':200,'message':None, 'data': {
                'is_logic_valid': True, 'completed_missions': order[:k],
                'status': 'ok', 'is_context_natural': True,
                'is_vocabulary_natural': True, 'is_grammar_correct': True,
                'is_pronunciation_correct': True,
            }})
        # 상태 감사용 저장 — 살아 있는 화면의 DOM 을 파일로 받는다.
        # **정본 captured/ 가 아니라 state_audit/activity/ 에 쓴다.**
        if self.path.startswith('/audit/'):
            name = re.sub(r'[^A-Za-z0-9_.-]', '_', self.path[len('/audit/'):]) or 'unnamed'
            n = int(self.headers.get('Content-Length', 0))
            raw = self.rfile.read(n) if n else b''
            d = os.path.join('state_audit', 'activity')
            os.makedirs(d, exist_ok=True)
            with open(os.path.join(d, name), 'wb') as f:
                f.write(raw)
            return self._send({'result':True,'code':200,'message':None,
                               'data':{'saved':name,'bytes':len(raw)}})
        # 목업 재캡처 — 정본 프로토타입에서 뜬 마크업을 대조 기준으로 넣는다.
        # **얼어붙은 phase1/_snapshots/ 가 아니라 app/src/screens_ref/ 에 쓴다.**
        # 전에는 captured/(지금의 _snapshots/)에 썼는데, 그 폴더는 시점 기록이라
        # 덮어쓰면 안 되는 곳이 됐다.
        if self.path.startswith('/capture/'):
            name = re.sub(r'[^A-Za-z0-9_.-]', '_', self.path[len('/capture/'):]) or 'unnamed'
            n = int(self.headers.get('Content-Length', 0))
            raw = self.rfile.read(n) if n else b''
            d = os.path.join('..', 'app', 'src', 'screens_ref')
            os.makedirs(d, exist_ok=True)
            with open(os.path.join(d, name), 'wb') as f:
                f.write(raw)
            return self._send({'result':True,'code':200,'message':None,
                               'data':{'saved':name,'bytes':len(raw)}})
        # 학생 로그인 — **비밀번호를 확인하지 않는다.** 로컬에는 계정이 없고
        # (.env 가 이 목을 본다) 어드민 계정은 실서버 것이라 여기서 안 먹는다.
        # 로그인이 필요한 화면(마이페이지)을 감사·확인하려고 계약(LoginToken)대로
        # 토큰과 사용자만 낸다. **인증을 흉내 낼 뿐 인증이 아니다.**
        if self.path.rstrip('/') == '/user/sign/login':
            n = int(self.headers.get('Content-Length', 0))
            body = json.loads(self.rfile.read(n) or b'{}')
            email = body.get('email') or 'local@example.com'
            return self._send({'result':True,'code':200,'message':None,'data':{
                'token':'local-dev-mock',
                'user':{'id':1,'email':email,'name':'로컬 확인용',
                        'role':'student','schoolCode':None}}})
        # 게스트 로그인 — 토큰 없이 {} 만 주면 앱이 "undefined" 를 토큰으로 저장하고
        # 들어온 것처럼 보이다가 모든 요청이 조용히 실패한다. 실서버처럼 토큰을 낸다.
        if self.path.rstrip('/') == '/user/sign/guest':
            n = int(self.headers.get('Content-Length', 0))
            body = json.loads(self.rfile.read(n) or b'{}')
            gid = body.get('guestId')
            if not gid or gid == 'undefined':
                gid = 'local-guest'
            return self._send({'result':True,'code':200,'message':None,
                               'data':{'status':'new','token':'local-dev-mock','guestId':gid}})

        self._send({'result':True,'code':200,'message':None,'data':{}})
    def do_GET(self):
        path=self.path.split('?')[0]
        # 열린 범위 — 실서버의 api/business/entitlement.py 와 **같은 값**을 낸다.
        # 없으면 알 수 없는 경로로 떨어져 {} 를 내는데, 그건 앱에서 "전부 잠김"
        # 으로 읽힌다(2026-08-26 확인 — 무료인 1급 4과에도 자물쇠가 붙었다).
        # 값은 api/shared/free_scope.py 가 정본이다. 여기 손대기 전에 그쪽을 봐라.
        if path.rstrip('/') == '/entitlement':
            return self._send({'result':True,'code':200,'message':None,'data':{
                'source':'guest',
                'books':[],
                'chapters':{'1':[4],'2':[1],'3':[1]},
                'jamo_chapters':[1],
                'games':['vocashot','spring-picnic'],
                'clips':True,
                'expires_at':None}})
        if path.startswith('/game-progress/'):
            game = path[len('/game-progress/'):]
            from urllib.parse import unquote
            rows = list(GAME_PROGRESS.get(unquote(game), {}).values())
            return self._send({'result':True,'code':200,'message':None,'data':rows})
        # 대화 — 계약대로 배열 둘을 낸다. 전에는 알 수 없는 경로라 {} 를 냈고,
        # 그래서 mission-dialog 의 feedbacks.map 이 죽어 대화 화면이 빈 채로 남았다.
        # 타입(MsgResponse)은 msgs·feedbacks 를 배열로 약속한다 — 목도 그것을 지킨다.
        m = re.match(r'^/chat/([^/]+)/msgs$', path)
        if m:
            return self._send({'result':True,'code':200,'message':None,
                               'data': CHAT_MSGS.get(m.group(1), {'msgs': [], 'feedbacks': []})})
        m = re.match(r'^/chat/([^/]+)/user$', path)
        if m:
            did = m.group(1)
            return self._send({'result':True,'code':200,'message':None, 'data': {
                'chat': {'id': 1, 'user_id': 'local', 'book_id': 1, 'dialog_id': did,
                         'idx': 0, 'is_deleted': False},
                'first_msg': CHAT_FIRST,
                'mission': [{'mission': '인사', 'descr': 'Say hello.'},
                            {'mission': '이름', 'descr': 'Say what your name is.'},
                            {'mission': '직업', 'descr': 'Say what your job is.'}],
            }})
        fn=ROUTES.get(path)
        # 목록을 기대하는 곳에 {} 를 주면 화면이 "records is not iterable" 로 죽는다.
        # 진짜 오류를 가리므로, 배열을 기대하는 경로는 빈 배열로 답한다.
        LIST_PATHS = ('/game-progress', '/learning-record/list', '/flashcard/word/',
                      '/dialog/mission/book/', '/review-queue')
        if fn:
            data = fn()
        elif any(path.startswith(x) for x in LIST_PATHS):
            data = []
        else:
            data = {}
        self._send({'result':True,'code':200,'message':None,'data':data})
    def log_message(self,*a): pass

if __name__=='__main__':
    print('mock api on 8799'); HTTPServer(('127.0.0.1',8799), H).serve_forever()
