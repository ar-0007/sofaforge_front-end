# Backend — Sofa Co. API

Standalone API process. Frontend ka isay koi ilm nahi — sirf HTTP pe baat hoti
hai, isliye dono alag deploy aur alag scale ho sakte hain.

**Abhi ka stack:** Express + tRPC + Drizzle + MySQL/MariaDB
**Target stack (pending):** Sequelize + PostgreSQL, REST `/api/v1/*`

> Ye split wala kaam mukammal hai. Postgres/Sequelize migration abhi baqi hai —
> tafseel ke liye `ARCHITECTURE.md` section 6 dekhein.

## Chalana

```bash
pnpm --filter @sofa/backend dev      # :4000 pe API
pnpm --filter @sofa/backend check    # typecheck
pnpm --filter @sofa/backend test     # vitest
```

Root se dono ek sath: `pnpm dev`

## Structure

| Folder | Kaam |
|---|---|
| `src/core/` | Platform plumbing — trpc, context, oauth, env, sdk, shopify |
| `src/db/` | Drizzle schema, migrations, seeders |
| `src/modules/` | **Feature modules** — asal business logic yahan |
| `src/integrations/` | Third-party: storage (S3), aur aage Shopify/LLM/pixels |
| `src/middlewares/` | auth, admin guard, error handler, validation *(khali — pending)* |
| `src/jobs/` | Background/cron kaam *(khali — pending)* |
| `src/config/` `src/utils/` `src/types/` | *(khali — pending)* |
| `scripts/` | One-off tooling (`create-admin`, `shopify-probe`) |
| `tests/` | Vitest tests |

## Entry points

- `src/app.ts` — Express app banata hai (body parser, CORS, routes mount)
- `src/server.ts` — port pe listen karta hai

Do alag files isliye hain taake tests `createApp()` ko bina port khole import
kar sakein.

## Ports aur env

`.env` workspace root pe hai (ek hi file, dono apps share karte hain).
`src/core/loadEnv.ts` usay absolute path se load karta hai, isliye process kahin
se bhi start ho — env mil jata hai.

| Var | Kaam |
|---|---|
| `API_PORT` | API kis port pe chale (default 4000) |
| `CORS_ORIGIN` | Frontend ka origin, comma-separated |
| `DATABASE_URL` | MySQL connection string |
| `JWT_SECRET` | Session signing |
| `SERVE_STATIC` | `true` ho to built frontend bhi yahi serve karega (single-container deploy) |
| `UPLOAD_DIR` | Admin se upload hui product photos kahan rakhi jayen (default: `backend/uploads/`) |

### Uploads

Owner apni photos dashboard se upload karta hai — koi S3/CDN account zaroori
nahi. Files `UPLOAD_DIR` me disk pe jati hain aur `/api/uploads/<file>` se
read-only serve hoti hain (wahi `/api/` prefix jo gateway pehle se forward
karta hai). Deploy pe ye folder **persistent** hona chahiye: redeploy pe wipe
hone wali jagah par mat rakho, warna shop ki tasveerein gayab ho jayengi.
Backup lete waqt database ke saath ye folder bhi lena hai.

## Module pattern (target)

Abhi routers tRPC hain. REST pe shift karte waqt har module ki shakl ye hogi:

```
modules/catalog/
  catalog.routes.ts       # URL -> controller
  catalog.controller.ts   # req/res, bas
  catalog.service.ts      # business logic
  catalog.repository.ts   # database queries
  catalog.validation.ts   # zod input checks
```

**Usool:** controller kabhi seedha database ko haath nahi lagata.

```
route -> middleware -> controller -> service -> repository -> model -> DB
```
