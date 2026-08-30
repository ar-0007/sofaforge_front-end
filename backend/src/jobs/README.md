# jobs/

Background kaam jo request ke bahar chalte hain.

| Job (banega) | Kaam |
|---|---|
| `abandonedCartReminder.job.ts` | Chhoray hue carts pe reminder bhejna |
| `syncShopifyCatalog.job.ts` | Shopify se catalog sync |
| `flushAnalyticsQueue.job.ts` | Buffered events ko FB/TikTok CAPI pe bhejna |

Shuru me simple `node-cron` kaafi hai. Traffic barhne pe inhe BullMQ + Redis
queue pe move kar sakte hain — code wahi rahega, sirf trigger badlega.
