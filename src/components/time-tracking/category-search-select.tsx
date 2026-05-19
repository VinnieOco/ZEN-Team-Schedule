"use client";

import { useMemo } from "react";

import {
  SearchableSelect,
  type SearchableSelectOption,
} from "@/components/ui/searchable-select";
import type { AllocationCategory } from "@/types";

interface CategorySearchSelectProps {
  categories: AllocationCategory[];
  value: string;
  onValueChange: (categoryId: string) => void;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
}

export function CategorySearchSelect({
  categories,
  value,
  onValueChange,
  disabled = false,
  className,
  triggerClassName,
}: CategorySearchSelectProps) {
  const options = useMemo<SearchableSelectOption[]>(
    () =>
      [...categories]
        .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))
        .map((category) => ({
          value: category.id,
          label: category.name,
          leading: (
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: category.color }}
            />
          ),
        })),
    [categories],
  );

  return (
    <SearchableSelect
      options={options}
      value={value}
      onValueChange={onValueChange}
      placeholder="Select category…"
      searchPlaceholder="Search categories…"
      emptyMessage="No categories found"
      disabled={disabled}
      className={className}
      triggerClassName={triggerClassName}
      size="sm"
    />
  );
}
