# 이 디렉터리에 대하여

`koreanapi-master` 를 그대로 들여왔다 (2026-08-20). 손댄 것은 `.gitignore` 하나뿐이고
코드는 상류 그대로다 — 여기서부터가 리뉴얼의 출발점이다.

## 왜 들여왔나

리뉴얼 Phase 1 이 API 6종과 마이그레이션 2종을 요구하는데, 서버가 저장소 밖에 있는
동안에는 그 작업을 시작할 수 없었다. 앱의 `ActivityShell` 이 여기에 걸려 있다.

## 자격증명

전부 환경변수로 읽는다. 하드코딩된 키가 없고 `.env` 도 들어오지 않았다.
`.gitignore` 가 `.env*` · `key` · `ssh` 를 계속 막는다.

    OPENAI_API_KEY · GEMINI_API_KEY · TUTORUS_CLIENT_ID / _SECRET
    JWT_SECRET · QR_TRACKING_SECRET · SERVER_ADDRESS / _PORT

## 교재 파생 자산

`seed_data/` 와 `tools/data/` 는 연세 교재에서 뽑은 문장·문항이다.
저장소 루트가 이미 `illust/` · `book/` · `*.xlsx` · `*.pdf` 를 같은 이유로 막고 있고,
`app/src/shared/data/vocashot-bank.ts` 도 같은 성격이다.

**이 저장소는 공개로 돌릴 수 없다.** 이유는 이 콘텐츠 자체다 —
부록 PDF 가 이력에 남아 있다고 적었던 것은 사실이 아니었다(195커밋 확인).
파일을 지우는 것만으로는 되지 않고 이력을 다시 써야 한다.

## 앱과 겹치는 것

**정해졌다(2026-08-25).** 앱은 게임 콘텐츠를 **서버에서 내려받는다**
(`app/src/api/game-content.ts`). `app/src/components/main/game/data/` 는 아무도
읽지 않는 사본이라 지웠다. 남은 것은 `seed_data/` 하나다.

그 `seed_data/` 도 **정본이 아니라 스냅숏**이다 — 게임 콘텐츠의 정본은 어드민이고,
사람이 거기서 고친다. 뒤처졌는지는 이것으로 본다.

```
cd app && python3 scripts/fixture-data-check.py --live
```
