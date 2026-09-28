import { describe, expect, it } from "vitest";

import { mergeFetchedRows, overlayUnconfirmedRows } from "@/lib/data/list-all-rows";

describe("mergeFetchedRows", () => {
  it("replaces the list when nothing changed locally during the fetch", () => {
    const current = [{ id: "local-only" }];
    const server = [{ id: "server" }];
    expect(mergeFetchedRows(current, server, true, new Set())).toEqual(server);
  });

  it("keeps a row saved locally while the fetch was in flight", () => {
    const current = [{ id: "existing" }, { id: "just-added" }];
    const server = [{ id: "existing" }, { id: "from-someone-else" }];
    expect(mergeFetchedRows(current, server, false, new Set())).toEqual([
      { id: "existing" },
      { id: "just-added" },
      { id: "from-someone-else" },
    ]);
  });

  it("does not bring back a row deleted locally during the fetch", () => {
    const current = [{ id: "keep" }];
    const server = [{ id: "keep" }, { id: "deleted" }];
    expect(mergeFetchedRows(current, server, false, new Set(["deleted"]))).toEqual([
      { id: "keep" },
    ]);
  });
});

describe("overlayUnconfirmedRows", () => {
  it("keeps a just-saved row when this fetch does not include it yet", () => {
    const current = [{ id: "saved", hours: 4 }];
    const server = [{ id: "other", hours: 1 }];
    const { rows, confirmedIds } = overlayUnconfirmedRows(
      server,
      current,
      server,
      new Set(["saved"]),
      new Map([["saved", 2]]),
      1,
    );
    expect(rows).toEqual([
      { id: "other", hours: 1 },
      { id: "saved", hours: 4 },
    ]);
    expect(confirmedIds).toEqual([]);
  });

  it("accepts the server row once a fetch started after the save includes it", () => {
    const current = [{ id: "saved", hours: 4 }];
    const server = [{ id: "saved", hours: 4 }];
    const { rows, confirmedIds } = overlayUnconfirmedRows(
      server,
      current,
      server,
      new Set(["saved"]),
      new Map([["saved", 2]]),
      2,
    );
    expect(rows).toEqual(server);
    expect(confirmedIds).toEqual(["saved"]);
  });
});
