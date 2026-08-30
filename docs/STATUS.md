# Sofa Co. — Abhi kahan khare hain

> **Aakhri update:** 2026-08-22
> Ye file "abhi kya haal hai" ke liye hai. Naqsha aur faisle `ARCHITECTURE.md`
> me hain, kaam ki list `todo.md` me. Ye teesri cheez batati hai: kya chal raha
> hai, kya adhoora hai, aur agla qadam kya hai.

---

## 1. Ek nazar me

| Cheez | Haal |
|---|---|
| Backend (`:4000`) | chal raha hai — Express + tRPC + Drizzle + MySQL |
| Frontend (`:3000`) | chal raha hai — Next.js 15 App Router |
| Typecheck | dono clean |
| Tests | backend 36, frontend 64 — sab pass |
| Build | dono pass (frontend 41/41 pages) |
| Database | connected — 110 products, 5 option groups, 63 choices |
| Git | **sab kuch uncommitted** — dekho point 5 |

```bash
pnpm dev          # dono ek sath
pnpm dev:backend  # sirf API  :4000
pnpm dev:frontend # sirf web  :3000
pnpm check        # dono ka typecheck
pnpm test         # dono ke tests
```

Storefront `http://localhost:3000` · Admin `http://localhost:3000/admin`

---

## 2. Crash ke baad kya hua

Do session ek sath chal rahe the — ek backend, ek frontend — aur system band ho
gaya. **Kuch zaaya nahi hua.** Sab kuch disk pe salamat mila, sirf commit nahi
hua tha.

**Backend session ne jo banaya:** analytics router, settings module, Meta CAPI +
TikTok Events integration, productOptions router, catalog importer, migrations
0003–0005, devAuth.

**Frontend session ne jo banaya:** 17 admin screens aur unke routes,
adminNav/adminUtils, brand + motion-primitives components, analytics lib
(tracker, consent, banner, teen pixel providers).

---

## 3. Analytics — ab mukammal hai

Infrastructure dono session bana chuke the, lekin **ek bhi call site nahi tha**.
Sirf `page_view` fire hota tha; baqi 12 events sirf kaghaz pe the. Ab lag chuke
hain:

| Event | Kahan se fire hota hai |
|---|---|
| `view_item` | ProductDetail — per product ek baar (ref guard) |
| `view_item_list` | Shop — per filter combination |
| `add_to_cart` | ProductDetail, Shop, Wishlist |
| `remove_from_cart` | CartDrawer |
| `add_to_wishlist` | ProductDetail — sirf save pe |
| `begin_checkout` / `purchase` | CartDrawer |
| `customise_start` / `customise_complete` | CustomStudio |
| `lead` | Contact + Swatch request — sirf kamyab submit pe |
| `sign_up` | Newsletter (SiteFooter) |

`search` jaan boojh kar chhora hai — storefront me search feature hai hi nahi.

### Do baatein jo yaad rakhni hain

**Paisa.** Catalog cents me rakhta hai, ad platforms bare number ko dollars
parhte hain. Isi liye har call site `frontend/src/lib/analytics/items.ts` se
guzarta hai. Ek jagah conversion chhooti, to $4,400 ka sofa $440,000 report ho
kar poori ROAS reporting kharab kar deta.

**50 items ka cap.** Backend `items` array ko 50 pe cap karta hai (flood
protection). Shop page 110 products render karta hai — poori list bhejne pe
event trim nahi hota, **poora reject** ho jata hai. Cap ab
`shared/analytics/events.ts` me `MAX_ANALYTICS_ITEMS` hai, dono taraf wahi
padhte hain, aur `productItems()` khud truncate karta hai.

> Ye bug typecheck, 85 tests aur dono builds pass kar gaya tha. Sirf app chala
> kar browser console parhne se pakda gaya. **Storefront ka kaam chalaye baghair
> "ho gaya" mat kehna.**

**Tracking sirf storefront pe.** `TrackingProvider` sirf `(storefront)` layout
me mounted hai. Admin aur account screens shopper journey nahi hain — wahan koi
ad pixel kabhi fire nahi hona chahiye. `CartProvider` root me hai, yani
`TrackingProvider` se **upar**, isliye CartContext ke andar `useTracking()`
kaam nahi karega (no-op milega). Cart events call sites pe lagte hain.

---

## 4. Jo abhi baqi hai

### 4.1 Database migrations — **ho gaya**

Migrations 0003–0006 ab apply ho chuki hain. `analyticsEvents`, `storeSettings`,
`productOptionGroups`, `productOptionChoices` aur `series.parentId` sab mojood
hain. Analytics events dobara save hone lage hain.

**Kyun atki hui theen:** `backend/drizzle.config.ts` workspace `.env` ko
`import.meta.dirname` se resolve karta tha. drizzle-kit config ko CJS me bundle
karta hai, jahan `import.meta.dirname` khali hota hai aur `path.resolve()` throw
kar deta hai. Yani `db:generate`, `db:migrate`, `db:push` — teeno hamesha fail
the. Ab `process.cwd()` se resolve hota hai, jo dono module formats me chalta hai.

### 4.2 Homepage animation

Aapne kaha animation "kisi kam ki nahi". Survey se ye nikla:

- `SectionHeading` (`primitives.tsx`) hi asal reveal hai — heading aur blurb
  scroll pe fade-up hote hain.
- Sections ke **body me motion hai hi nahi**: `RoomVisualiser`,
  `SeriesShowcase`, `ConfiguratorPreview`, `TrustStrip` — zero. `ShapeFinder`,
  `ProductCarousel`, `Testimonials` — bohot kam.
- Nateeja: heading animate hoti hai, phir poora content bina motion ke chipak
  jata hai. Isi liye adhoora lagta hai.

Buniyad pehle se mojood hai aur achhi hai — shared `EASE` curve,
`useSiteMotion()` (reduced-motion ka ehtram), aur
`components/motion-primitives/` me 16 components (tilt, in-view, text-effect,
spotlight, magnetic, animated-group) jo abhi **istemal hi nahi ho rahe**.

> `.env` me `NEXT_PUBLIC_FORCE_MOTION=true` laga hua hai. Iske baghair jis
> machine pe OS ka animation toggle band ho, wahan `useSiteMotion()` false
> deta hai aur saari animation ghayab ho jati hai. Animation "toot gayi" kehne
> se pehle ye check karein.

**Kaam aapki hidayat ka muntazir hai — abhi koi file nahi chhedi gayi.**

### 4.3 Product configurator — **ho gaya**

Purani WooCommerce site ke saare entities ab live hain, asli data ke saath:

| Group | Choices | Note |
|---|---|---|
| Select Depth | 3 | asli prices — +$4,000 / +$2,000 / +$59,999.90 |
| Select Material | 5 | Textured Weave, Chenille, Velvet, Bouclé, Leatherette |
| Select Colour | 51 | asli fabric photos; material ke hisab se filter hoti hain |
| Back Cushion Style | 2 | |
| Seat Style | 2 | |

Data `backend/src/db/seeders/importOptions.ts` se aata hai
(`pnpm --filter @sofa/backend db:options`).

**Ye HTML parse kyun karta hai, API kyun nahi:** WooCommerce Store API
(`/wp-json/wc/store/v1/products`) chalti hai lekin in products ko
`type: "simple"`, `attributes: []`, `has_options: false` batati hai. Configurator
store ke apne add-ons template se render hota hai, isliye data sirf product page
ke markup me milta hai — `data-group` / `data-price` / `data-label` attributes
me, aur materials ke liye `data-colours` JSON me jahan 51 colours apni swatch
photos ke sath pade hain.

**Do cheezein jo bug lagti hain magar nahi hain:** har product ka base price
waqai $4,400 hi hai (variation add-ons se aati hai), aur store har fabric ke liye
`#CCCCCC` placeholder hex bhejta hai — asli rang swatch **photo** hai, hex nahi.

Colours materials ke andar nested hain, jo flat schema me nahi samaati thi.
Iske liye `productOptionChoices.parentChoiceId` add kiya gaya (migration 0006).
Admin me har colour ke neeche "Only under Textured Weave" dikhta hai, aur choice
form me "Only show under" selector hai. Add-product form batata hai ke naye piece
ko kaunse shared options milenge.

### 4.4 ARCHITECTURE.md ka roadmap

| # | Kaam | Haal |
|---|---|---|
| 1–5 | Structure, split, Next.js, SEO, purana code hatana | ho gaya |
| 6 | Postgres + Sequelize migration | pending — teen faisle darkar |
| 7 | tRPC se REST `/api/v1/*` | pending |
| 8 | Storefront ka server-side data fetching | pending |
| 9 | `views/` se `features/` shift | aadha (admin ho gaya) |
| 10 | Analytics + pixels | **ho gaya** |

---

## 5. Git — dhyan dein

Poore repo me **ek hi commit** hai (`4f7d9c4`), aur uske upar taqreeban **300
files staged lekin uncommitted** hain. Monorepo split, admin dashboard,
analytics — sab kuch usi working tree me hai.

Ek crash pehle ho chuka hai. Us waqt bach gaye kyunke files disk pe theen, lekin
git history me kuch nahi hai. Dobara crash ya ghalat `git checkout` sab kuch le
dooba.

**Mashwara:** kaam ke har hisse ke baad commit karein.

---

## 6. Aap se kya chahiye

| # | Faisla | Kyun rukka hai |
|---|---|---|
| 1 | Migrations 0003–0005 apply karein? | Aapka live DB hai. Iske baghair analytics kuch save nahi karti. |
| 2 | Homepage animation ki direction | Aapne guide karne ko kaha hai. |
| 3 | Commit karein? | 300 files abhi bhi git ke bahar hain. |
| 4 | Postgres password | `ARCHITECTURE.md` §10 |
| 5 | Auth: Manus OAuth / apna email+password / dono | `ARCHITECTURE.md` §8 |
| 6 | MySQL enum boolean cleanup haan ya nahi | `ARCHITECTURE.md` §6 |

Faisle 4–6 Postgres migration se pehle darkar hain.
