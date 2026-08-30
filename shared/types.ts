/**
 * Unified type exports for code shared by backend and frontend.
 *
 * NOTE: database row types are intentionally NOT re-exported here. They belong
 * to the backend (`backend/src/db/schema.ts`); `shared/` must never import from
 * `backend/` or the dependency direction inverts and the two apps stop being
 * independently deployable. The frontend receives those shapes through tRPC
 * type inference instead.
 */

export * from "./_core/errors";
export type * from "./commerce/types";
