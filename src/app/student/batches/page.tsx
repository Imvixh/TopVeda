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
  BookOpen,
  Sparkles,
  Users,
  CheckCircle2,
  Loader2,
  ArrowRight,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BatchItem {
  id: string;
  title: string;
  subtitle?: string;
  board_label: string;
  badge_text?: string;
  badge_variant?: string;
  educator_name: string;
  bg_gradient?: string;
  border_color?: string;
  is_enrolled?: boolean;
}

export default function BatchesPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const supabase = React.useMemo(() => createClient(), []);

  const [batches, setBatches] = React.useState<BatchItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [selectedBoard, setSelectedBoard] = React.useState<string>("ALL");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const fetchBatches = React.useCallback(async () => {
    try {
      setIsLoading(true);

      const { data: batchesData, error } = await supabase
        .from("cms_batches")
        .select(`
          id,
          title,
          subtitle,
          board_label,
          badge_text,
          badge_variant,
          educator_name,
          bg_gradient,
          border_color,
          display_order
        `)
        .eq("status", "PUBLISHED")
        .eq("is_visible", true)
        .order("display_order", { ascending: true });

      if (error || !batchesData) {
        setBatches([]);
        return;
      }

      // Check student enrolled batch IDs
      const enrolledBatchIds = new Set<string>();
      if (user) {
        const { data: enrollments } = await supabase
          .from("student_enrollments")
          .select("batch_id")
          .eq("student_id", user.id)
          .eq("status", "ACTIVE");

        (enrollments || []).forEach((e) => {
          if (e.batch_id) enrolledBatchIds.add(e.batch_id);
        });
      }

      setBatches(
        batchesData.map((b) => ({
          id: b.id,
          title: b.title,
          subtitle: b.subtitle,
          board_label: b.board_label,
          badge_text: b.badge_text,
          badge_variant: b.badge_variant,
          educator_name: b.educator_name,
          bg_gradient: b.bg_gradient,
          border_color: b.border_color,
          is_enrolled: enrolledBatchIds.has(b.id),
        }))
      );
    } catch (err) {
      console.error("Failed to fetch batches:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user, supabase]);

  React.useEffect(() => {
    if (!isAuthLoading) {
      fetchBatches();
    }
  }, [isAuthLoading, fetchBatches]);

  const boardsList = React.useMemo(() => {
    const list = Array.from(new Set(batches.map((b) => b.board_label).filter(Boolean)));
    return ["ALL", ...list];
  }, [batches]);

  const filteredBatches = React.useMemo(() => {
    if (selectedBoard === "ALL") return batches;
    return batches.filter((b) => b.board_label === selectedBoard);
  }, [batches, selectedBoard]);

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
                  <BookOpen className="h-5 w-5" />
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-brand-charcoal tracking-tight">
                  Academic Batches
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-brand-text-muted mt-1">
                Explore dedicated board preparation batches led by expert TopVeda educators.
              </p>
            </div>
          </div>

          {/* Board Filters */}
          {boardsList.length > 2 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              {boardsList.map((board) => (
                <button
                  key={board}
                  onClick={() => setSelectedBoard(board)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 border",
                    selectedBoard === board
                      ? "bg-brand-charcoal text-white border-brand-charcoal shadow-xs"
                      : "bg-white text-brand-text-muted hover:text-brand-charcoal border-brand-border/70"
                  )}
                >
                  {board === "ALL" ? "All Batches" : board}
                </button>
              ))}
            </div>
          )}

          {/* Batches Grid */}
          {isLoading ? (
            <div className="p-16 text-center flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-brand-orange" />
              <p className="text-xs font-semibold text-brand-text-muted">Loading academic batches...</p>
            </div>
          ) : filteredBatches.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-brand-border space-y-3">
              <BookOpen className="h-10 w-10 text-brand-text-subtle mx-auto" />
              <h2 className="text-base font-bold text-brand-charcoal">No Batches Available</h2>
              <p className="text-xs text-brand-text-muted">
                New batches are regularly added for upcoming board terms. Check back soon.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredBatches.map((b) => (
                <div
                  key={b.id}
                  className="group relative rounded-3xl border border-brand-border/80 bg-white p-6 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-brand-orange text-xs font-bold">
                        <Sparkles className="h-3.5 w-3.5" />
                        {b.board_label}
                      </span>
                      {b.is_enrolled && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Enrolled
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-brand-charcoal group-hover:text-brand-orange transition-colors">
                        {b.title}
                      </h3>
                      {b.subtitle && (
                        <p className="text-xs text-brand-text-muted mt-0.5">{b.subtitle}</p>
                      )}
                    </div>

                    <p className="text-xs text-brand-text-muted flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-brand-orange" />
                      {b.educator_name}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                    <Link
                      href={`/student/batches/${b.id}`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-brand-orange group-hover:underline"
                    >
                      <span>Explore Batch</span>
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
