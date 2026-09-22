"use client";

import * as React from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ContentStatusBadge } from "./content-status-badge";
import { ScheduleStatusBadge } from "./schedule-status-badge";
import { ContentStatus } from "@/types/cms.types";
import {
  Globe2,
  FileEdit,
  AlertTriangle,
  Eye,
  EyeOff,
  Sparkles,
} from "lucide-react";

export type PublishableEntityType =
  | "HERO"
  | "BATCH"
  | "LECTURE"
  | "LIVE_CLASS"
  | "COURSE"
  | "CHAPTER"
  | "STUDY_MATERIAL"
  | "QUOTE"
  | "HUB"
  | "CHATBOT_PROMPT"
  | "CHATBOT_FAQ";

export interface PublishDialogTarget {
  entityType: PublishableEntityType;
  entityId: string;
  title: string;
  currentStatus: ContentStatus;
  isVisible: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  displayOrder?: number;
  featuredNote?: string;
  action: "PUBLISH" | "UNPUBLISH";
}

interface PublishConfirmationDialogProps {
  target: PublishDialogTarget | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (options: {
    displayOrder?: number;
    startsAt?: string | null;
    endsAt?: string | null;
  }) => Promise<void>;
  isProcessing: boolean;
}

export function PublishConfirmationDialog({
  target,
  isOpen,
  onClose,
  onConfirm,
  isProcessing,
}: PublishConfirmationDialogProps) {
  if (!target) return null;

  const isPublishing = target.action === "PUBLISH";

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !isProcessing && onClose()}
      title={isPublishing ? "Publish Content to Student Portal" : "Unpublish Content"}
      description={
        isPublishing
          ? "Promote this content item to PUBLISHED status for student discovery."
          : "Return this content to DRAFT status and withdraw it from student visibility."
      }
      maxWidth="md"
    >
      <PublishDialogInnerForm
        key={`${target.entityType}-${target.entityId}-${target.action}`}
        target={target}
        onClose={onClose}
        onConfirm={onConfirm}
        isProcessing={isProcessing}
      />
    </Modal>
  );
}

function PublishDialogInnerForm({
  target,
  onClose,
  onConfirm,
  isProcessing,
}: {
  target: PublishDialogTarget;
  onClose: () => void;
  onConfirm: (options: {
    displayOrder?: number;
    startsAt?: string | null;
    endsAt?: string | null;
  }) => Promise<void>;
  isProcessing: boolean;
}) {
  const isPublishing = target.action === "PUBLISH";

  const initialStartsAt = React.useMemo(() => {
    if (!target.startsAt) return "";
    try {
      const d = new Date(target.startsAt);
      const tzOffset = d.getTimezoneOffset() * 60000;
      return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
    } catch {
      return "";
    }
  }, [target.startsAt]);

  const initialEndsAt = React.useMemo(() => {
    if (!target.endsAt) return "";
    try {
      const d = new Date(target.endsAt);
      const tzOffset = d.getTimezoneOffset() * 60000;
      return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
    } catch {
      return "";
    }
  }, [target.endsAt]);

  const [formDisplayOrder, setFormDisplayOrder] = React.useState<number>(target.displayOrder || 0);
  const [formStartsAt, setFormStartsAt] = React.useState<string>(initialStartsAt);
  const [formEndsAt, setFormEndsAt] = React.useState<string>(initialEndsAt);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onConfirm({
      displayOrder: Number(formDisplayOrder) || 0,
      startsAt: formStartsAt ? new Date(formStartsAt).toISOString() : null,
      endsAt: formEndsAt ? new Date(formEndsAt).toISOString() : null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {/* Item Summary Card */}
        <div className="p-3.5 rounded-xl bg-brand-bg-warm/80 border border-brand-border space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-mono uppercase font-bold text-brand-orange">
              {target.entityType.replace(/_/g, " ")}
            </span>
            <div className="flex items-center gap-1.5">
              <ContentStatusBadge status={target.currentStatus} size="sm" />
              <span className="text-xs text-brand-text-muted">→</span>
              <ContentStatusBadge status={isPublishing ? "PUBLISHED" : "DRAFT"} size="sm" />
            </div>
          </div>

          <h4 className="font-extrabold text-sm text-brand-text-primary leading-tight">
            {target.title}
          </h4>

          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-brand-border/60 text-xs">
            <div className="flex items-center gap-1 text-brand-text-primary font-medium">
              {target.isVisible ? (
                <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[11px]">
                  <Eye className="h-3.5 w-3.5" /> Visibility: Enabled
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-gray-600 font-semibold text-[11px]">
                  <EyeOff className="h-3.5 w-3.5" /> Visibility: Disabled
                </span>
              )}
            </div>

            <ScheduleStatusBadge startsAt={target.startsAt} endsAt={target.endsAt} />

            {target.featuredNote && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                <Sparkles className="h-3 w-3 text-amber-500" /> {target.featuredNote}
              </span>
            )}
          </div>
        </div>

        {/* Warning Callout if Becoming Student-Facing */}
        {isPublishing ? (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
              <span>Public Student Visibility Notice</span>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              Publishing will make this record immediately visible to students on the TopVeda portal, provided its visibility is enabled and the scheduled activation window is active.
            </p>
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
              <span>Unpublishing Notice</span>
            </div>
            <p className="text-[11px] text-rose-800 leading-relaxed">
              Unpublishing will immediately hide this content from student discovery catalogs, search results, and portal widgets.
            </p>
          </div>
        )}

        {/* Optional Schedule Overrides on Publish */}
        {isPublishing && (
          <div className="space-y-2.5 pt-1">
            <p className="text-xs font-bold text-brand-text-primary">Publishing Schedule & Sequence</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-brand-text-primary">Starts At (Optional)</label>
                <input
                  type="datetime-local"
                  value={formStartsAt}
                  onChange={(e) => setFormStartsAt(e.target.value)}
                  disabled={isProcessing}
                  className="h-9 w-full rounded-lg border border-brand-border bg-brand-surface px-2.5 py-1 text-xs font-semibold text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-brand-text-primary">Ends At (Optional)</label>
                <input
                  type="datetime-local"
                  value={formEndsAt}
                  onChange={(e) => setFormEndsAt(e.target.value)}
                  disabled={isProcessing}
                  className="h-9 w-full rounded-lg border border-brand-border bg-brand-surface px-2.5 py-1 text-xs font-semibold text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
                />
              </div>
            </div>

            <Input
              label="Display Order (Priority Weight)"
              type="number"
              value={formDisplayOrder}
              onChange={(e) => setFormDisplayOrder(Number(e.target.value))}
              disabled={isProcessing}
            />
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-brand-border">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isProcessing}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={isProcessing}
            className={
              isPublishing
                ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs"
                : "bg-amber-600 hover:bg-amber-700 text-white shadow-2xs"
            }
          >
            {isProcessing ? (
              "Processing..."
            ) : isPublishing ? (
              <span className="flex items-center gap-1.5">
                <Globe2 className="h-3.5 w-3.5" /> Confirm & Publish
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <FileEdit className="h-3.5 w-3.5" /> Confirm & Unpublish
              </span>
            )}
          </Button>
        </div>
      </form>
    );
}
