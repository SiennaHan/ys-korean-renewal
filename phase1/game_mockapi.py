"""게임 화면을 띄우기 위한 최소 가짜 API. seed_data 를 그대로 낸다."""
import json, os, re
from http.server import BaseHTTPRequestHandler, HTTPServer

SEED='../koreanapi-master/koreanapi-master/seed_data'
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
    def do_POST(self):    self._send({'result':True,'code':200,'message':None,'data':{}})
    def do_GET(self):
        path=self.path.split('?')[0]
        fn=ROUTES.get(path)
        data = fn() if fn else ([] if path.startswith('/game-progress') else {})
        self._send({'result':True,'code':200,'message':None,'data':data})
    def log_message(self,*a): pass

if __name__=='__main__':
    print('mock api on 8799'); HTTPServer(('127.0.0.1',8799), H).serve_forever()
