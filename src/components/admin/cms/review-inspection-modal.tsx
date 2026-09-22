"use client";

import * as React from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { ContentStatusBadge } from "./content-status-badge";
import { CmsPendingReviewItem } from "@/types/cms.types";
import { StorageService } from "@/lib/services/storage.service";
import { createClient } from "@/lib/supabase/client";
import {
  CheckCircle2,
  RotateCcw,
  User,
  Calendar,
  FileText,
  Video,
  Layers,
  FileCheck2,
  Download,
  ShieldCheck,
} from "lucide-react";

interface ReviewInspectionModalProps {
  item: CmsPendingReviewItem | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenApprove: (item: CmsPendingReviewItem) => void;
  onOpenReject: (item: CmsPendingReviewItem) => void;
  onOpenPreview: (item: CmsPendingReviewItem) => void;
}

export function ReviewInspectionModal({
  item,
  isOpen,
  onClose,
  onOpenApprove,
  onOpenReject,
  onOpenPreview,
}: ReviewInspectionModalProps) {
  const supabase = React.useMemo(() => createClient(), []);
  const [signedMediaUrl, setSignedMediaUrl] = React.useState<string | null>(null);
  const [isLoadingMedia, setIsLoadingMedia] = React.useState(false);

  React.useEffect(() => {
    let isMounted = true;

    async function resolveSignedUrl() {
      if (!item || !isOpen) {
        setSignedMediaUrl(null);
        return;
      }

      if (item.entity_type === "STUDY_MATERIAL" && item.media_preview_url) {
        if (item.media_preview_url.startsWith("http")) {
          setSignedMediaUrl(item.media_preview_url);
        } else {
          setIsLoadingMedia(true);
          const { signedUrl } = await StorageService.getSignedUrl(
            supabase,
            "study-materials",
            item.media_preview_url,
            300
          );
          if (isMounted) {
            setSignedMediaUrl(signedUrl);
            setIsLoadingMedia(false);
          }
        }
      } else if (item.entity_type === "LECTURE" && item.media_preview_url) {
        if (item.media_preview_url.startsWith("http") || item.media_preview_url.startsWith("/")) {
          setSignedMediaUrl(item.media_preview_url);
        } else {
          setIsLoadingMedia(true);
          const { signedUrl } = await StorageService.getSignedUrl(
            supabase,
            "lecture-thumbnails",
            item.media_preview_url,
            300
          );
          if (isMounted) {
            setSignedMediaUrl(signedUrl);
            setIsLoadingMedia(false);
          }
        }
      } else {
        setSignedMediaUrl(null);
      }
    }

    void resolveSignedUrl();

    return () => {
      isMounted = false;
    };
  }, [item, isOpen, supabase]);

  if (!item) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Submission Inspection & Governance Snapshot"
      description="Inspect educator-submitted content payload, media assets, and governance metadata before recording an approval decision."
      maxWidth="lg"
    >
      <div className="space-y-5 pt-1">
        {/* Entity Summary Header */}
        <div className="p-4 rounded-xl bg-brand-bg-warm/80 border border-brand-border space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono uppercase font-bold text-brand-orange bg-brand-bg-peach px-2.5 py-0.5 rounded border border-brand-orange-border/40">
                {item.entity_type.replace(/_/g, " ")}
              </span>
              {item.subject && (
                <span className="text-xs font-semibold text-brand-text-muted">
                  • {item.subject}
                </span>
              )}
            </div>

            <ContentStatusBadge status={item.status} size="sm" />
          </div>

          <h3 className="font-extrabold text-base text-brand-text-primary leading-snug">
            {item.title}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-brand-border/60 text-xs">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-brand-orange shrink-0" />
              <div>
                <span className="text-brand-text-muted block text-[10px]">Author / Educator</span>
                <span className="font-bold text-brand-text-primary">{item.author_name}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-brand-orange shrink-0" />
              <div>
                <span className="text-brand-text-muted block text-[10px]">Submission Timestamp</span>
                <span className="font-semibold text-brand-text-primary">
                  {new Date(item.submitted_at).toLocaleString([], {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Governance Audit Snapshot */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
          <div className="flex items-center gap-1.5 font-bold text-slate-800">
            <ShieldCheck className="h-4 w-4 text-brand-orange shrink-0" />
            <span>Governance Audit Snapshot</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px] text-slate-700 pt-1">
            <div>
              <span className="text-slate-500 font-medium">Review Status: </span>
              <strong className="font-bold">{item.status}</strong>
            </div>

            {item.reviewed_at && (
              <div>
                <span className="text-slate-500 font-medium">Reviewed At: </span>
                <span>{new Date(item.reviewed_at).toLocaleString()}</span>
              </div>
            )}

            {item.reviewed_by && (
              <div className="col-span-full">
                <span className="text-slate-500 font-medium">Reviewer UID: </span>
                <code className="font-mono text-[10px] bg-slate-200/70 px-1.5 py-0.5 rounded text-slate-800">
                  {item.reviewed_by}
                </code>
              </div>
            )}

            {item.review_note && (
              <div className="col-span-full p-2.5 rounded-lg bg-amber-50/80 border border-amber-200 text-amber-950">
                <span className="font-bold block text-[10px] text-amber-800 mb-0.5">Existing Review Feedback:</span>
                <p className="italic text-[11px] leading-relaxed">&ldquo;{item.review_note}&rdquo;</p>
              </div>
            )}
          </div>
        </div>

        {/* Media & Payload Inspection Canvas */}
        <div className="space-y-2">
          <h4 className="font-bold text-xs text-brand-text-primary flex items-center gap-1.5">
            <FileCheck2 className="h-4 w-4 text-brand-orange" />
            <span>Media & Asset Verification</span>
          </h4>

          {item.entity_type === "LECTURE" && (
            <div className="p-3.5 rounded-xl border border-brand-border bg-white space-y-3 text-xs">
              <div className="flex items-start gap-3">
                {signedMediaUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={signedMediaUrl}
                    alt={item.title}
                    className="h-20 w-32 rounded-lg object-cover border border-brand-border shadow-xs shrink-0"
                  />
                ) : (
                  <div className="h-20 w-32 rounded-lg bg-slate-800 flex items-center justify-center text-white/50 shrink-0">
                    <Video className="h-6 w-6" />
                  </div>
                )}

                <div className="space-y-1">
                  <p className="font-bold text-brand-text-primary">{item.title}</p>
                  <p className="text-[11px] text-brand-text-muted">Subject: {item.subject}</p>
                  {item.video_stream_url ? (
                    <p className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block">
                      Playback Ready: {item.video_stream_url}
                    </p>
                  ) : (
                    <p className="text-[10px] text-brand-text-muted italic">
                      Video stream URL staged for production encoding.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {item.entity_type === "STUDY_MATERIAL" && (
            <div className="p-3.5 rounded-xl border border-brand-border bg-white flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-red-50 text-red-600 border border-red-200 flex items-center justify-center shrink-0">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-brand-text-primary">{item.title}</p>
                  <p className="text-[11px] text-brand-text-muted capitalize">
                    {item.subject.replace(/_/g, " ")} • Private Document Vault
                  </p>
                </div>
              </div>

              {signedMediaUrl ? (
                <a
                  href={signedMediaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs inline-flex items-center gap-1 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" /> Open PDF
                </a>
              ) : (
                <span className="text-[11px] text-brand-text-muted italic">
                  {isLoadingMedia ? "Generating signed link..." : "File linked"}
                </span>
              )}
            </div>
          )}

          {item.entity_type === "BATCH" && (
            <div className="p-3.5 rounded-xl border border-brand-border bg-white flex items-center gap-3 text-xs">
              <div className="h-10 w-10 rounded-lg bg-brand-bg-peach text-brand-orange border border-brand-orange-border/50 flex items-center justify-center shrink-0">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-brand-text-primary">{item.title}</p>
                <p className="text-[11px] text-brand-text-muted">Target Board: {item.subject}</p>
              </div>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-brand-border">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenPreview(item)}
            className="text-xs"
          >
            Open Student Card Simulation
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
            >
              Close
            </Button>

            {item.status === "PENDING_REVIEW" && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onClose();
                    onOpenReject(item);
                  }}
                  className="border-rose-200 text-rose-700 hover:bg-rose-50 font-bold"
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1" /> Return for Revision
                </Button>

                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    onClose();
                    onOpenApprove(item);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-2xs"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve Content
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
