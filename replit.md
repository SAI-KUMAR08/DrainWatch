# DrainWatch

DrainWatch is a civic safety platform for reporting drainage hazards in Hyderabad and coordinating municipal response.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/drainwatch` — public citizen portal and protected officer operations portal.
- `artifacts/api-server` — API routes, signed role sessions, risk calculation, demo seed data, and audit events.
- `lib/api-spec/openapi.yaml` — source of truth for the typed API contract.
- `lib/db/src/schema/index.ts` — PostgreSQL/Drizzle source of truth for reports and audit logs.

## Architecture decisions

- Civilian and officer experiences use separate login endpoints and server-side role checks; the UI does not grant permissions.
- The officer map uses Leaflet and OpenStreetMap tiles with stored latitude/longitude values rather than a decorative map illustration.
- Risk scores are calculated on the server and marker colors are derived from the returned score.
- Deterministic seed reports are marked as demo data; weather remains an explicit unavailable state until a provider is configured.

## Product

- Citizens can sign in, submit a hazard report, view only their own reports, and track status.
- Officers can sign in through the shared login, review an operational map and report queue, change statuses, inspect risk components, view unavailable weather state, and inspect audit activity.
- Public visitors can see current alerts and a limited public map/report overview.
- The shared `/login` page resolves the destination workspace from the server-validated role returned by the submitted credentials.

## Deployment

- Vercel configuration lives in `vercel.json`; the static Vite app and Express API function deploy from the repository root.
- Required Vercel environment variables are `DATABASE_URL` and `SESSION_SECRET`.
- `DEPLOY_VERCEL.md` documents the Vercel setup and Windows development commands.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Use `pnpm --filter @workspace/api-spec run codegen` after changing `lib/api-spec/openapi.yaml`.
- Demo credentials are intentionally limited to the shared sign-in flow; replace them with an approved identity provider before production use.
- Keep provider-backed weather, AI, news, and uploads in explicit unavailable states until real integrations are configured.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
