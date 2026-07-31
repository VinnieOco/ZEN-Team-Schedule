"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useScheduling } from "@/context/scheduling-context";
import {
  appendLeadSource,
  moveLeadSource,
  removeLeadSource,
  renameLeadSource,
  resolveLeadSources,
} from "@/lib/pipeline/lead-sources";
import type { LeadSourceOption } from "@/types";

interface LeadSourcesCardProps {
  canEdit: boolean;
}

export function LeadSourcesCard({ canEdit }: LeadSourcesCardProps) {
  const { settings, updateSettings } = useScheduling();
  const [newLabel, setNewLabel] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");

  const sources = resolveLeadSources(settings);

  const persist = (next: LeadSourceOption[] | null) => {
    if (next) updateSettings({ lead_sources: next });
  };

  const addSource = () => {
    const next = appendLeadSource(settings, newLabel);
    if (next) {
      persist(next);
      setNewLabel("");
    }
  };

  const startRename = (source: LeadSourceOption) => {
    setEditingId(source.id);
    setEditLabel(source.label);
  };

  const commitRename = () => {
    if (!editingId) return;
    persist(renameLeadSource(settings, editingId, editLabel));
    setEditingId(null);
    setEditLabel("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lead sources</CardTitle>
        <CardDescription>
          Sources shown when creating or filtering leads (architect, referral, web, and any others
          you add). Removing a source does not change leads already using it.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Label>Sources</Label>
        <ul className="space-y-2">
          {sources.map((source, index) => {
            const isEditing = editingId === source.id;
            return (
              <li
                key={source.id}
                className="flex items-center gap-2 rounded-md border bg-slate-50/80 px-3 py-2"
              >
                {canEdit && (
                  <div className="flex shrink-0 flex-col">
                    <button
                      type="button"
                      className="rounded p-0.5 text-muted-foreground hover:bg-slate-200 hover:text-slate-900 disabled:opacity-30"
                      disabled={index === 0}
                      onClick={() => persist(moveLeadSource(settings, source.id, -1))}
                      aria-label={`Move ${source.label} up`}
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      className="rounded p-0.5 text-muted-foreground hover:bg-slate-200 hover:text-slate-900 disabled:opacity-30"
                      disabled={index === sources.length - 1}
                      onClick={() => persist(moveLeadSource(settings, source.id, 1))}
                      aria-label={`Move ${source.label} down`}
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
                      onClick={() => canEdit && startRename(source)}
                    >
                      {source.label}
                    </button>
                  )}
                </div>
                {canEdit && sources.length > 1 && (
                  <button
                    type="button"
                    className="rounded-full p-1 text-muted-foreground hover:bg-slate-200 hover:text-slate-900"
                    onClick={() => persist(removeLeadSource(settings, source.id))}
                    aria-label={`Remove ${source.label}`}
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
              placeholder="e.g. Trade show"
              className="min-w-[180px] flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addSource();
                }
              }}
            />
            <Button type="button" variant="outline" onClick={addSource} disabled={!newLabel.trim()}>
              Add source
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
