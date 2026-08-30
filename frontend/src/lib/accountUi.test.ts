import { describe, expect, it } from "vitest";
import { getAccountEmptyStateMessage } from "./accountUi";

describe("account UI feedback", () => {
  it("provides useful empty-state guidance for orders and saved configurations", () => {
    expect(getAccountEmptyStateMessage("orders")).toEqual({
      title: "Your collection is waiting",
      description: "Your first order will appear here once it is placed.",
    });
    expect(getAccountEmptyStateMessage("configurations")).toEqual({
      title: "No saved designs yet",
      description: "Visit Custom Studio to create and save a piece.",
    });
  });
});
