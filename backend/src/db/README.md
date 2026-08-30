# db/

Database layer — Sequelize + PostgreSQL.

- `models/` — ek file = ek table. Columns, associations, hooks.
- `migrations/` — schema ka har change. `sequelize-cli` chalata hai.
- `seeders/` — shuruati data (7 series, admin user).

## Models banenge (13 tables, purane Drizzle schema se)

| Model | Table |
|---|---|
| `User` | users |
| `Series` | series |
| `Product` | products |
| `ProductVariant` | product_variants |
| `CustomConfiguration` | custom_configurations |
| `Order` | orders |
| `Cart` | carts |
| `ProductReview` | product_reviews |
| `Inquiry` | inquiries |
| `NewsletterSubscriber` | newsletter_subscribers |
| `ContentPlacement` | content_placements |
| `CustomerReminder` | customer_reminders |
| `AdminAuditLog` | admin_audit_logs |

**Note:** Postgres me table/column names `snake_case` honge (Postgres ka
convention), lekin JS side pe `camelCase` — Sequelize ka `underscored: true`
ye khud handle kar leta hai.

Purana code: `drizzle/schema.ts` + `drizzle/*.sql`
