# 연세 글로벌 한국어 — 리뉴얼

학생용 앱을 리뉴얼하는 작업 저장소다. **먼저 [BLOCKERS.md](BLOCKERS.md) 를 읽어라** —
지금 막혀 있는 것과 정해지지 않은 것이 거기 있다. 특히 `app` 은 지금
**프로덕션 빌드가 되지 않는다**.

## 무엇이 어디 있나

| | |
|---|---|
| `app/` | 학생용 앱. 리뉴얼의 본체다 (React 18 · RSBuild · TanStack Router) |
| `api/` | 서버(`koreanapi`). 2026-08-20 에 그대로 들여왔다 — `api/IMPORT.md` |
| `admin/` | 어드민. 이번 리뉴얼 범위 밖이다 |
| `phase1/` | 기획·명세·목업. 아래 "읽는 순서" 참조 |
| 루트의 `*.html` | 리뉴얼 전체 계획과 초기 검토 문서 |

`korean-master/` · `korean-admin-master/` · `koreanapi-master/` · `writeapi-master/` 는
**지금 배포돼 있는 버전의 참고본**이다. 저장소에 없고(`.gitignore`) 대조용으로만 쓴다.

## 읽는 순서

1. **`phase1/handoff_v2.html`** — 인계. 어디까지 됐고 무엇이 남았는지, 목업을 일부러 벗어난 여섯 곳
2. **`phase1/Phase1_dev_spec_v1.html`** — 개발 요구사항. DB 신설 2종 · API · 라우트 · 셸 컴포넌트
3. **`phase1/api_schema_v1.html`** — API 필드 스키마
4. **`phase1/activity_mockups_uiux.html`** — 활동 화면 목업 **(시각 정본)**
5. **`phase1/nav_mockup_uiux.html`** — 홈·교재학습·자모 목업
6. **`phase1/games_asis_v1.html`** — 게임·표현클립·MY 실측과 판단

목업이 여럿 있는데 **`_uiux` 가 붙은 것이 확정본**이다. 옛 판은
`phase1/_superseded/` 로 옮겼고 그 폴더의 `README.txt` 가 무엇이 무엇을 대체했는지 적는다.

"기획서"라 부를 문서가 넷이라 헷갈리는데 이렇게 나뉜다 —
`renewal_masterplan_v1`(순서) · `renewal_plan_v0.2`(제품 초안) ·
`phase1/renewal_plan_v1`(Phase 1 작업 목록) · `phase1/handoff_v2`(현재 상태).
**개발 착수는 `Phase1_dev_spec_v1` 과 `handoff_v2` 만 보면 된다.**

## 돌리려면 받아야 하는 것

저장소만으로는 돌지 않는다. 세 가지를 따로 받아야 한다.

| 받을 것 | 왜 저장소에 없나 |
|---|---|
| `app/.env` 의 값 8개 | API 주소 · 리소스 호스트 · AppSync 키 |
| `api/.env` 의 값 | DB 접속 · OpenAI · Gemini · Tutorus · JWT |
| `글로벌_교재기반_콘텐츠_v24.xlsx` | 콘텐츠 원장. 교재 파생이라 `.gitignore` 가 막는다. 콘텐츠를 다시 만들 때 필요하다.<br>앱에 반영된 것은 **v23** 이다 — v24 는 자모 포팅분(검수 대기)이 더 들어 있다 |

`PUBLIC_RES_URL_ROOT` 가 비어 있으면 **교재 삽화·음성이 전부 404** 가 된다.
로컬에서 그림이 깨져 보이면 대개 이것이다.

## 실행

```bash
# 앱 — 3000
cd app && pnpm install && pnpm dev

# 목업 대조 (Storybook) — 6006
cd app && pnpm storybook

# 서버 — 8000
cd api && pip install -r requirements.txt && ./start.sh
```

앱의 `.env` 는 서버를 `127.0.0.1:8799` 로 가리키고 있다. `start.sh` 는 8000 에
띄우므로 **둘 중 하나를 맞춰야** 한다.

## 이 저장소가 쓰는 두 장치

리뉴얼 작업에서 만든 것이고, 둘 다 사람 눈 대신 스크립트가 판정한다.

### 목업 대조

```bash
cd app && npm run parity:activity
```

활동 컴포넌트를 정적 HTML 로 그려 `app/src/mockups/activity__*.html`(목업에서 캡처한
마크업)과 구조를 비교한다. **22개 화면이 일치한다.** 봐주는 차이는 실행할 때마다
같이 찍히므로 무엇을 눈감아 주는지 숨지 않는다.

눈으로 볼 것은 Storybook 의 두 스토리다 — "목업 대조"(캡처한 목업)와
"활동 컴포넌트"(우리 컴포넌트). 나란히 놓고 본다.

### 콘텐츠 생성

```bash
cd app && python3 scripts/build-content.py          # 최신 원장으로 다시 만든다
cd app && python3 scripts/build-content.py --check  # 쓰지 않고 차이만 본다
```

`app/src/shared/data/n*.json` 은 **산출물이다. 손으로 고치지 마라** — 다음 생성에서
지워진다. 고칠 것은 원장(xlsx)이다. 자세한 것은 `app/src/shared/data/README.md`.

## 결정이 사는 곳

이 저장소는 **왜 그렇게 했는지를 커밋 메시지에 적는다.** 목업과 다르게 간 곳,
명세와 어긋난 곳, 되돌린 판단이 거기 있다.

```bash
git log --format='%h %s%n%b' -- app/src/components/main/activity
```

⚠️ 2026-08-20 하루 동안의 결정 28건이 **아직 기획 문서에 반영되지 않았다.**
목업과 다르게 간 곳이 여섯 있는데 문서는 목업 쪽을 말한다 —
[BLOCKERS.md](BLOCKERS.md) §5 에 목록이 있다.

## 라이선스 — 공개 금지

교재에서 뽑은 문장·어휘·듣기 지문이 **저장소에 추적된 채로 있다**(약 21MB).
`app/src/shared/data/` · `api/seed_data/` · `api/tools/data/` ·
`admin/src/lib/vocashot/vocabData.json` 이 그렇고, `app/src/shared/data/clip.ts` 는
외부 영상 스크립트 329건이다.

이력에 부록 PDF 는 없다 — 195개 커밋을 훑어 확인했다(`.gitignore` 의 반대 주장은
사실이 아니다). 다만 **공개로 돌리면 안 되는 이유는 위 콘텐츠 자체**이므로 결론은
같다. 파일을 지우는 것만으로는 되지 않고 이력을 다시 써야 한다.
