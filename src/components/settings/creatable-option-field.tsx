"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CreatableOptionFieldProps {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  onAddOption: (value: string) => void;
  disabled?: boolean;
  addPrompt?: string;
  placeholder?: string;
}

export function CreatableOptionField({
  label,
  value,
  options,
  onChange,
  onAddOption,
  disabled,
  addPrompt = "Add new…",
  placeholder = "Select or add",
}: CreatableOptionFieldProps) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  const selectOptions = (() => {
    const merged = [...options];
    const trimmed = value.trim();
    if (trimmed && !merged.some((o) => o.toLowerCase() === trimmed.toLowerCase())) {
      merged.unshift(trimmed);
    }
    return merged;
  })();

  useEffect(() => {
    if (!adding) setDraft("");
  }, [adding]);

  const submitNew = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onAddOption(trimmed);
    onChange(trimmed);
    setAdding(false);
    setDraft("");
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {!adding ? (
        <>
          <Select
            key={`${label}-${value || "empty"}`}
            value={value || undefined}
            onValueChange={onChange}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {selectOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!disabled && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs text-muted-foreground"
              onClick={() => setAdding(true)}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              {addPrompt}
            </Button>
          )}
        </>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`New ${label.toLowerCase()}`}
            className="min-w-[180px] flex-1"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submitNew();
              }
              if (e.key === "Escape") setAdding(false);
            }}
          />
          <Button type="button" size="sm" onClick={submitNew} disabled={!draft.trim()}>
            Add
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setAdding(false)}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
