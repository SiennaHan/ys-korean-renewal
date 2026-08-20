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

`app/README.md` 은 갈아 썼다. 벤더에서 온 영어 글이 사실과 어긋난 곳이 넷이었다 —
React 19(실제 18.3.1) · koreanapi 포트 8000(실제 8799) · 없는 `.env.example` ·
`/jamolist` 를 자모 화면이라 적은 것(빈 스텁이다).

## 2. 자모 라우트 — 명세가 옳았고 전제가 늦게 왔다 · 진행 중

`Phase1_dev_spec_v1.html` §4 는 이렇게 못박는다.

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
| `n8_jamo` | **포팅 완료**(v24 · 529행). 다만 전부 `draft` — 검수 대기. §2 |

생성기는 아직 둘 다 건너뛴다 — `n8_jamo` 는 검수 뒤에 붙인다(§2).

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
