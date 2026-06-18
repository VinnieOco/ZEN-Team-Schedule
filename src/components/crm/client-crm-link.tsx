"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { usePermissions } from "@/hooks/use-permissions";
import { clientRouteKey } from "@/lib/clients";
import { cn } from "@/lib/utils";

interface ClientCrmLinkProps {
  clientName: string | undefined | null;
  className?: string;
  showIcon?: boolean;
}

export function ClientCrmLink({
  clientName,
  className,
  showIcon = true,
}: ClientCrmLinkProps) {
  const { permissions } = usePermissions();
  const trimmed = clientName?.trim();

  if (!trimmed) {
    return <span className={cn("text-muted-foreground", className)}>—</span>;
  }

  if (!permissions.viewCrm) {
    return <span className={className}>{trimmed}</span>;
  }

  return (
    <Link
      href={`/crm/${clientRouteKey(trimmed)}`}
      className={cn(
        "inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-900 hover:underline",
        className,
      )}
    >
      {trimmed}
      {showIcon && <ExternalLink className="h-3 w-3 shrink-0 opacity-50" />}
    </Link>
  );
}
