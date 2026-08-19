# Speako — Student Web App

Student-facing SPA for **Speako**, a B2B Korean-language education platform for universities. Provides AI tutoring chat, speech/writing analysis, pronunciation practice, and vocabulary flashcards for foreign students learning Korean.

Part of the [Speako](../../) monorepo. Runs on **port 3000** and talks to the `koreanapi` backend (port 8000).

## Tech Stack

- **React 19** + **TypeScript**
- **RSBuild** — build tooling
- **TanStack Router** — file-based routing (`src/routes/`, auto-generates `routeTree.gen.ts`)
- **Tailwind CSS v4** + **ShadCN/UI** (New York style)
- **Zustand** — global state · **Dexie** — IndexedDB persistence
- **i18next** / **react-i18next** — 5 languages (en, ko, ja, zh, vi), default `en`
- **Chart.js**, **Framer Motion**, **Lottie**, **canvas-confetti** — UI/visualization
- **react-audio-voice-recorder** / **react-speech-recognition** — mic capture & STT
- **AWS Amplify** (AppSync) — realtime GraphQL
- **Biome** — lint & format (tabs, double quotes)

## Getting Started

Install dependencies (pnpm):

```sh
pnpm install
```

Copy the example env file and adjust as needed:

```sh
cp .env.example .env
```

Start the dev server (http://localhost:3000):

```sh
pnpm dev
```

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Dev server on port 3000 |
| `pnpm build` | Production build (output: `dist/`) |
| `pnpm preview` | Build then serve locally |
| `pnpm check` | Biome check (lint + format) |
| `pnpm lint` / `pnpm lint:fix` | Biome lint |
| `pnpm format:write` / `pnpm format:check` | Biome format |
| `pnpm typecheck` | TypeScript type checking (`tsc --noEmit`) |

## Environment Variables

Defined in `.env` (see `.env.example`):

| Variable | Description |
| --- | --- |
| `PUBLIC_KOREAN_API_URL` | Main API (koreanapi) base URL |
| `PUBLIC_KOREAN_API_URL_REMOTE` | Remote koreanapi URL |
| `PUBLIC_SPEAK_API_URL` | Speech analysis service (speakapi) |
| `PUBLIC_WRITE_API_URL` | Writing analysis service (writeapi) |
| `PUBLIC_RES_URL_ROOT` | Static resource (S3) root |
| `PUBLIC_APPSYNC_ENDPOINT` | AWS AppSync GraphQL endpoint |
| `PUBLIC_APPSYNC_REGION` | AppSync region |
| `PUBLIC_APPSYNC_API_KEY` | AppSync API key |
| `PUBLIC_QR_WEB_REDIRECT_URL` | Web URL opened after `/qr` tracking completes (default: `/`) |

## Project Structure

```
src/
├── api/          # Centralized api client (auto-injects JWT) + response types
├── assets/       # Images, audio, static assets
├── components/   # UI components (ui/ = ShadCN, LanguageSelector, ...)
├── config/       # App configuration
├── hooks/        # Custom React hooks
├── i18n/         # i18next config + locales/{en,ko,ja,zh,vi}.ts
├── lib/          # Utilities (cn, etc.)
├── routes/       # File-based routes (TanStack Router)
├── shared/       # Constants, Zustand store, Dexie db, shared data
├── styles/       # Global styles
├── types/        # Shared TypeScript types
└── main.tsx      # App entry
```

## Notable Routes

- `/login`, `/reset-password`, `/check-email`, `/new-password` — auth flow
- `/missionchat` — AI tutoring / mission chat
- `/flashcard` — vocabulary flashcards
- `/jamolist` — Hangul jamo practice
- `/learn`, `/book`, `/main` — learning content
- `/my-profile`, `/my-password` — account settings

## Auth Notes

- Supports both **guest** (auto-login) and **student** (email/password) authentication.
- Guest → student data migration (chat/flashcard) runs on first student login.
- Language preference is stored in localStorage (`speako-language`).

## Deployment

Deployed on Vercel. Set the build **Output Directory** to `dist`.
