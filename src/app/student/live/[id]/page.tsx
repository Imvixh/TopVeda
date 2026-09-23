"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { Container } from "@/components/ui/container";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Radio,
  Video,
  Clock,
  ArrowLeft,
  Loader2,
  Calendar,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Users,
  ShieldAlert,
  MessageSquare,
  Send,
} from "lucide-react";

export default function StudentLiveRoomPage() {
  const params = useParams();
  const router = useRouter();
  const { user, profile } = useAuth();
  const liveClassId = params.id as string;

  const [sessionData, setSessionData] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [countdown, setCountdown] = React.useState<number | null>(null);
  const [chatMessages, setChatMessages] = React.useState<{ name: string; message: string; time: string }[]>([
    { name: "TopVeda Bot", message: "Welcome to the live interactive classroom! Please keep discussions academic and respectful.", time: "Just now" },
  ]);
  const [inputMsg, setInputMsg] = React.useState("");

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

  React.useEffect(() => {
    void loadSession();
    const interval = setInterval(() => {
      void loadSession();
    }, 5000); // 5s poll for live status changes
    return () => clearInterval(interval);
  }, [loadSession]);

  React.useEffect(() => {
    if (countdown === null || countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;
    setChatMessages((prev) => [
      ...prev,
      {
        name: profile?.fullName || "Student",
        message: inputMsg.trim(),
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
    setInputMsg("");
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
  const canJoin = Boolean(sessionData?.canJoin);

  // Format countdown mm:ss
  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-[#0B1528] text-white flex flex-col">
      {/* Top Classroom Bar */}
      <header className="h-14 border-b border-white/10 bg-[#0E1B33] px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/student">
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 text-xs">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Student Home
            </Button>
          </Link>
          <div className="h-4 w-px bg-white/20" />
          <div>
            <span className="text-xs font-black text-brand-orange uppercase">{sessionData?.subject || "Live Class"}</span>
            <h1 className="text-xs font-bold text-white line-clamp-1">{sessionData?.topic || "Interactive Session"}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isLive && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-black tracking-wide uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
              LIVE
            </span>
          )}
          {sessionData?.educatorName && (
            <span className="text-xs text-white/70 hidden sm:inline-block">
              Teacher: <span className="font-bold text-white">{sessionData.educatorName}</span>
            </span>
          )}
        </div>
      </header>

      {/* Main Classroom Content */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Side: Video / Stream Stage */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 bg-[#070D1A] relative">
          {/* STATE 1: BROADCASTING LIVE */}
          {isLive && (
            <div className="w-full h-full max-h-[80vh] aspect-video rounded-2xl bg-black border border-white/10 overflow-hidden relative shadow-2xl flex items-center justify-center">
              {/* Stream Video Placeholder / WebRTC Canvas */}
              <div className="text-center space-y-3 p-6">
                <div className="h-16 w-16 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center mx-auto border border-red-500/30">
                  <Radio className="h-8 w-8 animate-pulse" />
                </div>
                <h3 className="text-lg font-black text-white">{sessionData?.topic}</h3>
                <p className="text-xs text-white/70 max-w-md mx-auto">
                  Interactive whiteboard and low-latency audio stream active. Powered by TopVeda Streaming.
                </p>
                <Badge variant="primary" size="sm" className="bg-red-500 text-white font-bold text-xs uppercase">
                  Connected to Teacher Stream
                </Badge>
              </div>
            </div>
          )}

          {/* STATE 2: TEACHER PREPARATION WINDOW (Students Blocked, Teacher in Setup) */}
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
                  Your educator (<span className="text-white font-bold">{sessionData?.educatorName}</span>) is currently preparing the camera, audio, and presentation materials.
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

          {/* STATE 3: UPCOMING WAITING ROOM (Before Early Access) */}
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
                <p className="text-xs text-white/70">
                  Scheduled for {sessionData?.timeDisplay || "Today"}
                </p>
              </div>

              {countdown !== null && countdown > 0 && (
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                  <span className="text-[10px] text-white/60 uppercase font-bold tracking-wider">Countdown to Class</span>
                  <p className="text-3xl font-black text-brand-orange tracking-tight">{formatCountdown(countdown)}</p>
                </div>
              )}
            </Card>
          )}

          {/* STATE 4: TERMINATED */}
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

          {/* STATE 5: COMPLETED */}
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

        {/* Right Side: Live Classroom Chat & Doubt Box */}
        <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-white/10 bg-[#0A1324] flex flex-col h-64 lg:h-auto">
          <div className="p-3.5 border-b border-white/10 flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5 text-brand-orange" />
              Classroom Chat
            </span>
            <Badge variant="outline" size="sm" className="text-[10px] text-white/60 border-white/20">
              Live
            </Badge>
          </div>

          {/* Message List */}
          <div className="flex-1 p-3 overflow-y-auto space-y-2.5 text-xs">
            {chatMessages.map((msg, idx) => (
              <div key={idx} className="p-2.5 rounded-xl bg-white/5 border border-white/5 space-y-0.5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-bold text-brand-orange">{msg.name}</span>
                  <span className="text-white/40">{msg.time}</span>
                </div>
                <p className="text-white/90 text-[11px] leading-relaxed">{msg.message}</p>
              </div>
            ))}
          </div>

          {/* Chat Input */}
          <form onSubmit={handleSendMessage} className="p-2.5 border-t border-white/10 flex items-center gap-2">
            <input
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              placeholder={isLive ? "Ask a doubt in class..." : "Chat opens when live..."}
              disabled={!isLive}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-brand-orange disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!isLive || !inputMsg.trim()}
              className="p-2 rounded-xl bg-brand-orange hover:bg-brand-orange-hover text-white disabled:opacity-50 transition-colors"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
