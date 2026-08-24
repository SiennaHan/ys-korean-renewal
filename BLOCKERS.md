# 막힌 것과 정해지지 않은 것

2026-08-21 기준. 인계받은 사람이 **먼저 부딪힐 순서**로 적었다.
[README.md](README.md) 가 저장소 안내이고, 이 문서는 지금 상태다.

아래에서 `*.html` 을 이름만으로 부르는데 **전부 `phase1/` 안에 있다.**
옛 판은 `phase1/_superseded/` 다.

---

## 1. 프로덕션 빌드 · 고쳤다 (2026-08-20)

원인은 React 버전이 아니라 **락파일이 둘이었던 것**이다.

```
package.json     "@tanstack/react-router": "^1.114.13"
pnpm-lock.yaml   1.136.8      ← 이 프로젝트의 도구는 pnpm 이다
package-lock.json 1.170.29    ← 섞여 들어온 것. node_modules 는 이쪽으로 깔려 있었다
```

캐럿이 1.170 까지 떠올랐고 그 사이에서 라이브러리가 `React["use"]` 를 쓰기 시작했다.
1.136.8 은 쓰지 않는다 — 그래서 **의존성을 올리거나 내릴 필요가 없었다.**

한 일 세 가지.

| | |
|---|---|
| `package.json` | 라우터 셋을 <b>정확히 `1.136.8`</b> 로 고정(캐럿 제거) |
| `package-lock.json` | 지웠다. 루트 `.claude/launch.json` 이 `npm --prefix app run dev` 였던 것도 pnpm 으로 바꿨다 — 설치 명령이 아니라 빌드가 깨지진 않았지만, 남겨 두면 누군가 `npm install` 을 치게 만든다 |
| `pnpm-lock.yaml` | specifier 를 새 값으로 갱신 |

```
npm run build            통과 · 총 21.2MB (gzip 4.7MB)
npm run typecheck        통과
npm run parity:activity  27개 화면 일치
```

⚠️ **npm 으로 설치하지 마라.** `package-lock.json` 이 다시 생기면 같은 일이 반복된다.
`pnpm install` 을 쓴다.

`app/README.md` 은 갈아 썼다. 벤더에서 온 영어 글이 사실과 어긋난 곳이 넷이었다 —
React 19(실제 18.3.1) · koreanapi 포트 8000(실제 8799) · 없는 `.env.example` ·
`/jamolist` 를 자모 화면이라 적은 것(빈 스텁이다).

## 2. 자모 라우트 — 명세가 옳았고 전제가 늦게 왔다 · 진행 중

`dev_spec_v1.html` §4 는 이렇게 못박는다.

> `/learn/jamo?level=1&lesson=&sub=1~6` ← 5개 라우트 · **6→1 통합**
> **콘텐츠 ID를 URL에서 제거한다** — `$code`(YK0041)·`$id`(C4) 노출 폐지.

구현은 아직 **6개 라우트에 `?code=` 를 남기고 있다.**

```
/learn/jamo/pronounce?code=YK0001      ← listen-repeat   (sub 1)
/learn/jamo/combine?code=YK0002        ← write           (sub 2)
/learn/jamo/word-repeat?code=YK0003    ← listen-repeat2  (sub 3)
/learn/jamo/word-write?code=YK0004     ← read-write      (sub 4)
/learn/jamo/choose?code=YK0005         ← listen          (sub 5)
/learn/jamo/combine3?code=YK0032       ← write3          (sub 6)
```

**어긴 것이 아니다.** 명세의 주소 방식은 자모 콘텐츠가 `(과, sub, 묶음)` 으로
주소를 잡을 때 성립하는데, 그 콘텐츠가 원장에 없었다. 구 콘텐츠는 **묶음이 모듈
경계**여서(모음1·자음1·자음2가 각각 별개 모듈) `과+sub` 하나로는 3개를 가리켰다.
그래서 코드로 주소를 잡고 있었다.

**2026-08-20 에 그 전제를 채웠다.** 구 앱 자모 529문항을 원장으로 포팅했다 —
`글로벌_교재기반_콘텐츠_v24.xlsx` 의 `n8_jamo`, 컬럼 12→31.
묶음이 `jamo_group` · `letter` 라는 **데이터 칸**이 되었으므로 이제
`?level&lesson&sub` 로 주소가 잡힌다.

**남은 것은 순서뿐이다.**

| | | |
|---|---|---|
| 3 | **포팅 검수** | 529행 전부 `review_status=draft`. 기계적으로 옮긴 것이라 원본 대조가 필요하다 — `legacy_id`(`Y3W35`)·`legacy_module`(`YK0001`) 열로 한 행씩 맞춰 본다 |
| 4 | 생성기 + 화면 | `build-content.py` 에 `n8_jamo` 추가, 6화면의 데이터 층을 `problem.ts` → JSON 으로 |
| 5 | 라우트 통합 | 6개 → `/learn/jamo?level&lesson&sub` 하나. `?code=` 제거 |

**검수(3)가 끝나기 전에는 4·5 를 하지 않는다.** 검수 안 된 콘텐츠가 화면에 올라가고,
틀리면 셋을 다시 해야 한다. 그때까지 앱은 `problem.ts` 를 그대로 쓴다 —
지금 아무것도 깨져 있지 않다.

포팅하면서 명세 오류 넷을 찾았다. `jamo_authoring_spec_v1.html` 맨 위에 적어 두었다 —
영상 컬럼 누락(288문항) · 자모 격자가 `selection1~3` 에 안 들어감 · 답이 셋 필요 ·
`answer_index` 가 0 부터(§4 는 1 부터라고 적었으나 원장의 다른 시트가 전부 0 부터다).

**목업 대조가 자모 화면에서 찾은 것 (2026-08-21).**
자모 목록을 목업 대조에 넣어 보니 넷이 갈렸다. **여덟 묶음의 낱자를 원장과 전수
대조한 결과 어긋난 것은 모음1 하나였고**(나머지 여섯은 낱자·순서까지 같다) 그것은
고쳤다. 남은 셋은 **목업 쪽이 구 교재 기준**이다.

| 무엇 | 원장 v24 (새 책) | 목업 `screens_uiux`(홈·목록 절) | 앱 | 처리 |
|---|---|---|---|---|
| 모음1 낱자 | **10자** 아·애·어·에·오·외·우·위·으·이 | **10자** ㅏㅓㅗㅜㅡㅣ**ㅐㅔ**ㅚㅟ | 8자였다 | **고쳤다** — `unit.ts` 에 ㅐ·ㅔ 추가(순서도 원장·목업과 같게 ㅣ 뒤) |
| 묶음 이름 | `모음1` | `모음 1` | `모음1` | 원장·앱이 같다. **목업이 갱신 대상** |
| 활동 이름 | — | `자모 듣고 따라하기` · `자모 쓰기` | `발음 듣고 따라하기` · `자음-모음 조합하고 쓰기` | 앱이 새 책 기준. **목업이 갱신 대상** |
| 진행 상태 | — | 완료 · 진행 중 | 전부 빈 자리 | 자모는 진행 기록을 아직 안 읽는다(§6 서버 대기) |

**목업을 새 책 기준으로 갱신했다 (2026-08-21).** `phase1/screens_uiux.html`(홈·목록 절) 의
자모 화면이 구 교재 기준이었다. 고친 것 —

| | 전 | 후 |
|---|---|---|
| 활동 이름 | `자모 듣고 따라하기` · `자모 쓰기` · `단어 읽고 쓰기` | `발음 듣고 따라하기` · `자음-모음 조합하고 쓰기` · `단어 쓰기` |
| 묶음 이름 | `모음 1` · `자음 1` | `모음1` · `자음1` (원장과 같게) |
| 활동 수 | 묶음마다 3개·2개 | **묶음마다 5개** — 실제로 다섯이 고르게 있다 |
| 묶음 수 | 한글 1과에 2개 | **3개** — 모음1 · 자음1 · 자음2 |
| 급 탭 | 한글 + 1~3급 | **한글 + 1~8급** (두 화면이 공유하는 정의였다) |
| 1급 과 칩 | 4~9과 | **4~15과** — 1~3과는 한글 탭으로 간다 |

캡처를 다시 떠서(`phase1/captured/` → `app/src/mockups/`) **자모 목록이 목업 대조에
들어갔다 — 27화면**. 렌더 뒤에 붙는 스크롤 표시 속성(`data-cue-bound` 등)은
디자인이 아니라 걷어냈다.

이 저장소는 **구현이 목업과 다르면 목업이 기준**이다. 이번엔 드물게 목업이 낡은
쪽이었다 — 그 규칙은 시각(레이아웃·치수·색)에 대한 것이고 어긋남은 **콘텐츠**였다.
콘텐츠 정본은 원장이므로 앱을 되돌리지 않고 목업을 고쳤다.

## 3. 라우트 통합 — 자모만 남았다 (2026-08-21 갱신)

| 명세가 요구하는 것 | 지금 |
|---|---|
| `/learn/word` · `grammar` · `listen` · `read` · `roleplay` | ✔ 옮겼다 |
| `/learn/flashcard?level=&lesson=` | ✔ **옮겼다** |
| `/learn/mission-chat?level=&lesson=` | ✔ **옮겼다** |
| `/learn/jamo` | △ 6개로 쪼개짐 — §2 |

**플래시카드·미션대화가 끝났다.** 교재학습 목록
(`app/src/components/main/textbook/index.tsx`)이 `/learn/flashcard` ·
`/learn/mission-chat` 으로 `{level, lesson}` 을 넘긴다. 둘 다
`parseLearnSearch` 로 검증하므로 **URL 에 콘텐츠 ID 가 없다.**
결과 화면도 명세대로 셸 공통으로 접었다 — `components/learn/flashcard-result.tsx`
가 라우트가 아니라 컴포넌트 상태다.

**남은 것은 죽은 옛 라우트를 걷어내는 것이다.** `app/src/routes/book/` 에 19개가
남아 `routeTree.gen.ts` 에 등록돼 있다 — 주소를 직접 치면 닿는다. 플래시카드와
미션대화 쪽으로 `navigate` 하는 코드는 **하나도 없다**(확인했다).

```bash
# 옛 경로로 가는 코드가 정말 없는지
grep -rn 'to: "/book/chapter/unit/' app/src --include='*.tsx' | grep -v routeTree
```

지우기 전에 확인할 것 — `/book/list` 처럼 아직 쓰이는 것이 섞여 있고, 자모 6화면은
§2 의 라우트 통합을 기다린다. **자모(§2)가 끝난 뒤에 한꺼번에 걷어내는 것이 싸다.**

---

## 3-b. 빈 스텁 라우트 넷이 프로덕션에 나간다 (2026-08-21 발견)

`dev_spec_v1.html` §4 는 **"테스트 라우트 9종과 빈 스텁 4종 제외"** 를 요구한다.
**절반만 됐다.**

```
app/rsbuild.config.ts
  routeFileIgnorePattern: NODE_ENV === "production" ? "routes/test/" : undefined
                                                      ↑ 테스트만 빠진다
```

스텁 넷은 그대로 등록되어 주소를 치면 닿는다. 내용은 `Hello "/…"` 한 줄이다.

| 라우트 | 파일 | 줄 수 |
|---|---|---|
| `/flashcard` | `app/src/routes/flashcard.tsx` | 9 |
| `/missionchat` | `app/src/routes/missionchat.tsx` | 9 |
| `/jamolist` | `app/src/routes/jamolist.tsx` | 9 |
| `/about` | `app/src/routes/about.tsx` | 9 |

앞의 셋은 **이름이 실제 기능과 겹쳐서 더 나쁘다** — 진짜는 `/learn/flashcard` ·
`/learn/mission-chat` 이고 자모 목록은 `/main/textbook/jamo` 다. 사람이든 AI든
`flashcard` 를 찾다가 이 스텁을 먼저 집는다. (`README` 가 `/jamolist` 를 자모 화면이라
적어 두었던 것도 이것 때문이다 — §1 에서 고쳤다.)

**고치는 법 둘.** 지우는 것이 낫다 — 아무것도 가리키지 않는다.

```bash
# 확인: 이 넷으로 navigate 하는 코드가 있나
grep -rn 'to: "/\(flashcard\|missionchat\|jamolist\|about\)"' app/src --include='*.tsx'
```

지우기 싫으면 ignore 패턴을 늘린다 — 다만 그러면 **개발에서는 계속 잡힌다.**

---

## 4. 받아쓰기(dictation) 12개는 잔재다 · 판단 불필요 (2026-08-21)

한때 "만들 것인지 버릴 것인지 정해진 적이 없다" 고 적어 두고 여러 문서에서
결정 대기 항목으로 끌고 다녔다. **정할 것이 아니었다** — 예전에 넣었다가
없앤 기능의 잔재다. 실제로 확인한 것 여섯 —

| 확인 | 결과 |
|---|---|
| `module.ts` 의 dictation 12개 | **전부 `is_disabled: true`** |
| 12개의 `code` | **모두 `YK0042` 하나** — 과마다 다른 콘텐츠가 아니라 같은 껍데기를 12번 붙인 것 |
| 그 코드의 문항 | `problem.ts` 에 **0개** |
| 앱의 화면·라우트 | **없다** |
| **배포본**(`korean-master`) | 데이터에만 있고 화면·라우트 **없다** — 지금 서비스에도 없다 |
| **원장 v24** | 받아쓰기 시트도, 그 말이 든 행도 **0** |

붙어 있는 자리는 1급 4~15과 열둘이다. 교재학습 화면은 활동 목록을 코드에 고정된
일곱 줄로 그리므로 `scene_type` 을 보지 않는다 — **애초에 목록에 뜨지도 않는다.**

즉 지금 아무것도 깨져 있지 않고, 새 교재(연세 글로벌 한국어)의 활동 라인업에도
받아쓰기는 없다(`phase1/G1_content_gate_v1.html` §4). **결정할 것이 없으므로 이 항목을 닫는다.**

정리할 일이 하나 남는데 급하지 않다 — `module.ts` 의 죽은 행 12개다.
그 파일은 생성기가 만들지 않는 손 관리 데이터라(`build-content.py` 는 `n*.json` 만
만든다) 지우려면 직접 손대야 한다. **콘텐츠 이관을 할 때 같이 치우는 편이 싸다.**

---

## 5. 목업과 다르게 간 여섯 곳 · 문서 미반영

`phase1/masterplan_v3.html` §16 이 **"구현이 목업과 다르면 목업이 기준"** 이라고 못박았다.
아래 여섯은 그 기준을 **의도적으로 벗어났고**, 지금 문서는 목업 쪽을 말한다.
근거는 커밋 메시지에 있다.

| 무엇 | 목업 | 구현 | 왜 |
|---|---|---|---|
| O/X 문항의 라벨 | `들은 문장` | **`제시 문장`** | 들은 것은 오디오뿐이고 그 글자는 맞는지 가릴 대상이다. 목업 문구가 틀렸다 |
| 문항 사이 이동 | 없음(앞으로만) | **진행 막대를 눌러 이동** | 도크에 `이전` 을 넣으면 주 버튼이 좁아져 목업과 달라진다 |
| 지시문 출처 | — | **원장(xlsx)이 정본** · i18n 은 대비책 | 같은 읽기 활동에서 객관식과 O/X 지시문이 다르다. 실제로 O/X 177문항이 객관식 지시문을 달고 있었다 |
| 녹음 시작·종료 | 누르면 바로 | **2초 준비 · 1초 마무리** | 마이크보다 사람이 빨라 첫 음절이 잘린다 |
| 마이크 거부 | 전체 화면 | **지금 화면 위 알림 + 다시 시도** | 설정에서 켜고 돌아왔을 때 있던 자리를 잃지 않아야 한다 |
| 선택지 채점 | 고른 것 하나만 표시 | **틀린 것이 여럿 남는다** | 맞을 때까지 다시 고르는 기존 동작을 살렸다 |

목업에 없어서 **새로 만든 CSS** 도 있다 — `.instruction p` · `.image-choices` ·
`.grammar-note` · `.catalog-empty` · `.preview-extra` · `.canvas-host` ·
`.record-card .heard .miss` · 진행막대 `.seg`. 각 규칙 위에 왜 만들었는지 적어 두었다.

**하루치 결정은 `phase1/masterplan_v3.html` §16 · §04 에 반영했다.**
아래 명령으로 근거를 볼 수 있다.

```bash
git log --format='%h %s%n%b' --since='2026-08-20'
```

---

## 6. 서버 작업이 시작되지 않았다

`api/` 는 들여왔지만 리뉴얼용 코드는 아직 없다.

| 필요 | 상태 |
|---|---|
| `POST /activity/enter` · `PATCH /activity/progress` · `POST /activity/complete` | 없음 |
| `GET /review-queue` · `DELETE /review-queue/{id}` | 없음 |
| `POST /learning-record` | 있음 — 응답 확장 필요 |
| `GET /dashboard` | 있음 — 필드 추가 필요 |
| `ko_activity_state` · `ko_review_queue` 신설 | 없음 |

화면 22종은 다 만들어져 있고 **상태만 붙이면 된다.** 다만 문서가 말하는
`ActivityShell` 은 **아직 없는 이름이다** — 상태를 전담하는 껍데기를 세우는 것이
남은 일(§6 의 API 가 생긴 뒤)이고, 지금 화면들은 `ActivityFrame` 을 직접 쓰면서
**구 `saveLearningRecord`** 로 기록한다(20곳). 실제 이름 대조는
`phase1/shell_spec_v1.html` §14 맨 위에 있다.

`dev_spec_v1.html` §16 의 네 물음 중 **둘은 정해졌고 둘은 개발자 판단이다.**

| | 물음 | 지금 상태 |
|---|---|---|
| 1 | `complete` 의 `wrongItems` 에 해설 문자열까지 담을지 | **정해졌다(2026-08-21)** — 담지 않는다. 문항 조회로 따로 받는다 |
| 2 | `DELETE /review-queue/{id}` 를 남길지 | **개발 판단** · 권고는 서버 자동 제거(정합성 문제다) |
| 3 | 진행 저장을 매 문항 보낼지 묶을지 | **개발 판단** · 권고는 매 문항 + `keepalive` |
| 4 | 게스트도 신규 API 를 쓰는지 | **정해졌다** — 쓴다. 범위는 아래 |

게스트 허용 범위는 → `phase1/access_and_pricing_v1.html`.
과 단위 맛보기 · 앱 내 결제 · 권한 출처 둘(학교 계약 · 개인 결제). 그 문서에
무료/유료 실측과 신설이 필요한 DB·API, 그리고 **지금 코드가 그 결정을 못 받는 곳 여섯**이
적혀 있다. 남은 물음 다섯 중 가장 큰 것은 **구독인가 권별 구매인가** — 이것이
`ko_entitlement` 의 모양과 환불·복원 규칙 전부를 바꾼다.

거기서 나온 것 중 **이 문서가 알아야 할 세 가지:**

| 무엇 | 왜 막히나 |
|---|---|
| **학생 자체 회원가입이 없다** | `/auth/signup` 은 관리자용이고 학생은 학교가 엑셀로 일괄 생성한다. 게다가 `ko_user.is_approved` 기본값이 **False** 라 개인 구매자가 가입해도 승인 대기로 앉는다. **B2C 의 1차 관문이고 결제보다 먼저 고쳐야 한다** |
| **게임 콘텐츠 6라우트가 무인증** | `card-sort/{categories,vocab,rare}` · `particle-sniper/{levels,sentences}` · `seoul-puzzle`. 이 셋을 유료로 하기로 했는데 주소만 알면 누구나 받는다 — 화면 잠금만으로는 잠금이 아니다 |
| **읽고답하기만 과 키가 없다** | `n5_read_answer_questions` 에는 `chapter` 가 없고 `text_id` 뿐이다. 과 단위로 가두려면 `n5_read_answer_text`(117행)를 거쳐 조인해야 한다. 나머지 여섯 세트는 `(book_id, chapter)` 를 직접 들고 있어 **이것만 예외다** |

게스트 진행을 서버에 남길지는 아직 열려 있다. 남기면 로그인 시
`migrateGuestData` 가 실제로 돌게 되는데 **그 경로는 한 번도 실행된 적이 없다.**

MY 탭 누적 학습 기록은 따로 설계해 두었고 네 결정이 반영돼 있다 →
`phase1/my_learning_summary_v1.html` (별도 전달)

---

## 7. 비밀번호 재설정이 껍데기다 · 메일을 못 보낸다

**메일 발송 수단이 저장소 어디에도 없다.** `boto3` 는 있지만 S3 전용이고 SES 는 쓰지 않는다.
그 결과 재설정 흐름 셋이 화면만 있고 동작하지 않는다.

```
app/src/routes/reset-password.tsx
    // TODO: API call to send reset email
    // await api.post("/user/sign/reset-password", { email });
    navigate({ to: "/check-email" });      ← 아무것도 안 보내고 "메일을 확인하세요" 로 넘긴다

app/src/routes/new-password.tsx
    // await api.post("/user/sign/new-password", { token, password });
```

서버에도 `/user/sign/reset-password` · `/user/sign/new-password` 가 **없다.**

**왜 급한가.** 비밀번호를 잊은 사용자가 오지 않을 메일을 기다리며 갇힌다. 지금은 학교가
학생을 일괄 생성하므로 학교에 물어 우회할 수 있지만, **B2C 자체 회원가입**(§6 의 API 목록)이
붙으면 우회로가 없어진다. 결제까지 오면 영수증도 보낼 수 없다.

**정해진 것 (2026-08-21).** 웹 푸시와 PWA 는 **만들지 않는다** — iOS 는 홈 화면에 추가한
PWA 에서만 푸시가 되고 그 유도 UX 가 비싸며, iOS/안드로이드 비중을 모르는 상태에서
투자 판단이 안 된다. **재방문 유도는 앱 안에서** 한다(연속 학습일이 이미 있다 ·
`ko_daily_activity`). 밖으로 나가는 것은 **메일만**, 그것도 아래 넷으로 한정한다.

| 메일 | 필요한 이유 | 결제와 무관? |
|---|---|---|
| 비밀번호 재설정 | 계정 복구. **B2B 학생에게도 필요하다** | **무관 — 지금 필요** |
| 결제 완료·영수증 | 구매 확인 제공은 전자상거래법상 의무이기도 하다 | 결제 |
| 결제 실패·환불 통지 | 환불 처리 결과를 알려야 한다 | 결제 |
| 구독 갱신 예고·만료 | **구독일 때만.** 급별 구매면 필요 없다 | 결제 · `access_and_pricing_v1` §07 의 1번에 걸린다 |

마케팅·리텐션 메일은 **만들지 않는다.**

**신설이 필요한 것** — 메일 발송(SES 등) · `POST /user/sign/reset-password` ·
`POST /user/sign/new-password` · 재설정 토큰 저장(만료 포함) · 5개 언어 메일 템플릿.

## 8. 콘텐츠에 비어 있는 두 시트

원장 v23 에 스키마만 있고 **내용이 없다.**

| 시트 | 상태 |
|---|---|
| `n7_mission_chat` | 예시 1행. 시나리오·프롬프트 신규 저작 필요 (1~8급 전체) |
| `n8_jamo` | **포팅 완료**(v24 · 529행). 다만 전부 `draft` — 검수 대기. §2 |

생성기는 아직 둘 다 건너뛴다 — `n8_jamo` 는 검수 뒤에 붙인다(§2).

---

## 확인된 상태

인계 시점에 아래는 통과한다.

```bash
cd app
npm run typecheck        # 통과
npm run parity:activity  # 27개 화면 일치
npx biome check src      # 통과
npm run build            # 통과 — §1 에서 고쳤다
```

i18n 은 5개 로케일 **300키**가 일치한다(en·ja·ko·vi·zh 전부 300).
