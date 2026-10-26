"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { StudentSidebar } from "@/components/student/student-sidebar";
import { StudentHeader } from "@/components/student/student-header";
import { FloatingChatbot } from "@/components/student/floating-chatbot";
import {
  PlaySquare,
  PlayCircle,
  Clock,
  User,
  Sparkles,
  Loader2,
  Search,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LectureItem {
  id: string;
  title: string;
  subject: string;
  teacher_name: string;
  duration_human?: string;
  duration_formatted?: string;
  thumbnail_bg?: string;
  category_tag?: string;
}

export default function LecturesPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const supabase = React.useMemo(() => createClient(), []);

  const [lectures, setLectures] = React.useState<LectureItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedSubject, setSelectedSubject] = React.useState("ALL");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const [hasNoEnrollments, setHasNoEnrollments] = React.useState(false);

  const fetchLectures = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setHasNoEnrollments(false);

      // Check role
      let isPrivileged = false;
      if (user) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();
        isPrivileged = prof?.role === "SUPER_ADMIN" || prof?.role === "ADMIN";
      }

      // Check student enrolled batch and course IDs
      let enrolledBatchIds: string[] = [];
      let enrolledCourseIds: string[] = [];

      if (user && !isPrivileged) {
        const { data: enrollments } = await supabase
          .from("student_enrollments")
          .select("batch_id, course_id")
          .eq("student_id", user.id)
          .eq("status", "ACTIVE");

        (enrollments || []).forEach((e) => {
          if (e.batch_id) enrolledBatchIds.push(e.batch_id);
          if (e.course_id) enrolledCourseIds.push(e.course_id);
        });

        // If student is not enrolled in any batch or course, mark empty
        if (enrolledBatchIds.length === 0 && enrolledCourseIds.length === 0) {
          setLectures([]);
          setHasNoEnrollments(true);
          return;
        }
      }

      let query = supabase
        .from("cms_lectures")
        .select(`
          id,
          title,
          subject,
          teacher_name,
          duration_human,
          duration_formatted,
          thumbnail_bg,
          category_tag,
          display_order,
          batch_id,
          cms_batches:batch_id(title)
        `)
        .eq("status", "PUBLISHED")
        .eq("is_visible", true)
        .order("display_order", { ascending: true });

      if (user && !isPrivileged && (enrolledBatchIds.length > 0 || enrolledCourseIds.length > 0)) {
        if (enrolledBatchIds.length > 0) {
          query = query.in("batch_id", enrolledBatchIds);
        }
      }

      const { data, error } = await query;

      if (error || !data) {
        setLectures([]);
        return;
      }

      setLectures(
        data.map((l: any) => ({
          id: l.id,
          title: l.title,
          subject: l.cms_batches?.title || l.subject || "Academic",
          teacher_name: l.teacher_name || "TopVeda Faculty",
          duration_human: l.duration_human,
          duration_formatted: l.duration_formatted || "45:00",
          thumbnail_bg: l.thumbnail_bg || "from-[#0F2042] via-[#162D59] to-[#0A162B]",
          category_tag: l.category_tag,
        }))
      );
    } catch (err) {
      console.error("Failed to fetch lectures:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user, supabase]);

  React.useEffect(() => {
    if (!isAuthLoading) {
      fetchLectures();
    }
  }, [isAuthLoading, fetchLectures]);

  const subjects = React.useMemo(() => {
    const list = Array.from(new Set(lectures.map((l) => l.subject).filter(Boolean)));
    return ["ALL", ...list];
  }, [lectures]);

  const filteredLectures = React.useMemo(() => {
    return lectures.filter((lec) => {
      const matchSearch =
        searchQuery.trim() === "" ||
        lec.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lec.teacher_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchSubject =
        selectedSubject === "ALL" || lec.subject === selectedSubject;
      return matchSearch && matchSubject;
    });
  }, [lectures, searchQuery, selectedSubject]);

  return (
    <div className="min-h-screen bg-[#FDFDFC] text-brand-text-primary flex flex-col font-sans antialiased">
      <StudentSidebar
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        <StudentHeader onOpenMobileMenu={() => setIsMobileMenuOpen(true)} />

        <main className="flex-1 px-4 sm:px-8 py-6 sm:py-8 max-w-6xl w-full mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-brand-orange/10 text-brand-orange">
                  <PlaySquare className="h-5 w-5" />
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-brand-charcoal tracking-tight">
                  Latest Lectures
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-brand-text-muted mt-1">
                High-definition recorded video sessions, problem drills, and revision lectures.
              </p>
            </div>

            {/* Search Box */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-brand-text-muted" />
              <input
                type="text"
                placeholder="Search lectures..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-9 pr-4 bg-white border border-brand-border rounded-xl text-xs outline-none focus:border-brand-orange"
              />
            </div>
          </div>

          {/* Subject Filter Pills */}
          {subjects.length > 2 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              {subjects.map((subj) => (
                <button
                  key={subj}
                  onClick={() => setSelectedSubject(subj)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 border",
                    selectedSubject === subj
                      ? "bg-brand-charcoal text-white border-brand-charcoal shadow-xs"
                      : "bg-white text-brand-text-muted hover:text-brand-charcoal border-brand-border/70"
                  )}
                >
                  {subj === "ALL" ? "All Subjects" : subj}
                </button>
              ))}
            </div>
          )}

          {/* Lectures Grid */}
          {isLoading ? (
            <div className="p-16 text-center flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-brand-orange" />
              <p className="text-xs font-semibold text-brand-text-muted">Loading recorded lectures...</p>
            </div>
          ) : filteredLectures.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-brand-border space-y-3">
              <BookOpen className="h-10 w-10 text-brand-text-subtle mx-auto" />
              <h2 className="text-base font-bold text-brand-charcoal">
                {hasNoEnrollments ? "No Batch Enrollments" : "No Lectures Found"}
              </h2>
              <p className="text-xs text-brand-text-muted max-w-md mx-auto">
                {hasNoEnrollments
                  ? "You are not currently enrolled in any academic batches. Explore our dedicated board preparation batches to unlock full syllabus video lectures."
                  : "Try adjusting your search query or subject filters."}
              </p>
              {hasNoEnrollments && (
                <div className="pt-2">
                  <Link
                    href="/student/batches"
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-brand-orange hover:bg-brand-orange-hover text-white text-xs font-bold shadow-xs transition-all"
                  >
                    <span>Explore Academic Batches</span>
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredLectures.map((lec) => (
                <div
                  key={lec.id}
                  className="group relative rounded-3xl border border-brand-border/80 bg-white overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
                >
                  {/* Thumbnail Banner */}
                  <div
                    className={cn(
                      "h-32 w-full bg-gradient-to-br flex items-center justify-center relative p-4",
                      lec.thumbnail_bg
                    )}
                  >
                    <PlayCircle className="h-12 w-12 text-white/80 group-hover:scale-110 transition-transform" />
                    {lec.category_tag && (
                      <span className="absolute top-3 left-3 px-2.5 py-0.5 rounded-md bg-black/40 backdrop-blur-xs text-[10px] font-extrabold text-white uppercase tracking-wider">
                        {lec.category_tag}
                      </span>
                    )}
                    <span className="absolute bottom-3 right-3 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-[10px] font-bold text-white flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {lec.duration_formatted}
                    </span>
                  </div>

                  {/* Body */}
                  <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-brand-orange uppercase">
                        {lec.subject}
                      </span>
                      <h3 className="text-sm font-bold text-brand-charcoal group-hover:text-brand-orange transition-colors line-clamp-2 mt-0.5">
                        {lec.title}
                      </h3>
                      <p className="text-xs text-brand-text-muted flex items-center gap-1.5 mt-2">
                        <User className="h-3 w-3 text-brand-orange" />
                        {lec.teacher_name}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-gray-100 flex items-center justify-end">
                      <Link
                        href={`/student/lectures/${lec.id}`}
                        className="px-4 py-1.5 rounded-xl bg-brand-orange text-white text-xs font-bold shadow-2xs hover:bg-brand-orange-hover transition-colors"
                      >
                        Watch Lecture
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      <FloatingChatbot />
    </div>
  );
}
