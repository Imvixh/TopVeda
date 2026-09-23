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
  BookOpen,
  PlayCircle,
  CheckCircle2,
  Lock,
  Sparkles,
  Loader2,
  Clock,
  Layers,
  ChevronRight,
  GraduationCap,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CourseDetailData {
  id: string;
  title: string;
  category: string;
  shortDescription?: string;
  boardName: string;
  subjectName: string;
  accessTier: string;
  isEnrolled: boolean;
  chapters: {
    id: string;
    chapterNumber: number;
    title: string;
    description?: string;
    lectures: {
      id: string;
      title: string;
      durationFormatted: string;
      isFreePreview: boolean;
      isCompleted: boolean;
    }[];
  }[];
}

export default function StudentCourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params?.id as string;
  const { user, isLoading: isAuthLoading } = useAuth();
  const supabase = React.useMemo(() => createClient(), []);

  const [course, setCourse] = React.useState<CourseDetailData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isEnrolling, setIsEnrolling] = React.useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const fetchCourseDetails = React.useCallback(async () => {
    if (!courseId) return;

    try {
      setIsLoading(true);

      // 1. Fetch Course metadata
      const { data: courseData, error: courseError } = await supabase
        .from("cms_courses")
        .select(`
          id,
          title,
          category,
          short_description,
          access_tier,
          board:cms_boards(name),
          subject:cms_subjects(name)
        `)
        .eq("id", courseId)
        .single();

      if (courseError || !courseData) {
        setCourse(null);
        return;
      }

      // 2. Check Enrollment Status
      let isEnrolled = false;
      if (user) {
        const { data: enrollment } = await supabase
          .from("student_enrollments")
          .select("id")
          .eq("student_id", user.id)
          .eq("course_id", courseId)
          .maybeSingle();

        isEnrolled = !!enrollment;
      }

      // 3. Fetch Chapters & Lectures
      const { data: chaptersData } = await supabase
        .from("cms_chapters")
        .select(`
          id,
          chapter_number,
          title,
          description,
          lectures:cms_lectures(
            id,
            title,
            duration_formatted,
            is_free_preview,
            display_order,
            status,
            is_visible
          )
        `)
        .eq("course_id", courseId)
        .eq("status", "PUBLISHED")
        .eq("is_visible", true)
        .order("chapter_number", { ascending: true });

      // 4. Fetch User Lecture Progress
      const completedLectureIds = new Set<string>();
      if (user) {
        const { data: progress } = await supabase
          .from("student_lecture_progress")
          .select("lecture_id")
          .eq("student_id", user.id)
          .eq("course_id", courseId)
          .eq("is_completed", true);

        (progress || []).forEach((p) => completedLectureIds.add(p.lecture_id));
      }

      const formattedChapters = (chaptersData || []).map((ch: any) => ({
        id: ch.id,
        chapterNumber: ch.chapter_number,
        title: ch.title,
        description: ch.description,
        lectures: (ch.lectures || [])
          .filter((l: any) => l.status === "PUBLISHED" && l.is_visible)
          .sort((a: any, b: any) => a.display_order - b.display_order)
          .map((l: any) => ({
            id: l.id,
            title: l.title,
            durationFormatted: l.duration_formatted || "45:00",
            isFreePreview: l.is_free_preview,
            isCompleted: completedLectureIds.has(l.id),
          })),
      }));

      setCourse({
        id: courseData.id,
        title: `${(courseData as any).board?.name ? (courseData as any).board.name + " " : ""}${courseData.title} – ${(courseData as any).subject?.name || courseData.category}`,
        category: courseData.category,
        shortDescription: courseData.short_description || "Comprehensive syllabus coverage and guided practice.",
        boardName: (courseData as any).board?.name || "TopVeda Board",
        subjectName: (courseData as any).subject?.name || courseData.category,
        accessTier: courseData.access_tier || "FREE",
        isEnrolled,
        chapters: formattedChapters,
      });
    } catch (err) {
      console.error("Failed to fetch course details:", err);
    } finally {
      setIsLoading(false);
    }
  }, [courseId, user, supabase]);

  React.useEffect(() => {
    if (!isAuthLoading) {
      fetchCourseDetails();
    }
  }, [isAuthLoading, fetchCourseDetails]);

  const handleEnroll = async () => {
    if (!user) {
      router.push("/auth/login");
      return;
    }

    try {
      setIsEnrolling(true);
      const res = await fetch("/api/student/learning/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId }),
      });

      if (res.ok) {
        await fetchCourseDetails();
      } else {
        const err = await res.json();
        alert(err.error || "Enrollment failed.");
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

        <main className="flex-1 px-4 sm:px-8 py-6 sm:py-8 max-w-[1000px] w-full mx-auto space-y-6">
          {/* Back Navigation */}
          <Link
            href="/student/learning"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-text-muted hover:text-brand-orange transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to My Learning</span>
          </Link>

          {isLoading ? (
            <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-brand-orange" />
              <p className="text-xs font-semibold text-brand-text-muted">Loading course details...</p>
            </div>
          ) : !course ? (
            <div className="p-12 text-center space-y-3">
              <h2 className="text-lg font-bold text-brand-charcoal">Course not found</h2>
              <p className="text-xs text-brand-text-muted">The requested course could not be located.</p>
              <Link href="/student/learning" className="text-xs font-bold text-brand-orange underline">
                Return to My Learning
              </Link>
            </div>
          ) : (
            <>
              {/* Course Header Banner */}
              <div className="p-6 sm:p-8 rounded-3xl bg-white border border-brand-border/80 shadow-2xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 border border-orange-200/60 text-brand-orange text-xs font-bold">
                    <Sparkles className="h-3.5 w-3.5" />
                    {course.boardName} · {course.subjectName}
                  </span>

                  {course.isEnrolled ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Enrolled
                    </span>
                  ) : (
                    <button
                      onClick={handleEnroll}
                      disabled={isEnrolling}
                      className="px-6 py-2.5 rounded-full bg-brand-orange hover:bg-brand-orange-hover text-white text-xs sm:text-sm font-bold shadow-xs transition-all cursor-pointer"
                    >
                      {isEnrolling ? "Enrolling..." : "Enroll in Course"}
                    </button>
                  )}
                </div>

                <div className="space-y-1">
                  <h1 className="text-xl sm:text-2xl font-black text-brand-charcoal tracking-tight">
                    {course.title}
                  </h1>
                  <p className="text-xs sm:text-sm font-medium text-brand-text-muted max-w-2xl">
                    {course.shortDescription}
                  </p>
                </div>
              </div>

              {/* Course Curriculum & Chapters */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-brand-orange" />
                  <h2 className="text-base sm:text-lg font-black text-brand-charcoal tracking-tight">
                    Curriculum & Lectures
                  </h2>
                </div>

                {course.chapters.length > 0 ? (
                  <div className="space-y-4">
                    {course.chapters.map((ch) => (
                      <div
                        key={ch.id}
                        className="p-5 rounded-2xl bg-white border border-brand-border/80 shadow-2xs space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm sm:text-base font-bold text-brand-charcoal">
                            Chapter {ch.chapterNumber}: {ch.title}
                          </h3>
                          <span className="text-xs font-semibold text-brand-text-muted">
                            {ch.lectures.length} {ch.lectures.length === 1 ? "lecture" : "lectures"}
                          </span>
                        </div>

                        {ch.description && (
                          <p className="text-xs text-brand-text-muted">{ch.description}</p>
                        )}

                        <div className="space-y-2 pt-1 border-t border-gray-100">
                          {ch.lectures.map((lec) => (
                            <div
                              key={lec.id}
                              className="p-3 rounded-xl bg-gray-50/70 hover:bg-orange-50/50 border border-gray-100 transition-colors flex items-center justify-between gap-3"
                            >
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                {lec.isCompleted ? (
                                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                                ) : (
                                  <PlayCircle className="h-4 w-4 text-brand-orange shrink-0" />
                                )}
                                <span className="text-xs font-bold text-brand-charcoal truncate">
                                  {lec.title}
                                </span>
                              </div>

                              <div className="flex items-center gap-3 shrink-0">
                                <span className="text-[11px] font-semibold text-brand-text-muted flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {lec.durationFormatted}
                                </span>

                                <Link
                                  href={`/student/lectures/${lec.id}`}
                                  className="px-3.5 py-1 rounded-full text-xs font-bold text-brand-orange hover:bg-orange-100 transition-colors"
                                >
                                  Watch
                                </Link>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 rounded-2xl bg-white border border-dashed border-gray-200 text-center space-y-2">
                    <p className="text-xs font-semibold text-brand-text-muted">
                      No published lectures in this course yet.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      </div>

      <FloatingChatbot />
    </div>
  );
}
