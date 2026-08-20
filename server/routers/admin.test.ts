import { describe, expect, it } from "vitest";
import { adminRouter } from "./admin";
import type { TrpcContext } from "../_core/context";

describe("admin router permissions", () => {
  it("rejects a signed-in non-admin before any management data is accessed", async () => {
    const ctx: TrpcContext = {
      user: {
        id: 8,
        openId: "standard-user",
        name: "Standard User",
        email: "user@example.com",
        loginMethod: "manus",
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
      req: {} as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };

    await expect(adminRouter.createCaller(ctx).overview()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
