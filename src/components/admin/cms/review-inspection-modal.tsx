"use client";

import * as React from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { ContentStatusBadge } from "./content-status-badge";
import { CmsPendingReviewItem } from "@/types/cms.types";
import { StorageService } from "@/lib/services/storage.service";
import { createClient } from "@/lib/supabase/client";
import {
  resolveLectureVideoId,
  buildYouTubeEmbedUrl,
  getYouTubeThumbnailUrl,
} from "@/lib/utils/youtube";
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
  Clock,
  ExternalLink,
  Play,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  CheckCircle,
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
  const [isCheckingProcessing, setIsCheckingProcessing] = React.useState(false);
  const [processingStatus, setProcessingStatus] = React.useState<string | null>(null);

  // Extract resolved YouTube Video ID & Embed URL
  const resolvedVideoId = React.useMemo(() => {
    if (!item || item.entity_type !== "LECTURE") return null;
    return resolveLectureVideoId({
      video_stream_id: item.video_stream_id,
      video_playback_url: item.video_playback_url || item.video_stream_url,
    });
  }, [item]);

  const resolvedEmbedUrl = React.useMemo(() => {
    if (!resolvedVideoId) return null;
    return buildYouTubeEmbedUrl(resolvedVideoId, { autoplay: false });
  }, [resolvedVideoId]);

  // Load Signed URL for custom thumbnails or PDF documents
  React.useEffect(() => {
    let isMounted = true;

    async function resolveSignedUrl() {
      if (!item || !isOpen) {
        setSignedMediaUrl(null);
        setProcessingStatus(null);
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
      } else if (item.entity_type === "LECTURE") {
        if (item.media_preview_url && (item.media_preview_url.startsWith("http") || item.media_preview_url.startsWith("/"))) {
          setSignedMediaUrl(item.media_preview_url);
        } else if (item.media_preview_url) {
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
        } else if (resolvedVideoId) {
          setSignedMediaUrl(getYouTubeThumbnailUrl(resolvedVideoId, "hq"));
        }
      } else {
        setSignedMediaUrl(null);
      }
    }

    void resolveSignedUrl();

    return () => {
      isMounted = false;
    };
  }, [item, isOpen, supabase, resolvedVideoId]);

  // Handler: Check video processing status on YouTube Data API
  const handleCheckVideoProcessing = async () => {
    if (!resolvedVideoId) return;
    try {
      setIsCheckingProcessing(true);
      const res = await fetch(`/api/youtube/video-status?videoId=${encodeURIComponent(resolvedVideoId)}`);
      const data = await res.json();
      if (data.uploadStatus) {
        setProcessingStatus(data.uploadStatus === "processed" ? "Ready & Processed" : `Status: ${data.uploadStatus}`);
      }
    } catch {
      setProcessingStatus("Unable to reach YouTube status API.");
    } finally {
      setIsCheckingProcessing(false);
    }
  };

  if (!item) return null;

  const isLecture = item.entity_type === "LECTURE";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isLecture ? "Recorded Lecture Review & Playback Studio" : "Submission Inspection & Governance Snapshot"}
      description={
        isLecture
          ? "Watch the submitted video, inspect audio/video quality, and verify batch and academic metadata before approving or returning for revision."
          : "Inspect educator-submitted content payload, media assets, and governance metadata before recording an approval decision."
      }
      maxWidth={isLecture ? "xl" : "lg"}
    >
      <div className="space-y-5 pt-1">
        {/* LECTURE VIDEO PLAYER SECTION */}
        {isLecture && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-brand-charcoal flex items-center gap-1.5">
                <Video className="h-4 w-4 text-brand-orange" />
                Submitted Video Stream Player
              </span>
              <div className="flex items-center gap-2">
                {resolvedVideoId && (
                  <span className="text-[10px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3 text-amber-600" />
                    Unlisted Review Stream ({resolvedVideoId})
                  </span>
                )}
                {resolvedVideoId && (
                  <button
                    type="button"
                    onClick={handleCheckVideoProcessing}
                    disabled={isCheckingProcessing}
                    className="text-[10px] font-bold text-sky-700 hover:text-sky-900 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-full flex items-center gap-1 cursor-pointer transition-colors"
                    title="Check YouTube encoding and processing state"
                  >
                    <RefreshCw className={`h-2.5 w-2.5 ${isCheckingProcessing ? "animate-spin" : ""}`} />
                    <span>{processingStatus || "Check Status"}</span>
                  </button>
                )}
              </div>
            </div>

            {resolvedEmbedUrl ? (
              <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-lg border border-slate-800 ring-1 ring-black/5">
                <iframe
                  src={resolvedEmbedUrl}
                  title={item.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="w-full h-full border-0"
                />
              </div>
            ) : (
              <div className="p-8 rounded-2xl bg-amber-50/70 border border-amber-200 text-center space-y-2">
                <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <h4 className="font-bold text-xs text-amber-900">
                  Video stream is processing or pending YouTube upload
                </h4>
                <p className="text-[11px] text-amber-750 max-w-md mx-auto">
                  {item.video_stream_id
                    ? `Video ID "${item.video_stream_id}" is registered. If recently uploaded, YouTube may take 1-2 minutes to finish processing.`
                    : "No YouTube video stream ID is attached to this submission. The educator may have saved a metadata draft."}
                </p>
                {signedMediaUrl && (
                  <div className="pt-2 flex justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={signedMediaUrl}
                      alt={item.title}
                      className="h-28 rounded-lg object-cover border border-amber-200 shadow-xs"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

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
              {item.batch_title && (
                <span className="text-[10px] font-bold bg-sky-50 text-sky-800 border border-sky-200 px-2 py-0.5 rounded-md">
                  Batch: {item.batch_title}
                </span>
              )}
            </div>

            <ContentStatusBadge status={item.status} size="sm" />
          </div>

          <h3 className="font-extrabold text-base text-brand-text-primary leading-snug">
            {item.title}
          </h3>

          {item.description && (
            <p className="text-xs text-brand-text-muted leading-relaxed line-clamp-3">
              {item.description}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-brand-border/60 text-xs">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-brand-orange shrink-0" />
              <div>
                <span className="text-brand-text-muted block text-[10px]">Author / Educator</span>
                <span className="font-bold text-brand-text-primary">{item.author_name}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-brand-orange shrink-0" />
              <div>
                <span className="text-brand-text-muted block text-[10px]">Real Duration</span>
                <span className="font-bold text-brand-text-primary">
                  {item.duration_human || item.duration_formatted || "45 min"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-brand-orange shrink-0" />
              <div>
                <span className="text-brand-text-muted block text-[10px]">Submitted Date</span>
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

        {/* NON-LECTURE ASSETS SECTION (Study Material / Batch) */}
        {!isLecture && (
          <div className="space-y-2">
            <h4 className="font-bold text-xs text-brand-text-primary flex items-center gap-1.5">
              <FileCheck2 className="h-4 w-4 text-brand-orange" />
              <span>Media & Asset Verification</span>
            </h4>

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
        )}

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-brand-border">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenPreview(item)}
            className="text-xs font-semibold"
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
                  className="border-rose-200 text-rose-700 hover:bg-rose-50 font-bold text-xs"
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
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs"
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
