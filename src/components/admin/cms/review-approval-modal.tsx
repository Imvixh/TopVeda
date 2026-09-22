"use client";

import * as React from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { ContentStatusBadge } from "./content-status-badge";
import { CmsPendingReviewItem } from "@/types/cms.types";
import { CheckCircle2, ShieldCheck, User, Calendar } from "lucide-react";

interface ReviewApprovalModalProps {
  item: CmsPendingReviewItem | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isProcessing: boolean;
}

export function ReviewApprovalModal({
  item,
  isOpen,
  onClose,
  onConfirm,
  isProcessing,
}: ReviewApprovalModalProps) {
  if (!item) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onConfirm();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !isProcessing && onClose()}
      title="Approve Submission"
      description="Record Super Admin editorial approval for this content submission."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {/* Item Summary Card */}
        <div className="p-3.5 rounded-xl bg-brand-bg-warm/80 border border-brand-border space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-mono uppercase font-bold text-brand-orange">
              {item.entity_type.replace(/_/g, " ")}
            </span>
            <div className="flex items-center gap-1.5">
              <ContentStatusBadge status={item.status} size="sm" />
              <span className="text-xs text-brand-text-muted">→</span>
              <ContentStatusBadge status="APPROVED" size="sm" />
            </div>
          </div>

          <h4 className="font-extrabold text-sm text-brand-text-primary leading-tight">
            {item.title}
          </h4>

          <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-brand-border/60 text-xs text-brand-text-muted">
            <div className="flex items-center gap-1">
              <User className="h-3.5 w-3.5 text-brand-orange" />
              <span>{item.author_name}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-brand-orange" />
              <span>{new Date(item.submitted_at).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}</span>
            </div>
            {item.subject && (
              <span className="px-2 py-0.5 rounded-md bg-brand-bg-peach/60 text-brand-orange font-semibold text-[10px] uppercase">
                {item.subject}
              </span>
            )}
          </div>
        </div>

        {/* Explicit Lifecycle Clarification Notice */}
        <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-200 text-xs text-sky-900 space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold text-sky-950">
            <ShieldCheck className="h-4 w-4 text-sky-600 shrink-0" />
            <span>Governance Rule: Approval $\ne$ Published</span>
          </div>
          <p className="text-[11px] text-sky-800 leading-relaxed">
            Approving this content transitions its lifecycle to <strong className="font-semibold text-sky-950">APPROVED</strong>. It will remain <em>hidden and unavailable</em> to students until a Super Admin explicitly publishes it from the Content Management center.
          </p>
        </div>

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
            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs font-bold"
          >
            {isProcessing ? (
              "Recording Approval..."
            ) : (
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" /> Approve Content
              </span>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
