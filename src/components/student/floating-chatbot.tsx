"use client";

import * as React from "react";
import { Sparkles, Bot, X, MessageSquareQuote } from "lucide-react";
import { CHATBOT_CONFIG } from "@/config/student-home.config";
import { cn } from "@/lib/utils";

export function FloatingChatbot() {
  const [isOpen, setIsOpen] = React.useState(false);
  const config = CHATBOT_CONFIG;

  if (!config.enabled) return null;

  const handleButtonClick = () => {
    if (config.externalUrl) {
      window.open(config.externalUrl, "_blank");
    } else {
      setIsOpen((prev) => !prev);
    }
  };

  return (
    <>
      {/* Floating Action Button (Fixed to Viewport) */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2 pointer-events-auto">
        {/* Floating Tooltip Pill (Desktop only) */}
        {!isOpen && (
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-charcoal/90 text-white text-[11px] font-bold shadow-lg backdrop-blur-md animate-bounce border border-white/10 select-none">
            <Sparkles className="h-3 w-3 text-brand-orange" />
            <span>TopVeda AI</span>
          </div>
        )}

        {/* Circular Floating Button */}
        <button
          onClick={handleButtonClick}
          className={cn(
            "relative w-14 h-14 rounded-full bg-gradient-to-tr from-brand-orange via-[#FA6B3A] to-[#FF8A65] text-white flex items-center justify-center shadow-xl shadow-brand-orange/35 hover:shadow-brand-orange/50 hover:scale-105 active:scale-95 transition-all duration-200 border-2 border-white select-none focus:outline-none focus:ring-4 focus:ring-brand-orange/30 group",
            isOpen && "rotate-90"
          )}
          aria-label="Open TopVeda AI Assistant"
        >
          {/* Subtle Breathing Ripple Pulse */}
          <span className="absolute inset-0 rounded-full bg-brand-orange/40 animate-ping pointer-events-none" />

          {isOpen ? (
            <X className="h-6 w-6 relative z-10 transition-transform" />
          ) : (
            <div className="relative z-10 flex items-center justify-center">
              <Bot className="h-6 w-6 group-hover:rotate-6 transition-transform" />
              <Sparkles className="h-3 w-3 absolute -top-1 -right-1 text-amber-200 animate-pulse" />
            </div>
          )}
        </button>
      </div>

      {/* Friendly Chatbot Preview Modal / Popup */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-[90vw] max-w-sm rounded-3xl bg-white border border-brand-border shadow-2xl overflow-hidden animate-in fade-in-50 slide-in-from-bottom-5 duration-200">
          {/* Modal Header */}
          <div className="p-4 bg-gradient-to-r from-brand-charcoal via-slate-900 to-slate-800 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-brand-orange flex items-center justify-center text-white shadow-xs">
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-black text-white">{config.name}</h3>
                  <span className="px-1.5 py-0.2 rounded-full bg-brand-orange/20 text-brand-orange text-[9px] font-extrabold tracking-wide uppercase border border-brand-orange/40">
                    Coming Soon
                  </span>
                </div>
                <p className="text-[10px] text-slate-300">24/7 Academic AI Tutor</p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Close dialog"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-5 space-y-4">
            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-brand-bg-peach/70 border border-brand-orange-border/60 text-xs">
              <MessageSquareQuote className="h-5 w-5 text-brand-orange shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-brand-charcoal text-xs">
                  {config.welcomeMessage}
                </p>
                <p className="text-[11px] text-brand-text-muted leading-relaxed">
                  {config.placeholderText}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[11px] font-bold text-brand-text-subtle uppercase tracking-wider">
                Upcoming AI Features
              </p>
              <div className="space-y-1.5 text-xs text-brand-text-muted font-medium">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-orange" />
                  <span>Instant step-by-step doubt resolution</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-orange" />
                  <span>Custom practice quizzes on any chapter</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-orange" />
                  <span>Personalized formula & concept memory cards</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="w-full py-2 rounded-xl bg-brand-charcoal hover:bg-brand-charcoal-light text-white text-xs font-bold transition-all"
            >
              Got it, thanks!
            </button>
          </div>
        </div>
      )}
    </>
  );
}
