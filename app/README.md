# app — 학생 웹

연세 글로벌 한국어 학생용 SPA. **Speako** 의 student-web 을 이 저장소로 들여온 것이고,
리뉴얼 작업은 전부 이 안에서 했다. 저장소 안내는 [../README.md](../README.md),
지금 막힌 것과 정해지지 않은 것은 [../BLOCKERS.md](../BLOCKERS.md) 에 있다.

> 원래 있던 영어 README 를 갈아 썼다. 그 글은 Speako 모노레포를 설명하고 있었고
> 지금 사실과 어긋난 곳이 넷이었다 — React 버전 · koreanapi 포트 · `.env.example` ·
> `/jamolist`.

## 먼저 알아야 할 것 셋

| | |
|---|---|
| **pnpm 만 쓴다** | `npm install` 을 하면 `package-lock.json` 이 다시 생기고 **프로덕션 빌드가 깨진다**. 지난번 원인이 이것이었다 — [../BLOCKERS.md](../BLOCKERS.md) §1 |
| **라우터 버전을 올리지 마라** | `@tanstack/react-router` 셋은 캐럿 없이 **정확히 `1.136.8`** 로 고정돼 있다. 1.15x 부터 React 19 의 `use` 를 쓰기 때문에 React 18 인 이 앱에서 빌드가 죽는다 |
| **`src/shared/data/` 는 공개 금지** | 교재에서 파생한 문장·어휘·듣기 지문 20MB 다. 저장소를 **비공개로 유지**해야 하는 이유다 |

## 스택

- **React 18.3.1** + TypeScript (선언은 `^18.2.0`)
- **RSBuild** — 빌드
- **TanStack Router** — 파일 기반 라우팅(`src/routes/`, `routeTree.gen.ts` 자동 생성)
- **Tailwind CSS v4** + ShadCN/UI (New York)
- **Zustand** — 전역 상태 · **Dexie** — IndexedDB
- **i18next** — 5개 언어(en · ko · ja · zh · vi), 기본값 `en`
- **Chart.js** · **Framer Motion** · **Lottie** · **canvas-confetti**
- **react-audio-voice-recorder** / **react-speech-recognition** — 마이크·STT
- **AWS Amplify**(AppSync) — 실시간 GraphQL
- **Biome** — 린트·포맷(탭, 쌍따옴표)
- **Storybook** — 활동 컴포넌트 카탈로그

## 시작하기

```sh
pnpm install
pnpm dev            # http://localhost:3000
```

`.env` 는 저장소에 없다(`.gitignore`). **`.env.example` 도 없다** — 값 8개를 별도로
받아야 한다([../README.md](../README.md) 의 "받을 것" 표).

`PUBLIC_RES_URL_ROOT` 가 비어 있으면 **교재 삽화·음성이 전부 404** 가 된다.
로컬에서 그림이 깨져 보이면 대개 이것이다.

## 스크립트

| 명령 | 하는 일 |
|---|---|
| `pnpm dev` | 개발 서버 (3000) |
| `pnpm build` | `tsc --noEmit` 뒤 프로덕션 빌드 → `dist/` |
| `pnpm preview` | 빌드 후 로컬 서빙 |
| `pnpm typecheck` | 타입 검사만 |
| `pnpm check` / `lint` / `format:write` | Biome |
| `pnpm storybook` | 활동 컴포넌트 카탈로그 (6006) |
| `pnpm parity:activity` | **목업 대조** — 아래 |

### `parity:activity` — 목업이 기준이다

구현이 목업과 다르면 **목업이 맞다**(`../phase1/handoff_v2.html` §03).
사람 눈으로 보던 것을 스크립트로 옮겼다.

```
scripts/activity-parity.tsx      컴포넌트를 react-dom/server 로 정적 HTML 로 렌더
scripts/activity-parity-diff.py  src/mockups/ 의 캡처와 구조를 비교 · 22개 화면
```

일부러 봐주는 차이(색 별칭, 한 칸짜리 진행막대 등)는 **실행할 때마다 목록으로 출력**한다.
새로 봐주려면 그 파일의 `IGNORED` 에 이유와 함께 적는다.

### `scripts/build-content.py` — 원장에서 JSON 을 만든다

**원장(xlsx)이 콘텐츠 정본이고 `src/shared/data/*.json` 은 산출물이다.** 손으로 고치지 마라.
원장은 저장소 밖에 있다. 자세한 것은 [src/shared/data/README.md](src/shared/data/README.md).

## 구조에서 알아둘 곳

```
src/
├── components/main/activity/   활동 셸과 조각들 — 목업에서 이식한 것. 여기가 리뉴얼의 중심이다
├── mockups/                    목업 캡처(.html)와 screens.ts. parity 가 읽는다
├── routes/learn/               활동 라우트 정본
├── shared/data/                교재 파생 콘텐츠 — 공개 금지
├── styles/                     activity · game · nav · vocashot 은 이관 CSS
└── i18n/locales/               en · ko · ja · zh · vi
```

**이관 CSS 넷**(`activity·game·nav·vocashot.css`)은 목업에서 그대로 가져온 것이라
**한 줄 한 규칙** 형태를 유지한다. Biome 이 이걸 1800줄로 부풀려서 `biome.json` 의
`files.ignore` 에 넣었다 — 목업과 대조할 수 있어야 하므로 그대로 둔다.

## 라우트

- `/learn/*` — **활동 정본**. `fill-blank` · `listen-answer` · `read-answer` · `listen` ·
  `read` · `word` · `grammar` · `roleplay`
- `/learn/jamo/*` — 자모 6종(`pronounce` · `combine` · `word-repeat` · `word-write` ·
  `choose` · `combine3`). 아직 명세 §4 의 한 라우트 + `sub` 꼴이 아니다 —
  [../BLOCKERS.md](../BLOCKERS.md) §2
- `/main/*` — 홈 · 교재학습 · 표현클립 · MY(게스트는 로그인으로 보낸다)
- `/flashcard` · `/missionchat` — **아직 구 경로다.** 교재학습 목록이 실제로 여는 길이므로
  이관 대상이다(handoff §05 의 1번)
- `/login` · `/reset-password` · `/check-email` · `/new-password` — 인증
- `/jamolist` — **빈 스텁이다**("Hello /jamolist!"). 자모는 `/learn/jamo/*` 에 있다

`menu_type` 값(`fill-blank` · `listen-answer` · `read-answer`)은 **DB 값이라 바꿀 수 없다**
(명세 §2.2). 라우트 이름만 바뀐 것이다.

## 인증

- **게스트**(자동 로그인)와 **학생**(이메일·비밀번호) 둘 다 된다.
- 로그인 시 게스트 기록을 계정으로 옮기는 `migrateGuestData` 는 로그인 화면이 게스트를
  돌려보내는 탓에 **한 번도 실행되지 않았다.** MY 게스트 차단을 넣다가 찾았고 길을 열어 두었다.
- 언어 설정은 localStorage(`speako-language`).

## 배포

Vercel. Output Directory 를 `dist` 로.
