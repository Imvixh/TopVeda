"use client";

import * as React from "react";
import { Calendar, CheckCircle2, Clock, AlertTriangle, Infinity as InfinityIcon } from "lucide-react";

interface ScheduleStatusBadgeProps {
  startsAt?: string | null;
  endsAt?: string | null;
  className?: string;
}

export function ScheduleStatusBadge({
  startsAt,
  endsAt,
  className = "",
}: ScheduleStatusBadgeProps) {
  const scheduleInfo = React.useMemo(() => {
    const now = new Date().getTime();

    if (!startsAt && !endsAt) {
      return {
        type: "always",
        label: "Always Active",
        tooltip: "No time constraints — eligible continuously while visible",
        icon: InfinityIcon,
        className: "bg-slate-50 text-slate-700 border-slate-200",
      };
    }

    const startTime = startsAt ? new Date(startsAt).getTime() : null;
    const endTime = endsAt ? new Date(endsAt).getTime() : null;

    if (startTime && startTime > now) {
      const formatted = new Date(startsAt!).toLocaleDateString([], { month: "short", day: "numeric" });
      return {
        type: "upcoming",
        label: `Starts ${formatted}`,
        tooltip: `Scheduled to activate on ${new Date(startsAt!).toLocaleString()}`,
        icon: Clock,
        className: "bg-amber-50 text-amber-800 border-amber-200",
      };
    }

    if (endTime && endTime < now) {
      const formatted = new Date(endsAt!).toLocaleDateString([], { month: "short", day: "numeric" });
      return {
        type: "expired",
        label: `Expired ${formatted}`,
        tooltip: `Schedule concluded on ${new Date(endsAt!).toLocaleString()}`,
        icon: AlertTriangle,
        className: "bg-rose-50 text-rose-800 border-rose-200",
      };
    }

    return {
      type: "active",
      label: "Active Now",
      tooltip: `Currently within active schedule window (${startsAt ? new Date(startsAt).toLocaleDateString() : "Open"} to ${endsAt ? new Date(endsAt).toLocaleDateString() : "Indefinite"})`,
      icon: CheckCircle2,
      className: "bg-emerald-50 text-emerald-800 border-emerald-200",
    };
  }, [startsAt, endsAt]);

  const Icon = scheduleInfo.icon;

  return (
    <span
      title={scheduleInfo.tooltip}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border tracking-tight ${scheduleInfo.className} ${className}`}
    >
      <Icon className="h-3 w-3 shrink-0" />
      <span>{scheduleInfo.label}</span>
    </span>
  );
}

export function ScheduleSummaryText({
  startsAt,
  endsAt,
}: {
  startsAt?: string | null;
  endsAt?: string | null;
}) {
  if (!startsAt && !endsAt) {
    return <span className="text-brand-text-muted text-[11px]">Continuous / No schedule bounds</span>;
  }

  const startFormatted = startsAt ? new Date(startsAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Immediate";
  const endFormatted = endsAt ? new Date(endsAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Indefinite";

  return (
    <div className="flex items-center gap-1 text-[11px] text-brand-text-primary">
      <Calendar className="h-3.5 w-3.5 text-brand-orange shrink-0" />
      <span>{startFormatted} → {endFormatted}</span>
    </div>
  );
}
