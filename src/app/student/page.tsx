"use client";

import * as React from "react";
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { getStudentHomeData, StudentHomeAggregatedData } from "@/lib/services/student-home.service";
import { StudentSidebar } from "@/components/student/student-sidebar";
import { StudentHeader } from "@/components/student/student-header";
import { StudentHeroBanner } from "@/components/student/student-hero-banner";
import { FeaturedBatchesSection } from "@/components/student/featured-batches-section";
import { OngoingBatchesSection } from "@/components/student/ongoing-batches-section";
import { LiveClassesSection } from "@/components/student/live-classes-section";
import { LatestLecturesSection } from "@/components/student/latest-lectures-section";
import { ExploreCoursesSection } from "@/components/student/explore-courses-section";
import { StudentPortalHub } from "@/components/student/student-portal-hub";
import { FloatingChatbot } from "@/components/student/floating-chatbot";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function StudentHomePage() {
  const { profile, isLoading } = useAuth();
  const supabase = React.useMemo(() => createClient(), []);
  const [homeData, setHomeData] = React.useState<StudentHomeAggregatedData | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  // Default to expanded on Home page as per specifications
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  // Dynamic greeting based on time of day
  const greetingTime = React.useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  }, []);

  const studentFirstName = profile?.fullName
    ? profile.fullName.trim().split(" ")[0]
    : "Abhay";

  // Fetch live CMS data from Supabase
  React.useEffect(() => {
    let isMounted = true;
    getStudentHomeData(supabase).then((data) => {
      if (isMounted) {
        setHomeData(data);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [supabase]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-bg-warm flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-brand-orange" />
          <p className="text-xs font-semibold text-brand-text-muted">Loading TopVeda Student Portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFDFC] text-brand-text-primary flex flex-col font-sans antialiased">
      {/* Sidebar Navigation */}
      <StudentSidebar
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed((prev) => !prev)}
        dailyQuote={homeData?.dailyQuote}
      />

      {/* Main Canvas Area */}
      <div
        className={cn(
          "flex-1 flex flex-col min-w-0 transition-all duration-300",
          isCollapsed ? "lg:pl-20" : "lg:pl-64"
        )}
      >
        {/* Top Header */}
        <StudentHeader
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onToggleSidebar={() => setIsCollapsed((prev) => !prev)}
          isSidebarCollapsed={isCollapsed}
        />

        {/* Page Content Canvas */}
        <main className="flex-1 px-4 sm:px-8 py-6 sm:py-8 max-w-[1440px] w-full mx-auto space-y-7 sm:space-y-8">
          {/* Welcome Area */}
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-black text-brand-charcoal tracking-tight flex items-center gap-2">
              <span>{greetingTime}, {studentFirstName}!</span>
              <span className="text-xl animate-bounce">👋</span>
            </h1>
            <p className="text-xs sm:text-sm font-medium text-brand-text-muted">
              Ready to continue your learning journey?
            </p>
          </div>

          {/* Hero Banner Carousel */}
          <StudentHeroBanner slides={homeData ? homeData.heroSlides : undefined} />

          {/* Section 1: New & Featured Batches */}
          <FeaturedBatchesSection batches={homeData ? homeData.featuredBatches : undefined} />

          {/* Section 2: Ongoing Batches */}
          <OngoingBatchesSection batches={homeData ? homeData.ongoingBatches : undefined} />

          {/* Section 3: Live Classes (Today) */}
          <LiveClassesSection liveClasses={homeData ? homeData.liveClassesToday : undefined} />

          {/* Section 4: Latest Lectures (Redesigned with larger cards & prominent thumbnails) */}
          <LatestLecturesSection lectures={homeData ? homeData.latestLectures : undefined} />

          {/* Section 5: Explore Courses */}
          <ExploreCoursesSection courses={homeData ? homeData.exploreCourses : undefined} />

          {/* Section 6: What's Happening on TopVeda? (Student Portal Quick Hub) */}
          <StudentPortalHub items={homeData ? homeData.whatsHappening : undefined} />
        </main>
      </div>

      {/* Floating AI Chatbot Assistant Button (Fixed to Viewport) */}
      <FloatingChatbot config={homeData ? homeData.chatbotConfig : undefined} />
    </div>
  );
}
