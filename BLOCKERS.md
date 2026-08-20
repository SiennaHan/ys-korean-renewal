# 막힌 것과 정해지지 않은 것

2026-08-20 기준. 인계받은 사람이 **먼저 부딪힐 순서**로 적었다.
[README.md](README.md) 가 저장소 안내이고, 이 문서는 지금 상태다.

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
| `package-lock.json` | 지웠다 — `README`·`.claude/launch.json` 둘 다 pnpm 을 쓴다 |
| `pnpm-lock.yaml` | specifier 를 새 값으로 갱신 |

```
npm run build            통과 · 총 21.2MB (gzip 4.7MB)
npm run typecheck        통과
npm run parity:activity  22개 화면 일치
```

⚠️ **npm 으로 설치하지 마라.** `package-lock.json` 이 다시 생기면 같은 일이 반복된다.
`pnpm install` 을 쓴다.

한 가지 남는다 — `app/README.md` 가 아직 **"React 19"** 라고 적고 있고(실제 18.3.1),
`koreanapi` 포트도 8000 으로 적혀 있다(앱 `.env` 는 8799). 그 파일은 다른 저장소
설명이라 통째로 갱신 대상이다.

## 2. 자모 라우트가 명세와 다르다 · 판단 필요

`Phase1_dev_spec_v1.html` §4 는 이렇게 못박는다.

> `/learn/jamo?level=1&lesson=&sub=1~6` ← 5개 라우트 · **6→1 통합**
> **콘텐츠 ID를 URL에서 제거한다** — `$code`(YK0041)·`$id`(C4) 노출 폐지.
> 급·과만 쿼리로 받고 문항 목록은 서버가 결정.

구현은 **6개 라우트에 `?code=` 를 남겼다.**

```
/learn/jamo/pronounce?code=YK0001      ← listen-repeat
/learn/jamo/word-repeat?code=YK0003    ← listen-repeat2
/learn/jamo/combine?code=YK0002        ← write
/learn/jamo/combine3?code=YK0032       ← write3
/learn/jamo/word-write?code=YK0004     ← read-write
/learn/jamo/choose?code=YK0005         ← listen
```

**왜 이렇게 갔나.** 자모 활동은 급·과가 아니라 묶음(모듈)에 달려 있다 — 1과 안에
`모음1` 과 `자음1` 이 각각 자기 활동을 갖는다. 명세의 `sub=1~6` 은 **문항 목록을
서버가 정한다**는 전제 위에 서 있고 그 서버(API 6종)가 아직 없다.

**정해야 할 것** — 명세를 구현에 맞게 고칠지, API 가 생길 때 구현을 명세대로 옮길지.
둘 다 되지만 **문서와 코드가 정면으로 다른 상태를 두면 안 된다.**

구 경로(`/book/chapter/unit/{scene}/{code}`)는 리다이렉트로 살아 있다.

---

## 3. 라우트 통합이 절반이다 · 남은 작업

| 명세가 요구하는 것 | 지금 |
|---|---|
| `/learn/word` · `grammar` · `listen` · `read` · `roleplay` | ✔ 옮겼다 |
| `/learn/flashcard?level=&lesson=` | ✗ `/book/chapter/unit/flashcard/$id` |
| `/learn/mission-chat?level=&lesson=` | ✗ `/book/chapter/unit/mission_chat/$code` |
| `/learn/jamo` | △ 6개로 쪼개짐 — §2 |

플래시카드와 미션대화는 **교재학습 목록이 실제로 여는 길**이다
(`app/src/components/main/textbook/index.tsx`). 명세는 결과 화면도 셸 공통으로
합치라고 한다(`.../flashcard/result/$id` 폐지).

---

## 4. 받아쓰기(dictation) 12개가 고아다 · 판단 필요

`ko_module` 에 `scene_type = "dictation"` 12개가 있고 **화면도 라우트도 없다.**
아무 목록도 가리키지 않고 목업에도 없다. 만들 것인지 버릴 것인지 정해진 적이 없다.

```bash
# 확인
grep -rn dictation app/src --include='*.tsx' --include='*.ts' | grep -v shared/data
# → 없음
```

---

## 5. 목업과 다르게 간 여섯 곳 · 문서 미반영

`handoff_v1.html` §03 이 **"구현이 목업과 다르면 목업이 기준"** 이라고 못박았다.
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

**하루치 결정은 `phase1/handoff_v2.html` §03 · §04 에 반영했다.**
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

앱의 `ActivityShell`(활동 상태 배선)이 여기에 걸려 있다. 화면 22종은 다 만들어져
있고 **상태만 붙이면 된다.**

`api_schema_v1.html` §6 의 네 물음은 **아직 답이 없다** — 해설 문자열 포함 여부 ·
`DELETE /review-queue` 유지 여부 · 진행 저장 주기 · 게스트 허용 범위.

MY 탭 누적 학습 기록은 따로 설계해 두었고 네 결정이 반영돼 있다 →
`phase1/my_learning_summary_v1.html` (별도 전달)

---

## 7. 콘텐츠에 비어 있는 두 시트

원장 v23 에 스키마만 있고 **내용이 없다.**

| 시트 | 상태 |
|---|---|
| `n7_mission_chat` | 예시 1행. 시나리오·프롬프트 신규 저작 필요 (1~8급 전체) |
| `n8_jamo` | 예시 1행. 구 앱(`pulley_korean_exercise`)에 1권 한정 콘텐츠가 있어 **포팅 여부 결정** 필요 |

생성기가 이 둘을 건너뛰고 매번 그 사실을 찍는다.

---

## 확인된 상태

인계 시점에 아래는 통과한다.

```bash
cd app
npm run typecheck        # 통과
npm run parity:activity  # 22개 화면 일치
npx biome check src      # 통과
npm run build            # 통과 — §1 에서 고쳤다
```

i18n 은 5개 로케일 287키가 일치한다.
