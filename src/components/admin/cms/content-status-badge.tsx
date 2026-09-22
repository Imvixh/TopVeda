"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { ContentStatus } from "@/types/cms.types";
import {
  FileEdit,
  Clock,
  AlertOctagon,
  CheckCircle2,
  Globe2,
  Archive,
} from "lucide-react";

interface ContentStatusBadgeProps {
  status: ContentStatus;
  size?: "sm" | "md";
  showIcon?: boolean;
  className?: string;
}

export function ContentStatusBadge({
  status,
  size = "sm",
  showIcon = true,
  className = "",
}: ContentStatusBadgeProps) {
  const config = React.useMemo(() => {
    switch (status) {
      case "PUBLISHED":
        return {
          variant: "success" as const,
          label: "PUBLISHED",
          icon: Globe2,
          tooltip: "Live & eligible for student portal display",
          border: "border-emerald-200 bg-emerald-50 text-emerald-800",
        };
      case "APPROVED":
        return {
          variant: "outline" as const,
          label: "APPROVED",
          icon: CheckCircle2,
          tooltip: "Approved by Super Admin — not yet student-visible",
          border: "border-sky-200 bg-sky-50 text-sky-800",
        };
      case "PENDING_REVIEW":
        return {
          variant: "peach" as const,
          label: "PENDING REVIEW",
          icon: Clock,
          tooltip: "Awaiting Super Admin governance review",
          border: "border-amber-200 bg-amber-50 text-amber-800",
        };
      case "REJECTED":
        return {
          variant: "peach" as const,
          label: "REJECTED",
          icon: AlertOctagon,
          tooltip: "Returned for modifications",
          border: "border-rose-200 bg-rose-50 text-rose-800",
        };
      case "ARCHIVED":
        return {
          variant: "neutral" as const,
          label: "ARCHIVED",
          icon: Archive,
          tooltip: "Retired from active publishing",
          border: "border-gray-200 bg-gray-100 text-gray-700",
        };
      case "DRAFT":
      default:
        return {
          variant: "neutral" as const,
          label: "DRAFT",
          icon: FileEdit,
          tooltip: "Draft — internal staging work in progress",
          border: "border-slate-200 bg-slate-50 text-slate-700",
        };
    }
  }, [status]);

  const Icon = config.icon;

  return (
    <span title={config.tooltip} className="inline-flex items-center">
      <Badge
        variant={config.variant}
        size={size}
        className={`font-bold text-[10px] tracking-wider uppercase inline-flex items-center gap-1 ${config.border} ${className}`}
      >
        {showIcon && <Icon className="h-3 w-3 shrink-0" />}
        <span>{config.label}</span>
      </Badge>
    </span>
  );
}
