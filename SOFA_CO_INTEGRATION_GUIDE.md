# Sofa Co. Custom Commerce — Technical Integration & Operations Guide

## Executive Summary

**Sofa Co. Custom Commerce** (`thesofaco.ca`) is a production-ready, full-stack custom furniture e-commerce platform built to replace legacy WordPress/WooCommerce deployments with a lightning-fast, modern React and TypeScript architecture [1]. The platform is centered around the brand message **"The Art of Living."** and features an editorial design system, curated product catalog across seven signature series (**Bobby**, **Diane**, **Isla**, **Nimbus**, **Paloma**, **Stanton**, and **Stanton II**), an interactive multi-step **Custom Studio** configurator, persistent customer cart and order checkout, customer accounts, complete static brand and support pages, precise inquiry categories (*Residential*, *Commercial*, *Product Inquiry*), and a role-protected administration dashboard with variant CRUD, media management, review moderation, cart analytics, consent-gated reminder drafting, and audit logging [2].

---

## Architecture & Technology Stack

The platform is constructed on a unified full-stack TypeScript template that eliminates fragile REST boilerplate through end-to-end tRPC contracts.

```
┌─────────────────────────────────────────────────────────┐
│                     Client (React 19)                   │
│  Wouter Routing · Framer Motion · Tailwind v4 · tRPC      │
└────────────────────────────┬────────────────────────────┘
                             │ tRPC RPC over /api/trpc
                             ▼
┌─────────────────────────────────────────────────────────┐
│                Server (Express 4 + tRPC 11)             │
│  Manus OAuth Auth · Admin Gating · Catalog Fallbacks    │
└────────────────────────────┬────────────────────────────┘
                             │ Drizzle ORM
                             ▼
┌─────────────────────────────────────────────────────────┐
│               Database (MySQL / TiDB / Supabase)        │
│  Products · Series · Variants · Orders · Carts · Reminders│
└─────────────────────────────────────────────────────────┘
```

### Core Technologies
- **Frontend Framework**: React 19, TypeScript, Wouter for lightweight routing, Framer Motion for scroll-progress and layout transitions, and Tailwind CSS v4 with custom warm cream (`#f8f4ec`), espresso (`#25221d`), and cognac (`#c58d5d`) design tokens [3].
- **Backend Framework**: Express 4, tRPC 11 with Superjson serialization, and secure Manus OAuth session cookie authentication [4].
- **Database & ORM**: Drizzle ORM configured for MySQL/TiDB and PostgreSQL schema compatibility, with structured query helpers in `server/db.ts` [5].
- **Resilience**: Automatic fallback catalog (`server/catalogFallback.ts`) ensures the storefront remains fully browseable even when database connectivity is offline or unmigrated [6].

---

## Detailed Component & Module Overview

### 1. Storefront Experience & Navigation (`client/src/components/StoreLayout.tsx`)
- **Top Marquee**: Displays brand highlights (*"Made to order in Canada ✦ Complimentary white-glove delivery ✦ The Art of Living."*) [7].
- **Navigation Bar**: Sticky backdrop-blurred header featuring the brand mark, primary navigation links (*Shop*, *Custom Studio*, *Our Story*, *Contact*), search trigger, customer account dropdown, and a live slide-out shopping bag drawer [8].
- **Footer**: Comprehensive site map, Toronto showroom address, and newsletter subscription form with instant database capture and owner push alerts [9].

### 2. Curated Product Catalog & Series
The collection spans seven distinct Canadian-crafted furniture series, each managed through database tables or fallback definitions:
- **Bobby** & **Diane**: Refined mid-century and relaxed lounge silhouettes.
- **Isla** & **Nimbus**: Cloud-like modular comfort with deep cushioning.
- **Paloma**, **Stanton**, & **Stanton II**: Architectural statement sofas with tailored tailoring and clean lines.

### 3. Custom Studio Configurator (`client/src/pages/CustomStudio.tsx`)
An immersive multi-step interactive configurator enabling clients to customize shape (Sectional, Sofa, Loveseat, Chair), fabric (Belgian Linen, Performance Velvet, Bouclé, Tuscan Leather), colour palette, and scale with live price calculation and instant addition to the shopping bag [10].

### 4. Customer Account & Order History (`client/src/pages/Account.tsx`)
Provides authenticated users with profile management, order history tracking, saved custom configurations, and quick access to active support channels [11].

### 5. Administration Dashboard (`client/src/pages/AdminPanel.tsx` & `AdminOperationsTools.tsx`)
Secured via `adminProcedure` ensuring only users with `role === 'admin'` can access sensitive business endpoints [12]. 
- **Overview & Analytics**: Live counts for products, orders, inquiries, pending reviews, active carts, and reminder drafts.
- **Catalog & Variant Tools**: Full CRUD for products, pricing, SKUs, and image gallery URLs.
- **Operations & Reminders**: Order status updates, customer inquiry moderation, review approvals, and a consent-gated reminder drafting tool that strictly requires explicit user consent confirmation (`consentConfirmed: true`) before creating a draft for manual review [13].

---

## Data Model & Schema Summary

The database schema (`drizzle/schema.ts`) includes the following core tables:
1. **users**: Stores user profiles, authentication metadata, and role (`admin` | `user`) [14].
2. **series**: Curated furniture families with visibility and sort order [15].
3. **products**: Individual furniture pieces linked to series, starting prices, and image assets [16].
4. **productVariants**: Specific size, fabric, and SKU variations [17].
5. **customConfigurations**: Saved custom studio builds linked to customer sessions [18].
6. **orders**: Completed customer purchases with items and shipping details [19].
7. **inquiries**: Customer contact submissions categorized by *Residential*, *Commercial*, and *Product Inquiry* [20].
8. **newsletterSubscribers**: Captured emails for the design list [21].
9. **contentPlacements**: Dynamic CMS slots for homepage banners and featured series [22].
10. **productReviews**: Moderated customer feedback and star ratings [23].
11. **carts**: Active customer shopping carts with items, subtotals, and reminder consent flags [24].
12. **customerReminders**: Drafted customer outreach messages requiring explicit consent and review [25].
13. **adminAuditLogs**: Immutable audit trail of all administrative actions and changes [26].

---

## Automated Testing Suite

The project includes a robust test suite covering helper functions, tRPC routers, authentication guards, and component rendering states:
- **Test Runner**: Vitest [27].
- **Test Files**:
  - `server/auth.logout.test.ts`: Validates session cookie clearance and logout behavior [28].
  - `server/commerce.router.test.ts`: Tests public commerce queries and fallback catalog behavior [29].
  - `server/routers/admin.test.ts`: Verifies role-based access control and strict admin procedure gating (`FORBIDDEN` for non-admins) [30].
  - `client/src/lib/storefrontUi.test.ts` & `accountUi.test.ts`: Verifies helper calculations and UI primitives [31].
  - `client/src/pages/AdminPanel.test.tsx` & `AdminOperationsTools.test.tsx`: Validates administrative tabs and consent-gated reminder submission states [32].

---

## Setup & Local Development Instructions

1. **Prerequisites**: Node.js 22+ and pnpm [33].
2. **Install Dependencies**:
   ```bash
   pnpm install
   ```
3. **Run Development Server**:
   ```bash
   pnpm dev
   ```
   The application will start on `http://localhost:3000`.
4. **Run Automated Tests**:
   ```bash
   pnpm test
   ```
5. **Type Checking**:
   ```bash
   pnpm check
   ```

---

## References

[1] Sofa Co. Custom Commerce Platform Brief, 2026.
[2] Sofa Co. Brand & Design System Specifications, 2026.
[3] React 19 & Tailwind CSS v4 Documentation, 2026.
[4] tRPC v11 & Express Integration Guide, 2026.
[5] Drizzle ORM Documentation, 2026.
[6] Sofa Co. Catalog Fallback Architecture, `server/catalogFallback.ts`, 2026.
[7] Sofa Co. StoreLayout Component, `client/src/components/StoreLayout.tsx`, 2026.
[8] Storefront Navigation Specifications, 2026.
[9] Owner Notification SDK, `server/_core/notification.ts`, 2026.
[10] Custom Studio Configurator Implementation, `client/src/pages/CustomStudio.tsx`, 2026.
[11] Customer Account Area, `client/src/pages/Account.tsx`, 2026.
[12] Role-Based Access Control in tRPC Procedures, `server/_core/trpc.ts`, 2026.
[13] Admin Operations & Consent-Gated Reminders, `server/routers/admin.ts`, 2026.
[14] Database Schema Definitions, `drizzle/schema.ts`, 2026.
[15] Series Catalog Model, `drizzle/schema.ts`, 2026.
[16] Product Catalog Model, `drizzle/schema.ts`, 2026.
[17] Product Variant Schema, `drizzle/schema.ts`, 2026.
[18] Custom Configurations Schema, `drizzle/schema.ts`, 2026.
[19] Orders & Checkout Schema, `drizzle/schema.ts`, 2026.
[20] Customer Inquiries Schema, `drizzle/schema.ts`, 2026.
[21] Newsletter Subscribers Schema, `drizzle/schema.ts`, 2026.
[22] Content Placements CMS Schema, `drizzle/schema.ts`, 2026.
[23] Product Reviews Schema, `drizzle/schema.ts`, 2026.
[24] Active Carts Analytics Schema, `drizzle/schema.ts`, 2026.
[25] Customer Reminders Schema, `drizzle/schema.ts`, 2026.
[26] Admin Audit Logs Schema, `drizzle/schema.ts`, 2026.
[27] Vitest Testing Framework Documentation, 2026.
[28] Authentication Logout Test, `server/auth.logout.test.ts`, 2026.
[29] Commerce Router Tests, `server/commerce.router.test.ts`, 2026.
[30] Admin Authorization Tests, `server/routers/admin.test.ts`, 2026.
[31] Storefront UI Helper Tests, `client/src/lib/storefrontUi.test.ts`, 2026.
[32] Admin Panel Render & Consent Tests, `client/src/pages/AdminPanel.test.tsx`, 2026.
[33] Project Configuration & Environment Standards, `package.json`, 2026.
