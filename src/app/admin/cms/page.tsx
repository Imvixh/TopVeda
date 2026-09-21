"use client";

import * as React from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import {
  GraduationCap,
  Layers,
  Video,
  FileText,
  Radio,
  FileCheck2,
  CheckCircle2,
  FileEdit,
  ArrowRight,
  RefreshCw,
  Landmark,
  Megaphone,
  Bot,
  Clock,
} from "lucide-react";

interface CmsDashboardMetrics {
  totalCourses: number;
  totalBatches: number;
  totalLectures: number;
  totalMaterials: number;
  upcomingLiveClasses: number;
  pendingReviews: number;
  publishedContent: number;
  draftContent: number;
}

interface RecentCmsItem {
  id: string;
  title: string;
  type: string;
  status: string;
  updatedAt: string;
  authorName?: string;
}

export default function SuperAdminCmsDashboardPage() {
  const supabase = React.useMemo(() => createClient(), []);

  const [metrics, setMetrics] = React.useState<CmsDashboardMetrics>({
    totalCourses: 0,
    totalBatches: 0,
    totalLectures: 0,
    totalMaterials: 0,
    upcomingLiveClasses: 0,
    pendingReviews: 0,
    publishedContent: 0,
    draftContent: 0,
  });

  const [recentItems, setRecentItems] = React.useState<RecentCmsItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [refreshTrigger, setRefreshTrigger] = React.useState(0);

  const handleManualRefresh = () => {
    setIsLoading(true);
    setRefreshTrigger((prev) => prev + 1);
  };

  React.useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        // 1. Parallel Count Queries across CMS tables
        const [
          coursesRes,
          batchesRes,
          lecturesRes,
          materialsRes,
          liveClassesRes,
          pendingReviewsRes,
          publishedLecturesRes,
          publishedBatchesRes,
          publishedCoursesRes,
          draftLecturesRes,
          draftMaterialsRes,
        ] = await Promise.allSettled([
          supabase.from("cms_courses").select("*", { count: "exact", head: true }),
          supabase.from("cms_batches").select("*", { count: "exact", head: true }),
          supabase.from("cms_lectures").select("*", { count: "exact", head: true }),
          supabase.from("cms_study_materials").select("*", { count: "exact", head: true }),
          supabase.from("cms_live_classes").select("*", { count: "exact", head: true }).eq("status", "PUBLISHED"),
          supabase.from("cms_pending_reviews_view").select("*", { count: "exact", head: true }),
          supabase.from("cms_lectures").select("*", { count: "exact", head: true }).eq("status", "PUBLISHED"),
          supabase.from("cms_batches").select("*", { count: "exact", head: true }).eq("status", "PUBLISHED"),
          supabase.from("cms_courses").select("*", { count: "exact", head: true }).eq("status", "PUBLISHED"),
          supabase.from("cms_lectures").select("*", { count: "exact", head: true }).eq("status", "DRAFT"),
          supabase.from("cms_study_materials").select("*", { count: "exact", head: true }).eq("status", "DRAFT"),
        ]);

        if (!isMounted) return;

        const totalCourses = coursesRes.status === "fulfilled" ? coursesRes.value.count ?? 0 : 0;
        const totalBatches = batchesRes.status === "fulfilled" ? batchesRes.value.count ?? 0 : 0;
        const totalLectures = lecturesRes.status === "fulfilled" ? lecturesRes.value.count ?? 0 : 0;
        const totalMaterials = materialsRes.status === "fulfilled" ? materialsRes.value.count ?? 0 : 0;
        const upcomingLiveClasses = liveClassesRes.status === "fulfilled" ? liveClassesRes.value.count ?? 0 : 0;
        const pendingReviews = pendingReviewsRes.status === "fulfilled" ? pendingReviewsRes.value.count ?? 0 : 0;

        const pubCount =
          (publishedLecturesRes.status === "fulfilled" ? publishedLecturesRes.value.count ?? 0 : 0) +
          (publishedBatchesRes.status === "fulfilled" ? publishedBatchesRes.value.count ?? 0 : 0) +
          (publishedCoursesRes.status === "fulfilled" ? publishedCoursesRes.value.count ?? 0 : 0);

        const draftCount =
          (draftLecturesRes.status === "fulfilled" ? draftLecturesRes.value.count ?? 0 : 0) +
          (draftMaterialsRes.status === "fulfilled" ? draftMaterialsRes.value.count ?? 0 : 0);

        setMetrics({
          totalCourses,
          totalBatches,
          totalLectures,
          totalMaterials,
          upcomingLiveClasses,
          pendingReviews,
          publishedContent: pubCount,
          draftContent: draftCount,
        });

        // 2. Fetch Recent Pending Review Submissions or Recent Items
        const { data: reviewData } = await supabase
          .from("cms_pending_reviews_view")
          .select("entity_id, title, entity_type, status, submitted_at, author_name")
          .limit(5);

        if (!isMounted) return;

        if (reviewData && reviewData.length > 0) {
          setRecentItems(
            reviewData.map((r) => ({
              id: r.entity_id,
              title: r.title,
              type: r.entity_type,
              status: r.status,
              updatedAt: r.submitted_at,
              authorName: r.author_name,
            }))
          );
        } else {
          // If no pending reviews, fetch recent courses/batches to show active content
          const { data: recentCourses } = await supabase
            .from("cms_courses")
            .select("id, title, status, updated_at")
            .order("updated_at", { ascending: false })
            .limit(5);

          if (!isMounted) return;

          if (recentCourses && recentCourses.length > 0) {
            setRecentItems(
              recentCourses.map((c) => ({
                id: c.id,
                title: c.title,
                type: "COURSE",
                status: c.status,
                updatedAt: c.updated_at,
              }))
            );
          } else {
            setRecentItems([]);
          }
        }
      } catch {
        // Fallback gracefully on query error
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      isMounted = false;
    };
  }, [supabase, refreshTrigger]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-brand-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="peach" size="sm" className="font-bold tracking-wider text-[10px] uppercase">
              Super Admin Suite
            </Badge>
            <Badge variant="outline" size="sm" className="text-[10px] font-semibold text-emerald-600 border-emerald-200 bg-emerald-50">
              Live DB Synced
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-text-primary tracking-tight">
            Content Management System
          </h1>
          <p className="text-xs sm:text-sm text-brand-text-muted">
            Manage courses, curriculum taxonomy, live classes, media assets, teacher reviews, and AI Chatbot knowledge.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            disabled={isLoading}
            className="text-xs"
            title="Refresh Metrics"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? "animate-spin text-brand-orange" : ""}`} />
            Refresh
          </Button>

          <Link href="/admin/cms/reviews">
            <Button variant="primary" size="sm" className="text-xs shadow-2xs">
              <FileCheck2 className="h-4 w-4 mr-1.5" />
              Review Queue
              {metrics.pendingReviews > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 bg-white text-brand-orange rounded-full text-[10px] font-extrabold">
                  {metrics.pendingReviews}
                </span>
              )}
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Pending Reviews Shortcut Banner (Prominent Card) */}
      <Card className="p-5 sm:p-6 bg-gradient-to-br from-brand-surface via-brand-bg-peach/20 to-brand-bg-peach/40 border-2 border-brand-orange-border shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-brand-orange text-white flex items-center justify-center shrink-0 shadow-md">
              <FileCheck2 className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-brand-text-primary">
                  Teacher Submissions & Review Queue
                </h2>
                {metrics.pendingReviews > 0 ? (
                  <Badge variant="peach" size="sm" className="animate-pulse text-[10px] font-bold">
                    {metrics.pendingReviews} PENDING
                  </Badge>
                ) : (
                  <Badge variant="outline" size="sm" className="text-[10px] text-emerald-700 bg-emerald-50 border-emerald-200">
                    All Caught Up
                  </Badge>
                )}
              </div>
              <p className="text-xs text-brand-text-muted mt-0.5">
                Inspect educator lecture videos, batches, and study notes awaiting Super Admin verification and publishing.
              </p>
            </div>
          </div>

          <Link href="/admin/cms/reviews">
            <Button variant="primary" size="sm" className="w-full sm:w-auto text-xs shadow-subtle">
              Open Review Queue
              <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
            </Button>
          </Link>
        </div>
      </Card>

      {/* 3. Metrics Overview Grid */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-brand-text-muted">
          Platform Content Overview
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {/* Total Courses */}
          <Card className="p-4 sm:p-5 space-y-2 hover:border-brand-orange-border/70 transition-all shadow-2xs">
            <div className="flex items-center justify-between text-brand-text-muted">
              <span className="text-xs font-semibold">Total Courses</span>
              <div className="h-8 w-8 rounded-lg bg-orange-50 text-brand-orange flex items-center justify-center">
                <GraduationCap className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-brand-text-primary">
              {metrics.totalCourses}
            </p>
            <p className="text-[11px] text-brand-text-muted">All active curriculum</p>
          </Card>

          {/* Total Batches */}
          <Card className="p-4 sm:p-5 space-y-2 hover:border-brand-orange-border/70 transition-all shadow-2xs">
            <div className="flex items-center justify-between text-brand-text-muted">
              <span className="text-xs font-semibold">Total Batches</span>
              <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Layers className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-brand-text-primary">
              {metrics.totalBatches}
            </p>
            <p className="text-[11px] text-brand-text-muted">Featured & ongoing</p>
          </Card>

          {/* Total Lectures */}
          <Card className="p-4 sm:p-5 space-y-2 hover:border-brand-orange-border/70 transition-all shadow-2xs">
            <div className="flex items-center justify-between text-brand-text-muted">
              <span className="text-xs font-semibold">Total Lectures</span>
              <div className="h-8 w-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <Video className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-brand-text-primary">
              {metrics.totalLectures}
            </p>
            <p className="text-[11px] text-brand-text-muted">Recorded video assets</p>
          </Card>

          {/* Total Study Materials */}
          <Card className="p-4 sm:p-5 space-y-2 hover:border-brand-orange-border/70 transition-all shadow-2xs">
            <div className="flex items-center justify-between text-brand-text-muted">
              <span className="text-xs font-semibold">Study Materials</span>
              <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <FileText className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-brand-text-primary">
              {metrics.totalMaterials}
            </p>
            <p className="text-[11px] text-brand-text-muted">Notes, PYQs & solutions</p>
          </Card>

          {/* Upcoming Live Classes */}
          <Card className="p-4 sm:p-5 space-y-2 hover:border-brand-orange-border/70 transition-all shadow-2xs">
            <div className="flex items-center justify-between text-brand-text-muted">
              <span className="text-xs font-semibold">Live Classes</span>
              <div className="h-8 w-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <Radio className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-brand-text-primary">
              {metrics.upcomingLiveClasses}
            </p>
            <p className="text-[11px] text-brand-text-muted">Published schedules</p>
          </Card>

          {/* Pending Reviews */}
          <Card className="p-4 sm:p-5 space-y-2 hover:border-brand-orange-border/70 transition-all shadow-2xs">
            <div className="flex items-center justify-between text-brand-text-muted">
              <span className="text-xs font-semibold">Pending Reviews</span>
              <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <FileCheck2 className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-brand-orange">
              {metrics.pendingReviews}
            </p>
            <p className="text-[11px] text-brand-text-muted">Awaiting decision</p>
          </Card>

          {/* Published Content */}
          <Card className="p-4 sm:p-5 space-y-2 hover:border-brand-orange-border/70 transition-all shadow-2xs">
            <div className="flex items-center justify-between text-brand-text-muted">
              <span className="text-xs font-semibold">Published Items</span>
              <div className="h-8 w-8 rounded-lg bg-green-50 text-green-600 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-emerald-600">
              {metrics.publishedContent}
            </p>
            <p className="text-[11px] text-brand-text-muted">Live on student portal</p>
          </Card>

          {/* Draft Content */}
          <Card className="p-4 sm:p-5 space-y-2 hover:border-brand-orange-border/70 transition-all shadow-2xs">
            <div className="flex items-center justify-between text-brand-text-muted">
              <span className="text-xs font-semibold">Draft Items</span>
              <div className="h-8 w-8 rounded-lg bg-gray-100 text-gray-700 flex items-center justify-center">
                <FileEdit className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-brand-text-primary">
              {metrics.draftContent}
            </p>
            <p className="text-[11px] text-brand-text-muted">Unpublished submissions</p>
          </Card>
        </div>
      </div>

      {/* 4. Section Quick Jump Grid */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-brand-text-muted">
          CMS Modules & Navigation
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Content Group */}
          <Card className="p-5 space-y-3 shadow-2xs hover:shadow-md transition-all">
            <div className="flex items-center gap-2 text-xs font-bold text-brand-orange uppercase">
              <Layers className="h-4 w-4" />
              <span>Content Catalog</span>
            </div>
            <p className="text-xs text-brand-text-muted leading-relaxed">
              Hero banners, courses, batches, recorded video lectures, live classes, and study materials.
            </p>
            <div className="pt-2 flex flex-wrap gap-1.5">
              <Link href="/admin/cms/courses">
                <Button variant="outline" size="sm" className="text-[11px] h-7 px-2">
                  Courses
                </Button>
              </Link>
              <Link href="/admin/cms/batches">
                <Button variant="outline" size="sm" className="text-[11px] h-7 px-2">
                  Batches
                </Button>
              </Link>
              <Link href="/admin/cms/lectures">
                <Button variant="outline" size="sm" className="text-[11px] h-7 px-2">
                  Lectures
                </Button>
              </Link>
            </div>
          </Card>

          {/* Academic Group */}
          <Card className="p-5 space-y-3 shadow-2xs hover:shadow-md transition-all">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase">
              <Landmark className="h-4 w-4" />
              <span>Academic Hierarchy</span>
            </div>
            <p className="text-xs text-brand-text-muted leading-relaxed">
              Taxonomy master records: educational boards, class levels, subject catalog, and syllabus chapters.
            </p>
            <div className="pt-2 flex flex-wrap gap-1.5">
              <Link href="/admin/cms/boards">
                <Button variant="outline" size="sm" className="text-[11px] h-7 px-2">
                  Boards
                </Button>
              </Link>
              <Link href="/admin/cms/classes">
                <Button variant="outline" size="sm" className="text-[11px] h-7 px-2">
                  Classes
                </Button>
              </Link>
              <Link href="/admin/cms/subjects">
                <Button variant="outline" size="sm" className="text-[11px] h-7 px-2">
                  Subjects
                </Button>
              </Link>
            </div>
          </Card>

          {/* Engagement Group */}
          <Card className="p-5 space-y-3 shadow-2xs hover:shadow-md transition-all">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 uppercase">
              <Megaphone className="h-4 w-4" />
              <span>Student Engagement</span>
            </div>
            <p className="text-xs text-brand-text-muted leading-relaxed">
              Portal hub announcements, exam alerts, news cards, and daily motivational quotes.
            </p>
            <div className="pt-2 flex flex-wrap gap-1.5">
              <Link href="/admin/cms/hub">
                <Button variant="outline" size="sm" className="text-[11px] h-7 px-2">
                  Hub News
                </Button>
              </Link>
              <Link href="/admin/cms/quotes">
                <Button variant="outline" size="sm" className="text-[11px] h-7 px-2">
                  Quotes
                </Button>
              </Link>
            </div>
          </Card>

          {/* Chatbot Group */}
          <Card className="p-5 space-y-3 shadow-2xs hover:shadow-md transition-all">
            <div className="flex items-center gap-2 text-xs font-bold text-purple-600 uppercase">
              <Bot className="h-4 w-4" />
              <span>AI Chatbot Studio</span>
            </div>
            <p className="text-xs text-brand-text-muted leading-relaxed">
              Bot identity, prompts starter bank, platform FAQs, and verified knowledge sources.
            </p>
            <div className="pt-2 flex flex-wrap gap-1.5">
              <Link href="/admin/cms/chatbot">
                <Button variant="outline" size="sm" className="text-[11px] h-7 px-2">
                  Settings
                </Button>
              </Link>
              <Link href="/admin/cms/chatbot/prompts">
                <Button variant="outline" size="sm" className="text-[11px] h-7 px-2">
                  Prompts
                </Button>
              </Link>
              <Link href="/admin/cms/chatbot/knowledge">
                <Button variant="outline" size="sm" className="text-[11px] h-7 px-2">
                  Knowledge
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>

      {/* 5. Recent Activity / Submissions Area */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-brand-text-muted">
            Recent CMS Activity & Submissions
          </h2>
          <Link href="/admin/cms/reviews" className="text-xs font-semibold text-brand-orange hover:underline">
            View All Reviews →
          </Link>
        </div>

        <Card className="p-0 overflow-hidden shadow-2xs">
          {recentItems.length > 0 ? (
            <div className="divide-y divide-brand-border">
              {recentItems.map((item) => (
                <div
                  key={item.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-brand-bg-warm/60 transition-colors"
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-brand-bg-warm border border-brand-border flex items-center justify-center shrink-0">
                      <Clock className="h-4 w-4 text-brand-text-muted" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-brand-text-primary">
                        {item.title}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-brand-text-muted">
                        <span className="font-semibold text-brand-orange uppercase">{item.type}</span>
                        {item.authorName && (
                          <>
                            <span>•</span>
                            <span>By {item.authorName}</span>
                          </>
                        )}
                        <span>•</span>
                        <span>{new Date(item.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <Badge
                      variant={
                        item.status === "PUBLISHED"
                          ? "success"
                          : item.status === "PENDING_REVIEW"
                          ? "peach"
                          : "neutral"
                      }
                      size="sm"
                      className="text-[10px] font-bold"
                    >
                      {item.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center space-y-2">
              <Clock className="h-8 w-8 text-brand-text-muted/60 mx-auto" />
              <p className="text-xs font-bold text-brand-text-primary">
                No recent activity recorded
              </p>
              <p className="text-xs text-brand-text-muted max-w-sm mx-auto">
                As educators and administrators create, submit, and publish content, real-time activity entries will appear here.
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
