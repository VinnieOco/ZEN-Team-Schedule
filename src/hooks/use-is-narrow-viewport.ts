"use client";

import { useEffect, useState } from "react";

/** True when viewport is below Tailwind `md` (768px). Defaults to true before mount for SSR-safe mobile-first crew UI. */
export function useIsNarrowViewport(breakpointPx = 768): boolean {
  const [isNarrow, setIsNarrow] = useState(true);

  useEffect(() => {
    const media = window.matchMedia(`(max-width: ${breakpointPx - 1}px)`);
    const update = () => setIsNarrow(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [breakpointPx]);

  return isNarrow;
}
