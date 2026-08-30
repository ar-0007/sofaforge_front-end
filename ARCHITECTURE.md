# Sofa Co. — Architecture

> **Status:** Split ho chuka hai. `backend/` aur `frontend/` ab do alag apps
> hain, dono chal rahe hain, saare tests pass hain. Frontend Next.js pe shift ho
> gaya hai aur SEO live hai. Postgres/Sequelize migration abhi baqi hai.

---

## 1. Masla kya tha (aur ab kya hai)

| Masla | Pehle | Ab |
|---|---|---|
| Process | Ek hi — backend hi Vite ko middleware ki tarah chalata tha | **Do alag** — API `:4000`, web `:3000` |
| package.json | Ek | **Teen** — backend, frontend, shared |
| Coupling | `client/src/lib/trpc.ts` seedha `server/routers` import karta tha | Sirf **type-only** import, build me erase ho jata hai |
| SEO | Zero — Google ko khali `<div id="root">` milta tha | **Live** — server-rendered HTML, per-page meta, JSON-LD, sitemap |
| Admin panel | Google dekh sakta tha | `noindex, nofollow` |
| MySQL + Drizzle | MariaDB pe migration toot-ti hai | *abhi wahi hai — point 6* |
| Analytics | Koi nahi | *abhi bhi koi nahi — point 7* |

Ab dono alag deploy ho sakte hain aur alag scale ho sakte hain.

## 2. Naya naqsha

```
sofa_forge/
│
├── backend/          Express + tRPC + Drizzle + MySQL    -> API       :4000
├── frontend/         Next.js 15 (App Router)             -> Web app   :3000
├── shared/           Types + constants (dono use karte hain)
├── docs/             Dastavezaat
└── ARCHITECTURE.md   ye file
```

Teen alag hisse, teen alag `package.json`. Backend ko frontend ka koi ilm nahi,
frontend backend se sirf HTTP pe baat karta hai.

```
   Browser
      |
      v
  +---------------------+
  |  frontend (Next.js) |   SSR/SSG — SEO ke liye HTML server pe banta hai
  |  :3000              |
  +----------+----------+
             |  /api/*  (next.config rewrite — same-origin cookies)
             v
  +---------------------+
  |  backend (Express)  |   API — koi bhi client use kar sakta hai
  |  :4000              |
  +----------+----------+
             v
       +-----------+
       |   MySQL   |   <- Postgres migration pending (point 6)
       +-----------+
```

---

## 3. Backend ka andar

```
backend/src/
├── core/            trpc, context, oauth, env, sdk, shopify, static   [bhara hua]
├── db/
│   ├── schema.ts    Drizzle schema (13 tables)                        [bhara hua]
│   ├── migrations/  schema history                                    [bhara hua]
│   ├── models/      Sequelize models                                  [khali]
│   └── seeders/     starter data                                      [bhara hua]
├── modules/         <- asal kaam yahan (feature ke hisab se)
│   ├── app.router.ts       sab routers yahan register hote hain
│   ├── commerce/           commerce.router.ts + catalog.fallback.ts
│   ├── admin/              admin.router.ts
│   └── auth/ cart/ catalog/ orders/ reviews/
│       inquiries/ content/ analytics/                                 [khali]
├── integrations/    storage.ts (S3)                                   [Shopify/LLM/pixels pending]
├── middlewares/     auth, admin guard, error handler                  [khali]
├── jobs/            cron / background kaam                            [khali]
├── config/ utils/ types/                                              [khali]
├── app.ts           Express app banata hai
└── server.ts        listen()
```

`[khali]` folders jaan boojh kar rakhe hain — REST migration me inhi me kaam
jayega. Abhi jo hai wo tRPC routers hain.

### Har module ki shakl ek jaisi

```
modules/catalog/
  catalog.routes.ts       URL -> controller
  catalog.controller.ts   req/res, bas
  catalog.service.ts      business logic
  catalog.repository.ts   Sequelize queries
  catalog.validation.ts   zod input checks
```

**Sunehra usool:** controller kabhi database ko haath nahi lagata.

```
route -> middleware -> controller -> service -> repository -> model -> Postgres
```

**Ye scalable kyun hai:** naya feature = naya folder. Purana code chhedna nahi
parta. Kal koi module alag microservice banana ho to poora folder utha lein.

---

## 4. Frontend ka andar (Next.js)

```
frontend/src/
├── app/
│   ├── layout.tsx       root layout — fonts, site-wide metadata
│   ├── providers.tsx    client providers (tRPC, react-query, cart, theme)
│   ├── (storefront)/    public pages  — server-rendered, indexed
│   ├── (dashboard)/     account/admin — noindex, nofollow
│   ├── sitemap.ts       auto sitemap (products DB se aate hain)
│   ├── robots.ts        crawler rules
│   └── not-found.tsx    404
├── views/               page-level components jo routes render karte hain
├── components/          ui/ (shadcn) + JsonLd.tsx
├── features/            catalog/ cart/ checkout/ account/ admin/ studio/  [khali]
├── lib/
│   ├── api/             config.ts (browser) + server.ts (server-only)
│   ├── analytics/       <- pixels + tracking                              [khali]
│   ├── seo/             site.ts + jsonLd.ts
│   └── browserStorage.ts  SSR-safe localStorage/sessionStorage
├── hooks/  contexts/  styles/  types/
└── public/
```

**`views/` kyun?** Next.js `src/pages/` ko legacy Pages Router samajh leta hai
aur wahan ki har file ko route bana deta hai — test files bhi, jis se build
toot-ti hai. Isliye page components `views/` me hain, routing sirf `app/` me.

### Route groups ka faida

`(storefront)` aur `(dashboard)` — bracket wale folder URL me nahi aate.
Sirf grouping hai, taake dono ka layout aur behaviour alag ho:

| Group | Rendering | SEO | Layout |
|---|---|---|---|
| `(storefront)` | Server (SSG/ISR) | index karo | header + footer |
| `(dashboard)` | Client (login ke baad) | `noindex` | sidebar |

Ye taqseem ahem hai: storefront ko Google dekhe aur wo fast ho; admin panel ko
Google bilkul na dekhe.

---

## 5. SEO — Next.js kyun

**Ye ho chuka hai.** Neeche ke numbers chalte hue app se liye gaye hain:

| Cheez | Pehle (Vite SPA) | Ab (Next.js) |
|---|---|---|
| Home page ka HTML | khali `<div id="root">` | **38 KB** — `<h1>` + poora content |
| Product page ka HTML | khali | **34 KB** — apna title/description/OG image |
| Meta / OG tags | sab pages pe same | har page ka apna |
| Sitemap | nahi | `/sitemap.xml` — 12 static + har product |
| Structured data | nahi | JSON-LD: `Product` (price/currency/stock) + `FurnitureStore` |
| Admin panel | crawl ho sakta tha | `noindex, nofollow, nocache` |
| 404 | 200 return karta tha | asli 404 + `noindex` |

**Rich snippets:** Product pages pe JSON-LD lagne se Google search results me
price, rating aur stock dikhne lagte hain — click-through kaafi barh jata hai.

---

## 6. Database — MySQL se PostgreSQL + Sequelize

### Abhi ka masla

`drizzle/0002_uneven_leo.sql:54` me `sentAt timestamp` bina default ke hai.
MySQL 8 ise nullable banata hai, MariaDB 10.4 ise `NOT NULL DEFAULT` zero-date
bana deta hai — jo aapke `NO_ZERO_DATE` sql_mode me error deta hai
(`ER_INVALID_DEFAULT`). Wo variable MariaDB 10.4 me read-only hai, runtime pe
theek nahi ho sakta.

*(App abhi chal raha hai kyunki maine wo column manually sahi banaya tha, lekin
fresh `db:push` phir toot jayega. Postgres pe jane se ye masla khatam.)*

### 13 tables shift honge

`users`, `series`, `products`, `product_variants`, `custom_configurations`,
`orders`, `carts`, `product_reviews`, `inquiries`, `newsletter_subscribers`,
`content_placements`, `customer_reminders`, `admin_audit_logs`

Postgres me naming `snake_case` hogi (Postgres convention), JS side pe
`camelCase` — Sequelize ka `underscored: true` khud handle kar leta hai.

### Ek pending faisla

Abhi `isVisible`, `isFeatured`, `isCustom`, `verifiedPurchase`,
`reminderConsent` — ye sab MySQL enum hain jinki values `'true'`/`'false'`
**strings** hain, asli boolean nahi. Isi liye code me
`eq(products.isVisible, "true")` likhna parta hai.

Postgres pe inhe asli `BOOLEAN` banana chahiye. Faisla aapka — batayein to
migration me kar dunga.

---

## 7. Analytics & Pixels

Do taraf se track karenge — dono zaroori hain:

```
frontend/src/lib/analytics/          backend/src/modules/analytics/
  tracker.ts    <- ek hi entry        + integrations/pixels/
  events.ts     <- typed event list       facebook-capi.ts
  consent.ts    <- GDPR gate              tiktok-events.ts
  providers/
    facebook-pixel.ts
    tiktok-pixel.ts
    ga4.ts
    internal.ts
```

### Ek call, sab jagah

```
track('purchase', { orderId, value, currency, items })
        |
        +--> Facebook Pixel   (browser)
        +--> TikTok Pixel     (browser)
        +--> GA4              (browser)
        +--> Apna backend  --> FB CAPI + TikTok Events API (server)
```

Faida: naya pixel (Snapchat, Pinterest) add karna ho to sirf ek file
`providers/` me daalni hai — poore app me ek line bhi nahi badlegi.

### Browser ke sath server bhi kyun?

| | Browser pixel | Server CAPI |
|---|---|---|
| Ad-blocker | ~30% block | block nahi hota |
| Data quality | kam | zyada (hashed email, order value) |
| Purchase event | reliable nahi | reliable |

Dono ek hi `event_id` bhejte hain — Facebook/TikTok duplicate khud merge kar
lete hain.

### Events

`page_view`, `view_item`, `view_item_list`, `add_to_cart`, `remove_from_cart`,
`begin_checkout`, `purchase`, `search`, `sign_up`, `lead`,
`customise_start`, `customise_complete`

### User behaviour (apni reporting)

Scroll depth, product pe kitna ruka, cart kahan chhora, konsa fabric/colour
sabse zyada choose hota hai — ye sab apne backend me save hoga.

### Environment variables

```
NEXT_PUBLIC_FB_PIXEL_ID          browser me chahiye (public hai, theek hai)
NEXT_PUBLIC_TIKTOK_PIXEL_ID
NEXT_PUBLIC_GA4_MEASUREMENT_ID

FB_CAPI_ACCESS_TOKEN             sirf backend — kabhi browser me nahi
TIKTOK_EVENTS_ACCESS_TOKEN
```

---

## 8. Auth ka faisla (pending)

Abhi login sirf **Manus OAuth** se hai — koi password column hai hi nahi.
Local pe humne JWT khud bana kar admin banaya tha.

Naye setup me teen raste hain:

1. **Manus OAuth hi rakhein** — kam kaam, lekin Manus platform pe bandhe rahenge
2. **Apna email + password auth** — bcrypt + refresh tokens. Poora control.
3. **Dono** — Manus + apna, users dono se aa sakein

Ye faisla migration se pehle karna hoga. Mera mashwara: **#2**, kyunki aap
project ko independent aur scalable bana rahe hain.

---

## 9. Aage ka plan

| # | Kaam | Status |
|---|---|---|
| 1 | Folder structure + docs | **ho gaya** |
| 2 | `backend/` + `frontend/` physical split, pnpm workspace | **ho gaya** |
| 3 | Frontend Next.js pe shift (App Router, route groups) | **ho gaya** |
| 4 | SEO — meta, JSON-LD, sitemap, robots, noindex | **ho gaya** |
| 5 | Purana `client/`, `server/`, `drizzle/` hatana | **ho gaya** |
| 6 | Postgres setup + Sequelize models + migrations | pending |
| 7 | Backend modules — tRPC se REST `/api/v1/*` | pending |
| 8 | Storefront pages ko server-side data fetching | pending |
| 9 | `views/` se `features/` me shift | pending |
| 10 | Analytics + pixels lagana | pending |

### Ab jo baqi hai us me sab se ahem

**Server-side data fetching (point 8).** Abhi product page ka *metadata* aur
JSON-LD server pe banta hai — yehi Google padhta hai, to rich snippets kaam
karenge. Lekin page ka *visible* data abhi bhi browser me tRPC hook se aata
hai. Poora SSR karne ke liye har storefront page ko server component banana
hoga jo `lib/api/server.ts` se data le. Ye point 7 (REST) ke sath karna behtar
hai.

**Purana code:** `client/`, `server/`, `drizzle/` ab mojood nahi — sab kuch
`git mv` se shift hua hai, to history salamat hai aur rollback mumkin hai.

---

## 10. Aap se kya chahiye

Split aur SEO ke liye kuch nahi chahiye tha — wo ho gaya. Ye teen faisle
**Postgres migration se pehle** darkar hain:

1. **Postgres password** — Postgres 18 chal raha hai (:5432) lekin `postgres`
   user ka password nahi pata. Ya to bata dein, ya khud role bana lein:

   ```
   ! & "C:\Program Files\PostgreSQL8in\psql.exe" -U postgres -c "CREATE USER sofa WITH PASSWORD 'apna_password' CREATEDB;"
   ```

2. **Auth ka faisla** — point 8. Mera mashwara: apna email + password auth.
3. **Boolean cleanup** haan ya nahi — point 6.

---

## 11. Rozana ke commands

```bash
pnpm install          # workspace install (teeno packages)
pnpm dev              # backend :4000 + frontend :3000 ek sath
pnpm dev:backend      # sirf API
pnpm dev:frontend     # sirf web
pnpm build            # dono build
pnpm check            # dono ka typecheck
pnpm test             # dono ke tests
pnpm db:push          # drizzle generate + migrate
```

`.env` sirf workspace root pe hai — dono apps wahi se parhte hain, secrets
duplicate nahi hote.
