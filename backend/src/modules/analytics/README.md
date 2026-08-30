# modules/analytics/ — server-side tracking

Browser ke pixels ad-blockers se block ho jate hain (~30% tak events kho jate
hain). Isliye ahem events **server se bhi** bhejte hain — isay "Conversions API"
(Facebook) aur "Events API" (TikTok) kehte hain.

```
analytics.routes.ts       POST /api/v1/analytics/events
analytics.controller.ts   event receive karo
analytics.service.ts      normalize -> queue -> FB CAPI + TikTok Events API
analytics.repository.ts   raw events DB me save (apni reporting ke liye)
```

## Kyun dono taraf (browser + server)?

| | Browser pixel | Server CAPI |
|---|---|---|
| Ad-blocker | block ho jata hai | nahi hota |
| Data quality | kam | zyada (email hash, order value) |
| Purchase event | reliable nahi | reliable |

Dono ek hi `event_id` bhejte hain, taake Facebook/TikTok duplicate merge kar de.

Browser wala hissa: `frontend/src/lib/analytics/`
