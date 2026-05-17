import Image from "next/image";

import { cn } from "@/lib/utils";

const LOGO_SRC = "/zen-logo.jpg";

interface ZenLogoProps {
  size?: number;
  className?: string;
  priority?: boolean;
}

export function ZenLogo({ size = 36, className, priority }: ZenLogoProps) {
  return (
    <Image
      src={LOGO_SRC}
      alt="ZEN Landscape"
      width={size}
      height={size}
      className={cn("shrink-0 rounded-md object-cover", className)}
      priority={priority}
    />
  );
}
