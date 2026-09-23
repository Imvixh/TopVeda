"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import {
  SafeTestQuestion,
  TestScorecardResult,
} from "@/types/assessment.types";
import {
  Clock,
  Target,
  Award,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  HelpCircle,
  RotateCcw,
  Loader2,
  TrendingUp,
  FileCheck,
  ShieldCheck,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function TestRunnerPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const testId = params.id as string;

  // View mode: 'instruction' | 'active' | 'scorecard'
  const [viewMode, setViewMode] = React.useState<"instruction" | "active" | "scorecard">("instruction");
  const [testMeta, setTestMeta] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  // Active Runner State
  const [attemptId, setAttemptId] = React.useState<string | null>(null);
  const [questions, setQuestions] = React.useState<SafeTestQuestion[]>([]);
  const [currentQIndex, setCurrentQIndex] = React.useState(0);
  const [selectedAnswers, setSelectedAnswers] = React.useState<Record<string, string[]>>({});
  const [secondsRemaining, setSecondsRemaining] = React.useState<number>(0);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showSubmitModal, setShowSubmitModal] = React.useState(false);

  // Scorecard Result State
  const [scorecard, setScorecard] = React.useState<TestScorecardResult | null>(null);

  // 1. Fetch Test Metadata on Mount
  const loadTestMeta = React.useCallback(async () => {
    if (!testId) return;
    try {
      setIsLoading(true);
      const res = await fetch(`/api/student/tests/${testId}`);
      if (res.ok) {
        const data = await res.json();
        setTestMeta(data);
      }
    } catch (err) {
      console.error("Failed to load test metadata:", err);
    } finally {
      setIsLoading(false);
    }
  }, [testId]);

  React.useEffect(() => {
    void loadTestMeta();
  }, [loadTestMeta]);

  // 2. Start Test Attempt
  const handleStartTest = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/student/tests/${testId}/attempt`, {
        method: "POST",
      });

      if (res.ok) {
        const data = await res.json();
        setAttemptId(data.attemptId);
        setQuestions(data.questions || []);
        setCurrentQIndex(0);
        setSelectedAnswers({});
        setSecondsRemaining((data.durationMinutes || 20) * 60);
        setViewMode("active");
      } else {
        const err = await res.json();
        alert(err.error || "Failed to start test attempt.");
      }
    } catch (err) {
      console.error("Error starting test:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Countdown Timer in Active Runner
  React.useEffect(() => {
    if (viewMode !== "active" || secondsRemaining <= 0) return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          void handleSubmitTest(); // Auto-submit on time expiry
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [viewMode, secondsRemaining]);

  // 4. Option Selection Handlers
  const handleSelectOption = (questionId: string, optionId: string) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: [optionId], // Single choice selection
    }));
  };

  const handleClearSelection = (questionId: string) => {
    setSelectedAnswers((prev) => {
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
  };

  // 5. Submit Test Attempt for Server-Side Grading
  const handleSubmitTest = async () => {
    if (!attemptId || isSubmitting) return;

    try {
      setIsSubmitting(true);
      setShowSubmitModal(false);

      const answersPayload = questions.map((q) => ({
        questionId: q.id,
        selectedOptionIds: selectedAnswers[q.id] || [],
      }));

      const totalDurationSecs = (testMeta?.duration_minutes || 20) * 60;
      const timeSpentSecs = Math.max(1, totalDurationSecs - secondsRemaining);

      const res = await fetch(`/api/student/tests/${testId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId,
          timeSpentSeconds: timeSpentSecs,
          answers: answersPayload,
        }),
      });

      if (res.ok) {
        const scored: TestScorecardResult = await res.json();
        setScorecard(scored);
        setViewMode("scorecard");
      } else {
        const err = await res.json();
        alert(err.error || "Failed to evaluate test submission.");
      }
    } catch (err) {
      console.error("Submission failed:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  if (isLoading && viewMode === "instruction") {
    return (
      <div className="min-h-screen bg-[#FDFDFC] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-brand-orange" />
          <p className="text-xs font-semibold text-brand-text-muted">Loading test parameters...</p>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // STATE 1: PRE-TEST INSTRUCTIONS VIEW
  // ==========================================================================
  if (viewMode === "instruction") {
    return (
      <div className="min-h-screen bg-[#FDFDFC] text-brand-text-primary flex flex-col font-sans antialiased">
        <header className="h-14 border-b border-brand-border/70 bg-white px-4 sm:px-8 flex items-center justify-between">
          <Link href="/student/tests" className="flex items-center gap-2 text-xs font-bold text-brand-text-muted hover:text-brand-charcoal transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Tests</span>
          </Link>
          <span className="text-xs font-black text-brand-orange uppercase">TopVeda Assessment Engine</span>
        </header>

        <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-8 sm:py-12 space-y-6">
          <div className="p-6 sm:p-8 rounded-3xl bg-white border border-brand-border/80 shadow-2xs space-y-6">
            <div className="space-y-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-extrabold bg-orange-50 text-brand-orange border border-orange-200 uppercase tracking-wide">
                {testMeta?.subject_name}
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-brand-charcoal tracking-tight">
                {testMeta?.title}
              </h1>
              {testMeta?.description && (
                <p className="text-xs sm:text-sm text-brand-text-muted leading-relaxed">
                  {testMeta.description}
                </p>
              )}
            </div>

            {/* Parameter Badges Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-brand-bg-warm/60 border border-brand-border/60">
              <div className="space-y-0.5 text-center sm:text-left">
                <span className="text-[10px] font-bold text-brand-text-muted uppercase">Duration</span>
                <p className="text-sm font-black text-brand-charcoal">{testMeta?.duration_minutes} Mins</p>
              </div>
              <div className="space-y-0.5 text-center sm:text-left">
                <span className="text-[10px] font-bold text-brand-text-muted uppercase">Questions</span>
                <p className="text-sm font-black text-brand-charcoal">{testMeta?.total_questions} Items</p>
              </div>
              <div className="space-y-0.5 text-center sm:text-left">
                <span className="text-[10px] font-bold text-brand-text-muted uppercase">Total Marks</span>
                <p className="text-sm font-black text-brand-charcoal">{testMeta?.total_marks} Marks</p>
              </div>
              <div className="space-y-0.5 text-center sm:text-left">
                <span className="text-[10px] font-bold text-brand-text-muted uppercase">Passing Mark</span>
                <p className="text-sm font-black text-emerald-600">{testMeta?.passing_marks} Marks</p>
              </div>
            </div>

            {/* Test Rules */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-brand-charcoal">
                Exam Instructions & Marking Scheme
              </h3>
              <ul className="space-y-2 text-xs font-medium text-brand-text-muted leading-relaxed">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Each correct question awards <strong>+4 Marks</strong>.</span>
                </li>
                <li className="flex items-start gap-2">
                  <XCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>Incorrect answers incur <strong>-1 Negative Mark</strong>.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Clock className="h-4 w-4 text-brand-orange shrink-0 mt-0.5" />
                  <span>The test will auto-submit when the countdown timer reaches zero.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Award className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" />
                  <span>Your scorecard and progress tracker will be updated immediately upon submission.</span>
                </li>
              </ul>
            </div>

            {/* Begin Action CTA */}
            <div className="pt-4 border-t border-brand-border/40">
              <button
                onClick={handleStartTest}
                className="w-full py-3.5 rounded-2xl bg-brand-orange hover:bg-brand-orange-hover text-white text-sm font-black tracking-wide flex items-center justify-center gap-2 shadow-xs transition-colors"
              >
                <span>Begin Test Now</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ==========================================================================
  // STATE 2: ACTIVE TEST RUNNER
  // ==========================================================================
  if (viewMode === "active") {
    const currentQ = questions[currentQIndex];
    const totalQ = questions.length;
    const attemptedCount = Object.keys(selectedAnswers).length;

    return (
      <div className="min-h-screen bg-[#FDFDFC] text-brand-text-primary flex flex-col font-sans antialiased">
        {/* Runner Top Bar */}
        <header className="h-16 border-b border-brand-border/70 bg-white px-4 sm:px-8 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <span className="text-xs font-black text-brand-charcoal truncate max-w-[200px] sm:max-w-md">
              {testMeta?.title}
            </span>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            {/* Dynamic Countdown Timer */}
            <div className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-black tabular-nums flex items-center gap-1.5 border",
              secondsRemaining < 180
                ? "bg-rose-50 text-rose-600 border-rose-200 animate-pulse"
                : "bg-orange-50 text-brand-orange border-orange-200"
            )}>
              <Clock className="h-3.5 w-3.5" />
              <span>{formatTime(secondsRemaining)}</span>
            </div>

            {/* Submit Button */}
            <button
              onClick={() => setShowSubmitModal(true)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold tracking-wide transition-colors shadow-3xs"
            >
              Submit Test
            </button>
          </div>
        </header>

        {/* Runner Main Canvas */}
        <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 sm:py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left/Main Column: Question Card */}
          <div className="lg:col-span-2 space-y-6">
            <div className="p-6 sm:p-7 rounded-3xl bg-white border border-brand-border/80 shadow-2xs space-y-6">
              {/* Question Header */}
              <div className="flex items-center justify-between pb-4 border-b border-brand-border/40">
                <span className="text-xs font-black text-brand-charcoal uppercase tracking-wider">
                  Question {currentQIndex + 1} of {totalQ}
                </span>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  +{currentQ?.marks} Marks · -{currentQ?.negativeMarks} Negative
                </span>
              </div>

              {/* Question Text */}
              <div className="text-sm sm:text-base font-bold text-brand-charcoal leading-relaxed">
                {currentQ?.questionText}
              </div>

              {/* Options List */}
              <div className="space-y-3 pt-2">
                {currentQ?.options?.map((opt) => {
                  const isSelected = selectedAnswers[currentQ.id]?.includes(opt.id);

                  return (
                    <button
                      key={opt.id}
                      onClick={() => handleSelectOption(currentQ.id, opt.id)}
                      className={cn(
                        "w-full p-4 rounded-2xl border text-left flex items-center gap-3.5 transition-all text-xs sm:text-sm font-semibold",
                        isSelected
                          ? "bg-[#FFF4EE] border-brand-orange text-brand-charcoal shadow-xs ring-1 ring-brand-orange"
                          : "bg-white border-brand-border/80 text-brand-charcoal hover:bg-gray-50/80"
                      )}
                    >
                      <div className={cn(
                        "w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-xs font-black transition-colors",
                        isSelected
                          ? "bg-brand-orange text-white"
                          : "bg-gray-100 text-brand-charcoal"
                      )}>
                        {opt.optionLabel}
                      </div>
                      <span className="flex-1 leading-normal">{opt.optionText}</span>
                    </button>
                  );
                })}
              </div>

              {/* Runner Navigation Controls */}
              <div className="flex items-center justify-between pt-4 border-t border-brand-border/40">
                <button
                  onClick={() => setCurrentQIndex((prev) => Math.max(0, prev - 1))}
                  disabled={currentQIndex === 0}
                  className="px-4 py-2 rounded-xl border border-brand-border bg-white hover:bg-gray-50 text-xs font-bold text-brand-charcoal disabled:opacity-40 transition-colors flex items-center gap-1.5"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Previous</span>
                </button>

                {selectedAnswers[currentQ?.id] && (
                  <button
                    onClick={() => handleClearSelection(currentQ.id)}
                    className="text-xs font-bold text-brand-text-muted hover:text-brand-orange transition-colors"
                  >
                    Clear Selection
                  </button>
                )}

                <button
                  onClick={() => setCurrentQIndex((prev) => Math.min(totalQ - 1, prev + 1))}
                  disabled={currentQIndex === totalQ - 1}
                  className="px-4 py-2 rounded-xl bg-brand-charcoal hover:bg-black text-white text-xs font-bold disabled:opacity-40 transition-colors flex items-center gap-1.5"
                >
                  <span>Next</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Question Palette */}
          <div className="space-y-4">
            <div className="p-5 rounded-3xl bg-white border border-brand-border/80 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-brand-charcoal">
                  Question Palette
                </h3>
                <span className="text-[11px] font-bold text-brand-text-muted">
                  {attemptedCount} / {totalQ} Answered
                </span>
              </div>

              {/* Palette Grid */}
              <div className="grid grid-cols-4 gap-2">
                {questions.map((q, idx) => {
                  const isAnswered = selectedAnswers[q.id]?.length > 0;
                  const isCurrent = idx === currentQIndex;

                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentQIndex(idx)}
                      className={cn(
                        "h-10 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center",
                        isCurrent
                          ? "ring-2 ring-brand-charcoal scale-105"
                          : "",
                        isAnswered
                          ? "bg-emerald-600 text-white shadow-3xs"
                          : "bg-gray-100 text-brand-text-muted hover:bg-gray-200"
                      )}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center justify-between text-[10px] font-semibold text-brand-text-muted pt-2 border-t border-brand-border/40">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
                  Answered
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-gray-200 inline-block" />
                  Unanswered
                </span>
              </div>
            </div>
          </div>
        </main>

        {/* Submit Confirmation Modal */}
        {showSubmitModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="max-w-md w-full p-6 sm:p-7 rounded-3xl bg-white border border-brand-border shadow-2xl space-y-5">
              <div className="space-y-1.5 text-center">
                <h3 className="text-base font-black text-brand-charcoal">
                  Ready to submit your test?
                </h3>
                <p className="text-xs text-brand-text-muted">
                  You have answered <strong>{attemptedCount}</strong> out of <strong>{totalQ}</strong> questions.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-brand-bg-warm border border-brand-border text-xs space-y-1">
                <div className="flex justify-between font-medium text-brand-text-muted">
                  <span>Answered:</span>
                  <span className="font-bold text-emerald-700">{attemptedCount}</span>
                </div>
                <div className="flex justify-between font-medium text-brand-text-muted">
                  <span>Unanswered:</span>
                  <span className="font-bold text-rose-600">{totalQ - attemptedCount}</span>
                </div>
                <div className="flex justify-between font-medium text-brand-text-muted">
                  <span>Time Remaining:</span>
                  <span className="font-bold text-brand-orange">{formatTime(secondsRemaining)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => setShowSubmitModal(false)}
                  className="py-2.5 rounded-xl border border-brand-border text-xs font-bold text-brand-charcoal hover:bg-gray-50 transition-colors"
                >
                  Continue Test
                </button>
                <button
                  onClick={handleSubmitTest}
                  disabled={isSubmitting}
                  className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-colors flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <span>Confirm & Submit</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================================================
  // STATE 3: POST-SUBMISSION SCORECARD & ANALYSIS VIEW
  // ==========================================================================
  if (viewMode === "scorecard" && scorecard) {
    return (
      <div className="min-h-screen bg-[#FDFDFC] text-brand-text-primary flex flex-col font-sans antialiased">
        <header className="h-14 border-b border-brand-border/70 bg-white px-4 sm:px-8 flex items-center justify-between">
          <Link href="/student/tests" className="flex items-center gap-2 text-xs font-bold text-brand-text-muted hover:text-brand-charcoal transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span>All Tests</span>
          </Link>
          <span className="text-xs font-black text-brand-orange uppercase">Performance Scorecard</span>
        </header>

        <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8 sm:py-10 space-y-7">
          {/* Hero Score Card */}
          <div className="p-6 sm:p-8 rounded-3xl bg-white border border-brand-border/80 shadow-2xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-brand-border/40">
              <div className="space-y-1">
                <span className="px-3 py-1 rounded-full text-[10px] font-extrabold bg-orange-50 text-brand-orange border border-orange-200 uppercase tracking-wide">
                  {scorecard.subjectName}
                </span>
                <h1 className="text-xl font-black text-brand-charcoal">
                  {scorecard.testTitle}
                </h1>
              </div>

              <div className="flex items-center gap-3">
                <span className={cn(
                  "px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border shadow-3xs",
                  scorecard.passed
                    ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                    : "bg-rose-50 text-rose-700 border-rose-300"
                )}>
                  {scorecard.passed ? "PASSED" : "NEEDS PRACTICE"}
                </span>
              </div>
            </div>

            {/* Score Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-brand-bg-warm/60 border border-brand-border/60 text-center space-y-0.5">
                <span className="text-[10px] font-bold text-brand-text-muted uppercase">Score</span>
                <p className="text-2xl font-black text-brand-charcoal tabular-nums">
                  {scorecard.scoreObtained} / {scorecard.maxScore}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-brand-bg-warm/60 border border-brand-border/60 text-center space-y-0.5">
                <span className="text-[10px] font-bold text-brand-text-muted uppercase">Percentage</span>
                <p className="text-2xl font-black text-brand-orange tabular-nums">
                  {scorecard.percentage}%
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/70 text-center space-y-0.5">
                <span className="text-[10px] font-bold text-emerald-700 uppercase">Correct</span>
                <p className="text-2xl font-black text-emerald-700 tabular-nums">
                  {scorecard.correctCount}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200/70 text-center space-y-0.5">
                <span className="text-[10px] font-bold text-rose-700 uppercase">Incorrect</span>
                <p className="text-2xl font-black text-rose-700 tabular-nums">
                  {scorecard.incorrectCount}
                </p>
              </div>
            </div>

            {/* Progress Synchronization Notice */}
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>Results successfully synchronized with your <strong>Progress Tracker</strong>.</span>
              </div>
              <Link href="/student/progress" className="font-black underline text-[11px] shrink-0">
                View Tracker →
              </Link>
            </div>
          </div>

          {/* Detailed Question by Question Review */}
          <div className="space-y-4">
            <h2 className="text-base sm:text-lg font-black text-brand-charcoal tracking-tight">
              Detailed Question Analysis & Explanations
            </h2>

            <div className="space-y-4">
              {scorecard.evaluations.map((ev, idx) => (
                <div
                  key={ev.questionId}
                  className="p-5 sm:p-6 rounded-3xl bg-white border border-brand-border/80 shadow-2xs space-y-4"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-brand-border/40">
                    <span className="text-xs font-black text-brand-charcoal uppercase">
                      Question {idx + 1}
                    </span>
                    <span className={cn(
                      "px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border",
                      ev.isCorrect
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : ev.isAttempted
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : "bg-gray-100 text-brand-text-muted border-gray-200"
                    )}>
                      {ev.isCorrect ? `+${ev.marksAwarded} Marks` : ev.isAttempted ? `${ev.marksAwarded} Marks` : "Unattempted (0 Marks)"}
                    </span>
                  </div>

                  <p className="text-sm font-bold text-brand-charcoal leading-relaxed">
                    {ev.questionText}
                  </p>

                  {/* Options with Revealed Correctness */}
                  <div className="space-y-2 pt-1">
                    {ev.options.map((opt) => {
                      const isStudentChoice = ev.studentSelectedOptionIds.includes(opt.id);
                      const isActualCorrect = opt.isCorrect;

                      return (
                        <div
                          key={opt.id}
                          className={cn(
                            "p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between gap-3",
                            isActualCorrect
                              ? "bg-emerald-50/80 border-emerald-300 text-emerald-900"
                              : isStudentChoice && !isActualCorrect
                                ? "bg-rose-50/80 border-rose-300 text-rose-900"
                                : "bg-gray-50/60 border-brand-border/60 text-brand-text-muted"
                          )}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className={cn(
                              "w-6 h-6 rounded-lg flex items-center justify-center font-bold text-[11px]",
                              isActualCorrect
                                ? "bg-emerald-600 text-white"
                                : isStudentChoice
                                  ? "bg-rose-600 text-white"
                                  : "bg-gray-200 text-brand-charcoal"
                            )}>
                              {opt.optionLabel}
                            </span>
                            <span>{opt.optionText}</span>
                          </div>

                          <div className="text-[10px] font-extrabold uppercase">
                            {isActualCorrect && <span className="text-emerald-700">✓ Correct Answer</span>}
                            {isStudentChoice && !isActualCorrect && <span className="text-rose-600">✗ Your Choice</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Concept Explanation Box */}
                  {ev.explanation && (
                    <div className="p-3.5 rounded-2xl bg-brand-bg-warm/70 border border-brand-border/60 text-xs space-y-1">
                      <span className="font-bold text-brand-orange text-[10px] uppercase tracking-wider flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        Explanation
                      </span>
                      <p className="text-brand-charcoal leading-relaxed">
                        {ev.explanation}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Scorecard Bottom Actions */}
          <div className="flex items-center justify-between pt-4">
            <Link
              href="/student/tests"
              className="px-5 py-2.5 rounded-2xl border border-brand-border bg-white hover:bg-gray-50 text-xs font-bold text-brand-charcoal transition-colors"
            >
              ← Back to Tests
            </Link>

            <Link
              href="/student/progress"
              className="px-5 py-2.5 rounded-2xl bg-brand-orange hover:bg-brand-orange-hover text-white text-xs font-black transition-colors shadow-xs"
            >
              View in Progress Tracker →
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return null;
}
