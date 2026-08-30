import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { listUploads, saveDataUrl } from "../../core/media";
import { adminProcedure, router } from "../../core/trpc";

/**
 * The admin's image library. Uploads arrive as a `data:` URL from the browser
 * (already downsized there), so no multipart parser or storage account is
 * needed — one dependency-free path from "photo on my laptop" to "picture on
 * the shop".
 */
export const mediaRouter = router({
  upload: adminProcedure
    .input(
      z.object({
        fileName: z.string().min(1).max(255),
        // ~16 MB of base64 ≈ 12 MB of image; the byte cap is enforced on decode.
        dataUrl: z.string().min(32).max(24_000_000),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        return await saveDataUrl(input.dataUrl, input.fileName);
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "The image could not be saved.",
        });
      }
    }),

  /** Recently uploaded images, so the same photo can be reused without a re-upload. */
  library: adminProcedure
    .input(z.object({ limit: z.number().int().min(1).max(200).default(60) }).optional())
    .query(({ input }) => listUploads(input?.limit ?? 60)),
});
