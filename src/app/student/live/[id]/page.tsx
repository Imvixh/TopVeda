"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { Container } from "@/components/ui/container";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import {
  LiveChatMessage,
  LivePoll,
  LiveQuiz,
  LiveQuizResult,
} from "@/types/live-interaction.types";
import {
  Radio,
  Clock,
  ArrowLeft,
  Loader2,
  Calendar,
  Sparkles,
  CheckCircle2,
  ShieldAlert,
  MessageSquare,
  BarChart2,
  HelpCircle,
  Send,
  Plus,
  EyeOff,
  Check,
  Award,
} from "lucide-react";

export default function StudentLiveRoomPage() {
  const params = useParams();
  const router = useRouter();
  const { user, profile } = useAuth();
  const liveClassId = params.id as string;
  const supabase = React.useMemo(() => createClient(), []);

  const [sessionData, setSessionData] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [countdown, setCountdown] = React.useState<number | null>(null);

  // Interaction Tabs: "CHAT" | "POLLS" | "QUIZZES"
  const [activeTab, setActiveTab] = React.useState<"CHAT" | "POLLS" | "QUIZZES">("CHAT");

  // Live Chat State
  const [chatMessages, setChatMessages] = React.useState<LiveChatMessage[]>([]);
  const [inputMsg, setInputMsg] = React.useState("");
  const [isSendingMsg, setIsSendingMsg] = React.useState(false);
  const chatBottomRef = React.useRef<HTMLDivElement>(null);

  // Live Polls State
  const [activePoll, setActivePoll] = React.useState<LivePoll | null>(null);
  const [selectedPollOption, setSelectedPollOption] = React.useState<string | null>(null);
  const [isVoting, setIsVoting] = React.useState(false);

  // Live Quizzes State
  const [activeQuiz, setActiveQuiz] = React.useState<LiveQuiz | null>(null);
  const [quizAnswers, setQuizAnswers] = React.useState<Record<string, string>>({});
  const [quizResult, setQuizResult] = React.useState<LiveQuizResult | null>(null);
  const [isSubmittingQuiz, setIsSubmittingQuiz] = React.useState(false);

  // Teacher Creation Modals
  const isTeacherOrAdmin = profile?.role === "ADMIN" || profile?.role === "SUPER_ADMIN";
  const [isCreatePollOpen, setIsCreatePollOpen] = React.useState(false);
  const [pollQuestion, setPollQuestion] = React.useState("");
  const [pollOptions, setPollOptions] = React.useState<string[]>(["", ""]);
  const [isSubmittingPoll, setIsSubmittingPoll] = React.useState(false);

  const [isCreateQuizOpen, setIsCreateQuizOpen] = React.useState(false);
  const [quizTitle, setQuizTitle] = React.useState("");
  const [quizQuestionText, setQuizQuestionText] = React.useState("");
  const [quizOptions, setQuizOptions] = React.useState<string[]>(["", "", "", ""]);
  const [quizCorrectOption, setQuizCorrectOption] = React.useState("1");
  const [isSubmittingNewQuiz, setIsSubmittingNewQuiz] = React.useState(false);

  // Load Session Data
  const loadSession = React.useCallback(async () => {
    if (!liveClassId) return;
    try {
      const res = await fetch(`/api/teacher/live/session?id=${liveClassId}`);
      const data = await res.json();
      setSessionData(data);
      if (data.secondsToStart !== undefined) {
        setCountdown(data.secondsToStart);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [liveClassId]);

  // Load Interaction Data (Chat, Polls, Quizzes)
  const loadChatMessages = React.useCallback(async () => {
    if (!liveClassId) return;
    try {
      const res = await fetch(`/api/student/live/${liveClassId}/chat`);
      const data = await res.json();
      if (data.messages) {
        setChatMessages(data.messages);
      }
    } catch (e) {
      console.warn("Failed to load chat messages:", e);
    }
  }, [liveClassId]);

  const loadPolls = React.useCallback(async () => {
    if (!liveClassId) return;
    try {
      const res = await fetch(`/api/student/live/${liveClassId}/polls`);
      const data = await res.json();
      setActivePoll(data.poll || null);
      if (data.poll?.userVotedOptionId) {
        setSelectedPollOption(data.poll.userVotedOptionId);
      }
    } catch (e) {
      console.warn("Failed to load polls:", e);
    }
  }, [liveClassId]);

  const loadQuizzes = React.useCallback(async () => {
    if (!liveClassId) return;
    try {
      const res = await fetch(`/api/student/live/${liveClassId}/quizzes`);
      const data = await res.json();
      setActiveQuiz(data.quiz || null);
    } catch (e) {
      console.warn("Failed to load quiz:", e);
    }
  }, [liveClassId]);

  React.useEffect(() => {
    void loadSession();
    void loadChatMessages();
    void loadPolls();
    void loadQuizzes();

    const interval = setInterval(() => {
      void loadSession();
      void loadPolls();
      void loadQuizzes();
    }, 5000); // 5s poll for real-time state sync

    return () => clearInterval(interval);
  }, [loadSession, loadChatMessages, loadPolls, loadQuizzes]);

  // Countdown Timer
  React.useEffect(() => {
    if (countdown === null || countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // Auto-scroll chat
  React.useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Supabase Realtime Subscriptions for Chat, Polls & Quizzes
  React.useEffect(() => {
    if (!liveClassId) return;

    const channel = supabase
      .channel(`live-class-room-${liveClassId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "live_class_messages",
          filter: `live_class_id=eq.${liveClassId}`,
        },
        (payload) => {
          const newMsg = payload.new as any;
          if (newMsg && !newMsg.is_hidden) {
            setChatMessages((prev) => [
              ...prev,
              {
                id: newMsg.id,
                liveClassId: newMsg.live_class_id,
                senderId: newMsg.sender_id,
                senderName: newMsg.sender_name,
                senderRole: newMsg.sender_role,
                message: newMsg.message,
                isHidden: newMsg.is_hidden,
                createdAt: newMsg.created_at,
                updatedAt: newMsg.updated_at,
              },
            ]);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "live_class_polls",
          filter: `live_class_id=eq.${liveClassId}`,
        },
        () => {
          void loadPolls();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "live_class_poll_votes",
          filter: `live_class_id=eq.${liveClassId}`,
        },
        () => {
          void loadPolls();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "live_class_quizzes",
          filter: `live_class_id=eq.${liveClassId}`,
        },
        () => {
          void loadQuizzes();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [liveClassId, supabase, loadPolls, loadQuizzes]);

  // Server-Authoritative Live Attendance Heartbeat Tracker
  React.useEffect(() => {
    if (!liveClassId || !user || !sessionData?.isLive) return;

    const recordHeartbeat = async () => {
      try {
        await fetch("/api/student/live/attendance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            liveClassId,
            heartbeatDurationSeconds: 30,
          }),
        });
      } catch {
        // silent non-blocking
      }
    };

    void recordHeartbeat();
    const heartbeatTimer = setInterval(() => {
      void recordHeartbeat();
    }, 30000);

    return () => clearInterval(heartbeatTimer);
  }, [liveClassId, user, sessionData?.isLive]);

  // Handle Send Chat Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim() || isSendingMsg) return;

    try {
      setIsSendingMsg(true);
      const text = inputMsg.trim();
      setInputMsg("");

      const res = await fetch(`/api/student/live/${liveClassId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to send message.");
      } else {
        void loadChatMessages();
      }
    } catch (err) {
      console.error("Failed to post message:", err);
    } finally {
      setIsSendingMsg(false);
    }
  };

  // Handle Moderate Chat Message (Educator only)
  const handleModerateMessage = async (messageId: string) => {
    try {
      await fetch(`/api/teacher/live/${liveClassId}/chat/moderate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, isHidden: true }),
      });
      setChatMessages((prev) => prev.filter((m) => m.id !== messageId));
    } catch (err) {
      console.error("Failed to moderate message:", err);
    }
  };

  // Handle Poll Voting
  const handleVotePoll = async (optionId: string) => {
    if (!activePoll || activePoll.status !== "ACTIVE" || isVoting) return;
    try {
      setIsVoting(true);
      setSelectedPollOption(optionId);

      const res = await fetch(`/api/student/live/${liveClassId}/polls/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pollId: activePoll.id, optionId }),
      });

      const data = await res.json();
      if (res.ok && data.poll) {
        setActivePoll(data.poll);
      }
    } catch (err) {
      console.error("Failed to vote:", err);
    } finally {
      setIsVoting(false);
    }
  };

  // Handle Quiz Submission
  const handleSubmitQuiz = async () => {
    if (!activeQuiz || activeQuiz.status !== "ACTIVE" || isSubmittingQuiz) return;
    try {
      setIsSubmittingQuiz(true);

      const res = await fetch(`/api/student/live/${liveClassId}/quizzes/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quizId: activeQuiz.id,
          answers: quizAnswers,
        }),
      });

      const data = await res.json();
      if (res.ok && data.result) {
        setQuizResult(data.result);
        void loadQuizzes();
      } else {
        alert(data.error || "Failed to submit quiz.");
      }
    } catch (err) {
      console.error("Failed to submit quiz:", err);
    } finally {
      setIsSubmittingQuiz(false);
    }
  };

  // Handle Create Poll (Teacher)
  const handleCreatePollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pollQuestion.trim() || pollOptions.filter((o) => o.trim()).length < 2) return;

    try {
      setIsSubmittingPoll(true);
      const res = await fetch(`/api/teacher/live/${liveClassId}/polls`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: pollQuestion.trim(),
          options: pollOptions.filter((o) => o.trim()),
        }),
      });
      if (res.ok) {
        setIsCreatePollOpen(false);
        setPollQuestion("");
        setPollOptions(["", ""]);
        void loadPolls();
      }
    } catch (err) {
      console.error("Failed to create poll:", err);
    } finally {
      setIsSubmittingPoll(false);
    }
  };

  // Handle Create Quiz (Teacher)
  const handleCreateQuizSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quizTitle.trim() || !quizQuestionText.trim()) return;

    const filteredOptions = quizOptions
      .map((t, idx) => ({ id: String(idx + 1), text: t.trim() }))
      .filter((o) => o.text);

    if (filteredOptions.length < 2) return;

    try {
      setIsSubmittingNewQuiz(true);
      const res = await fetch(`/api/teacher/live/${liveClassId}/quizzes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: quizTitle.trim(),
          durationSeconds: 120,
          questions: [
            {
              questionText: quizQuestionText.trim(),
              options: filteredOptions,
              correctOptionId: quizCorrectOption,
              points: 1,
            },
          ],
        }),
      });
      if (res.ok) {
        setIsCreateQuizOpen(false);
        setQuizTitle("");
        setQuizQuestionText("");
        setQuizOptions(["", "", "", ""]);
        void loadQuizzes();
      }
    } catch (err) {
      console.error("Failed to create quiz:", err);
    } finally {
      setIsSubmittingNewQuiz(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-bg-warm flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-brand-orange" />
          <p className="text-xs font-semibold text-brand-text-muted">Connecting to Live Classroom...</p>
        </div>
      </div>
    );
  }

  const isTerminated = sessionData?.liveStatus === "TERMINATED" || sessionData?.isTerminated;
  const isCompleted = sessionData?.liveStatus === "COMPLETED" || sessionData?.isCompleted;
  const isLive = Boolean(sessionData?.isLive && sessionData?.canJoin);
  const isPreparationWindow = Boolean(sessionData?.isPreparationWindow);

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-[#0B1528] text-white flex flex-col font-sans antialiased">
      {/* Top Classroom Navigation Bar */}
      <header className="h-14 border-b border-white/10 bg-[#0E1B33] px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={isTeacherOrAdmin ? "/admin/content" : "/student"}>
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 text-xs">
              <ArrowLeft className="h-4 w-4 mr-1" />
              {isTeacherOrAdmin ? "Teacher Workspace" : "Student Home"}
            </Button>
          </Link>
          <div className="h-4 w-px bg-white/20" />
          <div>
            <span className="text-xs font-black text-brand-orange uppercase tracking-wider">{sessionData?.subject || "Live Class"}</span>
            <h1 className="text-xs font-bold text-white line-clamp-1">{sessionData?.topic || "Interactive Session"}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {sessionData?.studioPublishUrl && isTeacherOrAdmin && (
            <Button
              size="sm"
              onClick={() => window.open(sessionData.studioPublishUrl, "_blank")}
              className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs hidden sm:inline-flex items-center gap-1.5"
            >
              <Radio className="h-3.5 w-3.5" />
              <span>Broadcast Studio</span>
            </Button>
          )}

          {isLive && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-black tracking-wide uppercase shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
              LIVE
            </span>
          )}

          {sessionData?.educatorName && (
            <div className="flex items-center gap-2 text-xs text-white/70">
              {sessionData.educatorAvatarUrl ? (
                <img
                  src={sessionData.educatorAvatarUrl}
                  alt={sessionData.educatorName}
                  className="w-6 h-6 rounded-full object-cover border border-white/20"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-brand-orange/30 text-brand-orange flex items-center justify-center font-bold text-[10px]">
                  {sessionData.educatorName.charAt(0)}
                </div>
              )}
              <span className="hidden sm:inline-block">
                Teacher: <span className="font-bold text-white">{sessionData.educatorName}</span>
              </span>
            </div>
          )}
        </div>
      </header>

      {/* Main Classroom Stage */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Side: Video Player Stage */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 bg-[#070D1A] relative">
          {isLive && (
            <div className="w-full h-full max-h-[80vh] aspect-video rounded-2xl bg-black border border-white/10 overflow-hidden relative shadow-2xl flex items-center justify-center">
              {sessionData?.playbackVideoId ? (
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${sessionData.playbackVideoId}?autoplay=1&playsinline=1&rel=0&modestbranding=1`}
                  title={sessionData.topic || "TopVeda Live Stream"}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="w-full h-full border-0"
                />
              ) : (
                <div className="text-center space-y-3 p-6">
                  <div className="h-16 w-16 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center mx-auto border border-red-500/30">
                    <Radio className="h-8 w-8 animate-pulse" />
                  </div>
                  <h3 className="text-lg font-black text-white">{sessionData?.topic}</h3>
                  <p className="text-xs text-white/70 max-w-md mx-auto">
                    Interactive whiteboard and low-latency audio stream active. Powered by TopVeda Streaming.
                  </p>
                </div>
              )}
            </div>
          )}

          {!isLive && isPreparationWindow && (
            <Card className="max-w-md p-8 text-center bg-[#0E1B33] border-white/10 text-white space-y-4 rounded-3xl shadow-xl">
              <div className="h-14 w-14 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/30">
                <Clock className="h-7 w-7 animate-pulse" />
              </div>
              <div className="space-y-1">
                <Badge variant="peach" size="sm" className="text-[10px] uppercase font-bold">
                  Teacher Preparation in Progress
                </Badge>
                <h2 className="text-base font-bold text-white">Classroom Opening Shortly</h2>
                <p className="text-xs text-white/70 leading-relaxed">
                  Your educator (<span className="text-white font-bold">{sessionData?.educatorName}</span>) is preparing presentation materials.
                </p>
              </div>

              {countdown !== null && countdown > 0 && (
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                  <span className="text-[10px] text-white/60 uppercase font-bold tracking-wider">Session Starts In</span>
                  <p className="text-2xl font-black text-brand-orange tracking-tight">{formatCountdown(countdown)}</p>
                </div>
              )}
            </Card>
          )}

          {!isLive && !isPreparationWindow && !isTerminated && !isCompleted && (
            <Card className="max-w-md p-8 text-center bg-[#0E1B33] border-white/10 text-white space-y-4 rounded-3xl shadow-xl">
              <div className="h-14 w-14 rounded-2xl bg-brand-orange/20 text-brand-orange flex items-center justify-center mx-auto border border-brand-orange/30">
                <Calendar className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <Badge variant="peach" size="sm" className="text-[10px] uppercase font-bold">
                  Scheduled Session
                </Badge>
                <h2 className="text-base font-bold text-white">{sessionData?.topic}</h2>
                <p className="text-xs text-white/70">Scheduled for {sessionData?.timeDisplay || "Today"}</p>
              </div>

              {countdown !== null && countdown > 0 && (
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                  <span className="text-[10px] text-white/60 uppercase font-bold tracking-wider">Countdown to Class</span>
                  <p className="text-3xl font-black text-brand-orange tracking-tight">{formatCountdown(countdown)}</p>
                </div>
              )}
            </Card>
          )}

          {isTerminated && (
            <Card className="max-w-md p-8 text-center bg-[#1A0A0E] border-rose-500/30 text-white space-y-4 rounded-3xl shadow-xl">
              <div className="h-14 w-14 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/30">
                <ShieldAlert className="h-7 w-7 text-rose-500" />
              </div>
              <div className="space-y-1">
                <Badge variant="outline" size="sm" className="bg-rose-500/20 text-rose-400 border-rose-500/40 text-[10px] font-bold uppercase">
                  Session Terminated
                </Badge>
                <h2 className="text-base font-bold text-white">Live Broadcast Ended</h2>
                <p className="text-xs text-rose-200/80 leading-relaxed">
                  {sessionData?.terminationReason || "This live session was concluded by system administrators."}
                </p>
              </div>
              <Link href="/student">
                <Button size="sm" className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold w-full">
                  Return to Student Portal
                </Button>
              </Link>
            </Card>
          )}

          {isCompleted && (
            <Card className="max-w-md p-8 text-center bg-[#0E1B33] border-emerald-500/30 text-white space-y-4 rounded-3xl shadow-xl">
              <div className="h-14 w-14 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
                <CheckCircle2 className="h-7 w-7 text-emerald-400" />
              </div>
              <div className="space-y-1">
                <Badge variant="outline" size="sm" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40 text-[10px] font-bold uppercase">
                  Class Concluded
                </Badge>
                <h2 className="text-base font-bold text-white">Session Completed</h2>
                <p className="text-xs text-white/70">
                  The recording is currently undergoing processing and will be available under Recorded Lectures.
                </p>
              </div>
              <Link href="/student">
                <Button size="sm" className="bg-brand-orange hover:bg-brand-orange-hover text-white text-xs font-bold w-full">
                  Explore Other Lectures
                </Button>
              </Link>
            </Card>
          )}
        </div>

        {/* Right Side: Native Interactive Sidebar (Chat, Polls, Quizzes) */}
        <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-white/10 bg-[#0A1324] flex flex-col h-[480px] lg:h-auto">
          {/* Interaction Mode Selector Tabs */}
          <div className="grid grid-cols-3 border-b border-white/10 bg-[#0E1B33]">
            <button
              onClick={() => setActiveTab("CHAT")}
              className={`py-3 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                activeTab === "CHAT"
                  ? "text-brand-orange border-b-2 border-brand-orange bg-white/5"
                  : "text-white/60 hover:text-white"
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Chat</span>
            </button>

            <button
              onClick={() => setActiveTab("POLLS")}
              className={`py-3 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                activeTab === "POLLS"
                  ? "text-brand-orange border-b-2 border-brand-orange bg-white/5"
                  : "text-white/60 hover:text-white"
              }`}
            >
              <BarChart2 className="h-3.5 w-3.5" />
              <span>Polls</span>
              {activePoll?.status === "ACTIVE" && (
                <span className="w-2 h-2 rounded-full bg-brand-orange animate-ping" />
              )}
            </button>

            <button
              onClick={() => setActiveTab("QUIZZES")}
              className={`py-3 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                activeTab === "QUIZZES"
                  ? "text-brand-orange border-b-2 border-brand-orange bg-white/5"
                  : "text-white/60 hover:text-white"
              }`}
            >
              <HelpCircle className="h-3.5 w-3.5" />
              <span>Quiz</span>
              {activeQuiz?.status === "ACTIVE" && !activeQuiz.hasAttempted && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              )}
            </button>
          </div>

          {/* TAB 1: LIVE CHAT */}
          {activeTab === "CHAT" && (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Message Feed */}
              <div className="flex-1 p-3 overflow-y-auto space-y-2.5 text-xs scrollbar-thin scrollbar-thumb-white/10">
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-[11px] text-white/70 italic text-center">
                  Welcome to the live interactive classroom! Please keep discussions academic and respectful.
                </div>

                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className="p-2.5 rounded-xl bg-white/5 border border-white/5 space-y-1 hover:bg-white/[0.07] transition-colors group"
                  >
                    <div className="flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`font-bold ${
                            msg.senderRole === "SUPER_ADMIN"
                              ? "text-rose-400"
                              : msg.senderRole === "ADMIN"
                              ? "text-amber-400"
                              : "text-brand-orange"
                          }`}
                        >
                          {msg.senderName}
                        </span>
                        {msg.senderRole !== "STUDENT" && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono text-[9px] border border-amber-500/30">
                            {msg.senderRole === "SUPER_ADMIN" ? "ADMIN" : "FACULTY"}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-white/40">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {isTeacherOrAdmin && (
                          <button
                            onClick={() => handleModerateMessage(msg.id)}
                            title="Hide message"
                            className="opacity-0 group-hover:opacity-100 text-white/40 hover:text-rose-400 p-0.5 rounded transition-opacity"
                          >
                            <EyeOff className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-white/90 text-xs leading-relaxed break-words">{msg.message}</p>
                  </div>
                ))}
                <div ref={chatBottomRef} />
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendMessage} className="p-2.5 border-t border-white/10 flex items-center gap-2 bg-[#0E1B33]">
                <input
                  value={inputMsg}
                  onChange={(e) => setInputMsg(e.target.value)}
                  placeholder={isLive ? "Ask a question in class..." : "Chat active during live..."}
                  disabled={!isLive || isSendingMsg}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-brand-orange disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!isLive || !inputMsg.trim() || isSendingMsg}
                  className="p-2.5 rounded-xl bg-brand-orange hover:bg-brand-orange-hover text-white disabled:opacity-50 transition-colors shrink-0"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </form>
            </div>
          )}

          {/* TAB 2: LIVE POLLS */}
          {activeTab === "POLLS" && (
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {isTeacherOrAdmin && (
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={() => setIsCreatePollOpen(true)}
                    className="bg-brand-orange hover:bg-brand-orange-hover text-white text-xs font-bold"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Launch New Poll
                  </Button>
                </div>
              )}

              {!activePoll ? (
                <div className="p-8 text-center bg-white/5 rounded-2xl border border-white/10 space-y-2">
                  <BarChart2 className="h-8 w-8 text-white/40 mx-auto" />
                  <p className="text-xs font-bold text-white">No active poll right now</p>
                  <p className="text-[11px] text-white/60">Your educator will launch interactive polls during the session.</p>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-brand-orange font-bold uppercase tracking-wider">
                      {activePoll.status === "ACTIVE" ? "Active Poll" : "Poll Closed"}
                    </span>
                    <span className="text-[10px] text-white/50">{activePoll.totalVotes || 0} votes</span>
                  </div>

                  <h3 className="text-xs font-bold text-white leading-snug">{activePoll.question}</h3>

                  {/* Options List */}
                  <div className="space-y-2 pt-1">
                    {activePoll.options.map((opt) => {
                      const isSelected = selectedPollOption === opt.id;
                      const hasVoted = Boolean(selectedPollOption);
                      const showResults = hasVoted || activePoll.status === "CLOSED" || isTeacherOrAdmin;

                      return (
                        <div
                          key={opt.id}
                          onClick={() => {
                            if (!hasVoted && activePoll.status === "ACTIVE") {
                              void handleVotePoll(opt.id);
                            }
                          }}
                          className={`p-2.5 rounded-xl border relative overflow-hidden transition-all ${
                            !hasVoted && activePoll.status === "ACTIVE"
                              ? "cursor-pointer hover:border-brand-orange bg-white/5 border-white/10"
                              : isSelected
                              ? "border-brand-orange bg-brand-orange/10"
                              : "border-white/10 bg-white/5"
                          }`}
                        >
                          {/* Animated Result Fill Bar */}
                          {showResults && (
                            <div
                              className={`absolute inset-y-0 left-0 transition-all duration-500 opacity-20 ${
                                isSelected ? "bg-brand-orange" : "bg-white"
                              }`}
                              style={{ width: `${opt.votePercentage || 0}%` }}
                            />
                          )}

                          <div className="relative flex items-center justify-between text-xs">
                            <span className="font-medium text-white/90">{opt.text}</span>
                            {showResults && (
                              <span className="font-bold text-[11px] text-white shrink-0 ml-2">
                                {opt.votePercentage || 0}%
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {selectedPollOption && activePoll.status === "ACTIVE" && (
                    <p className="text-[10px] text-emerald-400 flex items-center gap-1 font-bold pt-1">
                      <Check className="h-3 w-3" /> Vote recorded. Results update in realtime.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: LIVE QUIZZES */}
          {activeTab === "QUIZZES" && (
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {isTeacherOrAdmin && (
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={() => setIsCreateQuizOpen(true)}
                    className="bg-brand-orange hover:bg-brand-orange-hover text-white text-xs font-bold"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Launch Live Quiz
                  </Button>
                </div>
              )}

              {!activeQuiz ? (
                <div className="p-8 text-center bg-white/5 rounded-2xl border border-white/10 space-y-2">
                  <HelpCircle className="h-8 w-8 text-white/40 mx-auto" />
                  <p className="text-xs font-bold text-white">No active quiz right now</p>
                  <p className="text-[11px] text-white/60">Live concept quizzes will appear here for immediate evaluation.</p>
                </div>
              ) : activeQuiz.hasAttempted || quizResult ? (
                /* Completed Scorecard Card */
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider">
                      Quiz Completed
                    </span>
                    <Badge variant="outline" size="sm" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40 text-[10px]">
                      Score: {activeQuiz.userScore ?? quizResult?.scoreObtained} / {activeQuiz.totalPoints ?? quizResult?.maxScore}
                    </Badge>
                  </div>

                  <h3 className="text-xs font-bold text-white">{activeQuiz.title}</h3>

                  <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-center space-y-1">
                    <Award className="h-6 w-6 text-emerald-400 mx-auto" />
                    <p className="text-lg font-black text-white">
                      {activeQuiz.userPercentage ?? quizResult?.percentage}% Correct
                    </p>
                    <p className="text-[10px] text-emerald-300">Logged to your study learning activity trail.</p>
                  </div>
                </div>
              ) : (
                /* Active Quiz Answering Card */
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-brand-orange font-bold uppercase tracking-wider">
                      Live Quiz In Progress
                    </span>
                    <span className="text-[10px] text-white/60">Timer: {activeQuiz.durationSeconds}s</span>
                  </div>

                  <h3 className="text-xs font-bold text-white leading-snug">{activeQuiz.title}</h3>

                  {/* Questions List */}
                  <div className="space-y-4 pt-1">
                    {activeQuiz.questions.map((q) => (
                      <div key={q.id} className="space-y-2">
                        <p className="text-xs text-white/90 font-medium">
                          Q{q.questionNumber}. {q.questionText}
                        </p>
                        <div className="space-y-1.5">
                          {q.options.map((opt) => {
                            const isChosen = quizAnswers[q.id] === opt.id;
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => setQuizAnswers((prev) => ({ ...prev, [q.id]: opt.id }))}
                                className={`w-full p-2 rounded-xl text-left text-xs border transition-all ${
                                  isChosen
                                    ? "bg-brand-orange/20 border-brand-orange text-white font-bold"
                                    : "bg-white/5 border-white/10 text-white/80 hover:bg-white/10"
                                }`}
                              >
                                {opt.text}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button
                    onClick={handleSubmitQuiz}
                    disabled={isSubmittingQuiz || Object.keys(quizAnswers).length === 0}
                    className="w-full bg-brand-orange hover:bg-brand-orange-hover text-white font-bold text-xs mt-2"
                  >
                    {isSubmittingQuiz && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                    Submit Quiz Answers
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* TEACHER MODAL: CREATE POLL */}
      <Modal
        isOpen={isCreatePollOpen}
        onClose={() => setIsCreatePollOpen(false)}
        title="Launch Interactive Live Poll"
        description="Ask an instant question to participants with real-time percentage results."
        maxWidth="md"
      >
        <form onSubmit={handleCreatePollSubmit} className="space-y-3 pt-2">
          <div className="space-y-1">
            <label className="text-xs font-bold text-brand-charcoal">Poll Question</label>
            <Input
              value={pollQuestion}
              onChange={(e) => setPollQuestion(e.target.value)}
              placeholder="e.g. Which formula applies to non-uniform acceleration?"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-brand-charcoal">Answer Options</label>
            {pollOptions.map((opt, idx) => (
              <Input
                key={idx}
                value={opt}
                onChange={(e) => {
                  const updated = [...pollOptions];
                  updated[idx] = e.target.value;
                  setPollOptions(updated);
                }}
                placeholder={`Option ${idx + 1}`}
              />
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPollOptions((prev) => [...prev, ""])}
              className="text-xs font-bold"
            >
              + Add Option
            </Button>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsCreatePollOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSubmittingPoll} className="bg-brand-orange text-white font-bold text-xs">
              {isSubmittingPoll && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              Publish Poll
            </Button>
          </div>
        </form>
      </Modal>

      {/* TEACHER MODAL: CREATE QUIZ */}
      <Modal
        isOpen={isCreateQuizOpen}
        onClose={() => setIsCreateQuizOpen(false)}
        title="Launch Live Concept Quiz"
        description="Deliver a timed quiz with server-side grading and immediate student performance metrics."
        maxWidth="md"
      >
        <form onSubmit={handleCreateQuizSubmit} className="space-y-3 pt-2">
          <div className="space-y-1">
            <label className="text-xs font-bold text-brand-charcoal">Quiz Title</label>
            <Input
              value={quizTitle}
              onChange={(e) => setQuizTitle(e.target.value)}
              placeholder="e.g. 2-Minute Quick Concept Check"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-brand-charcoal">Question Text</label>
            <Input
              value={quizQuestionText}
              onChange={(e) => setQuizQuestionText(e.target.value)}
              placeholder="e.g. What is the derivative of sin(2x)?"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-brand-charcoal">Options & Correct Answer</label>
            {quizOptions.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="correctOption"
                  checked={quizCorrectOption === String(idx + 1)}
                  onChange={() => setQuizCorrectOption(String(idx + 1))}
                  className="text-brand-orange"
                />
                <Input
                  value={opt}
                  onChange={(e) => {
                    const updated = [...quizOptions];
                    updated[idx] = e.target.value;
                    setQuizOptions(updated);
                  }}
                  placeholder={`Option ${idx + 1}`}
                  className="flex-1"
                />
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateQuizOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSubmittingNewQuiz} className="bg-brand-orange text-white font-bold text-xs">
              {isSubmittingNewQuiz && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              Publish Live Quiz
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
