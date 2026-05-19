"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface SearchableSelectOption {
  value: string;
  label: string;
  /** Extra text included when filtering (e.g. client name, email). */
  keywords?: string;
  leading?: ReactNode;
  disabled?: boolean;
}

export interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  id?: string;
  size?: "sm" | "default";
  minPanelWidth?: number;
}

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

export function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyMessage = "No results found",
  disabled = false,
  className,
  triggerClassName,
  id,
  size = "default",
  minPanelWidth = 200,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [panelRect, setPanelRect] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const selected = useMemo(
    () => options.find((option) => option.value === value),
    [options, value],
  );

  const filtered = useMemo(() => filterOptions(options, query), [options, query]);

  const updatePanelPosition = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPanelRect({
      top: rect.bottom + 4,
      left: rect.left,
      width: Math.max(rect.width, minPanelWidth),
    });
  }, [minPanelWidth]);

  useEffect(() => {
    if (!open) return;
    updatePanelPosition();
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        containerRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };
    const onReposition = () => updatePanelPosition();
    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open, updatePanelPosition]);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      setQuery("");
      setPanelRect(null);
    }
  }, [open]);

  const triggerSizeClass =
    size === "sm"
      ? "h-8 px-2 text-xs"
      : "h-9 px-3 py-2 text-sm";

  const panel =
    open && panelRect
      ? createPortal(
          <div
            ref={panelRef}
            style={{
              position: "fixed",
              top: panelRect.top,
              left: panelRect.left,
              width: panelRect.width,
              zIndex: 10000,
            }}
            className="rounded-md border bg-white shadow-md"
          >
            <div className="border-b p-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className={cn("pl-8", size === "sm" ? "h-8 text-xs" : "h-9 text-sm")}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setOpen(false);
                      e.stopPropagation();
                    }
                  }}
                />
              </div>
            </div>
            <ul
              id={listId}
              role="listbox"
              className="max-h-60 overflow-y-auto p-1"
            >
              {filtered.length === 0 ? (
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
                        "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-50",
                        size === "sm" ? "text-xs" : "text-sm",
                        value === option.value && "bg-slate-100",
                      )}
                      onClick={() => {
                        if (option.disabled) return;
                        onValueChange(option.value);
                        setOpen(false);
                      }}
                    >
                      {option.leading}
                      <span className="min-w-0 flex-1 truncate">{option.label}</span>
                      {value === option.value && (
                        <Check className="h-3.5 w-3.5 shrink-0 text-slate-700" />
                      )}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listId}
        onClick={() => {
          if (disabled) return;
          setOpen((prev) => {
            const next = !prev;
            if (next) updatePanelPosition();
            return next;
          });
        }}
        className={cn(
          "flex w-full items-center justify-between gap-1 rounded-md border border-input bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          triggerSizeClass,
          !selected && "text-muted-foreground",
          triggerClassName,
        )}
      >
        <span className="truncate">{selected?.label ?? placeholder}</span>
        <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
      </button>
      {panel}
    </div>
  );
}
