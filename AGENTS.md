# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

## Critical breaking changes in this project

**Middleware is `proxy.ts`, not `middleware.ts`.**
Next.js 16 uses `src/proxy.ts` as the middleware entry point. Do NOT create `src/middleware.ts` — having both files causes a build error. The `config` matcher is exported from `proxy.ts` directly (not re-exported).

## Quick doc reference

| Task | Doc |
|---|---|
| Server vs Client Components | `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md` |
| Server Actions / mutations | `node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md` |
| Data fetching | `node_modules/next/dist/docs/01-app/01-getting-started/06-fetching-data.md` |
| Caching | `node_modules/next/dist/docs/01-app/01-getting-started/08-caching.md` |
| Route Handlers | `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md` |
| Middleware / proxy | `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md` |
| CSS / Tailwind | `node_modules/next/dist/docs/01-app/01-getting-started/11-css.md` |
| Instant navigation | `node_modules/next/dist/docs/01-app/02-guides/instant-navigation.mdx` |

Start with `node_modules/next/dist/docs/index.md` for the full index. This project uses the **App Router** — look in `01-app/`, not `02-pages/`.
