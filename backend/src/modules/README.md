# modules/

Har feature apna alag folder. Ye "modular monolith" pattern hai — abhi ek hi
service chalti hai, lekin kal koi module alag microservice banana ho to
sirf uska folder uthana parega.

| Module | Zimmedari | Purana code |
|---|---|---|
| `auth/` | Login, session JWT, current user | `server/_core/sdk.ts`, `oauth.ts`, `context.ts` |
| `catalog/` | Series, products, variants | `server/routers/commerce.ts` (catalog hissa) |
| `cart/` | Cart track, abandoned carts | `commerce.ts` (trackCart) |
| `orders/` | Order create/list, status | `commerce.ts` (createOrder, getOrders) |
| `reviews/` | Product reviews + moderation | `commerce.ts` + `admin.ts` |
| `inquiries/` | Contact form, newsletter | `commerce.ts` |
| `content/` | Homepage placements/banners | `commerce.ts` (getPlacements) |
| `admin/` | Dashboard, audit log, reminders | `server/routers/admin.ts` |
| `analytics/` | Event ingest + server-side pixels | naya |

Har module ke andar ke 5 files ke liye backend ka main README dekhein.
