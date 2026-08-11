import { describe, expect, it } from "vitest";

import { estimateTypeAfterWon } from "@/lib/project-contracts";

describe("estimateTypeAfterWon", () => {
  it("promotes new and existing project wins to contract", () => {
    expect(estimateTypeAfterWon("new")).toBe("contract");
    expect(estimateTypeAfterWon("existing")).toBe("contract");
  });

  it("promotes change-order wins to change_order", () => {
    expect(estimateTypeAfterWon("change_order")).toBe("change_order");
  });

  it("keeps change_order type when linking to an existing project", () => {
    expect(estimateTypeAfterWon("existing", "change_order")).toBe("change_order");
    expect(estimateTypeAfterWon("new", "change_order")).toBe("change_order");
  });
});
