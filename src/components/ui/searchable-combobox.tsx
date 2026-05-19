"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { SearchableSelectOption } from "@/components/ui/searchable-select";

function optionSearchText(option: SearchableSelectOption): string {
  return [option.label, option.keywords].filter(Boolean).join(" ").toLowerCase();
}

function filterOptions(
  options: SearchableSelectOption[],
  query: string,
): SearchableSelectOption[] {
  const q = query.trim().toLowerCase();
  if (!q) return options;
  return options.filter((option) => optionSearchText(option).includes(q));
}

type PanelLayout = {
  top: number;
  left: number;
  width: number;
  position: "fixed" | "absolute";
};

export interface SearchableComboboxProps {
  options: SearchableSelectOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  /** When true, typed text can be used even if it is not in the list. Default true. */
  allowCustom?: boolean;
  customOptionLabel?: (query: string) => string;
  disabled?: boolean;
  className?: string;
  id?: string;
  required?: boolean;
  minPanelWidth?: number;
}

export function SearchableCombobox({
  options,
  value,
  onValueChange,
  placeholder = "Search or type…",
  searchPlaceholder = "Search…",
  emptyMessage = "No clients found",
  allowCustom = true,
  customOptionLabel = (query) => `Use "${query}" as client name`,
  disabled = false,
  className,
  id,
  required,
  minPanelWidth = 200,
}: SearchableComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [panelLayout, setPanelLayout] = useState<PanelLayout | null>(null);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  const filtered = useMemo(() => filterOptions(options, query), [options, query]);

  const trimmedQuery = query.trim();
  const exactMatch = useMemo(
    () =>
      trimmedQuery
        ? options.some(
            (option) =>
              option.label.trim().toLowerCase() === trimmedQuery.toLowerCase() ||
              option.value.trim().toLowerCase() === trimmedQuery.toLowerCase(),
          )
        : false,
    [options, trimmedQuery],
  );

  const showCustomOption = allowCustom && trimmedQuery.length > 0 && !exactMatch;

  const updatePanelPosition = useCallback(() => {
    const input = inputRef.current;
    if (!input) return;

    const inputRect = input.getBoundingClientRect();
    const dialog = input.closest('[role="dialog"]') as HTMLElement | null;

    if (dialog) {
      const dialogRect = dialog.getBoundingClientRect();
      setPortalTarget(dialog);
      setPanelLayout({
        position: "absolute",
        top: inputRect.bottom - dialogRect.top + 4,
        left: inputRect.left - dialogRect.left,
        width: Math.max(inputRect.width, minPanelWidth),
      });
    } else {
      setPortalTarget(document.body);
      setPanelLayout({
        position: "fixed",
        top: inputRect.bottom + 4,
        left: inputRect.left,
        width: Math.max(inputRect.width, minPanelWidth),
      });
    }
  }, [minPanelWidth]);

  useLayoutEffect(() => {
    if (!open) return;
    updatePanelPosition();
  }, [open, updatePanelPosition]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (containerRef.current?.contains(target) || panelRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };

    const onReposition = () => updatePanelPosition();

    document.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open, updatePanelPosition]);

  useEffect(() => {
    if (open) {
      setQuery("");
      requestAnimationFrame(() => {
        const panelInput = panelRef.current?.querySelector("input");
        panelInput?.focus();
      });
    } else {
      setQuery("");
      setPanelLayout(null);
      setPortalTarget(null);
    }
  }, [open]);

  const selectValue = (next: string) => {
    onValueChange(next);
    setOpen(false);
  };

  const panel =
    mounted && open && panelLayout && portalTarget
      ? createPortal(
          <div
            ref={panelRef}
            data-searchable-select-panel
            style={{
              position: panelLayout.position,
              top: panelLayout.top,
              left: panelLayout.left,
              width: panelLayout.width,
              zIndex: 100,
            }}
            className="pointer-events-auto rounded-md border bg-white shadow-lg"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="border-b p-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="h-9 pl-8 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setOpen(false);
                      e.stopPropagation();
                    }
                    if (e.key === "Enter" && showCustomOption) {
                      e.preventDefault();
                      selectValue(trimmedQuery);
                    }
                  }}
                />
              </div>
            </div>
            <ul id={listId} role="listbox" className="max-h-60 overflow-y-auto p-1">
              {showCustomOption && (
                <li>
                  <button
                    type="button"
                    role="option"
                    className="flex w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-slate-100"
                    onClick={() => selectValue(trimmedQuery)}
                  >
                    {customOptionLabel(trimmedQuery)}
                  </button>
                </li>
              )}
              {filtered.length === 0 && !showCustomOption ? (
                <li className="px-2 py-2 text-sm text-muted-foreground">{emptyMessage}</li>
              ) : (
                filtered.map((option) => (
                  <li key={option.value}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={value === option.value}
                      disabled={option.disabled}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-50",
                        value === option.value && "bg-slate-100",
                      )}
                      onClick={() => {
                        if (option.disabled) return;
                        selectValue(option.value);
                      }}
                    >
                      <span className="min-w-0 flex-1 truncate">{option.label}</span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>,
          portalTarget,
        )
      : null;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <Input
          ref={inputRef}
          id={id}
          value={value}
          disabled={disabled}
          required={required}
          placeholder={placeholder}
          autoComplete="off"
          onChange={(e) => onValueChange(e.target.value)}
          onFocus={() => {
            if (!disabled) setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" && !open) {
              e.preventDefault();
              setOpen(true);
            }
          }}
          className="pr-9"
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          aria-label="Open client list"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={listId}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            if (disabled) return;
            setOpen((prev) => !prev);
            inputRef.current?.focus();
          }}
          className="absolute right-0 top-0 flex h-9 w-9 items-center justify-center text-muted-foreground hover:text-foreground disabled:pointer-events-none"
        >
          <ChevronDown className={cn("h-4 w-4 opacity-50 transition-transform", open && "rotate-180")} />
        </button>
      </div>
      {panel}
    </div>
  );
}
