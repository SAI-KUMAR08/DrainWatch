---
name: Vercel and Windows support
description: Deployment and local-platform constraints for DrainWatch.
---

DrainWatch is deployed as a static Vite client plus a serverless Express API function on Vercel. Local development commands must not depend on POSIX shell syntax because Windows is a supported development environment.

**Why:** Vercel provides the public hosting target, while the project owner develops primarily on Windows; shell-specific scripts caused platform drift.

**How to apply:** Keep the Vercel entrypoint at `api/index.ts`, keep client requests relative to `/api`, require `DATABASE_URL` and `SESSION_SECRET` in Vercel, and use Node-based scripts instead of `export`, `sh`, or shell chaining.