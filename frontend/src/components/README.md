# components/

Wo UI jo kisi ek feature ki milkiyat nahi.

| Folder | Kya |
|---|---|
| `ui/` | shadcn/ui primitives — Button, Input, Dialog, Table... (~45 files) |
| `layout/` | Header, Footer, Sidebar, StoreLayout, DashboardLayout |
| `shared/` | ErrorBoundary, Loading skeletons, SEO wrappers, Analytics scripts |

Purana code: `client/src/components/` sab yahan aayega.

**Client vs Server components:** `ui/` ke jin components me `useState`/`onClick`
hai unke upar `"use client"` likhna parega. Static layout wale server pe hi rahenge —
isse JS bundle chhota rehta hai aur page fast khulta hai.
