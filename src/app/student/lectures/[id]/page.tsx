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
  BookOpen,
  Sparkles,
  Loader2,
  FileText,
  HelpCircle,
  Share2,
  Video,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LectureDetail {
  id: string;
  title: string;
  subject: string;
  teacher_name: string;
  description?: string;
  duration_human?: string;
  duration_formatted?: string;
  video_playback_url?: string;
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
          duration_human,
          duration_formatted,
          video_playback_url,
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

      // Check progress if student is logged in
      let completed = false;
      if (user) {
        const { data: progress } = await supabase
          .from("student_lecture_progress")
          .select("is_completed")
          .eq("student_id", user.id)
          .eq("lecture_id", lectureId)
          .maybeSingle();

        completed = !!progress?.is_completed;

        // Record activity and progress
        if (data.course_id) {
          await supabase.from("student_lecture_progress").upsert(
            {
              student_id: user.id,
              lecture_id: lectureId,
              course_id: data.course_id,
              is_completed: true,
              last_watched_at: new Date().toISOString(),
              progress_percentage: 100,
            },
            { onConflict: "student_id,lecture_id" }
          );
          completed = true;
        }
      }

      setLecture({ ...data, is_completed: completed });
      setIsCompleted(completed);
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
            <span>Back</span>
          </button>

          {isLoading ? (
            <div className="p-16 text-center flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-brand-orange" />
              <p className="text-xs font-semibold text-brand-text-muted">Loading video lecture...</p>
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
              {/* Video Player Box */}
              <div className="relative aspect-video w-full rounded-3xl overflow-hidden bg-brand-charcoal border border-brand-border/80 shadow-lg flex items-center justify-center group">
                {lecture.video_playback_url ? (
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
                    {isCompleted && (
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                        <CheckCircle2 className="h-4 w-4" />
                        Completed
                      </span>
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
              </div>
            </div>
          )}
        </main>
      </div>

      <FloatingChatbot />
    </div>
  );
}
