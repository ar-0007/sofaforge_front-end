# features/

Har feature ka apna folder — backend ke `modules/` ka aaina.

```
features/catalog/
  components/     ProductCard, ProductGrid, SeriesNav, FilterBar
  hooks/          useProducts, useProductFilters
  types.ts        feature-specific types
```

| Feature | Kya hai andar | Purana code |
|---|---|---|
| `catalog/` | Product listing, detail, filters | `pages/Shop.tsx`, `ProductDetail.tsx` |
| `cart/` | Cart drawer, line items | `contexts/CartContext.tsx` |
| `checkout/` | Order form, confirmation | `pages/Contact.tsx` ka hissa |
| `account/` | Orders, saved designs, wishlist | `pages/Account.tsx` |
| `admin/` | Dashboard, catalog & ops tools | `pages/AdminPanel.tsx` + 2 more |
| `studio/` | Custom sofa configurator | `pages/CustomStudio.tsx` |

**Rule:** ek feature doosre feature se seedha import na kare. Agar zaroorat
paray to wo cheez `components/` ya `lib/` me shift ho jayegi.
