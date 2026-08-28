<!-- 관찰: app/src/styles/tokens.css, app/src/styles/activity.css, app/src/styles/nav.css, app/src/styles/auth.css, app/src/styles/globals.css, app/src/components/main/activity, app/src/components/ui, app/src/shared/constants @ edba97f -->

# DESIGN.md — 학생앱 디자인

이 앱의 화면이 **지금 실제로 어떻게 생겼는지**를 코드에서 재어 적은 것이다.

## 0. 이 문서는 무엇인가

### 두 단계로 자란다

| | 무엇 | 지금 |
|---|---|---|
| **1단계 — 현황** | 코드에서 잰 값. "지금 이렇다" | **여기까지 됐다** |
| **2단계 — 규범** | "앞으로 이렇게 한다" | §8 의 `정할 값` 칸이 비어 있다 |

**이 문서가 결국 되려는 것은 규범이다.** 다만 무엇이 있는지도 모르는 채로 규칙을
정하면 이미 다수인 쪽을 소수로 만들어 버린다. 그래서 이번 판은 **규범이 들어갈
자리를 만들고 그 자리를 채울 근거를 대는 데까지** 한다.

§8 의 표에서 `정할 값` 칸이 비어 있으면 **그 줄은 아직 규범이 아니다.** 채워진
줄만 규범이다. 기획자가 빈칸을 채우는 순간 이 문서는 2단계가 된다.

### 게임 다섯은 범위 밖이다

VocaShot · 봄소풍 숫자미션 · 서울 여행 퍼즐 · 어휘 카드 마스터 · 조사 스나이퍼는
**의도적으로 다른 세계다.** 무대가 어둡고 게임마다 자기 팔레트를 쥔다. 학습 화면과
같아지는 것이 목표가 아니므로 이 문서가 다루지 않는다 — 값도 재지 않았고 규범도
적용 대상이 아니다. `styles/game.css` · `styles/vocashot.css` ·
`components/main/game/**` · `routes/main/game/**` 이 그 범위다.

### 다른 문서와의 경계

`phase1/shell_spec_v1.html` §21~34 가 값을 정한다. 그것은 **학습 활동 셸의 명세**고
이 문서는 **전 화면군의 현황**이다. 값이 갈리면 shell_spec 이 이긴다.

**화면 수는 여기 적지 않는다.** 세는 단위가 넷이라 CLAUDE.md 가 따로 경고하는
자리이고, 주인 문서가 있다. 지금 수가 필요하면 `python3 phase1/check_docs.py` 가
첫 줄에 찍는다.

### 언제 낡는가

절마다 **그 숫자를 낸 명령**을 같이 적었다. 숫자가 미덥지 않으면 다시 돌려라.

맨 위 `<!-- 관찰: … -->` 스탬프가 걸려 있어서, 이 문서가 값을 캔 파일이 바뀌면
`check_docs.py` 가 "이 문서를 다시 봐라" 고 말한다. **이 장치가 없으면 측정치가 많은
문서는 없느니만 못하다** — 실제로 `app/src/styles/tokens.css` 주석에 적힌 부채 수치
(389 · 998)가 지금 실측(69 · 189)과 5배 넘게 어긋난 채 남아 있다.

---

## 1. 화면 지도 — 무엇이 어느 세계에 사나

| 화면군 | CSS | 클래스 접두사 | 색 출처 | 목업 대조 |
|---|---|---|---|---|
| **학습 활동** | `styles/activity.css` (563줄) | `.activity-frame .*` (목업 이름 그대로) | semantic 토큰 | ○ |
| **내비·홈·교재학습·자모 목록** | `styles/nav.css` (268줄) | `.nav-frame .*` | semantic 토큰 | ○ |
| **인증** (로그인·가입·재설정) | `styles/auth.css` (748줄) | `.auth-*` | semantic 토큰 | ✕ |
| **표현클립** | 없음 — Tailwind 인라인 | 없음 | semantic 토큰 유틸 + 임의값 | ○ |
| **레거시 교재 트리** `/book/**` | 없음 — Tailwind 인라인 | 없음 | **임의값·기본 팔레트** | ✕ |
| **MY · 법적 · 문의 · QR** | 없음 — Tailwind 인라인 | 없음 | 섞임 | ✕ |
| ~~게임 다섯~~ | ~~`game.css`·`vocashot.css`~~ | — | — | **범위 밖** (§0) |

**세 세대가 겹쳐 있다.**

1. **목업 이관 세대**(활동·내비) — 목업 CSS 를 클래스 이름째로 가져오고 색만 토큰으로
   바꿨다. 수치가 목업에 근거가 있다.
2. **토큰 세대**(인증) — 처음부터 semantic 토큰만 보고 썼다. 목업 캡처는 없다.
3. **Tailwind 인라인 세대**(레거시 교재·MY·QR) — 클래스 이름도 CSS 파일도 없다.
   부채가 여기 몰려 있다(§8-b).

표현클립은 3세대의 꼴을 쓰지만 색은 토큰 유틸리티를 쓴다 — 중간이다.
**2026-08-28 기준 아직 만드는 중이라 값이 굳지 않았다.**

> **레거시 교재 트리는 죽은 화면이 아니다.** `/book/$id` · `/book/chapter/$id` ·
> `/book/chapter/unit/$id` 세 층이 살아서 옛 동선을 그린다(BLOCKERS.md). 다만 목업
> 대조 밖이라 **아무 검사도 이 화면들의 생김새를 보지 않는다.** §8 의 물음 하나가
> 이것이다.

---

## 2. 기반 — 실제 값

### 2.1 색 — 토큰은 2단, 그런데 절반이 리터럴로 복제돼 있다

`app/src/styles/tokens.css` 가 primitive → semantic **2단**으로 되어 있다. 색과
타이포의 개수는 `phase1/shell_spec_v1.html` §21 이 주인이다 — 여기 옮겨 적지 않는다.

| semantic 갈래 | 쓰는 곳 |
|---|---|
| `--color-text-*` | 본문 · 보조 · 지시문 제목 · 강조 · 비활성 · 반전 |
| `--color-background-*` | 화면 · 카드 · 선택지 · 정답 · 오답 · 주의 · 비활성 · 내려앉은 상자 |
| `--color-fill-*` | 주 버튼 · 진행바 · 정답/오답 아이콘 · 플래시카드 알아요/몰라요 |
| `--color-line-*` | 구분선 · 컨트롤 테두리 · 비활성 · 포커스 링 |
| `--color-icon-*` | 본문 · 보조 · 정답 · 오답 · 반전 · 장식(`faint`) |

토큰 파일이 스스로 정한 규칙은 **"화면 코드는 semantic 만 쓴다. primitive 를 화면에서
직접 쓰는 것은 예외 취급한다"** 이다.

**그런데 지켜지지 않는다.** 토큰화됐다는 CSS 셋에 하드코딩 hex 가 **63개** 있고,
그중 **28개는 primitive 토큰 값의 정확한 복제**다.

| 파일 | hex | 그중 primitive 값과 같은 것 |
|---|---|---|
| `activity.css` | 35 | **21** |
| `nav.css` | 27 | **6** |
| `auth.css` | 1 | **1** |

가장 많이 복제된 것 — `#ffffff`(12회) = `--color-primitive-white-100`,
`#f9fafc`(5회) = `white-50`, `#a2d1ff` = `blue-100`, `#59acff` = `blue-300`,
`#d7dbe3` = `blue-gray-200`, `#adb3be` = `blue-gray-400`, `#4b505a` = `blue-gray-800`.

`.activity-frame .chip-opt.on` 의 `background:#e9f2fc` 처럼 **토큰에 없는 색**도
섞여 있다.

<details><summary>다시 재는 법</summary>

`app/src/styles/` 에서 `activity.css` · `nav.css` · `auth.css` 의 주석을 지우고
`#hex` 를 뽑아, `tokens.css` 의 `--color-primitive-*` 값과 대조한다.
</details>

### 2.2 타이포 — 눈금은 토큰이 쥐고, 글꼴은 `<link>` 로만 온다

`tokens.css` 가 `--text-*` 로 눈금을 둔다(개수는 `shell_spec_v1` §21 이 주인).
갈래는 넷이다.

| 갈래 | 크기 | 쓰는 곳 |
|---|---|---|
| `h2` · `h3` · `h4` (각 700/600 두 벌) | 32 · 24 · 20 | 결과 화면 큰 숫자, 제목 |
| `subtitle1~4` | 18 · 17 · 16 · 14 | 활동 지시문(`subtitle1-sb`), 헤더 활동명(`subtitle3-sb`) |
| `b1` · `b2` · `b3` (sb/m/r) | 16 · 14 · 12 | 버튼 라벨(`b1-sb`), 선택지(`b1-m`), 문항 본문(`b1-r`) |
| `c1` · `c2` · `c3` | 14 · 12 · 10 | 진행 카운트(`c2-m`) |

**글꼴이 오는 길은 하나뿐이다.** Pretendard 는 `app/index.html` 의 `<link>` 다.
`globals.css` 에 사고 기록이 남아 있다 — 전에는 CSS `@import` 였는데 **Tailwind v4
의 import 해석기가 원격 `@import` 를 위치와 무관하게 버려서, 프로덕션에서 Pretendard
가 아예 로드되지 않고 시스템 sans-serif 로 그려지고 있었다.** 폰트를 CSS 에서
부르려 하지 마라.

`--font-sans` 는 `"Pretendard", "Apple SD Gothic Neo", -apple-system,
BlinkMacSystemFont, sans-serif` 다.

> `nav.css` 는 2026-08-26 에 눈금 밖이던 넷(11 · 13 · 19 · 22)을 가장 가까운
> 눈금(12 · 14 · 20 · 24)으로 올렸다. 기획자 확인을 받은 변경이다.

### 2.3 간격과 radius — **토큰이 없다**

색과 타이포는 토큰인데 **간격·radius 토큰은 `tokens.css` 에 아예 없다.** 그래서
화면군마다 자기 값을 쓴다.

| | 서로 다른 값 | 총 횟수 | 가장 많은 값 |
|---|---|---|---|
| `border-radius` | **22종** | 143 | `12px` (32회), `50%` (26), `10px` (16), `8px` (9) |
| `gap` | **21종** | 108 | `8px` (23), `12px` (14), `10px` (11), `6px` (9) |
| `padding` | **34종** | 231 | `16px` (36), `12px` (29), `14px` (18), `10px` (14) |

화면군별 radius 갈래 수:

| 파일 | radius 종 | 방식 |
|---|---|---|
| `activity.css` | 18종 | 리터럴 (목업 값 그대로) |
| `nav.css` | 10종 | **변수 2개**(`--radius-card:14` · `--radius-control:9`) + 리터럴 |
| `auth.css` | 8종 | 리터럴 |

`nav.css` 만 프레임 안에 자기 눈금을 둔다 — `--gutter:16` · `--radius-card:14` ·
`--radius-control:9` · `--space-1..6`(4·8·12·16·24). **이것이 지금 이 앱에 있는
유일한 간격 눈금이고, 한 화면군 안에만 산다.**

<details><summary>다시 재는 법</summary>

`app/src/styles/` 의 `activity.css`·`nav.css`·`auth.css`·`globals.css`·`tokens.css`
에서 `border-radius:` · `gap:` · `padding:` 값을 뽑아 **공백으로 쪼개되 `var(...)` 는
한 덩이로 두고** 센다.

> **세는 법을 여기 적어 두는 이유** — `var(...)` 를 쪼개느냐에 따라 padding 이
> 34종/231회와 35종/225회로 갈린다. 실제로 이 문서를 검증하다 그것 때문에 한 번
> 어긋난 것으로 나왔다. 다시 잴 때 이 규칙을 쓰지 않으면 값이 안 맞는다.
</details>

### 2.4 프레임과 반응형

- 폭은 **`M_WIDTH 375` / `T_WIDTH 768`** 두 값뿐이다
  (`app/src/shared/constants/index.ts`).
- `components/app-layout.tsx` 가 `h-dvh` 안에서 그 폭을 `max-width` 로 잡고,
  바깥은 회색, 안쪽은 흰 카드에 그림자. 폭 전환은 스프링 애니메이션이다.
- 화면군의 프레임(`.activity-frame` · `.nav-frame` · `.auth-page`)은 **부모를
  채운다.** 부모가 높이를 안 주면 `100%` 가 `auto` 로 풀려 아래가 비는 사고가
  실제로 있었다(각 CSS 머리 주석).
- 미디어 쿼리는 사실상 없다 — 게임 밖에서는 `prefers-reduced-motion` 하나뿐이다.
  **폭 두 개를 앱이 직접 잡으므로 CSS 브레이크포인트가 필요 없는 구조다.**

**다크모드는 없다.** `dark:` 변형이 `app-layout.tsx` 두 곳에 있지만 **켜는 장치가
없어 죽은 코드다.** `globals.css` 에는 shadcn 이 남긴 oklch 변수 64개가 있는데
이것도 별개 계보다(§2.6).

### 2.5 모션

게임 밖의 `@keyframes` 는 **다섯 개**뿐이다.

| 이름 | 파일 | 쓰임 |
|---|---|---|
| `btn-pop` | `globals.css` | 버튼 누름 |
| `record-pulse` · `record-spin` | `activity.css` | 녹음 중 |
| `choice-shake` · `choice-blink` | `activity.css` | 오답 흔들림 · 정답 깜빡임 |

지속시간은 **`0.16s` 가 압도적**(12회)이고 그 밖은 `1.2s`·`0.8s`·`0.3s`.
이징은 `ease`(12) · `ease-out`(4) · `linear`(2).

`prefers-reduced-motion: reduce` 는 **`auth.css` 와 `activity.css` 에만** 걸려 있다.
`nav.css` 와 Tailwind 인라인 세대에는 없다.

### 2.6 아이콘과 컴포넌트 계보

- `lucide-react` — **48 파일**에서 쓴다. 사실상 기본 아이콘 세트.
- `app/src/assets/icons.tsx` — 129줄의 자체 SVG. 목업이 그린 것들.
- `app/src/components/ui/*` **8개**(`button` · `dialog` · `assess-chart` ·
  `circular-progress` · `book-header` · `header-back-button` ·
  `language-selector` · `settings-page`) — **shadcn 잔재다.** `cva` 로 짜였고
  `globals.css` 의 oklch 변수 계보에 붙어 있다. **토큰과 다른 뿌리**이고 아직
  11곳에서 `--primary` 등을 쓴다.

---

## 3. 컴포넌트 카탈로그 — 역할별 가로 비교

**이 절이 일관성 작업의 핵심이다.** 같은 역할을 나란히 놓아 값이 갈린 자리를
드러낸다. `정할 값` 은 §8 에서 채운다.

### 주 버튼 — 셋 다 다르다

| | 학습 활동 `.primary` | 인증 `.auth-primary` | 내비 `.paywall-cta` |
|---|---|---|---|
| 높이 | `height:56px` | `min-height:52px` | `height:50px` |
| radius | `12px` | `12px` | `var(--radius-control)` = **9px** |
| 글자 | 16 / 24 | 16 / 22, 700 | 16, 700 |
| 배경(활성) | `--color-fill-primary` | `--color-fill-primary` | `--color-fill-primary` |
| 비활성 | `--color-background-disable` + `--color-text-disable` | 같음 | `opacity:.48` (색은 그대로) |
| 목업 근거 | ○ (활동 목업) | ✕ | ○ (nav 목업) |

**색은 이미 하나다. 갈린 것은 높이(56/52/50)와 radius(12/12/9)와 비활성 표현이다.**

### 그 밖의 역할

| 역할 | 학습 활동 | 내비·홈 | 인증 |
|---|---|---|---|
| **앱바** | `.appbar` `flex:0 0 58px`, 그리드 `44px 1fr 44px` | `.chapter-head` `min-height:42px` | `.auth-topbar` `min-height:56px` |
| **아이콘 버튼** | `.icon-control` 44×44, svg 24 | `.tabbar svg` 22 | `.auth-back` 40×40 |
| **입력칸** | — (활동엔 거의 없다) | — | `.auth-input` `height:52px` · radius `12px` · padding `0 16px` |
| **선택지** | `.choice` `min-height:64px` · radius `12px` · padding `16px 48px 16px 18px` | — | — |
| **칩** | `.chip-opt` radius `8px` · padding `10px 16px` | `.chip3` `height:32px` · radius `9px` · padding `0 12px` | — |
| **카드** | `.problem-card` radius `16px` · padding `18px` | `--radius-card` = `14px` | `.auth-panel` `max-width:360px` · gap `28px` |
| **모달** | `.activity-confirm` 바텀시트, radius `20px 20px 0 0` | — | — |
| **토스트** | — | — | — |

**토스트는 어느 화면군에도 없다.** `components/toast/toast.tsx` 가 Tailwind
인라인으로 따로 산다 — `rounded-lg` · `max-w-xs` · `p-4` · `shadow-lg`, 색은
Tailwind 기본 팔레트. **이 앱에서 토큰과 가장 먼 컴포넌트다.**

카드 radius 가 **16(활동) · 14(내비) · 12(클립의 `rounded-[10px]` 도 있다)** 로
갈린다. 칩 radius 도 **8(활동) · 9(내비)** 로 1px 다르다.

---

## 4. 상태의 문법

| 상태 | 색 | 어디서 오나 |
|---|---|---|
| 정답 | 배경 `--color-background-correct` · 아이콘 `--color-icon-correct` | 토큰 |
| 오답 | 배경 `--color-background-wrong` · 아이콘 `--color-icon-wrong` | 토큰 |
| 주의(3회 이상 틀림) | `--color-fill-caution` | 토큰 |
| 비활성 | `--color-background-disable` + `--color-text-disable` | 토큰 |
| 진행바 미응답 | `--color-fill-track` | 토큰 |
| 플래시카드 알아요/몰라요 | `--color-fill-known` / `--color-fill-unknown` | 토큰 |

**상태 색은 토큰이 잘 잡고 있다.** 갈리는 것은 색이 아니라 **표현 방식**이다 —
비활성을 인증·활동은 색 교체로, 내비 `paywall-cta` 는 `opacity:.48` 로 낸다.

**빈 상태 · 로딩 · 에러는 공통 컴포넌트가 없다.** `Loading` 이 20파일,
`isLoading` 이 10파일, `Error` 가 16파일에 흩어져 있고 생김새를 맞추는 장치가 없다.
`.nav-frame .catalog-empty` 처럼 화면군 안에서만 정의된 것이 있을 뿐이다.

---

## 5. 언어가 디자인에 주는 압력

**규칙**(`phase1/shell_spec_v1.html` §31) — 학습 대상(문항 본문·선택지·지문·대화문·
자모)은 **한국어 고정**, 그 밖(활동 지시문·앱바·버튼·pill·결과 화면·건너뛰기·도구
버튼)은 **UI 언어**를 따른다. 로케일은 `ko` · `en` · `ja` · `zh` · `vi` 다섯이다.

**이것이 레이아웃에 주는 압력이 실제 버그를 냈다.** 같은 자리에 한국어 4글자가
들어가던 칸에 베트남어가 17글자로 온다. 그래서:

- **글자를 담는 칸에 고정 px 폭을 주지 마라.** 줘야 하면 `min-width` 로 두어 자라게
  한다.
- `app/scripts/fixed-box-check.py` 가 **고정 px 폭인데 안에 변수가 들어가는 칸**을
  찾아 사람에게 보여 준다. `pnpm check:css` 가 같이 돌린다. 걸리면 그 자리를 열어
  **가장 긴 실제 값**이 들어가는지 보고 `ALLOW` 에 무엇을 확인했는지 적어야 통과한다.
- 넘치는지 눈으로 볼 때 `scrollWidth` 를 믿지 마라 — `overflow:visible` 인 블록은
  넘친 글자를 안 센다. `Range.getClientRects()` 로 실제 글자 폭을 재라.

---

## 6. 접근성

- **포커스 링** — `--color-line-focus` 토큰이 있고 `:focus-visible` 규칙이 6곳.
  Tailwind 인라인 세대에는 없다.
- **`.ux-control`** — 목업이 "누를 수 있는 것" 에 붙인 표식. 게임에서 온 관행이지만
  `paywall` 등 밖에서도 쓴다.
- **화면 전환 때 초점을 옮긴다** — SPA 라 아무도 안 하면 초점이 `<body>` 로 떨어져
  스크린리더가 화면이 바뀐 줄 모르고 다음 Tab 이 문서 맨 처음으로 간다.
  `components/main/game/use-screen-focus.ts` 의 관행이 학습 화면에도 쓰인다.
- **`aria-label` 은 `t()` 를 지난다** — 앱 언어를 따라야 한다.
- **`prefers-reduced-motion`** 은 `auth.css` · `activity.css` 에만 있다(§2.5).

---

## 7. 무엇이 이 디자인을 지키나 — 그리고 못 지키나

| 검사 | 보는 것 | **못 보는 것** |
|---|---|---|
| `pnpm parity:activity` | 목업 캡처와 **마크업 구조**가 같은지 | 색·간격·글꼴이 토큰인지. 목업 캡처가 없는 화면군(인증·레거시·MY) |
| `pnpm check:css` | CSS 이름과 코드 이름이 **양방향**으로 맞는지 | 값이 맞는지 |
| `fixed-box-check.py` | 고정 px 폭 칸에 변수가 들어가는 자리 | 실제로 넘치는지(폰트 없이는 못 센다) |
| `check_docs.py` | 문서의 참조·숫자·낡은 표현 | 문서가 맞는 말인지 |

**아무도 안 보는 축이 있다.**

- 색이 **토큰 밖**인지 (그래서 §2.1 의 복제 28개가 남았다)
- 간격·radius 가 **눈금 밖**인지 (그래서 §2.3 의 22종·34종이 생겼다)
- 같은 역할의 컴포넌트가 **화면군 사이에서 갈렸는지** (§3)

§8 에서 값을 정하면 이 축들도 셀 수 있다.

---

## 8. 정해야 할 물음 — 규범이 될 자리

**여기가 2단계의 입구다.** `정할 값` 이 비어 있으면 아직 규범이 아니다.

**1·2·3·4·6·7·8 은 2026-08-28 에 정해졌다.** 채워진 줄은 규범이다.

| # | 물음 | 후보 | 다수·정본 근거 | **정한 값** | 정하면 굳힐 방법 |
|---|---|---|---|---|---|
| 1 | 주 버튼 높이를 하나로 볼까 | 56 · 52 · 50 | 56=활동(목업 근거 ○) · 52=인증 · 50=내비(목업 ○) | **56px** ✔ | CSS 값 검사 |
| 2 | 주 버튼·선택지·입력칸 radius | 12 · 9 | **12 가 다수**(활동·인증), 9 는 내비 변수 | **12px** ✔ | 〃 |
| 3 | 비활성 표현을 하나로 볼까 | 색 교체 · `opacity:.48` | 색 교체가 다수(활동·인증) | **색 교체** ✔ | — |
| 4 | radius 눈금을 몇 개로 둘까 | 지금 **22종** | `12px` 32회로 최다, 이어 `10` `8` `16` | **12(컨트롤) · 16(카드) · 8(칩)** ✔ | 눈금 밖 값 세기 |
| 5 | 간격 눈금을 토큰으로 올릴까 | `nav.css` 의 `--space-1..6`(4·8·12·16·24) | **이 앱의 유일한 눈금**, 한 화면군에만 산다 | 기본 여백 **16px** · **4의 배수** 방침 — 아래 5-b | 〃 |
| 6 | 카드 radius | 16(활동) · 14(내비) · 10(클립) | 목업 근거는 16·14 둘 다 있다 | **16px** ✔ | 〃 |
| 7 | 칩 radius | 8(활동) · 9(내비) | 1px 차 — 둘 다 목업 근거 있음 | **8px** ✔ | 〃 |
| 8 | 앱바를 하나로 볼까 | 58 · 42 · 56 | 화면군마다 하는 일이 다르다(뜻이 있을 수 있다) | **58px** ✔ (내비의 과 머리 42 는 앱바가 아니라 목록 머리라 그대로) | — |

**정한 값은 활동 화면 쪽으로 모았다.** 활동이 목업 근거가 가장 두껍고 화면 수도 가장
많다. 그래서 **바뀌는 것은 인증과 내비다** — 자세한 것은 아래 8-c.

#### 5-b. 간격은 4의 배수로 (2026-08-28 방침)

기본 여백은 **16px**, 그 밖의 간격도 **웬만하면 4의 배수**로 둔다.
**소급 적용은 아직 하지 않았다** — 지금 어긋난 양이 크고 목업에서 온 값이라
같이 옮겨야 한다. 실측은 아래 8-c.
| 9 | 토큰 리터럴 복제 28개를 걷을까 | 걷는다 · 둔다 | 토큰 파일이 스스로 "semantic 만 쓴다" 고 정해 뒀다 | | primitive 값 대조 검사 |
| 10 | 빈 상태·로딩·에러를 공통 컴포넌트로 뺄까 | 지금 46파일에 흩어짐 | 공통 정의가 없다 | | — |
| 11 | 토스트를 토큰으로 데려올까 | Tailwind 기본 팔레트 | **토큰과 가장 먼 컴포넌트** | | — |
| 12 | `components/ui/*` 8개(shadcn oklch)를 흡수할까 걷어낼까 | 흡수 · 제거 | 11곳에서 쓴다. 토큰과 별개 뿌리 | | — |
| 13 | 다크모드 죽은 코드를 지울까 | `dark:` 2곳 | 켜는 장치가 없다 | | — |
| 14 | **레거시 교재 트리 `/book/**` 를 규범 대상으로 볼까, 얼릴까** | 대상 · 동결 | **살아 있는데 대조 밖** — 부채가 가장 몰린 곳 | | — |
| 15 | `prefers-reduced-motion` 을 전 화면군에 걸까 | 지금 2/6 | 활동·인증만 있다 | | — |

**14번이 가장 크다.** 얼리기로 하면 아래 부채 대부분이 규범 밖으로 나가고, 대상으로
삼으면 이관 작업이 이 문서에서 가장 큰 덩어리가 된다.

### 8-c. 정한 값을 따르려면 무엇이 바뀌나 (2026-08-28 적용분)

**"정했다" 고 자동으로 바뀌지 않는다.** 화면군마다 자기 값을 리터럴로 쥐고 있었기
때문이다. 아래가 이번에 실제로 옮긴 것이다.

| 어디 | 무엇 | 전 → 후 |
|---|---|---|
| 인증 | 주 버튼 높이 | 52 → **56** |
| 인증 | 상단바 높이 | 56 → **58** |
| 내비 | `--radius-card` (4곳이 쓴다) | 14 → **16** |
| 내비 | `--radius-control` (4곳이 쓴다) | 9 → **12** |
| 내비 | 칩 `.chip3` | 9 → **8** (컨트롤 12 와 다르므로 리터럴로 박았다) |
| 내비 | `.paywall-cta` 높이·radius | 50·9 → **56·12** |
| 내비 | `.paywall-cta:disabled` | `opacity:.48` → **색 교체** |
| 활동 | — | 이미 정한 값이라 안 바뀜 |

**목업 정본도 같이 옮겼다.** `screens_SOT.html` 의 `--radius-card`·`--radius-control`
세 벌과 `.chip3`, `paywall_SOT.html` 의 `.primary` 높이. **안 옮기면 조용히 갈라진다** —
`nav__*` 캡처는 이 값들을 클래스로만 그려서 **목업 대조가 이 차이를 못 본다.**

**그리고 이 값들은 이제 변수다.** CSS 가 `var(--d-btn-h, 56px)` 꼴이라, 변수를 아무도
주지 않으면 정한 값이 그대로 쓰이고, 개발 빌드의 「디자인」 패널
(`components/dev/design-decisions.tsx`)이 진짜 화면 위에서 다른 후보를 얹어 볼 수 있다.
결정판은 `phase1/design_decisions_SOT.html` 이다.

### 8-b. 근거가 되는 측정치

게임을 뺀 `app/src` 의 tsx **137개** 기준(2026-08-28).

| 무엇 | 수 | 몰려 있는 곳 |
|---|---|---|
| 임의값 `bg-[#hex]` 류 | **162** | `routes/book/**` · `components/learn/jamo/**` · `chat-text.tsx` |
| Tailwind 기본 색 클래스 | **63** | `app-layout` · `routes/book/**` · `qr` · `toast` |
| semantic 토큰 유틸리티 | **137** | `ui/button` · `my-profile` · `content4/5` |
| 인라인 `style={{` | **50** (중 20은 스토리 파일) | 활동 화면 몇 곳 |
| 하드코딩 `"#hex"` (tsx) | **31** | `chat-text` · `assess-chart` · 자모 넷 |
| 하드코딩 hex (토큰화된 CSS) | **63**, 그중 **28**이 토큰 값 복제 | `activity.css` 35 · `nav.css` 27 |

> `tokens.css` 주석은 이 부채를 **389 · 998** 로 적고 있다. **낡았다** — 게임까지
> 포함해도 69 · 189 다. 이관이 그만큼 진행됐다는 뜻이다.

<details><summary>다시 재는 법</summary>

`app/src` 의 `*.tsx` 에서 `routeTree.gen` 과 `components/main/game/` ·
`routes/main/game/` · `components/draw/` 를 뺀 뒤,
`bg|text|border|…-\[#hex\]` · Tailwind 기본 팔레트 클래스 ·
`bg|text|border-(text|background|fill|line|icon)-*` · `style={{` · `"#hex"` 를 센다.
</details>

---

## 9. 새 화면을 만들 때 — 지금 확실한 것만

§8 이 비어 있는 동안에도 **이미 정해진 것**은 있다.

1. **색은 semantic 토큰만 쓴다.** `--color-text-*` · `--color-background-*` ·
   `--color-fill-*` · `--color-line-*` · `--color-icon-*`. primitive 를 직접 쓰거나
   hex 를 적지 마라 — 토큰 파일이 그렇게 정해 뒀다.
2. **글자 크기는 `--text-*` 23 눈금 안에서 고른다.** 눈금 밖 값이 필요하면 가장
   가까운 눈금으로 올린다(`nav.css` 가 그렇게 했다).
3. **폰트를 CSS 에서 부르지 마라.** `index.html` 의 `<link>` 다(§2.2).
4. **글자를 담는 칸에 고정 px 폭을 주지 마라.** 다섯 언어가 들어온다(§5).
5. **화면 전환이 있으면 초점을 옮겨라**(§6).
6. **목업 캡처가 있는 화면이면 그것이 정본이다.** 벗어나야 하면
   `phase1/screen_promotions.md` 에 이유를 적는다 — 안 적으면 `check_docs.py` 가 막는다.
7. **간격·radius 는 아직 정해진 눈금이 없다.** 새로 지어내기 전에 §2.3 의 분포에서
   이미 많이 쓰는 값을 고르고, §8 의 4·5번에 답이 생기면 그것을 따른다.
