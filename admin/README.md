# Speako — Admin Web App

Admin-facing SPA for **Speako**, a B2B Korean-language education platform for universities. Used by master/school/student admins to manage admins, schools, class levels, and students (including bulk registration).

Part of the [Speako](../../) monorepo. Runs on **port 3001** and talks to the `koreanapi` backend (port 8000).

## Tech Stack

- **React 19** + **TypeScript**
- **RSBuild** — build tooling
- **TanStack Router** — file-based routing (`src/routes/`, auto-generates `routeTree.gen.ts`)
- **Tailwind CSS v4** + **ShadCN/UI**
- **Zustand** — global state
- **xlsx** (SheetJS) — Excel import for bulk student registration
- **react-qr-code** — QR code generation
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

Start the dev server (http://localhost:3001):

```sh
pnpm dev
```

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Dev server on port 3001 |
| `pnpm build` | Production build (output: `dist/`) |
| `pnpm start` | Serve the production build locally |
| `pnpm check` | Biome check (lint + format) |
| `pnpm lint` / `pnpm lint:fix` | Biome lint |
| `pnpm format:write` / `pnpm format:check` | Biome format |
| `pnpm typecheck` | TypeScript type checking (`tsc --noEmit`) |

## Environment Variables

Defined in `.env` (see `.env.example`):

| Variable | Description |
| --- | --- |
| `PUBLIC_ADMIN_API_URL` | Backend API base URL (koreanapi) |
| `PUBLIC_APPSYNC_ENDPOINT` | AWS AppSync GraphQL endpoint |
| `PUBLIC_APPSYNC_REGION` | AppSync region |
| `PUBLIC_APPSYNC_API_KEY` | AppSync API key |

## Project Structure

```
src/
├── api/          # Centralized api client (auto-injects JWT) + response types
├── components/   # UI components (ShadCN, sidebar layout, tables, ...)
├── config/       # App configuration
├── lib/          # Utilities (cn, etc.)
├── routes/       # File-based routes (TanStack Router)
├── styles/       # Global styles
└── main.tsx      # App entry
```

## Routes

- `/login`, `/signup` — auth (admin signup requires master-admin approval)
- `/admin` — admin management (관리자)
- `/school` — school & class-level management (학교관리)
- `/student` — student management + batch/Excel registration (학생관리)
- `/stt-shadow` — STT shadow comparison monitoring
- `/qr-stats` — anonymous QR scan analytics (master admin only)
- `/tts-test` — TTS testing tool

## Auth & Roles

- Auth guard in `__root.tsx` redirects to `/login` when no token is present.
- Roles: `master_admin` > `school_admin` / `student_admin` > `student`.
- School admins are scoped to their own school; master admins have full visibility.
- Student registration supports an editable spreadsheet-style table (clipboard paste) and Excel (`.xlsx`) upload.

## Deployment

Deployed on Vercel. Set the build **Output Directory** to `dist`.
