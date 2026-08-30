# lib/analytics/ — Pixels & user behaviour

Sab tracking ek hi jagah se guzray gi. Components me kabhi `fbq(...)` ya
`ttq.track(...)` seedha nahi likha jayega.

```
tracker.ts              Sab kuch yahan se: track('add_to_cart', {...})
events.ts               Typed event list — galat naam likha to compile error
consent.ts              User ne consent diya? (GDPR) Warna kuch fire nahi hoga
providers/
  facebook-pixel.ts     Facebook / Meta Pixel
  tiktok-pixel.ts       TikTok Pixel
  ga4.ts                Google Analytics 4
  internal.ts           Apna backend (/api/v1/analytics/events)
```

## Ek hi call, sab providers pe

```
track('purchase', { orderId, value, currency, items })
        |
        +--> Facebook Pixel   (browser)
        +--> TikTok Pixel     (browser)
        +--> GA4              (browser)
        +--> Apna backend     -> wahan se FB CAPI + TikTok Events API
```

Faida: naya pixel (Snapchat, Pinterest) add karna ho to sirf ek file
`providers/` me daalni hai — poore app me ek line bhi nahi badlegi.

## Kaunse events track honge

E-commerce ke standard events, taake FB/TikTok inhe pehchan sakein:

`page_view`, `view_item`, `view_item_list`, `add_to_cart`, `remove_from_cart`,
`begin_checkout`, `purchase`, `search`, `sign_up`, `lead` (contact form),
`customise_start` / `customise_complete` (Custom Studio ke liye)

## User behaviour

Sirf pixel events nahi — apne backend pe bhi bhejte hain taake apni reporting
ho: scroll depth, kis product pe kitna ruka, cart chhora kahan, konsa
fabric/colour sabse zyada choose hota hai.

Ye data `backend/src/modules/analytics/` me save hoga.

## Environment variables

```
NEXT_PUBLIC_FB_PIXEL_ID
NEXT_PUBLIC_TIKTOK_PIXEL_ID
NEXT_PUBLIC_GA4_MEASUREMENT_ID
```

`NEXT_PUBLIC_` prefix ka matlab browser me bhi mil jayega — pixel IDs public
hote hain, isliye theek hai. Access **tokens** (CAPI wale) kabhi yahan nahi,
wo sirf backend me.
