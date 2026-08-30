# modules/catalog/ — example module

Ye module reference hai. Baaki har module bilkul isi shakl ka hoga.

```
catalog.routes.ts        GET  /api/v1/catalog/series
                         GET  /api/v1/catalog/products
                         GET  /api/v1/catalog/products/:slug

catalog.controller.ts    req se data nikalo -> service call karo -> res.json()
                         (koi business logic nahi, koi DB nahi)

catalog.service.ts       Rules yahan: visible products hi dikhayein,
                         DB down ho to fallback catalog do, cache lagao

catalog.repository.ts    Sirf Sequelize: Product.findAll({ where: ... })

catalog.validation.ts    zod: slug string ho, page number ho, limit <= 100
```

## Data ka safar (ek request)

```
GET /api/v1/catalog/products/bobby-3-seater
   |
   v  routes      -> sahi controller dhoondta hai
   v  validation  -> slug valid hai?
   v  controller  -> service.getProductBySlug(slug)
   v  service     -> cache dekho, na mile to repository
   v  repository  -> Product.findOne({ where: { slug } })
   v  model       -> SQL
   v  Postgres
```

Har layer ka ek hi kaam hai — isi liye test karna aur badalna asaan rehta hai.
