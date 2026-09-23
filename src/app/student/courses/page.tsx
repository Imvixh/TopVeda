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
  Compass,
  GraduationCap,
  Sparkles,
  CheckCircle2,
  Loader2,
  ArrowRight,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CourseCatalogItem {
  id: string;
  title: string;
  category: string;
  short_description?: string;
  board_name?: string;
  subject_name?: string;
  access_tier: string;
  is_enrolled?: boolean;
}

export default function CoursesPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const supabase = React.useMemo(() => createClient(), []);

  const [courses, setCourses] = React.useState<CourseCatalogItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [selectedCategory, setSelectedCategory] = React.useState<string>("ALL");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const fetchCourses = React.useCallback(async () => {
    try {
      setIsLoading(true);

      const { data: coursesData, error } = await supabase
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
        .eq("status", "PUBLISHED")
        .eq("is_visible", true)
        .order("display_order", { ascending: true });

      if (error || !coursesData) {
        setCourses([]);
        return;
      }

      // Check student enrolled courses
      const enrolledCourseIds = new Set<string>();
      if (user) {
        const { data: enrollments } = await supabase
          .from("student_enrollments")
          .select("course_id")
          .eq("student_id", user.id)
          .eq("status", "ACTIVE");

        (enrollments || []).forEach((e) => enrolledCourseIds.add(e.course_id));
      }

      setCourses(
        coursesData.map((c: any) => ({
          id: c.id,
          title: c.title,
          category: c.category || "Board Curriculum",
          short_description: c.short_description,
          board_name: c.board?.name,
          subject_name: c.subject?.name,
          access_tier: c.access_tier || "FREE",
          is_enrolled: enrolledCourseIds.has(c.id),
        }))
      );
    } catch (err) {
      console.error("Failed to fetch courses:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user, supabase]);

  React.useEffect(() => {
    if (!isAuthLoading) {
      fetchCourses();
    }
  }, [isAuthLoading, fetchCourses]);

  const categories = React.useMemo(() => {
    const list = Array.from(new Set(courses.map((c) => c.category).filter(Boolean)));
    return ["ALL", ...list];
  }, [courses]);

  const filteredCourses = React.useMemo(() => {
    if (selectedCategory === "ALL") return courses;
    return courses.filter((c) => c.category === selectedCategory);
  }, [courses, selectedCategory]);

  return (
    <div className="min-h-screen bg-[#FDFDFC] text-brand-text-primary flex flex-col font-sans antialiased">
      <StudentSidebar
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        <StudentHeader onOpenMobileMenu={() => setIsMobileMenuOpen(true)} />

        <main className="flex-1 px-4 sm:px-8 py-6 sm:py-8 max-w-6xl w-full mx-auto space-y-6">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-brand-orange/10 text-brand-orange">
                <Compass className="h-5 w-5" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-brand-charcoal tracking-tight">
                Explore Courses
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-brand-text-muted mt-1">
              Curated syllabus tracks covering Class 10 & 12 Board examinations.
            </p>
          </div>

          {/* Categories */}
          {categories.length > 2 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 border",
                    selectedCategory === cat
                      ? "bg-brand-charcoal text-white border-brand-charcoal shadow-xs"
                      : "bg-white text-brand-text-muted hover:text-brand-charcoal border-brand-border/70"
                  )}
                >
                  {cat === "ALL" ? "All Courses" : cat}
                </button>
              ))}
            </div>
          )}

          {/* Course Grid */}
          {isLoading ? (
            <div className="p-16 text-center flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-brand-orange" />
              <p className="text-xs font-semibold text-brand-text-muted">Loading courses catalog...</p>
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-brand-border space-y-3">
              <BookOpen className="h-10 w-10 text-brand-text-subtle mx-auto" />
              <h2 className="text-base font-bold text-brand-charcoal">No Courses Listed</h2>
              <p className="text-xs text-brand-text-muted">
                Courses are being prepared by the academic team. Please check back soon.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredCourses.map((course) => (
                <div
                  key={course.id}
                  className="group relative rounded-3xl border border-brand-border/80 bg-white p-6 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-brand-orange text-xs font-bold">
                        <Sparkles className="h-3.5 w-3.5" />
                        {course.board_name || "Board Course"}
                      </span>
                      {course.is_enrolled && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Enrolled
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-brand-charcoal group-hover:text-brand-orange transition-colors">
                        {course.title}
                      </h3>
                      {course.short_description && (
                        <p className="text-xs text-brand-text-muted mt-1 line-clamp-2">
                          {course.short_description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-xs font-semibold text-brand-text-muted">
                      {course.subject_name || course.category}
                    </span>
                    <Link
                      href={`/student/courses/${course.id}`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-brand-orange group-hover:underline"
                    >
                      <span>View Course</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
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
