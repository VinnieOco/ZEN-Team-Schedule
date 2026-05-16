"use client";

import { useState } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useScheduling } from "@/context/scheduling-context";
import {
  appendDepartment,
  appendJobRole,
  removeFromList,
  resolveDepartments,
  resolveJobRoles,
} from "@/lib/team-options";

interface TeamOptionsCardProps {
  canEdit: boolean;
}

function OptionList({
  items,
  onRemove,
  disabled,
}: {
  items: string[];
  onRemove: (value: string) => void;
  disabled?: boolean;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">None yet.</p>;
  }

  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((item) => (
        <li
          key={item}
          className="flex items-center gap-1 rounded-full border bg-slate-50 px-2.5 py-1 text-sm text-slate-800"
        >
          <span>{item}</span>
          {!disabled && (
            <button
              type="button"
              className="rounded-full p-0.5 text-muted-foreground hover:bg-slate-200 hover:text-slate-900"
              onClick={() => onRemove(item)}
              aria-label={`Remove ${item}`}
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

export function TeamOptionsCard({ canEdit }: TeamOptionsCardProps) {
  const { settings, updateSettings } = useScheduling();
  const [newRole, setNewRole] = useState("");
  const [newDepartment, setNewDepartment] = useState("");

  const jobRoles = resolveJobRoles(settings);
  const departments = resolveDepartments(settings);

  const addRole = () => {
    const next = appendJobRole(settings, newRole);
    if (next) {
      updateSettings({ job_roles: next });
      setNewRole("");
    }
  };

  const addDepartment = () => {
    const next = appendDepartment(settings, newDepartment);
    if (next) {
      updateSettings({ departments: next });
      setNewDepartment("");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Job roles & departments</CardTitle>
        <CardDescription>
          Options shown when adding or editing schedule team members. Removing an option does not
          change people already assigned to it.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-3">
          <Label>Job roles</Label>
          <OptionList
            items={jobRoles}
            disabled={!canEdit}
            onRemove={(role) => updateSettings({ job_roles: removeFromList(jobRoles, role) })}
          />
          {canEdit && (
            <div className="flex flex-wrap gap-2">
              <Input
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                placeholder="e.g. Project Manager"
                className="min-w-[180px] flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addRole();
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={addRole} disabled={!newRole.trim()}>
                Add role
              </Button>
            </div>
          )}
        </div>
        <div className="space-y-3">
          <Label>Departments</Label>
          <OptionList
            items={departments}
            disabled={!canEdit}
            onRemove={(dept) =>
              updateSettings({ departments: removeFromList(departments, dept) })
            }
          />
          {canEdit && (
            <div className="flex flex-wrap gap-2">
              <Input
                value={newDepartment}
                onChange={(e) => setNewDepartment(e.target.value)}
                placeholder="e.g. Construction"
                className="min-w-[180px] flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addDepartment();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={addDepartment}
                disabled={!newDepartment.trim()}
              >
                Add department
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
