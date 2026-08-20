"""게임 화면을 띄우기 위한 최소 가짜 API. seed_data 를 그대로 낸다."""
import json, os, re
from http.server import BaseHTTPRequestHandler, HTTPServer

SEED='../koreanapi-master/koreanapi-master/seed_data'

# 게임 진행 — 서버는 upsert 에서 max() 로 최고 점수를 유지한다. 같게 흉내낸다.
# {game_name: {stage_id: row}}
GAME_PROGRESS = {}
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

        if self.path.startswith('/capture/'):
            name = re.sub(r'[^A-Za-z0-9_.-]', '_', self.path[len('/capture/'):]) or 'unnamed'
            n = int(self.headers.get('Content-Length', 0))
            raw = self.rfile.read(n) if n else b''
            os.makedirs('captured', exist_ok=True)
            with open(os.path.join('captured', name), 'wb') as f:
                f.write(raw)
            return self._send({'result':True,'code':200,'message':None,
                               'data':{'saved':name,'bytes':len(raw)}})
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
        if path.startswith('/game-progress/'):
            game = path[len('/game-progress/'):]
            from urllib.parse import unquote
            rows = list(GAME_PROGRESS.get(unquote(game), {}).values())
            return self._send({'result':True,'code':200,'message':None,'data':rows})
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
