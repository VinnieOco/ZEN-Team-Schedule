"use client";

import { useState } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useScheduling } from "@/context/scheduling-context";
import { CATEGORY_COLOR_OPTIONS, DEFAULT_CATEGORY_COLOR } from "@/lib/category-colors";
import { cn } from "@/lib/utils";

interface CategoriesCardProps {
  canEdit: boolean;
}

export function CategoriesCard({ canEdit }: CategoriesCardProps) {
  const { categories, addCategory, deleteCategory } = useScheduling();
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(DEFAULT_CATEGORY_COLOR);
  const [billableDefault, setBillableDefault] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const sorted = [...categories].sort((a, b) => a.sort_order - b.sort_order);

  const handleAdd = () => {
    setFormError(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setFormError("Enter a category name.");
      return;
    }
    const created = addCategory({
      name: trimmed,
      color,
      is_billable_default: billableDefault,
    });
    if (!created) {
      setFormError("That category name already exists.");
      return;
    }
    setName("");
    setColor(DEFAULT_CATEGORY_COLOR);
    setBillableDefault(true);
  };

  const handleRemove = (id: string, label: string) => {
    setDeleteError(null);
    if (!window.confirm(`Remove category "${label}"?`)) return;
    const result = deleteCategory(id);
    if (!result.ok) {
      setDeleteError(result.message);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Time & schedule categories</CardTitle>
        <CardDescription>
          Categories appear when logging time and adding schedule allocations. Everyone can use
          them; admins and managers can add or remove.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {deleteError && (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {deleteError}
          </p>
        )}
        <ul className="space-y-2">
          {sorted.map((category) => (
            <li
              key={category.id}
              className="flex items-center gap-3 rounded-md border bg-slate-50/80 px-3 py-2"
            >
              <span
                className="h-8 w-8 shrink-0 rounded-md border border-slate-200/80"
                style={{ backgroundColor: category.color }}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-900">{category.name}</p>
                <p className="text-xs text-muted-foreground">
                  Default: {category.is_billable_default ? "Billable" : "Non-billable"}
                </p>
              </div>
              {canEdit && (
                <button
                  type="button"
                  className="rounded-full p-1 text-muted-foreground hover:bg-slate-200 hover:text-slate-900"
                  onClick={() => handleRemove(category.id, category.name)}
                  aria-label={`Remove ${category.name}`}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>

        {canEdit && (
          <div className="space-y-3 rounded-md border border-dashed p-4">
            <Label>Add category</Label>
            <div className="flex flex-wrap gap-2">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Site visit"
                className="min-w-[180px] flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAdd();
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={handleAdd} disabled={!name.trim()}>
                Add category
              </Button>
            </div>
            {formError && <p className="text-sm text-red-600">{formError}</p>}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Color</Label>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_COLOR_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={cn(
                      "h-8 w-8 rounded-md border-2 transition-transform hover:scale-105",
                      color === option ? "border-emerald-600 ring-2 ring-emerald-200" : "border-transparent",
                    )}
                    style={{ backgroundColor: option }}
                    onClick={() => setColor(option)}
                    aria-label={`Color ${option}`}
                    aria-pressed={color === option}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="category-billable-default"
                checked={billableDefault}
                onCheckedChange={setBillableDefault}
              />
              <Label htmlFor="category-billable-default">Billable by default</Label>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
