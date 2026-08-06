import { describe, expect, it } from "vitest";

import {
  createEmptyTimesheetRow,
  entriesToTimesheetRows,
  mergeTimesheetRowsPreservingLocalDrafts,
  type TimesheetRow,
} from "@/lib/timesheet";
import type { TimeEntry } from "@/types";

const WEEK = ["2026-08-03", "2026-08-04", "2026-08-05", "2026-08-06", "2026-08-07"];

function draftRow(overrides: Partial<TimesheetRow> = {}): TimesheetRow {
  return {
    ...createEmptyTimesheetRow(WEEK, {
      allocation_category_id: "cat-1",
      is_billable: true,
    }),
    key: "proj-1:cat-1:1:",
    project_id: "proj-1",
    ...overrides,
  };
}

describe("mergeTimesheetRowsPreservingLocalDrafts", () => {
  it("keeps unsaved day hours when a sibling day save refreshes from the server", () => {
    const previous = draftRow({
      timesheet_line_id: "line-1",
      hoursByDay: {
        "2026-08-03": 8,
        "2026-08-04": 4,
        "2026-08-05": 0,
        "2026-08-06": 0,
        "2026-08-07": 0,
      },
      entryIdsByDay: {
        "2026-08-03": "entry-mon",
        "2026-08-04": undefined,
        "2026-08-05": undefined,
        "2026-08-06": undefined,
        "2026-08-07": undefined,
      },
    });

    const fromServer = draftRow({
      timesheet_line_id: "line-1",
      hoursByDay: {
        "2026-08-03": 8,
        "2026-08-04": 0,
        "2026-08-05": 0,
        "2026-08-06": 0,
        "2026-08-07": 0,
      },
      entryIdsByDay: {
        "2026-08-03": "entry-mon",
        "2026-08-04": undefined,
        "2026-08-05": undefined,
        "2026-08-06": undefined,
        "2026-08-07": undefined,
      },
    });

    const merged = mergeTimesheetRowsPreservingLocalDrafts([previous], [fromServer], {
      editingRowKeys: new Set(),
    });

    expect(merged).toHaveLength(1);
    expect(merged[0]!.hoursByDay["2026-08-03"]).toBe(8);
    expect(merged[0]!.hoursByDay["2026-08-04"]).toBe(4);
    expect(merged[0]!.entryIdsByDay["2026-08-03"]).toBe("entry-mon");
  });

  it("preserves purely local draft rows that the server has not returned yet", () => {
    const localDraft = draftRow({
      key: "draft:cat-1:1:",
      timesheet_line_id: "line-draft",
      project_id: "proj-draft",
      hoursByDay: {
        "2026-08-03": 2,
        "2026-08-04": 0,
        "2026-08-05": 0,
        "2026-08-06": 0,
        "2026-08-07": 0,
      },
    });

    const serverRow = draftRow({
      timesheet_line_id: "line-saved",
      hoursByDay: {
        "2026-08-03": 8,
        "2026-08-04": 0,
        "2026-08-05": 0,
        "2026-08-06": 0,
        "2026-08-07": 0,
      },
      entryIdsByDay: {
        "2026-08-03": "entry-1",
        "2026-08-04": undefined,
        "2026-08-05": undefined,
        "2026-08-06": undefined,
        "2026-08-07": undefined,
      },
    });

    const merged = mergeTimesheetRowsPreservingLocalDrafts([localDraft, serverRow], [serverRow], {
      editingRowKeys: new Set(),
    });

    expect(merged.map((r) => r.key)).toEqual(["proj-1:cat-1:1:", "draft:cat-1:1:"]);
    expect(merged.find((r) => r.key === "draft:cat-1:1:")!.hoursByDay["2026-08-03"]).toBe(2);
  });

  it("keeps local metadata while a row is being edited", () => {
    const previous = draftRow({
      timesheet_line_id: "line-1",
      task_name: "Field work",
      notes: "draft note",
      hoursByDay: {
        "2026-08-03": 3,
        "2026-08-04": 0,
        "2026-08-05": 0,
        "2026-08-06": 0,
        "2026-08-07": 0,
      },
      entryIdsByDay: {
        "2026-08-03": "entry-1",
        "2026-08-04": undefined,
        "2026-08-05": undefined,
        "2026-08-06": undefined,
        "2026-08-07": undefined,
      },
    });

    const fromServer = draftRow({
      timesheet_line_id: "line-1",
      task_name: "Server task",
      notes: "server note",
      hoursByDay: {
        "2026-08-03": 3,
        "2026-08-04": 0,
        "2026-08-05": 0,
        "2026-08-06": 0,
        "2026-08-07": 0,
      },
      entryIdsByDay: {
        "2026-08-03": "entry-1",
        "2026-08-04": undefined,
        "2026-08-05": undefined,
        "2026-08-06": undefined,
        "2026-08-07": undefined,
      },
    });

    const merged = mergeTimesheetRowsPreservingLocalDrafts([previous], [fromServer], {
      editingRowKeys: new Set([previous.key]),
    });

    expect(merged[0]!.task_name).toBe("Field work");
    expect(merged[0]!.notes).toBe("draft note");
    expect(merged[0]!.hoursByDay["2026-08-03"]).toBe(3);
  });
});

describe("entriesToTimesheetRows (save → reload)", () => {
  it("rebuilds a week row from persisted time entries after reload", () => {
    const entries: TimeEntry[] = [
      {
        id: "e1",
        employee_id: "emp-1",
        project_id: "proj-1",
        allocation_category_id: "cat-1",
        entry_date: "2026-08-03",
        hours: 8,
        is_billable: true,
        timesheet_line_id: "line-abc",
      },
      {
        id: "e2",
        employee_id: "emp-1",
        project_id: "proj-1",
        allocation_category_id: "cat-1",
        entry_date: "2026-08-04",
        hours: 4,
        is_billable: true,
        timesheet_line_id: "line-abc",
      },
    ];

    const rows = entriesToTimesheetRows(entries, WEEK);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.timesheet_line_id).toBe("line-abc");
    expect(rows[0]!.hoursByDay["2026-08-03"]).toBe(8);
    expect(rows[0]!.hoursByDay["2026-08-04"]).toBe(4);
    expect(rows[0]!.entryIdsByDay["2026-08-03"]).toBe("e1");
    expect(rows[0]!.entryIdsByDay["2026-08-04"]).toBe("e2");
  });
});
