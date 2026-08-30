# Frontend — Sofa Co. (Next.js App Router)

Next.js 15 + React 19 + Tailwind 4 + shadcn/ui.
Backend se sirf HTTP pe baat karta hai (`/api/*`).

## Chalana

```bash
pnpm --filter @sofa/frontend dev     # :3000
pnpm --filter @sofa/frontend build   # production build
pnpm --filter @sofa/frontend check   # typecheck
```

Root se dono ek sath: `pnpm dev`

## Next.js kyun (Vite ki jagah)?

Purana setup pure client-side React tha — Google ko khali `<div id="root">`
milta tha. Ab HTML server pe banta hai:

| Cheez | Pehle (Vite SPA) | Ab (Next.js) |
|---|---|---|
| Home page ka HTML | khali div | ~38 KB, poora content + `<h1>` |
| Meta / OG tags | sab pages pe same | har page ka apna |
| Product page | khali | apna title, description, OG image |
| Sitemap | nahi | `app/sitemap.ts` — products DB se auto |
| Structured data | nahi | JSON-LD (Product + FurnitureStore) |
| Admin panel | Google dekh sakta tha | `noindex, nofollow` |

## Structure

| Folder | Kaam |
|---|---|
| `src/app/(storefront)/` | Public pages — indexed |
| `src/app/(dashboard)/` | account + admin — `noindex` |
| `src/app/layout.tsx` | Root layout, fonts, site-wide metadata |
| `src/app/providers.tsx` | Client providers (tRPC, react-query, cart, theme) |
| `src/app/sitemap.ts` `robots.ts` | Crawler surface |
| `src/views/` | Page-level components jo routes render karte hain |
| `src/components/` | Reusable UI (`ui/` = shadcn) |
| `src/features/` | Feature ka apna code *(khali — views/ yahan shift hongi)* |
| `src/lib/api/` | Backend client (`config.ts` browser, `server.ts` server-only) |
| `src/lib/seo/` | Site config + JSON-LD builders |
| `src/lib/analytics/` | Pixels + event tracking *(khali — pending)* |
| `src/contexts/` `src/hooks/` | Global state aur shared hooks |

### `views/` kyun, `pages/` kyun nahi

Next.js `src/pages/` ko legacy Pages Router samajhta hai — wahan rakha koi bhi
file route ban jati hai (test files bhi, jis se build toot-ti hai). Isliye page
components `src/views/` me hain, aur asli routing sirf `src/app/` me.

## Route groups

`(storefront)` aur `(dashboard)` — bracket wale folder URL me nahi aate, sirf
grouping hai. Har group ka apna layout hai jo `robots` metadata set karta hai,
isliye admin panel kabhi index nahi hoga.

## Backend se connection

Browser requests relative rehti hain (`/api/...`) aur `next.config.ts` unhe
backend pe rewrite kar deta hai. Isi wajah se cookies same-origin rehti hain
aur OAuth callback bilkul pehle jaisa chalta hai.

Server components `src/lib/api/server.ts` use karte hain — wo seedha backend se
baat karta hai (rewrite ke bagair), taake render ke waqt data mil jaye. Yehi
cheez product page ke meta tags aur JSON-LD ko asli banati hai.

## Env

`.env` workspace root pe hai; `next.config.ts` usay load karta hai.
`NEXT_PUBLIC_*` browser tak jate hain — un me kabhi secret na dalein.
