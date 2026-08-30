# shared/

Wo cheezein jo backend aur frontend **dono** use karte hain. Ye alag package hai
(`@sofa/shared`), taake ek jagah badlein aur dono taraf apply ho jaye.

| Folder | Kya |
|---|---|
| `types/` | API request/response shapes, entity types (Product, Order, User) |
| `constants/` | Order statuses, review statuses, cookie name, pixel event names |

## Sirf yahan kya rakhein

Sirf wo cheezein jo **dono** taraf sach hain — types, enums, pure functions
(validation regex, price formatting).

Yahan **na** rakhein: React components, Express code, database models, ya koi
bhi cheez jisme `window` ya `process.env` ho.

## Sabse bara faida

Backend `Order` ka koi field badle to frontend me foran compile error aayega —
production me toot-ne ka intezar nahi karna parega.

---
`_core/` aur `commerce/` purane code ke folders hain. Migration ke waqt inka
maal `types/` aur `constants/` me shift ho jayega.
