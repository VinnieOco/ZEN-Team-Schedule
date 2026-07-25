"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useScheduling } from "@/context/scheduling-context";
import {
  appendLeadFollowUpType,
  moveLeadFollowUpType,
  removeLeadFollowUpType,
  renameLeadFollowUpType,
  resolveLeadFollowUpTypes,
} from "@/lib/pipeline/lead-follow-up-types";
import type { LeadFollowUpTypeOption } from "@/types";

interface LeadFollowUpTypesCardProps {
  canEdit: boolean;
}

export function LeadFollowUpTypesCard({ canEdit }: LeadFollowUpTypesCardProps) {
  const { settings, updateSettings } = useScheduling();
  const [newLabel, setNewLabel] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");

  const types = resolveLeadFollowUpTypes(settings);

  const persist = (next: LeadFollowUpTypeOption[] | null) => {
    if (next) updateSettings({ lead_follow_up_types: next });
  };

  const addType = () => {
    const next = appendLeadFollowUpType(settings, newLabel);
    if (next) {
      persist(next);
      setNewLabel("");
    }
  };

  const startRename = (type: LeadFollowUpTypeOption) => {
    setEditingId(type.id);
    setEditLabel(type.label);
  };

  const commitRename = () => {
    if (!editingId) return;
    persist(renameLeadFollowUpType(settings, editingId, editLabel));
    setEditingId(null);
    setEditLabel("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lead follow-up types</CardTitle>
        <CardDescription>
          Types available when scheduling a follow-up on a lead (phone call, email, site visit,
          and any others you add). Removing a type does not change follow-ups already using it.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Label>Types</Label>
        <ul className="space-y-2">
          {types.map((type, index) => {
            const isEditing = editingId === type.id;
            return (
              <li
                key={type.id}
                className="flex items-center gap-2 rounded-md border bg-slate-50/80 px-3 py-2"
              >
                {canEdit && (
                  <div className="flex shrink-0 flex-col">
                    <button
                      type="button"
                      className="rounded p-0.5 text-muted-foreground hover:bg-slate-200 hover:text-slate-900 disabled:opacity-30"
                      disabled={index === 0}
                      onClick={() => persist(moveLeadFollowUpType(settings, type.id, -1))}
                      aria-label={`Move ${type.label} up`}
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      className="rounded p-0.5 text-muted-foreground hover:bg-slate-200 hover:text-slate-900 disabled:opacity-30"
                      disabled={index === types.length - 1}
                      onClick={() => persist(moveLeadFollowUpType(settings, type.id, 1))}
                      aria-label={`Move ${type.label} down`}
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  {isEditing ? (
                    <Input
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      className="h-8"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          commitRename();
                        }
                        if (e.key === "Escape") {
                          setEditingId(null);
                          setEditLabel("");
                        }
                      }}
                      onBlur={commitRename}
                    />
                  ) : (
                    <button
                      type="button"
                      className="block w-full truncate text-left font-medium text-slate-900 disabled:cursor-default"
                      disabled={!canEdit}
                      onClick={() => canEdit && startRename(type)}
                    >
                      {type.label}
                    </button>
                  )}
                </div>
                {canEdit && types.length > 1 && (
                  <button
                    type="button"
                    className="rounded-full p-1 text-muted-foreground hover:bg-slate-200 hover:text-slate-900"
                    onClick={() => persist(removeLeadFollowUpType(settings, type.id))}
                    aria-label={`Remove ${type.label}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>

        {canEdit && (
          <div className="flex flex-wrap gap-2">
            <Input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="e.g. Text message"
              className="min-w-[180px] flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addType();
                }
              }}
            />
            <Button type="button" variant="outline" onClick={addType} disabled={!newLabel.trim()}>
              Add type
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
