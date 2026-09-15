# Deploying DrainWatch to Vercel

DrainWatch is configured as one Vercel project:

- Vite builds the web app into `artifacts/drainwatch/dist/public`.
- `api/index.ts` exposes the existing Express API as a Vercel Node function.
- `/api/*` stays on the API function; all other client-side routes fall back to `index.html`.

## Vercel project settings

Create a Vercel project from the repository root. Keep the Root Directory set to `.` and use the committed `vercel.json` settings.

Add these environment variables for Preview and Production:

- `DATABASE_URL` — PostgreSQL connection string
- `SESSION_SECRET` — long random value used to sign sessions

The database must be reachable from Vercel. The API seeds deterministic demo reports on a cold start when they do not already exist.

## Windows development

Install Node.js 20 or newer and pnpm 10:

```powershell
corepack enable
corepack prepare pnpm@10.26.1 --activate
pnpm install
pnpm --filter @workspace/drainwatch run dev
pnpm --filter @workspace/api-server run dev
```

The workspace no longer depends on `sh`, `export`, or Linux-only native package overrides. Vercel itself runs Node functions on Linux; the application code and local commands are cross-platform.