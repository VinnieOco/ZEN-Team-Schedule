"use client";

import { useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
    <Select value={value} disabled={disabled || saving} onValueChange={(v) => void handleChange(v)}>
      <SelectTrigger className="h-8 max-w-[220px] text-xs">
        <SelectValue placeholder="Link to schedule…" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={UNLINK_VALUE}>Not linked</SelectItem>
        {linkable.map((e) => (
          <SelectItem key={e.id} value={e.id}>
            {getEmployeeFullName(e)}
            {e.email ? ` · ${e.email}` : ""}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
