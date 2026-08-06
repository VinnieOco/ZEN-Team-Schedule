"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  parsePipelineFocus,
  type PipelineListFocus,
} from "@/lib/pipeline/focus";

/**
 * Optimistic `?focus=` sync for Pipeline list metrics / due widgets.
 */
export function usePipelineListFocus(): [
  PipelineListFocus,
  (next: PipelineListFocus) => void,
] {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlFocus = parsePipelineFocus(searchParams.get("focus"));
  const [focus, setFocusLocal] = useState(urlFocus);

  useEffect(() => {
    setFocusLocal(urlFocus);
  }, [urlFocus]);

  const setFocus = useCallback(
    (next: PipelineListFocus) => {
      setFocusLocal(next);
      const params = new URLSearchParams(searchParams.toString());
      if (next === "all") params.delete("focus");
      else params.set("focus", next);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return [focus, setFocus];
}
