/**
 * Base URL for the backend API.
 *
 * Empty by default: requests stay relative (`/api/...`) and the Vite dev server
 * proxies them to the backend, so cookies remain same-origin and the OAuth
 * callback keeps working. Set VITE_API_URL only when the API is hosted on a
 * different origin than the frontend.
 */
export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");

export const apiUrl = (path: string) =>
  `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
