# middlewares/

Express middlewares — har request pe chalne wale chhote functions.

| File (banegi) | Kaam |
|---|---|
| `authenticate.ts` | JWT verify karke `req.user` set karta hai |
| `requireAuth.ts` | Login na ho to 401 |
| `requireAdmin.ts` | `role !== 'admin'` ho to 403 |
| `validate.ts` | zod schema se body/query/params check |
| `errorHandler.ts` | Saari errors ek jagah, consistent JSON response |
| `rateLimit.ts` | Abuse rokne ke liye |
| `requestLogger.ts` | Har request ka log + request id |

Purana code: `server/_core/trpc.ts` (protectedProcedure, adminProcedure)
