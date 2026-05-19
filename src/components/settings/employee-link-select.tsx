"use client";

import { useMemo, useState } from "react";

import { SearchableSelect } from "@/components/ui/searchable-select";
import { getEmployeeFullName } from "@/lib/week";
import type { Employee } from "@/types";

const UNLINK_VALUE = "__none__";

interface EmployeeLinkSelectProps {
  profileId: string;
  employees: Employee[];
  linkedEmployeeId: string | null;
  disabled?: boolean;
  onLinked?: () => void;
  onError?: (message: string) => void;
}

export function EmployeeLinkSelect({
  profileId,
  employees,
  linkedEmployeeId,
  disabled,
  onLinked,
  onError,
}: EmployeeLinkSelectProps) {
  const [saving, setSaving] = useState(false);

  const linkable = employees.filter(
    (e) => e.active && (!e.profile_id || e.profile_id === profileId),
  );

  const value = linkedEmployeeId ?? UNLINK_VALUE;

  const options = useMemo(
    () => [
      { value: UNLINK_VALUE, label: "Not linked" },
      ...linkable.map((e) => ({
        value: e.id,
        label: getEmployeeFullName(e),
        keywords: [e.email, e.department].filter(Boolean).join(" "),
      })),
    ],
    [linkable],
  );

  const handleChange = async (next: string) => {
    setSaving(true);
    onError?.("");

    try {
      const res = await fetch("/api/admin/employees/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId,
          employeeId: next === UNLINK_VALUE ? null : next,
        }),
      });
      const json = (await res.json()) as { error?: string };

      if (!res.ok) {
        throw new Error(json.error ?? "Could not update link");
      }

      onLinked?.();
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "Could not update link");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SearchableSelect
      options={options}
      value={value}
      onValueChange={(v) => void handleChange(v)}
      disabled={disabled || saving}
      placeholder="Link to schedule…"
      searchPlaceholder="Search team members…"
      size="sm"
      className="max-w-[220px]"
    />
  );
}
