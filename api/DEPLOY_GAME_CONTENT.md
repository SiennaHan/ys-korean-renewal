# 게임 컨텐츠 DB 마이그레이션 — 프로덕션 배포 가이드

5개 게임(spring-picnic, particle-sniper, card-sort, seoul-puzzle, vocashot)의
학습 컨텐츠를 코드 번들에서 DB로 이전하는 첫 배포입니다.

## 영향 범위

**신규 테이블 11개** (`ko_spring_picnic_friend`, `_question`, `ko_particle_sniper_level`,
`_lesson`, `ko_card_sort_category`, `_vocab`, `_rare_example`, `ko_seoul_puzzle_location`,
`_step`, `ko_vocashot_preset`). **기존 테이블 변경 없음** — 100% additive.

**신규 엔드포인트**: `/game-content/*` (학생용 GET 공개, 관리자용 POST/PATCH/DELETE는
`MasterAdminRequired`).

**기존 엔드포인트 변경 없음** — 학생 SPA가 새 엔드포인트를 호출하므로 백엔드 배포가
먼저 완료된 후에 프론트엔드를 배포해야 합니다.

## 배포 순서 (중요)

1. **백엔드 배포 + 시드** (먼저, 5분 이내)
2. 백엔드 헬스체크
3. **admin 프론트엔드 배포** (Vercel)
4. **korean 프론트엔드 배포** (Vercel)

순서가 바뀌면 학생들에게 잠시 빈 게임 화면 노출 가능.

## 1. 백엔드 배포

```bash
# 프로덕션 SSH 접속 후
cd /path/to/koreanapi
git pull origin master

# 종속성에 변동 없음 — pip install 생략 가능 (수행해도 무해)

# 서버 재시작 — startup 시 SQLAlchemy.create_all()이 신규 11개 테이블 자동 생성
bash stop.sh
bash start.sh

# 헬스체크 — 200 응답 + 빈 배열/객체 반환 확인
curl -s http://localhost:8000/game-content/spring-picnic/friends
# 기대 응답: {"result":true,"code":200,"message":"ok","data":[]}
```

**테이블이 자동 생성되지 않을 경우 수동 적용**:

```bash
mysql -u $DB_USER -p $DB_NAME < migration_game_content.sql
```

## 2. 시드 데이터 적용 (1회만)

서버가 새 코드로 떠 있는 상태에서 동일 서버 또는 DB에 접근 가능한 머신에서:

```bash
cd /path/to/koreanapi

# 동일 .env (DB_HOST/USER/PASSWORD/NAME) 가 보이는 환경에서 실행.
python seed_spring_picnic.py     # 4 친구 + 63 문항
python seed_particle_sniper.py   # 6 급수 + 20 레슨
python seed_card_sort.py         # 57 카테고리 + 60 어휘 + 8 희귀어
python seed_seoul_puzzle.py      # 10 장소 + 38 단계
python seed_vocashot.py          # 5 프리셋 + 108 단어
```

모든 시드 스크립트는 **idempotent** — id 기준 upsert. 재실행 안전.

### seoul-puzzle 은 이미 배포한 뒤에도 한 번 더 시드해야 합니다 (2026-08-27)

대화 줄의 번역 필드(`friendMsgT` · `selfMsgT` · `friendMsg2T`)가 **평평한 문자열
하나(영어)** 에서 **언어별 짝**(`{en, ja, zh, vi}`)으로 바뀌었습니다. 전에는 🌐 를
눌러도 앱 언어와 무관하게 늘 영어가 나왔습니다.

- **DB 스키마 변경은 없습니다.** `ko_seoul_puzzle_step.data` 가 JSON 통째로 담는
  TEXT 이고 Pydantic 도 `data: dict` 이라, 바뀐 것은 그 JSON 안쪽뿐입니다.
- 그래서 필요한 것은 `python seed_seoul_puzzle.py` **한 번 더 실행**입니다.
- **앱은 옛 꼴도 읽습니다** — 시드를 다시 넣기 전에는 그 줄만 영어가 나오고,
  깨지지는 않습니다. 즉 배포 순서에 걸리는 일이 없습니다.
- ⚠️ **주의** — 이 시드는 `step` 의 `data` 를 통째로 덮어씁니다. 어드민에서 문항을
  손으로 고친 것이 있으면 그것도 씨드 값으로 돌아갑니다. 첫 배포 때와 달리 지금은
  운영에 데이터가 이미 있으니, 고친 것이 있는지 먼저 확인하세요.

확인:

```bash
curl -s http://localhost:8000/game-content/seoul-puzzle \
  | python3 -c 'import json,sys; d=json.load(sys.stdin)["data"]; print(d["puzzles"]["hongdae"][0]["friendMsgT"])'
# 기대: {'en': ..., 'ja': ..., 'zh': ..., 'vi': ...}  ← dict 여야 한다. str 이면 시드가 안 됐다
```

데이터 확인:

```bash
curl -s http://localhost:8000/game-content/spring-picnic/friends | python3 -c 'import json,sys; print(len(json.loads(sys.stdin.read())["data"]))'
# 기대: 4

curl -s http://localhost:8000/game-content/vocashot/presets | python3 -c 'import json,sys; print(len(json.loads(sys.stdin.read())["data"]))'
# 기대: 5
```

## 3. admin 프론트엔드 배포

```bash
# 로컬에서
cd frontend/admin
git push origin master
# → Vercel 자동 빌드/배포
```

배포 후 https://admin.korean.pulleyai.co.kr 로그인 → 사이드바에 "컨텐츠편집" 메뉴 확인.

## 4. korean 프론트엔드 배포

```bash
cd frontend/korean
git push origin master
# → Vercel 자동 빌드/배포
```

배포 후 https://korean.pulleyai.co.kr 의 게임 5종 정상 로드 확인.

## 롤백 시나리오

**시나리오 1: 백엔드 배포 실패 (서버 미기동)**

```bash
cd /path/to/koreanapi
git reset --hard HEAD~1   # 또는 직전 안정 커밋 SHA
bash stop.sh; bash start.sh
```

신규 테이블은 남아 있지만 `IF NOT EXISTS`라 무해. 데이터 보존됨.

**시나리오 2: 프론트엔드 에러로 학생 SPA 깨짐**

Vercel 대시보드에서 직전 배포로 "Rollback" 클릭.

**시나리오 3: 데이터 손상 시 재시드**

```bash
# 영향 받는 테이블만 TRUNCATE 후 재시드
mysql -e "TRUNCATE ko_spring_picnic_question;" $DB_NAME
python seed_spring_picnic.py
```

## 변경 후 워크플로우

이제부터 컨텐츠 변경은:

- 관리자 SPA의 "컨텐츠편집" 메뉴로 마스터 어드민이 직접 편집 (CREATE/READ/UPDATE/DELETE)
- 잘못된 데이터는 Pydantic 검증으로 422 응답
- 코드 배포 없이 즉시 반영

코드의 JSON 시드 파일은 초기화/재시드용 백업으로만 사용. 일상 변경은 어드민 UI를 사용.
