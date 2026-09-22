"use client";

import * as React from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { ContentStatusBadge } from "./content-status-badge";
import { CmsPendingReviewItem } from "@/types/cms.types";
import { AlertTriangle, RotateCcw, User, Calendar } from "lucide-react";

interface ReviewRejectionModalProps {
  item: CmsPendingReviewItem | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reviewNote: string) => Promise<void>;
  isProcessing: boolean;
}

export function ReviewRejectionModal({
  item,
  isOpen,
  onClose,
  onConfirm,
  isProcessing,
}: ReviewRejectionModalProps) {
  if (!item) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !isProcessing && onClose()}
      title="Return Submission for Revision"
      description="Provide specific feedback explaining required revisions so the educator can make updates and re-submit."
      maxWidth="md"
    >
      <ReviewRejectionInnerForm
        key={`${item.entity_type}-${item.entity_id}`}
        item={item}
        onClose={onClose}
        onConfirm={onConfirm}
        isProcessing={isProcessing}
      />
    </Modal>
  );
}

function ReviewRejectionInnerForm({
  item,
  onClose,
  onConfirm,
  isProcessing,
}: {
  item: CmsPendingReviewItem;
  onClose: () => void;
  onConfirm: (reviewNote: string) => Promise<void>;
  isProcessing: boolean;
}) {
  const [reviewNote, setReviewNote] = React.useState("");
  const [validationError, setValidationError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = reviewNote.trim();
    if (!trimmed || trimmed.length < 5) {
      setValidationError("Please provide a constructive rejection reason (minimum 5 characters).");
      return;
    }
    setValidationError(null);
    await onConfirm(trimmed);
  };

  return (
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
            <ContentStatusBadge status="REJECTED" size="sm" />
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
        </div>
      </div>

      {/* Required Rejection Note Input */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold text-brand-text-primary">
            Rejection Reason & Revision Notes <span className="text-rose-600">*</span>
          </label>
          <span className="text-[10px] text-brand-text-muted">
            {reviewNote.trim().length}/500 chars
          </span>
        </div>

        <textarea
          value={reviewNote}
          onChange={(e) => {
            setReviewNote(e.target.value);
            if (validationError && e.target.value.trim().length >= 5) {
              setValidationError(null);
            }
          }}
          placeholder="e.g. Please replace video audio distortion at 04:15, or verify curriculum chapter references."
          rows={4}
          maxLength={500}
          disabled={isProcessing}
          className={`w-full rounded-xl border bg-brand-surface p-3 text-xs text-brand-text-primary placeholder:text-brand-text-muted/60 focus:outline-none focus:ring-2 ${
            validationError
              ? "border-rose-400 focus:ring-rose-200"
              : "border-brand-border focus:ring-brand-orange/20"
          }`}
        />

        {validationError && (
          <p className="text-[11px] font-semibold text-rose-600 flex items-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span>{validationError}</span>
          </p>
        )}
      </div>

      {/* Informative Lifecycle Warning */}
      <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
        <div className="flex items-center gap-1.5 font-bold">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
          <span>Non-Destructive Return</span>
        </div>
        <p className="text-[11px] text-amber-800 leading-relaxed">
          This item will not be deleted or archived. It will transition to <strong className="font-semibold">REJECTED</strong> and appear in the educator&apos;s editing workspace with your feedback notes.
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
          className="bg-rose-600 hover:bg-rose-700 text-white shadow-2xs font-bold"
        >
          {isProcessing ? (
            "Recording Rejection..."
          ) : (
            <span className="flex items-center gap-1.5">
              <RotateCcw className="h-3.5 w-3.5" /> Return with Feedback
            </span>
          )}
        </Button>
      </div>
    </form>
  );
}
