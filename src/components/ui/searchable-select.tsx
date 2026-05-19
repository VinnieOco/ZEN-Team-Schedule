"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
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

type PanelLayout = {
  top: number;
  left: number;
  width: number;
  position: "fixed" | "absolute";
};

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
  const [panelLayout, setPanelLayout] = useState<PanelLayout | null>(null);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  const selected = useMemo(
    () => options.find((option) => option.value === value),
    [options, value],
  );

  const filtered = useMemo(() => filterOptions(options, query), [options, query]);

  const updatePanelPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const triggerRect = trigger.getBoundingClientRect();
    const dialog = trigger.closest('[role="dialog"]') as HTMLElement | null;

    if (dialog) {
      const dialogRect = dialog.getBoundingClientRect();
      setPortalTarget(dialog);
      setPanelLayout({
        position: "absolute",
        top: triggerRect.bottom - dialogRect.top + 4,
        left: triggerRect.left - dialogRect.left,
        width: Math.max(triggerRect.width, minPanelWidth),
      });
    } else {
      setPortalTarget(document.body);
      setPanelLayout({
        position: "fixed",
        top: triggerRect.bottom + 4,
        left: triggerRect.left,
        width: Math.max(triggerRect.width, minPanelWidth),
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
      if (
        containerRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
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
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      setQuery("");
      setPanelLayout(null);
      setPortalTarget(null);
    }
  }, [open]);

  const triggerSizeClass =
    size === "sm"
      ? "h-8 px-2 text-xs"
      : "h-9 px-3 py-2 text-sm";

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
          portalTarget,
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
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          if (disabled) return;
          setOpen((prev) => !prev);
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
