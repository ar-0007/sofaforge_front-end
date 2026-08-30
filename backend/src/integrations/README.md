# integrations/

Har third-party service ka wrapper. Baqi backend seedha `axios` call nahi
karega — hamesha yahan se guzray ga. Faida: service badalni ho to sirf ek file.

| File (banegi) | Kaam | Purana code |
|---|---|---|
| `shopify.ts` | Storefront API | `server/_core/shopify.ts` + `shopifyNormalize.ts` |
| `llm.ts` | AI chat/completions | `server/_core/llm.ts` |
| `storage.ts` | S3 upload / presigned URLs | `server/storage.ts`, `storageProxy.ts` |
| `email.ts` | Transactional email | `server/_core/notification.ts` |
| `imageGeneration.ts` | AI images | `server/_core/imageGeneration.ts` |
| `maps.ts` | Google Maps | `server/_core/map.ts` |
| `pixels/facebook-capi.ts` | **Facebook Conversions API** (server-side) | naya |
| `pixels/tiktok-events.ts` | **TikTok Events API** (server-side) | naya |
