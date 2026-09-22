"use client";

import * as React from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { ContentStatusBadge } from "./content-status-badge";
import { ScheduleStatusBadge } from "./schedule-status-badge";
import {
  CmsCourse,
  CmsBatch,
  CmsLecture,
  CmsLiveClass,
  CmsStudyMaterial,
} from "@/types/cms.types";
import {
  GraduationCap,
  Video,
  Radio,
  FileText,
  User,
  Clock,
  Download,
  Calendar,
  Sparkles,
  ShieldCheck,
  HardDrive,
} from "lucide-react";

export type PreviewContentItem =
  | { type: "COURSE"; data: CmsCourse }
  | { type: "BATCH"; data: CmsBatch }
  | { type: "LECTURE"; data: CmsLecture; signedThumb?: string | null }
  | { type: "LIVE_CLASS"; data: CmsLiveClass }
  | { type: "STUDY_MATERIAL"; data: CmsStudyMaterial; signedPdf?: string | null };

interface ContentPreviewModalProps {
  item: PreviewContentItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ContentPreviewModal({
  item,
  isOpen,
  onClose,
}: ContentPreviewModalProps) {
  if (!item) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Student Experience Simulation Preview"
      description="Visualizes how this content appears to enrolled/exploring students on the TopVeda portal without altering its publication state."
      maxWidth="lg"
    >
      <div className="space-y-6 pt-1">
        {/* Governance State Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-brand-bg-warm/70 border border-brand-border">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase font-bold text-brand-orange">
              {item.type.replace(/_/g, " ")} PREVIEW
            </span>
            <ContentStatusBadge status={item.data.status} size="sm" />
          </div>

          <div className="flex items-center gap-2">
            <ScheduleStatusBadge startsAt={item.data.starts_at} endsAt={item.data.ends_at} />
            <span className="text-[11px] text-brand-text-muted">
              {item.data.is_visible ? "• Visible" : "• Hidden from portal"}
            </span>
          </div>
        </div>

        {/* Student-Facing Rendering Preview Canvas */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-inner space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-slate-400 text-xs">
            <div className="flex items-center gap-2 font-mono text-[11px]">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Simulated Student Portal Canvas</span>
            </div>
            <span className="text-[10px] text-slate-500">Read-Only Sandbox</span>
          </div>

          {/* Render based on entity type */}
          <div className="flex justify-center p-2">
            {item.type === "COURSE" && <CourseCardPreview course={item.data} />}
            {item.type === "BATCH" && <BatchCardPreview batch={item.data} />}
            {item.type === "LECTURE" && <LectureCardPreview lecture={item.data} signedThumb={item.signedThumb} />}
            {item.type === "LIVE_CLASS" && <LiveClassCardPreview liveClass={item.data} />}
            {item.type === "STUDY_MATERIAL" && <StudyMaterialCardPreview material={item.data} signedPdf={item.signedPdf} />}
          </div>
        </div>

        {/* Security Note Callout */}
        <div className="p-3 rounded-xl bg-sky-50/70 border border-sky-200 text-xs text-sky-900 flex items-start gap-2.5">
          <ShieldCheck className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-bold">Sandbox Preview Integrity</p>
            <p className="text-[11px] text-sky-800 leading-relaxed">
              This preview operates purely in administrative context and does not create public endpoints, bypass database RLS, or expose draft media to students.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end pt-2 border-t border-brand-border">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close Preview
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// 1. Course Card Preview
function CourseCardPreview({ course }: { course: CmsCourse }) {
  return (
    <div className="max-w-sm w-full rounded-2xl bg-white p-5 border border-brand-border shadow-md space-y-3.5 text-left">
      <div className="flex items-center justify-between">
        <div className="h-10 w-10 rounded-xl bg-rose-50 text-brand-orange border border-rose-100 flex items-center justify-center">
          <GraduationCap className="h-5 w-5" />
        </div>
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-brand-orange bg-brand-bg-peach border border-brand-orange-border/50">
          {course.category}
        </span>
      </div>

      <div className="space-y-1">
        <h3 className="font-extrabold text-base text-brand-text-primary leading-snug">
          {course.title}
        </h3>
        {course.short_description && (
          <p className="text-xs text-brand-text-muted line-clamp-2 leading-relaxed">
            {course.short_description}
          </p>
        )}
      </div>

      <div className="pt-2 border-t border-brand-border/60 flex items-center justify-between">
        <span className="text-[11px] font-bold text-brand-text-muted">
          {course.board?.name || "CBSE"} • {course.class_level?.name || "Class 10"}
        </span>
        <button className="text-xs font-extrabold text-brand-orange hover:underline flex items-center gap-1 cursor-pointer">
          <span>Explore Course</span> →
        </button>
      </div>
    </div>
  );
}

// 2. Batch Card Preview
function BatchCardPreview({ batch }: { batch: CmsBatch }) {
  return (
    <div
      className={`max-w-sm w-full rounded-2xl p-5 border shadow-md space-y-4 text-left bg-gradient-to-br ${
        batch.bg_gradient || "from-sky-50 via-blue-50 to-indigo-50"
      } ${batch.border_color || "border-sky-200"}`}
    >
      <div className="flex items-center justify-between">
        <span className="font-extrabold text-xs text-brand-text-primary tracking-wide">
          {batch.board_label}
        </span>
        {batch.badge_text && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-orange-500 text-white shadow-xs">
            {batch.badge_text}
          </span>
        )}
      </div>

      <div className="space-y-1">
        <h3 className="font-extrabold text-base text-brand-text-primary leading-snug">
          {batch.title}
        </h3>
        <p className="text-xs text-brand-text-muted line-clamp-2">
          {batch.subtitle}
        </p>
      </div>

      <div className="flex items-center gap-2.5 pt-2 border-t border-brand-border/40">
        <div className="h-8 w-8 rounded-full bg-brand-orange/10 border border-brand-orange/20 flex items-center justify-center text-brand-orange">
          <User className="h-4 w-4" />
        </div>
        <div className="text-xs">
          <p className="font-bold text-brand-text-primary">{batch.educator_name}</p>
          <p className="text-[10px] text-brand-text-muted">Lead Master Educator</p>
        </div>
      </div>

      <button className="w-full py-2 rounded-xl bg-brand-orange text-white text-xs font-bold shadow-xs hover:bg-brand-orange-hover transition-colors flex items-center justify-center gap-1.5 cursor-pointer">
        <span>{batch.cta_text || "Enroll Now →"}</span>
      </button>
    </div>
  );
}

// 3. Lecture Card Preview
function LectureCardPreview({
  lecture,
  signedThumb,
}: {
  lecture: CmsLecture;
  signedThumb?: string | null;
}) {
  return (
    <div className="max-w-sm w-full rounded-2xl bg-white border border-brand-border shadow-md overflow-hidden text-left">
      <div className="relative h-40 bg-gradient-to-tr from-[#0F2042] via-[#162D59] to-[#0A162B] flex items-center justify-center overflow-hidden">
        {signedThumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={signedThumb} alt={lecture.title} className="w-full h-full object-cover" />
        ) : (
          <Video className="h-10 w-10 text-white/40" />
        )}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
          <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-brand-orange text-white">
            {lecture.category_tag}
          </span>
          {lecture.is_free_preview && (
            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-600 text-white flex items-center gap-0.5">
              <Sparkles className="h-2.5 w-2.5" /> Free
            </span>
          )}
        </div>
        <div className="absolute bottom-2.5 right-2.5 bg-black/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
          <Clock className="h-3 w-3" />
          <span>{lecture.duration_human || lecture.duration_formatted}</span>
        </div>
      </div>

      <div className="p-4 space-y-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-brand-orange">
          {lecture.subject}
        </span>
        <h4 className="font-extrabold text-sm text-brand-text-primary line-clamp-2 leading-snug">
          {lecture.title}
        </h4>
        <div className="flex items-center justify-between pt-2 border-t border-brand-border/60 text-xs text-brand-text-muted">
          <div className="flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-brand-orange" />
            <span className="font-medium">{lecture.teacher_name}</span>
          </div>
          <button className="text-xs font-bold text-brand-orange hover:underline cursor-pointer">
            Watch Now →
          </button>
        </div>
      </div>
    </div>
  );
}

// 4. Live Class Card Preview
function LiveClassCardPreview({ liveClass }: { liveClass: CmsLiveClass }) {
  return (
    <div className="max-w-sm w-full rounded-2xl bg-white p-5 border border-brand-border shadow-md space-y-3.5 text-left">
      <div className="flex items-center justify-between">
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-brand-bg-peach text-brand-orange border border-brand-orange-border/50">
          {liveClass.subject}
        </span>
        {liveClass.live_status === "LIVE" ? (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-50 text-rose-600 border border-rose-200 flex items-center gap-1 animate-pulse">
            <Radio className="h-3 w-3" /> LIVE NOW
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-sky-700 bg-sky-50 border border-sky-200 flex items-center gap-1">
            <Clock className="h-3 w-3" /> Scheduled
          </span>
        )}
      </div>

      <div className="space-y-1">
        <h4 className="font-extrabold text-base text-brand-text-primary leading-snug">
          {liveClass.topic}
        </h4>
        <div className="flex items-center gap-1.5 text-xs text-brand-text-muted">
          <Calendar className="h-3.5 w-3.5 text-brand-orange" />
          <span>{liveClass.time_display}</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-brand-border/60">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-brand-bg-peach flex items-center justify-center text-brand-orange">
            <User className="h-4 w-4" />
          </div>
          <span className="text-xs font-semibold text-brand-text-primary">{liveClass.educator_name}</span>
        </div>

        <button className="px-3 py-1.5 rounded-lg bg-brand-orange text-white text-xs font-bold shadow-2xs hover:bg-brand-orange-hover transition-colors flex items-center gap-1 cursor-pointer">
          {liveClass.live_status === "LIVE" ? "Join Class" : liveClass.cta_text || "Remind Me"}
        </button>
      </div>
    </div>
  );
}

// 5. Study Material Card Preview
function StudyMaterialCardPreview({
  material,
  signedPdf,
}: {
  material: CmsStudyMaterial;
  signedPdf?: string | null;
}) {
  return (
    <div className="max-w-sm w-full rounded-2xl bg-white p-5 border border-brand-border shadow-md space-y-3.5 text-left">
      <div className="flex items-center justify-between">
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-brand-orange bg-brand-bg-peach border border-brand-orange-border/50">
          {material.material_type.replace(/_/g, " ")}
        </span>
        <div className="flex items-center gap-1 text-[11px] text-brand-text-muted">
          <Download className="h-3.5 w-3.5" />
          <span>{material.download_count} downloads</span>
        </div>
      </div>

      <div className="flex items-start gap-3">
        <div className="h-10 w-10 shrink-0 rounded-xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center">
          <FileText className="h-5 w-5" />
        </div>
        <div className="space-y-0.5">
          <h4 className="font-extrabold text-sm text-brand-text-primary leading-snug">
            {material.title}
          </h4>
          <p className="text-[11px] text-brand-text-muted">
            PDF Document {material.page_count ? `• ${material.page_count} pages` : ""}
          </p>
        </div>
      </div>

      <div className="pt-2 border-t border-brand-border/60 flex items-center justify-between">
        <span className="text-[10px] font-mono text-brand-text-muted flex items-center gap-1">
          <HardDrive className="h-3 w-3" />
          {material.file_size_bytes ? `${(material.file_size_bytes / (1024 * 1024)).toFixed(1)} MB` : "Encrypted Vault"}
        </span>

        {signedPdf ? (
          <a
            href={signedPdf}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold shadow-2xs hover:bg-emerald-700 transition-colors flex items-center gap-1"
          >
            <Download className="h-3.5 w-3.5" /> Download PDF
          </a>
        ) : (
          <button className="px-3 py-1.5 rounded-lg bg-brand-orange text-white text-xs font-bold shadow-2xs hover:bg-brand-orange-hover transition-colors flex items-center gap-1 cursor-pointer">
            <Download className="h-3.5 w-3.5" /> Download PDF
          </button>
        )}
      </div>
    </div>
  );
}
