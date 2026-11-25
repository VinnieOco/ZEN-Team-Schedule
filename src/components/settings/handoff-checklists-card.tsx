"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useScheduling } from "@/context/scheduling-context";
import {
  appendHandoffChecklistItem,
  moveHandoffChecklistItem,
  removeHandoffChecklistItem,
  renameHandoffChecklistItem,
  setHandoffChecklistItemRequired,
  type HandoffChecklistItemSetting,
  type HandoffChecklistKind,
} from "@/lib/handoff/checklist-settings";
import { builtinTemplates } from "@/lib/handoff/model";

interface HandoffChecklistsCardProps {
  canEdit: boolean;
}

const STAGES = [
  ...builtinTemplates("project").map((stage) => ({
    kind: "project" as const,
    key: stage.key,
    label: `${stage.phase} · ${stage.title}`,
  })),
  ...builtinTemplates("change_order").map((stage) => ({
    kind: "change_order" as const,
    key: stage.key,
    label: `Change order · ${stage.title}`,
  })),
];

export function HandoffChecklistsCard({ canEdit }: HandoffChecklistsCardProps) {
  const { settings, updateSettings } = useScheduling();
  const [selected, setSelected] = useState(`${STAGES[0].kind}:${STAGES[0].key}`);
  const [newLabel, setNewLabel] = useState("");
  const [newRequired, setNewRequired] = useState(true);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");

  const [kind, stageKey] = selected.split(":") as [HandoffChecklistKind, string];
  const items = settings.handoff_checklists[kind]?.[stageKey] ?? [];

  const persist = (
    next: ReturnType<typeof appendHandoffChecklistItem>,
  ) => {
    if (next) updateSettings({ handoff_checklists: next });
  };

  const addItem = () => {
    const next = appendHandoffChecklistItem(
      settings.handoff_checklists,
      kind,
      stageKey,
      newLabel,
      newRequired,
    );
    if (!next) return;
    persist(next);
    setNewLabel("");
    setNewRequired(true);
  };

  const startRename = (item: HandoffChecklistItemSetting) => {
    setEditingKey(item.key);
    setEditLabel(item.label);
  };

  const commitRename = () => {
    if (!editingKey) return;
    persist(
      renameHandoffChecklistItem(
        settings.handoff_checklists,
        kind,
        stageKey,
        editingKey,
        editLabel,
      ),
    );
    setEditingKey(null);
    setEditLabel("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Handoff</CardTitle>
        <CardDescription>
          Checklist items for each handoff stage. Projects start with this list. A new item is
          added to handoffs that do not have it yet. Removing an item takes it off handoffs where
          it is still open.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Stage</Label>
          <Select
            value={selected}
            onValueChange={(value) => {
              setSelected(value);
              setEditingKey(null);
              setNewLabel("");
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STAGES.map((stage) => (
                <SelectItem key={`${stage.kind}:${stage.key}`} value={`${stage.kind}:${stage.key}`}>
                  {stage.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No checklist items for this stage.</p>
        ) : (
          <ul className="space-y-2">
            {items.map((item, index) => {
              const isEditing = editingKey === item.key;
              return (
                <li
                  key={item.key}
                  className="flex items-center gap-2 rounded-md border bg-slate-50/80 px-3 py-2"
                >
                  {canEdit && (
                    <div className="flex shrink-0 flex-col">
                      <button
                        type="button"
                        className="rounded p-0.5 text-muted-foreground hover:bg-slate-200 hover:text-slate-900 disabled:opacity-30"
                        disabled={index === 0}
                        onClick={() =>
                          persist(
                            moveHandoffChecklistItem(
                              settings.handoff_checklists,
                              kind,
                              stageKey,
                              item.key,
                              -1,
                            ),
                          )
                        }
                        aria-label={`Move ${item.label} up`}
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        className="rounded p-0.5 text-muted-foreground hover:bg-slate-200 hover:text-slate-900 disabled:opacity-30"
                        disabled={index === items.length - 1}
                        onClick={() =>
                          persist(
                            moveHandoffChecklistItem(
                              settings.handoff_checklists,
                              kind,
                              stageKey,
                              item.key,
                              1,
                            ),
                          )
                        }
                        aria-label={`Move ${item.label} down`}
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    {isEditing ? (
                      <Input
                        value={editLabel}
                        onChange={(event) => setEditLabel(event.target.value)}
                        className="h-8"
                        autoFocus
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            commitRename();
                          }
                          if (event.key === "Escape") {
                            setEditingKey(null);
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
                        onClick={() => canEdit && startRename(item)}
                      >
                        {item.label}
                      </button>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Label htmlFor={`required-${item.key}`} className="text-xs text-muted-foreground">
                      Required
                    </Label>
                    <Switch
                      id={`required-${item.key}`}
                      checked={item.required}
                      disabled={!canEdit}
                      onCheckedChange={(required) =>
                        persist(
                          setHandoffChecklistItemRequired(
                            settings.handoff_checklists,
                            kind,
                            stageKey,
                            item.key,
                            required,
                          ),
                        )
                      }
                    />
                  </div>
                  {canEdit && (
                    <button
                      type="button"
                      className="rounded-full p-1 text-muted-foreground hover:bg-slate-200 hover:text-slate-900"
                      onClick={() =>
                        persist(
                          removeHandoffChecklistItem(
                            settings.handoff_checklists,
                            kind,
                            stageKey,
                            item.key,
                          ),
                        )
                      }
                      aria-label={`Remove ${item.label}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {canEdit && (
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={newLabel}
              onChange={(event) => setNewLabel(event.target.value)}
              placeholder="Checklist item"
              className="min-w-[180px] flex-1"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addItem();
                }
              }}
            />
            <div className="flex items-center gap-2">
              <Switch
                id="new-handoff-required"
                checked={newRequired}
                onCheckedChange={setNewRequired}
              />
              <Label htmlFor="new-handoff-required">Required</Label>
            </div>
            <Button type="button" variant="outline" onClick={addItem} disabled={!newLabel.trim()}>
              Add item
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
