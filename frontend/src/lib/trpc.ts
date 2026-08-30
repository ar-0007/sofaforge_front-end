"use client";

import { createTRPCReact } from "@trpc/react-query";
// Type-only import — erased at build time, so no backend code ends up in the
// browser bundle. It is the single compile-time link between the two apps.
import type { AppRouter } from "@backend/modules/app.router";

export const trpc = createTRPCReact<AppRouter>();