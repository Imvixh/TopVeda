import * as React from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  CheckCircle2,
  Clock,
  LayoutDashboard,
  type LucideIcon,
} from "lucide-react";

interface CmsPlaceholderPageProps {
  title: string;
  section: "CONTENT" | "ACADEMIC" | "ENGAGEMENT" | "REVIEW" | "AI CHATBOT";
  description: string;
  icon: LucideIcon;
  targetTable: string;
  capabilities: string[];
  primaryActionLabel?: string;
  primaryActionHref?: string;
}

export function CmsPlaceholderPage({
  title,
  section,
  description,
  icon: Icon,
  targetTable,
  capabilities,
  primaryActionLabel,
  primaryActionHref,
}: CmsPlaceholderPageProps) {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-brand-border">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Badge variant="peach" size="sm" className="font-bold uppercase tracking-wider text-[10px]">
              {section}
            </Badge>
            <Badge variant="outline" size="sm" className="text-[10px] font-mono text-brand-text-muted">
              {targetTable}
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-text-primary tracking-tight flex items-center gap-2.5">
            <Icon className="h-7 w-7 text-brand-orange" />
            <span>{title}</span>
          </h1>
          <p className="text-xs sm:text-sm text-brand-text-muted max-w-2xl">
            {description}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Link href="/admin/cms">
            <Button variant="outline" size="sm" className="text-xs">
              <LayoutDashboard className="h-3.5 w-3.5 mr-1.5" />
              Dashboard
            </Button>
          </Link>
          {primaryActionHref && primaryActionLabel && (
            <Link href={primaryActionHref}>
              <Button variant="primary" size="sm" className="text-xs">
                {primaryActionLabel}
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Readiness / Foundation Card */}
      <Card className="p-6 sm:p-8 bg-gradient-to-br from-brand-surface to-brand-bg-peach/30 border-2 border-brand-orange-border shadow-sm space-y-6">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-2xl bg-brand-orange text-white flex items-center justify-center shrink-0 shadow-md">
            <Sparkles className="h-6 w-6" />
          </div>
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-brand-text-primary">
                CMS Module Architecture Ready
              </h2>
              <Badge variant="primary" size="sm" className="text-[10px] uppercase font-bold">
                Phase 4.1 Step 5A Shell
              </Badge>
            </div>
            <p className="text-xs text-brand-text-muted leading-relaxed">
              The database schema, RLS policies, storage bucket rules, server-side services, and API endpoints for this entity are fully applied and verified in Steps 1–4. The administrative management UI and forms are ready for implementation in the next step.
            </p>
          </div>
        </div>

        {/* Key Features / Data Capabilities Grid */}
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-brand-text-muted">
            Configured Module Capabilities
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {capabilities.map((cap, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 p-3 rounded-xl bg-brand-surface border border-brand-border/80 text-xs shadow-2xs"
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span className="text-brand-text-primary font-medium leading-tight">
                  {cap}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Status Capsule */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-brand-charcoal text-white text-xs">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-brand-orange" />
            <span className="font-semibold">
              CRUD Forms & Modal Editors: Scheduled for Step 5B
            </span>
          </div>
          <span className="text-[11px] text-gray-400 font-mono">
            Table: {targetTable}
          </span>
        </div>
      </Card>
    </div>
  );
}
