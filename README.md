# 연세 글로벌 한국어 — 리뉴얼

학생용 앱을 리뉴얼하는 작업 저장소다. 문서가 26개인데 **처음에 볼 것은 셋뿐이다.**

무엇이 갖춰졌고 **무엇이 빠졌는지**는 정본 기획서 `phase1/renewal_masterplan_v2.html`
**§2 덮개 지도**에 있다 — 영역 × 산출물 표이고 **빈 칸이 곧 빠진 기획이다.**

## 처음 30분 — 이 셋만 순서대로

| | 무엇 | 왜 먼저 |
|---|---|---|
| 1 | **[BLOCKERS.md](BLOCKERS.md)** | 지금 막혀 있는 것과 **정해지지 않은 것**. 여기 없는 것은 대체로 정해져 있다는 뜻이다 |
| 2 | **`phase1/handoff_v2.html`** | 어디까지 됐고 무엇이 남았나. 문서 지도(§01)와 **목업을 일부러 벗어난 여섯 곳**(§03) |
| 3 | **`phase1/Phase1_dev_spec_v1.html`** | 무엇을 만들라 — DB 신설 2종 · API · 라우트 · 셸 |

전체 그림이 필요하면 **`phase1/renewal_masterplan_v2.html`**(정본 기획서) —
덮개 지도(§2) · 게이트 현황(§5) · Phase 1 상태(§8) · 리스크(§13).

나머지 23개는 **필요할 때 찾아 보는 참고서다.** 아래 표에서 물음으로 찾아라.

## 무엇을 알고 싶으면 어느 문서

| 알고 싶은 것 | 문서 (`phase1/`) |
|---|---|
| 화면이 어떻게 생겨야 하나 — **시각 정본** | `activity_mockups_uiux` · `nav_mockup_uiux` · `game_screens_uiux` · `shell_mockup_uiux` |
| 활동 셸의 상태 전이 · 정상 흐름 밖의 화면 · 접근성 | `G2_shell_and_state_spec_v1` |
| 셸을 어떤 컴포넌트로 쪼개나 | `Shell_component_spec_uiux` |
| CSS 규격 · 토큰 · 간격 | `build_spec_uiux` |
| API 요청·응답 필드 | `api_schema_v1` |
| **누가 무엇까지 볼 수 있나 — 무료/유료 경계 · 결제** | `access_and_pricing_v1` |
| **교재학습 탭** — 활동으로 들어가는 유일한 길 | `textbook_tab_spec_v1` |
| MY 누적 학습기록에 필요한 데이터 | `my_learning_summary_v1` |
| 활동 12종이 각각 무엇이고 문항 스키마는 | `G1_activity_lineup_v2` · `G1_item_schema_proposal_v1` |
| 자모 콘텐츠를 어떻게 저작하나 | `jamo_authoring_spec_v1` — **맨 위의 실측 정정을 먼저 읽어라** |
| 게임·표현클립·MY 의 실측과 판단 | `games_asis_v1` · `games_polish_v1` · `home_asis_v1` |
| VocaShot | `vocashot_solo_spec_v1`(명세) · `vocashot_play_uiux`(**문항 1149개로 도는 시제품**) |
| 목업을 어떻게 읽나 | `mockup_read_v1` |
| 리뉴얼 **전** 앱이 어땠나 (현행 as-is) | `app_asis_mockup_v1` — 인터랙티브 목업 |
| 학습 한 바퀴가 어떻게 돌아야 하나 | `core_loop_mockup_v1` — "오답은 기록이 아니라 예약" 원칙이 여기서 나왔다 |

**"기획서" 라 부를 문서가 넷이어서 헷갈렸다. 셋으로 줄였다** —
`renewal_masterplan_v2`(**정본 기획서**: 덮개 지도 · 게이트 · Phase 1 상태) ·
`renewal_plan_v0.2`(제품 초안 D1~D7, **D7 은 대체됐다**) · `handoff_v2`(인계 · 시점 기록).
**개발 착수에는 `Phase1_dev_spec_v1` 과 `handoff_v2` 만 있으면 된다.**

목업이 여럿인데 **`_uiux` 가 붙은 것이 확정본이다.** 정본이 아닌 22개는
`phase1/_superseded/` 로 옮겼다. 그 폴더의 `README.txt` 가 항목마다 **[대체됨]**(더 새 판이 있다)
인지 **[근거]**(대체된 게 아니라 다른 문서의 주장을 받치는 산출물)인지 적는다.

> 목업을 열면 **삽화가 깨져 보인다.** `illust/`(1.4GB) 와 `handwriting/` 은 교재 파생이라
> `.gitignore` 가 막는다 — 고장이 아니다. 실제 앱은 `PUBLIC_RES_URL_ROOT` 에서 받는다.

## 무엇이 어디 있나

| | |
|---|---|
| `app/` | 학생용 앱. 리뉴얼의 본체다 (React 18 · RSBuild · TanStack Router) — `app/README.md` |
| `api/` | 서버(`koreanapi`). 2026-08-20 에 그대로 들여왔다 — `api/IMPORT.md` |
| `admin/` | 어드민. 이번 리뉴얼 범위 밖이다 |
| `phase1/` | 기획·명세·목업 HTML 26개 + `_superseded/` 22개.<br>그 밖에 인계 메모 넷(`*_handoff_note.txt`) · 디자인 토큰(`tokens.css` · `figma_*.json`) · 가짜 API(`game_mockapi.py`) |

`korean-master/` · `korean-admin-master/` · `koreanapi-master/` · `writeapi-master/` 는
**지금 배포돼 있는 버전의 참고본**이다. 저장소에 없고(`.gitignore`) 대조용으로만 쓴다.

## 돌리려면 받아야 하는 것

저장소만으로는 돌지 않는다. 세 가지를 따로 받아야 한다.

| 받을 것 | 왜 저장소에 없나 |
|---|---|
| `app/.env` 의 값 8개 | API 주소 · 리소스 호스트 · AppSync 키. **`.env.example` 이 없으니 값을 직접 받아야 한다** |
| `api/.env` 의 값 | DB 접속 · OpenAI · Gemini · Tutorus · JWT |
| `글로벌_교재기반_콘텐츠_v24.xlsx` | 콘텐츠 원장. 교재 파생이라 `.gitignore` 가 막는다.<br>앱에 반영된 것은 **v23** 이다 — v24 는 자모 포팅분(검수 대기)이 더 들어 있다 |

`PUBLIC_RES_URL_ROOT` 가 비어 있으면 **교재 삽화·음성이 전부 404** 가 된다.
로컬에서 그림이 깨져 보이면 대개 이것이다.

## 실행

```bash
cd app && pnpm install && pnpm dev
```

⚠️ **`npm install` 을 하지 마라.** `package-lock.json` 이 다시 생기면
프로덕션 빌드가 깨진다 — 한 번 겪었다. [BLOCKERS.md](BLOCKERS.md) §1.

```bash
cd api && pip install -r requirements.txt && ./start.sh
```

앱의 `.env` 는 서버를 `127.0.0.1:8799` 로 가리키고 `start.sh` 는 8000 에 띄운다.
**둘 중 하나를 맞춰야 한다.**

## 이 저장소가 쓰는 두 장치

리뉴얼 작업에서 만든 것이고, 둘 다 사람 눈 대신 스크립트가 판정한다.

### 목업 대조 — 시각 정본은 목업이다

**구현이 목업과 다르면 목업이 기준이다.**

```bash
cd app && pnpm parity:activity
```

컴포넌트를 정적 HTML 로 그려 `app/src/mockups/*.html`(목업에서 캡처한 마크업)과
구조를 비교한다. **24개 화면이 일치한다** — 활동 22 + 교재학습 목록 + 자모 목록.
봐주는 차이는 실행할 때마다 같이 찍히므로 무엇을 눈감아 주는지 숨지 않는다.

**홈 셋만 아직 들어가 있지 않다.** 홈은 데이터를 넣을 길이 없어(props 를 받지 않는다)
정적으로 그리면 스피너만 나온다 — 활동 화면들처럼 표시와 데이터를 갈라야 넣을 수 있다.

눈으로 볼 것은 Storybook(`pnpm storybook`, 6006)의 두 스토리다 —
"목업 대조"(캡처한 목업)와 "활동 컴포넌트"(우리 것). 나란히 놓고 본다.

### 콘텐츠 생성 — 원장이 정본이다

```bash
cd app && python3 scripts/build-content.py          # 최신 원장으로 다시 만든다
cd app && python3 scripts/build-content.py --check  # 쓰지 않고 차이만 본다
```

`app/src/shared/data/n*.json` 은 **산출물이다. 손으로 고치지 마라** — 다음 생성에서
지워진다. 고칠 것은 원장(xlsx)이다. 자세한 것은 `app/src/shared/data/README.md`.

### 문서 참조 검사

```bash
python3 phase1/check_docs.py
```

문서를 옮기거나 합치거나 절 번호를 바꿨을 때 **"다 고쳤다" 고 믿는 대신 이것을 돌린다.**
문서 참조 · 절 인용 · 고아 · 옛 경로 넷을 검사하고 하나라도 끊어지면 **1 을 낸다.**

이 저장소는 문서를 **이름과 절 번호로** 인용한다(절 인용이 358개다). 그래서 한 곳을
옮기면 조용히 끊어지는 곳이 생긴다 — 실제로 문서를 못 치우고 쌓아 온 이유가 이거였다.
만들자마자 끊어진 참조 둘을 잡았다.

## 결정이 사는 곳

이 저장소는 **왜 그렇게 했는지를 커밋 메시지에 적는다.** 목업과 다르게 간 곳,
명세와 어긋난 곳, 되돌린 판단이 거기 있다.

```bash
git log --format='%h %s%n%b' -- app/src/components/main/activity
```

목업을 일부러 벗어난 여섯 곳은 `phase1/handoff_v2.html` §03 에 이유까지 적혀 있다.

## 라이선스 — 공개 금지

교재에서 뽑은 문장·어휘·듣기 지문이 **저장소에 추적된 채로 있다**(약 21MB).
`app/src/shared/data/` · `api/seed_data/` · `api/tools/data/` ·
`admin/src/lib/vocashot/vocabData.json` 이 그렇고, `app/src/shared/data/clip.ts` 는
외부 영상 스크립트 329건이다.

이력에 부록 PDF 는 없다 — 195개 커밋을 훑어 확인했다(`.gitignore` 의 반대 주장은
사실이 아니다). 다만 **공개로 돌리면 안 되는 이유는 위 콘텐츠 자체**이므로 결론은
같다. 파일을 지우는 것만으로는 되지 않고 이력을 다시 써야 한다.
