"use client";

import * as React from "react";
import Link from "next/link";
import {
  Trophy,
  Medal,
  Award,
  Crown,
  Sparkles,
  ClipboardCheck,
  Video,
  Clock,
  Search,
  Filter,
  Eye,
  EyeOff,
  ChevronDown,
  User,
  Mail,
  Phone,
  CheckCircle2,
  X,
  ExternalLink,
  ShieldCheck,
  Loader2,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface LeaderboardEntry {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  avatarUrl: string | null;
  testsAttempted: number;
  averageScore: number;
  passedCount: number;
  lecturesCompleted: number;
  watchMinutes: number;
  points: number;
  rank: number;
}

interface BatchOption {
  id: string;
  title: string;
  boardLabel: string;
}

export default function AdminLeaderboardPage() {
  const [selectedBatchId, setSelectedBatchId] = React.useState<string>("ALL");
  const [batches, setBatches] = React.useState<BatchOption[]>([]);
  const [leaderboard, setLeaderboard] = React.useState<LeaderboardEntry[]>([]);
  const [top3, setTop3] = React.useState<LeaderboardEntry[]>([]);
  const [isEnabled, setIsEnabled] = React.useState<boolean>(true);
  const [isToggling, setIsToggling] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");

  // Inspect student modal state
  const [inspectStudent, setInspectStudent] = React.useState<LeaderboardEntry | null>(null);
  const [notificationSent, setNotificationSent] = React.useState(false);

  const fetchLeaderboard = React.useCallback(async (batchId: string) => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/student/leaderboard?batchId=${batchId}`);
      if (res.ok) {
        const data = await res.json();
        setIsEnabled(data.isEnabled !== false);
        setBatches(data.batches || []);
        setTop3(data.top3 || []);
        setLeaderboard(data.leaderboard || []);
      }
    } catch (err) {
      console.error("Failed to load admin leaderboard:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchLeaderboard(selectedBatchId);
  }, [selectedBatchId, fetchLeaderboard]);

  // Handle ON / OFF Toggle Switch
  const handleToggleLeaderboard = async () => {
    const nextState = !isEnabled;
    try {
      setIsToggling(true);
      const res = await fetch("/api/admin/leaderboard/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: nextState }),
      });

      if (res.ok) {
        const data = await res.json();
        setIsEnabled(data.isEnabled);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to update leaderboard toggle state.");
      }
    } catch (err) {
      console.error("Toggle error:", err);
    } finally {
      setIsToggling(false);
    }
  };

  const filteredList = React.useMemo(() => {
    if (!searchQuery.trim()) return leaderboard;
    const q = searchQuery.toLowerCase();
    return leaderboard.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        (s.phone && s.phone.includes(q))
    );
  }, [leaderboard, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 border border-amber-300 text-amber-600 flex items-center justify-center">
              <Trophy className="h-4 w-4" />
            </div>
            <h1 className="text-xl font-extrabold text-brand-text-primary tracking-tight">
              Student Leaderboard Governance
            </h1>
          </div>
          <p className="text-xs text-brand-text-muted mt-1">
            Real-time cohort performance, verified test scores, student points tracking, and public visibility toggle.
          </p>
        </div>

        <Link href="/student/leaderboard" target="_blank" rel="noopener noreferrer">
          <Button variant="outline" size="sm" className="text-xs">
            <span>Preview Student View</span>
            <ExternalLink className="h-3.5 w-3.5 ml-1" />
          </Button>
        </Link>
      </div>

      {/* SUPER ADMIN ON / OFF TOGGLE CARD */}
      <Card className="p-5 sm:p-6 border-2 border-brand-orange-border/70 bg-gradient-to-r from-orange-50/60 via-amber-50/40 to-white shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-charcoal">
                Student Leaderboard Visibility
              </span>
              <span
                className={cn(
                  "px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border",
                  isEnabled
                    ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                    : "bg-amber-100 text-amber-800 border-amber-300"
                )}
              >
                {isEnabled ? "ACTIVE (Visible to Students)" : "PAUSED (Hidden from Students)"}
              </span>
            </div>
            <p className="text-xs text-brand-text-muted max-w-xl leading-relaxed">
              Use this switch to instantly turn the leaderboard ON or OFF for all students. When turned OFF, students will see a polite pause notification and rankings will be hidden.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleToggleLeaderboard}
              disabled={isToggling}
              className={cn(
                "relative inline-flex h-8 w-16 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-orange focus:ring-offset-2 disabled:opacity-50",
                isEnabled ? "bg-emerald-600" : "bg-gray-300"
              )}
              role="switch"
              aria-checked={isEnabled}
              title={isEnabled ? "Click to turn OFF leaderboard" : "Click to turn ON leaderboard"}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out",
                  isEnabled ? "translate-x-8" : "translate-x-0"
                )}
              />
            </button>

            <span className="text-xs font-black text-brand-charcoal">
              {isEnabled ? "ON" : "OFF"}
            </span>
          </div>
        </div>
      </Card>

      {/* FILTER & STATS TOOLBAR */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-brand-border/80 shadow-2xs">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-text-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Search student by name, email or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-brand-border/80 focus:border-brand-orange focus:outline-none bg-brand-bg-warm/40"
          />
        </div>

        {/* Batch Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-brand-text-muted whitespace-nowrap">
            Filter Batch:
          </span>
          <select
            value={selectedBatchId}
            onChange={(e) => setSelectedBatchId(e.target.value)}
            className="bg-white border border-brand-border/90 px-3 py-1.5 rounded-xl text-xs font-bold text-brand-charcoal shadow-2xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
          >
            <option value="ALL">All Enrolled Batches</option>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* LEADERBOARD TABLE */}
      <Card className="p-0 border border-brand-border/80 overflow-hidden shadow-2xs">
        {isLoading ? (
          <div className="p-16 text-center flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-brand-orange" />
            <p className="text-xs font-semibold text-brand-text-muted">Computing cohort rankings...</p>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="p-12 text-center text-xs text-brand-text-muted">
            No students found matching your criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-brand-bg-warm/60 border-b border-brand-border/70 text-[11px] font-black uppercase text-brand-charcoal tracking-wider">
                  <th className="py-3.5 px-4 w-16 text-center">Rank</th>
                  <th className="py-3.5 px-4">Student Profile</th>
                  <th className="py-3.5 px-4 text-center">Tests Taken</th>
                  <th className="py-3.5 px-4 text-center">Avg Score</th>
                  <th className="py-3.5 px-4 text-center">Lectures Watched</th>
                  <th className="py-3.5 px-4 text-right">Total Points</th>
                  <th className="py-3.5 px-4 text-center w-28">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredList.map((st) => {
                  const isGold = st.rank === 1;
                  const isSilver = st.rank === 2;
                  const isBronze = st.rank === 3;

                  return (
                    <tr
                      key={st.id}
                      className="hover:bg-orange-50/40 transition-colors group cursor-pointer"
                      onClick={() => setInspectStudent(st)}
                    >
                      {/* Rank Column */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={cn(
                            "inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-black shadow-2xs",
                            isGold
                              ? "bg-amber-400 text-white ring-2 ring-amber-200"
                              : isSilver
                              ? "bg-slate-300 text-slate-800"
                              : isBronze
                              ? "bg-amber-700 text-white"
                              : "bg-gray-100 text-brand-charcoal"
                          )}
                        >
                          {st.rank}
                        </span>
                      </td>

                      {/* Student Profile */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-full overflow-hidden border border-brand-border bg-brand-bg-peach flex items-center justify-center shrink-0">
                            {st.avatarUrl ? (
                              <img src={st.avatarUrl} alt={st.fullName} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-xs font-black text-brand-orange">{st.fullName.charAt(0)}</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-brand-charcoal truncate group-hover:text-brand-orange transition-colors">
                              {st.fullName}
                            </p>
                            <p className="text-[11px] text-brand-text-muted truncate">
                              {st.email} {st.phone ? `• ${st.phone}` : ""}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Tests Taken */}
                      <td className="py-3 px-4 text-center">
                        <span className="font-semibold text-brand-charcoal">
                          {st.testsAttempted}
                        </span>
                        <span className="text-[10px] text-emerald-700 block font-medium">
                          {st.passedCount} Passed
                        </span>
                      </td>

                      {/* Avg Score */}
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full font-bold text-xs bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {st.averageScore}%
                        </span>
                      </td>

                      {/* Lectures Watched */}
                      <td className="py-3 px-4 text-center">
                        <span className="font-semibold text-brand-charcoal">
                          {st.lecturesCompleted} Completed
                        </span>
                        <span className="text-[10px] text-brand-text-muted block">
                          {st.watchMinutes} min total
                        </span>
                      </td>

                      {/* Total Points */}
                      <td className="py-3 px-4 text-right">
                        <span className="text-xs font-black text-brand-orange bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-full">
                          {st.points} pts
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setInspectStudent(st)}
                          className="text-[11px] h-7 px-2.5"
                        >
                          Inspect
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* INSPECT STUDENT MODAL */}
      {inspectStudent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in-50 duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 border border-brand-border shadow-2xl relative">
            <button
              onClick={() => {
                setInspectStudent(null);
                setNotificationSent(false);
              }}
              className="absolute right-5 top-5 p-2 rounded-full text-brand-text-muted hover:text-brand-charcoal hover:bg-gray-100 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-brand-orange bg-brand-bg-peach flex items-center justify-center shrink-0 shadow-md">
                {inspectStudent.avatarUrl ? (
                  <img src={inspectStudent.avatarUrl} alt={inspectStudent.fullName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xl font-black text-brand-orange">{inspectStudent.fullName.charAt(0)}</span>
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-800">
                    Rank #{inspectStudent.rank}
                  </span>
                  <span className="text-xs font-extrabold text-brand-orange">
                    {inspectStudent.points} Points
                  </span>
                </div>
                <h3 className="text-lg font-black text-brand-charcoal truncate mt-0.5">
                  {inspectStudent.fullName}
                </h3>
                <p className="text-xs text-brand-text-muted truncate">{inspectStudent.email}</p>
              </div>
            </div>

            {/* Contact Details */}
            <div className="p-3.5 rounded-2xl bg-brand-bg-warm/60 border border-brand-border/80 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-brand-text-muted flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  Email:
                </span>
                <span className="font-bold text-brand-charcoal">{inspectStudent.email}</span>
              </div>
              {inspectStudent.phone && (
                <div className="flex items-center justify-between">
                  <span className="text-brand-text-muted flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" />
                    Phone:
                  </span>
                  <span className="font-bold text-brand-charcoal">{inspectStudent.phone}</span>
                </div>
              )}
            </div>

            {/* Detailed Performance Metrics */}
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3 rounded-2xl bg-orange-50/60 border border-orange-100">
                <span className="text-[10px] font-bold uppercase text-brand-text-muted block">Tests Attempted</span>
                <span className="text-base font-black text-brand-charcoal">{inspectStudent.testsAttempted} Tests</span>
                <span className="text-[10px] text-emerald-700 block font-semibold">{inspectStudent.passedCount} Passed</span>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-100">
                <span className="text-[10px] font-bold uppercase text-brand-text-muted block">Average Score</span>
                <span className="text-base font-black text-emerald-800">{inspectStudent.averageScore}%</span>
                <span className="text-[10px] text-brand-text-muted block">Overall Accuracy</span>
              </div>

              <div className="p-3 rounded-2xl bg-sky-50/60 border border-sky-100">
                <span className="text-[10px] font-bold uppercase text-brand-text-muted block">Lectures Completed</span>
                <span className="text-base font-black text-sky-800">{inspectStudent.lecturesCompleted}</span>
                <span className="text-[10px] text-brand-text-muted block">Modules finished</span>
              </div>

              <div className="p-3 rounded-2xl bg-purple-50/60 border border-purple-100">
                <span className="text-[10px] font-bold uppercase text-brand-text-muted block">Watch Duration</span>
                <span className="text-base font-black text-purple-800">{inspectStudent.watchMinutes}m</span>
                <span className="text-[10px] text-brand-text-muted block">Active learning time</span>
              </div>
            </div>

            {/* Super Admin Quick Actions */}
            <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
              <Button
                variant="primary"
                size="sm"
                className="flex-1 text-xs"
                onClick={() => {
                  setNotificationSent(true);
                  setTimeout(() => setNotificationSent(false), 3000);
                }}
              >
                {notificationSent ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-1 text-white" />
                    <span>Appreciation Sent!</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-1" />
                    <span>Send Appreciation / Award</span>
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => {
                  navigator.clipboard.writeText(`${inspectStudent.fullName} (${inspectStudent.email}${inspectStudent.phone ? `, ${inspectStudent.phone}` : ""})`);
                  alert("Copied student contact details to clipboard!");
                }}
              >
                Copy Info
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
