# config/

App ki tamam configuration ek jagah.

| File (banegi) | Kaam |
|---|---|
| `env.ts` | `process.env` ko zod se validate karke typed object deta hai. App start pe hi galat/missing env pakra jata hai. |
| `database.ts` | Sequelize instance + connection pool settings |
| `constants.ts` | Cookie name, token TTL, pagination defaults |

**Rule:** `process.env` sirf `env.ts` me use hoga. Baaki poore backend me
`import { env } from '@/config/env'`. Isse pata rehta hai app ko kya kya chahiye.

Purana code jo yahan aayega: `server/_core/env.ts`
