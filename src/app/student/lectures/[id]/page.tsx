"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { StudentSidebar } from "@/components/student/student-sidebar";
import { StudentHeader } from "@/components/student/student-header";
import { FloatingChatbot } from "@/components/student/floating-chatbot";
import {
  ArrowLeft,
  PlayCircle,
  CheckCircle2,
  Clock,
  User,
  Sparkles,
  Loader2,
  ShieldCheck,
  BookOpen,
} from "lucide-react";

interface LectureDetail {
  id: string;
  title: string;
  subject: string;
  teacher_name: string;
  description?: string;
  duration_seconds?: number;
  duration_human?: string;
  duration_formatted?: string;
  video_playback_url?: string;
  video_stream_id?: string;
  category_tag?: string;
  course_id?: string;
  batch_id?: string;
  chapter_id?: string;
  is_completed?: boolean;
}

export default function LectureVideoPlayerPage() {
  const params = useParams();
  const router = useRouter();
  const lectureId = params?.id as string;
  const { user, isLoading: isAuthLoading } = useAuth();
  const supabase = React.useMemo(() => createClient(), []);

  const [lecture, setLecture] = React.useState<LectureDetail | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isCompleted, setIsCompleted] = React.useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [watchProgressPercent, setWatchProgressPercent] = React.useState(0);

  const fetchLecture = React.useCallback(async () => {
    if (!lectureId) return;

    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .from("cms_lectures")
        .select(`
          id,
          title,
          subject,
          teacher_name,
          description,
          duration_seconds,
          duration_human,
          duration_formatted,
          video_playback_url,
          video_stream_id,
          category_tag,
          course_id,
          batch_id,
          chapter_id
        `)
        .eq("id", lectureId)
        .eq("status", "PUBLISHED")
        .eq("is_visible", true)
        .single();

      if (error || !data) {
        setLecture(null);
        return;
      }

      // Check existing progress if student is logged in
      let completed = false;
      let existingProgress = 0;
      if (user) {
        const { data: progress } = await supabase
          .from("student_lecture_progress")
          .select("is_completed, last_position_seconds, watch_duration_seconds")
          .eq("student_id", user.id)
          .eq("lecture_id", lectureId)
          .maybeSingle();

        completed = !!progress?.is_completed;
        if (completed) {
          existingProgress = 100;
        } else if (progress?.last_position_seconds && data.duration_seconds) {
          existingProgress = Math.min(
            100,
            Math.round((progress.last_position_seconds / data.duration_seconds) * 100)
          );
        }

        // Send an initial watch heartbeat
        if (data.course_id) {
          await fetch("/api/student/learning/progress", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              lectureId,
              courseId: data.course_id,
              lastPositionSeconds: progress?.last_position_seconds || 30,
              watchDurationSeconds: 30,
              totalDurationSeconds: data.duration_seconds || 2700,
            }),
          }).catch((e) => console.warn("Progress update warning:", e));
        }
      }

      setLecture({ ...data, is_completed: completed });
      setIsCompleted(completed);
      setWatchProgressPercent(existingProgress);
    } catch (err) {
      console.error("Failed to fetch lecture details:", err);
    } finally {
      setIsLoading(false);
    }
  }, [lectureId, user, supabase]);

  React.useEffect(() => {
    if (!isAuthLoading) {
      fetchLecture();
    }
  }, [isAuthLoading, fetchLecture]);

  // Helper to extract YouTube embed URL
  const getEmbedUrl = React.useCallback((): string | null => {
    if (!lecture) return null;
    const url = lecture.video_playback_url;
    const streamId = lecture.video_stream_id;

    if (url && (url.includes("youtube.com") || url.includes("youtube-nocookie.com") || url.includes("youtu.be"))) {
      if (url.includes("/embed/")) return url;
      const vMatch = url.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})/);
      if (vMatch && vMatch[1]) {
        return `https://www.youtube-nocookie.com/embed/${vMatch[1]}?enablejsapi=1&rel=0&modestbranding=1`;
      }
    }

    if (streamId && streamId.length === 11 && !streamId.startsWith("cf_")) {
      return `https://www.youtube-nocookie.com/embed/${streamId}?enablejsapi=1&rel=0&modestbranding=1`;
    }

    return null;
  }, [lecture]);

  const handleManualComplete = async () => {
    if (!user || !lecture || !lecture.course_id) return;
    try {
      const totalSecs = lecture.duration_seconds || 2700;
      const res = await fetch("/api/student/learning/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lectureId: lecture.id,
          courseId: lecture.course_id,
          lastPositionSeconds: totalSecs,
          watchDurationSeconds: totalSecs,
          totalDurationSeconds: totalSecs,
        }),
      });
      if (res.ok) {
        setIsCompleted(true);
        setWatchProgressPercent(100);
      }
    } catch (err) {
      console.error("Failed to mark completed:", err);
    }
  };

  const embedUrl = getEmbedUrl();

  return (
    <div className="min-h-screen bg-[#FDFDFC] text-brand-text-primary flex flex-col font-sans antialiased">
      <StudentSidebar
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        <StudentHeader onOpenMobileMenu={() => setIsMobileMenuOpen(true)} />

        <main className="flex-1 px-4 sm:px-8 py-6 sm:py-8 max-w-5xl w-full mx-auto space-y-6">
          {/* Back Navigation */}
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-text-muted hover:text-brand-orange transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Course Lectures</span>
          </button>

          {isLoading ? (
            <div className="p-16 text-center flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-brand-orange" />
              <p className="text-xs font-semibold text-brand-text-muted">Loading secure video lecture...</p>
            </div>
          ) : !lecture ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-brand-border space-y-3">
              <h2 className="text-lg font-bold text-brand-charcoal">Lecture Not Found</h2>
              <p className="text-xs text-brand-text-muted">
                This lecture is currently unavailable or has not been published yet.
              </p>
              <Link
                href="/student/learning"
                className="inline-block text-xs font-bold text-brand-orange underline"
              >
                Return to My Learning
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Video Player Canvas */}
              <div className="relative aspect-video w-full rounded-3xl overflow-hidden bg-brand-charcoal border border-brand-border/80 shadow-lg flex items-center justify-center group">
                {embedUrl ? (
                  <iframe
                    src={embedUrl}
                    title={lecture.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="w-full h-full border-0"
                  />
                ) : lecture.video_playback_url ? (
                  <video
                    src={lecture.video_playback_url}
                    controls
                    autoPlay={false}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-3 text-white p-6 text-center">
                    <div className="h-16 w-16 rounded-2xl bg-brand-orange/20 border border-brand-orange/40 flex items-center justify-center text-brand-orange">
                      <PlayCircle className="h-10 w-10" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold">{lecture.title}</h3>
                      <p className="text-xs text-gray-300 mt-1">
                        High-definition recorded video stream is ready for playback.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Lecture Metadata Card */}
              <div className="p-6 sm:p-8 rounded-3xl bg-white border border-brand-border/80 shadow-2xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-brand-orange text-xs font-bold">
                      <Sparkles className="h-3.5 w-3.5" />
                      {lecture.subject}
                    </span>
                    {lecture.category_tag && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full bg-brand-bg-warm border border-brand-border text-xs font-semibold text-brand-charcoal">
                        {lecture.category_tag}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs font-semibold text-brand-text-muted">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {lecture.duration_human || lecture.duration_formatted || "45 min"}
                    </span>
                    {isCompleted ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Completed (100%)
                      </span>
                    ) : (
                      <button
                        onClick={handleManualComplete}
                        className="inline-flex items-center gap-1 text-brand-orange hover:text-brand-orange-hover font-bold bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-200 transition-colors"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Mark Completed
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <h1 className="text-xl sm:text-2xl font-black text-brand-charcoal tracking-tight">
                    {lecture.title}
                  </h1>
                  <p className="text-xs sm:text-sm font-medium text-brand-text-muted flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-brand-orange" />
                    {lecture.teacher_name}
                  </p>
                </div>

                {lecture.description && (
                  <p className="text-xs sm:text-sm text-brand-text-muted leading-relaxed pt-2 border-t border-gray-100">
                    {lecture.description}
                  </p>
                )}

                {/* Privacy & Governance Notice Banner */}
                <div className="p-3.5 rounded-2xl bg-brand-bg-warm/80 border border-brand-border/70 flex items-start gap-2.5 text-xs text-brand-text-muted">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed">
                    <strong>TopVeda Security Model:</strong> TopVeda authentication and enrollment control access to the embedded player. YouTube Unlisted reduces public discoverability but cannot prevent sharing of a discovered URL.
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      <FloatingChatbot />
    </div>
  );
}
