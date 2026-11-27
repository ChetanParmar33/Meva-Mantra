# Meva Mantra API

NestJS 12 + Prisma 7 + PostgreSQL. Setup and commands: see the [root README](../../README.md). Endpoints: [docs/API.md](../../docs/API.md).

- `pnpm dev`: watch mode on port 4100 (`/api`)
- `pnpm db:migrate` / `pnpm db:seed` / `pnpm db:studio`
- `node test/smoke.mjs`: end-to-end smoke test against the running API
