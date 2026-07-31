"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Controlled tab/view state that updates the UI immediately, then syncs the URL.
 * Avoids Radix Tabs feeling "stuck" while waiting on router.replace + searchParams.
 */
export function useOptimisticUrlView<T extends string>(
  parse: (raw: string | null) => T,
  applyToParams: (next: T, params: URLSearchParams) => void,
): [T, (next: string) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlView = parse(searchParams.get("view"));
  const [view, setViewLocal] = useState(urlView);

  useEffect(() => {
    setViewLocal(urlView);
  }, [urlView]);

  const setView = useCallback(
    (next: string) => {
      const parsed = parse(next);
      setViewLocal(parsed);
      const params = new URLSearchParams(searchParams.toString());
      applyToParams(parsed, params);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [applyToParams, parse, pathname, router, searchParams],
  );

  return [view, setView];
}

/**
 * Same pattern for the top-level Pipeline tab (?tab=).
 */
export function useOptimisticUrlTab<T extends string>(
  parse: (raw: string | null) => T,
  applyToParams: (next: T, params: URLSearchParams, previous: T) => void,
): [T, (next: string) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlTab = parse(searchParams.get("tab"));
  const [tab, setTabLocal] = useState(urlTab);

  useEffect(() => {
    setTabLocal(urlTab);
  }, [urlTab]);

  const setTab = useCallback(
    (next: string) => {
      const parsed = parse(next);
      setTabLocal(parsed);
      const params = new URLSearchParams(searchParams.toString());
      applyToParams(parsed, params, tab);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [applyToParams, parse, pathname, router, searchParams, tab],
  );

  return [tab, setTab];
}
