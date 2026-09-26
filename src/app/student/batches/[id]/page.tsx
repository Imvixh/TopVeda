"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { StudentSidebar } from "@/components/student/student-sidebar";
import { StudentHeader } from "@/components/student/student-header";
import { FloatingChatbot } from "@/components/student/floating-chatbot";
import {
  ArrowLeft,
  BookOpen,
  PlayCircle,
  Video,
  FileText,
  Sparkles,
  CheckCircle2,
  Clock,
  Loader2,
  Users,
  Building2,
  GraduationCap,
} from "lucide-react";
import { formatLiveTimeDisplay } from "@/lib/utils/timezone";
import { cn } from "@/lib/utils";

interface BatchDetailData {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  board_label: string;
  badge_text?: string;
  badge_variant?: string;
  educator_name: string;
  educator_avatar_url: string;
  course_id?: string;
  is_enrolled: boolean;
  lectures: Array<{
    id: string;
    title: string;
    duration_formatted: string;
    teacher_name: string;
  }>;
  liveClasses: Array<{
    id: string;
    topic: string;
    time_display: string;
    is_live: boolean;
  }>;
  studyMaterials: Array<{
    id: string;
    title: string;
    material_type: string;
    file_format: string;
  }>;
}

export default function BatchDetailPage() {
  const params = useParams();
  const router = useRouter();
  const batchId = params?.id as string;
  const { user, isLoading: isAuthLoading } = useAuth();
  const supabase = React.useMemo(() => createClient(), []);

  const [batch, setBatch] = React.useState<BatchDetailData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isEnrolling, setIsEnrolling] = React.useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const fetchBatchDetails = React.useCallback(async () => {
    if (!batchId) return;

    try {
      setIsLoading(true);

      // 1. Fetch Batch
      const { data: batchData, error: batchError } = await supabase
        .from("cms_batches")
        .select(`
          id,
          title,
          subtitle,
          description,
          board_label,
          badge_text,
          badge_variant,
          educator_name,
          educator_avatar_url,
          course_id
        `)
        .eq("id", batchId)
        .eq("status", "PUBLISHED")
        .eq("is_visible", true)
        .single();

      if (batchError || !batchData) {
        setBatch(null);
        return;
      }

      // 2. Check Enrollment
      let isEnrolled = false;
      if (user) {
        const { data: enroll } = await supabase
          .from("student_enrollments")
          .select("id")
          .eq("student_id", user.id)
          .eq("batch_id", batchId)
          .maybeSingle();

        isEnrolled = !!enroll;
      }

      // 3. Fetch Batch Lectures
      const { data: lecturesData } = await supabase
        .from("cms_lectures")
        .select("id, title, duration_formatted, teacher_name, display_order")
        .eq("batch_id", batchId)
        .eq("status", "PUBLISHED")
        .eq("is_visible", true)
        .order("display_order", { ascending: true });

      // 4. Fetch Batch Live Classes
      const { data: liveData } = await supabase
        .from("cms_live_classes")
        .select("id, topic, time_display, is_live, live_status, scheduled_start")
        .eq("batch_id", batchId)
        .eq("is_visible", true)
        .in("live_status", ["SCHEDULED", "LIVE"])
        .order("scheduled_start", { ascending: true });

      // 5. Fetch Batch Study Materials
      const { data: materialsData } = await supabase
        .from("cms_study_materials")
        .select("id, title, material_type, file_format")
        .eq("batch_id", batchId)
        .eq("status", "PUBLISHED")
        .eq("is_visible", true);

      setBatch({
        id: batchData.id,
        title: batchData.title,
        subtitle: batchData.subtitle,
        description: batchData.description,
        board_label: batchData.board_label,
        badge_text: batchData.badge_text,
        badge_variant: batchData.badge_variant,
        educator_name: batchData.educator_name,
        educator_avatar_url: batchData.educator_avatar_url || null,
        course_id: batchData.course_id,
        is_enrolled: isEnrolled,
        lectures: (lecturesData || []).map((l) => ({
          id: l.id,
          title: l.title,
          duration_formatted: l.duration_formatted || "45:00",
          teacher_name: l.teacher_name,
        })),
        liveClasses: (liveData || []).map((lc) => ({
          id: lc.id,
          topic: lc.topic,
          time_display: lc.scheduled_start ? formatLiveTimeDisplay(lc.scheduled_start) : lc.time_display,
          is_live: lc.live_status === "LIVE" || lc.is_live,
        })),
        studyMaterials: (materialsData || []).map((m) => ({
          id: m.id,
          title: m.title,
          material_type: m.material_type || "Notes",
          file_format: m.file_format || "PDF",
        })),
      });
    } catch (err) {
      console.error("Failed to fetch batch details:", err);
    } finally {
      setIsLoading(false);
    }
  }, [batchId, user, supabase]);

  React.useEffect(() => {
    if (!isAuthLoading) {
      fetchBatchDetails();
    }
  }, [isAuthLoading, fetchBatchDetails]);

  const handleEnroll = async () => {
    if (!user) {
      router.push("/auth/login");
      return;
    }

    try {
      setIsEnrolling(true);
      if (batch?.course_id) {
        const res = await fetch("/api/student/learning/enroll", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ courseId: batch.course_id, batchId: batch.id }),
        });

        if (res.ok) {
          await fetchBatchDetails();
        } else {
          const err = await res.json();
          alert(err.error || "Enrollment failed.");
        }
      }
    } catch (err) {
      console.error("Enrollment error:", err);
    } finally {
      setIsEnrolling(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFDFC] text-brand-text-primary flex flex-col font-sans antialiased">
      <StudentSidebar
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        <StudentHeader onOpenMobileMenu={() => setIsMobileMenuOpen(true)} />

        <main className="flex-1 px-4 sm:px-8 py-6 sm:py-8 max-w-5xl w-full mx-auto space-y-6">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-text-muted hover:text-brand-orange transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </button>

          {isLoading ? (
            <div className="p-16 text-center flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-brand-orange" />
              <p className="text-xs font-semibold text-brand-text-muted">Loading batch syllabus & schedule...</p>
            </div>
          ) : !batch ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-brand-border space-y-3">
              <h2 className="text-lg font-bold text-brand-charcoal">Batch Not Found</h2>
              <p className="text-xs text-brand-text-muted">
                The requested academic batch could not be found or has been archived.
              </p>
              <Link href="/student" className="text-xs font-bold text-brand-orange underline">
                Return to Student Home
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Batch Banner Header */}
              <div className="p-6 sm:p-8 rounded-3xl bg-white border border-brand-border/80 shadow-2xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-brand-orange text-xs font-bold">
                      <Sparkles className="h-3.5 w-3.5" />
                      {batch.board_label}
                    </span>
                    {batch.badge_text && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full bg-brand-bg-warm border border-brand-border text-xs font-semibold text-brand-charcoal">
                        {batch.badge_text}
                      </span>
                    )}
                  </div>

                  {batch.is_enrolled ? (
                    <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
                      <CheckCircle2 className="h-4 w-4" />
                      Enrolled in Batch
                    </span>
                  ) : (
                    <button
                      onClick={handleEnroll}
                      disabled={isEnrolling}
                      className="px-6 py-2.5 rounded-full bg-brand-orange hover:bg-brand-orange-hover text-white text-xs sm:text-sm font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isEnrolling ? "Enrolling..." : "Enroll in Batch"}
                    </button>
                  )}
                </div>

                <div className="space-y-1">
                  <h1 className="text-xl sm:text-2xl font-black text-brand-charcoal tracking-tight">
                    {batch.title}
                  </h1>
                  {batch.subtitle && (
                    <p className="text-xs sm:text-sm font-semibold text-brand-text-muted">
                      {batch.subtitle}
                    </p>
                  )}
                  <p className="text-xs text-brand-text-muted flex items-center gap-1.5 pt-1">
                    <Users className="h-3.5 w-3.5 text-brand-orange" />
                    Faculty: {batch.educator_name}
                  </p>
                </div>

                {batch.description && (
                  <p className="text-xs sm:text-sm text-brand-text-muted leading-relaxed pt-2 border-t border-gray-100">
                    {batch.description}
                  </p>
                )}
              </div>

              {/* Batch Lectures */}
              <div className="p-6 sm:p-8 rounded-3xl bg-white border border-brand-border/80 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm sm:text-base font-bold text-brand-charcoal flex items-center gap-2">
                    <PlayCircle className="h-4 w-4 text-brand-orange" />
                    Recorded Lectures ({batch.lectures.length})
                  </h3>
                </div>

                {batch.lectures.length > 0 ? (
                  <div className="space-y-2">
                    {batch.lectures.map((lec) => (
                      <div
                        key={lec.id}
                        className="p-3.5 rounded-2xl bg-brand-bg-warm/40 border border-brand-border/60 flex items-center justify-between gap-3 hover:bg-brand-bg-warm/70 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <PlayCircle className="h-4 w-4 text-brand-orange shrink-0" />
                          <div>
                            <h4 className="text-xs font-bold text-brand-charcoal truncate">{lec.title}</h4>
                            <p className="text-[11px] text-brand-text-muted">{lec.teacher_name}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-[11px] font-semibold text-brand-text-muted flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {lec.duration_formatted}
                          </span>
                          <Link
                            href={`/student/lectures/${lec.id}`}
                            className="px-3 py-1 rounded-xl text-xs font-bold bg-brand-orange text-white hover:bg-brand-orange-hover transition-colors shadow-2xs"
                          >
                            Watch
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-brand-text-muted text-center py-4">
                    No recorded lectures published in this batch yet.
                  </p>
                )}
              </div>

              {/* Batch Study Materials */}
              {batch.studyMaterials.length > 0 && (
                <div className="p-6 sm:p-8 rounded-3xl bg-white border border-brand-border/80 shadow-2xs space-y-4">
                  <h3 className="text-sm sm:text-base font-bold text-brand-charcoal flex items-center gap-2">
                    <FileText className="h-4 w-4 text-emerald-600" />
                    Attached Notes & Study Materials ({batch.studyMaterials.length})
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {batch.studyMaterials.map((mat) => (
                      <Link
                        key={mat.id}
                        href="/student/study-material"
                        className="p-3.5 rounded-2xl bg-emerald-50/40 border border-emerald-100 flex items-center justify-between gap-2 hover:bg-emerald-50 transition-colors"
                      >
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-brand-charcoal truncate">{mat.title}</h4>
                          <span className="text-[10px] font-semibold text-emerald-700 uppercase">
                            {mat.material_type} · {mat.file_format}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-brand-orange shrink-0">View →</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      <FloatingChatbot />
    </div>
  );
}
