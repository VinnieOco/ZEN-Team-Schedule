"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useScheduling } from "@/context/scheduling-context";
import {
  appendLeadStage,
  moveLeadStage,
  removeLeadStage,
  renameLeadStage,
  resolveLeadStages,
} from "@/lib/pipeline/lead-stages";
import type { LeadStageOption } from "@/types";

interface LeadStagesCardProps {
  canEdit: boolean;
}

function kindHint(kind: LeadStageOption["kind"]): string {
  if (kind === "won") return "Won";
  if (kind === "lost") return "Lost";
  return "Open";
}

export function LeadStagesCard({ canEdit }: LeadStagesCardProps) {
  const { settings, updateSettings } = useScheduling();
  const [newLabel, setNewLabel] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");

  const stages = resolveLeadStages(settings);

  const persist = (next: LeadStageOption[] | null) => {
    if (next) updateSettings({ lead_stages: next });
  };

  const addStage = () => {
    const next = appendLeadStage(settings, newLabel);
    if (next) {
      persist(next);
      setNewLabel("");
    }
  };

  const startRename = (stage: LeadStageOption) => {
    setEditingId(stage.id);
    setEditLabel(stage.label);
  };

  const commitRename = () => {
    if (!editingId) return;
    persist(renameLeadStage(settings, editingId, editLabel));
    setEditingId(null);
    setEditLabel("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lead stages</CardTitle>
        <CardDescription>
          Stages shown on the Pipeline Leads board and filters. Add open stages for your sales
          process. Won and Lost stay available for conversion and win-rate tracking. Removing a
          stage does not change leads already in it.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Label>Stages</Label>
        <ul className="space-y-2">
          {stages.map((stage, index) => {
            const isTerminal = stage.kind !== "open";
            const isEditing = editingId === stage.id;
            return (
              <li
                key={stage.id}
                className="flex items-center gap-2 rounded-md border bg-slate-50/80 px-3 py-2"
              >
                {canEdit && (
                  <div className="flex shrink-0 flex-col">
                    <button
                      type="button"
                      className="rounded p-0.5 text-muted-foreground hover:bg-slate-200 hover:text-slate-900 disabled:opacity-30"
                      disabled={index === 0}
                      onClick={() => persist(moveLeadStage(settings, stage.id, -1))}
                      aria-label={`Move ${stage.label} up`}
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      className="rounded p-0.5 text-muted-foreground hover:bg-slate-200 hover:text-slate-900 disabled:opacity-30"
                      disabled={index === stages.length - 1}
                      onClick={() => persist(moveLeadStage(settings, stage.id, 1))}
                      aria-label={`Move ${stage.label} down`}
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
                      onClick={() => canEdit && startRename(stage)}
                    >
                      {stage.label}
                    </button>
                  )}
                  <p className="text-xs text-muted-foreground">{kindHint(stage.kind)}</p>
                </div>
                {canEdit && !isTerminal && (
                  <button
                    type="button"
                    className="rounded-full p-1 text-muted-foreground hover:bg-slate-200 hover:text-slate-900"
                    onClick={() => persist(removeLeadStage(settings, stage.id))}
                    aria-label={`Remove ${stage.label}`}
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
              placeholder="e.g. Site visit scheduled"
              className="min-w-[180px] flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addStage();
                }
              }}
            />
            <Button type="button" variant="outline" onClick={addStage} disabled={!newLabel.trim()}>
              Add stage
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
