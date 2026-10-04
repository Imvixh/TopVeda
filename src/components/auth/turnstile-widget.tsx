"use client";

import * as React from "react";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement | string,
        params: {
          sitekey: string;
          callback?: (token: string) => void;
          "error-callback"?: (errorCode?: string) => void;
          "expired-callback"?: () => void;
          "timeout-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
          size?: "normal" | "compact" | "flexible";
          action?: string;
          "refresh-expired"?: "auto" | "manual" | "never";
          "refresh-timeout"?: "auto" | "manual" | "never";
        }
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
      getResponse: (widgetId?: string) => string | undefined;
    };
    onTurnstileLoad?: () => void;
  }
}

export interface TurnstileWidgetRef {
  reset: () => void;
  remove: () => void;
  getWidgetId: () => string | null;
  getResponse: () => string | undefined;
}

export interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: (errorCode?: string) => void;
  onTimeout?: () => void;
  theme?: "light" | "dark" | "auto";
  size?: "normal" | "compact" | "flexible";
  action?: string;
  className?: string;
}

export const TurnstileWidget = React.forwardRef<TurnstileWidgetRef, TurnstileWidgetProps>(
  (
    {
      onVerify,
      onExpire,
      onError,
      onTimeout,
      theme = "auto",
      size = "normal",
      action,
      className = "",
    },
    ref
  ) => {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const widgetIdRef = React.useRef<string | null>(null);
    const generationRef = React.useRef(0);

    const [status, setStatus] = React.useState<"loading" | "ready" | "error">("loading");
    const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

    // Turnstile Site Key (Public)
    // Development: configured key or official Cloudflare testing sitekey
    // Production: MUST be configured via NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY (never fallback to test key)
    const isProduction = process.env.NODE_ENV === "production";
    const siteKey =
      process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY ||
      (!isProduction ? "1x00000000000000000000AA" : "");

    const onVerifyRef = React.useRef(onVerify);
    onVerifyRef.current = onVerify;

    const onExpireRef = React.useRef(onExpire);
    onExpireRef.current = onExpire;

    const onErrorRef = React.useRef(onError);
    onErrorRef.current = onError;

    const onTimeoutRef = React.useRef(onTimeout);
    onTimeoutRef.current = onTimeout;

    // Render widget helper
    const renderWidget = React.useCallback(() => {
      if (!containerRef.current) return;

      const currentGen = ++generationRef.current;

      if (isProduction && siteKey === "1x00000000000000000000AA") {
        console.error("[TurnstileWidget] Security configuration error: Dummy test sitekey detected in production environment.");
        setStatus("error");
        setErrorMessage("Security verification is misconfigured for production.");
        if (onErrorRef.current) onErrorRef.current("invalid-production-sitekey");
        return;
      }

      if (!siteKey) {
        if (isProduction) {
          console.error("[TurnstileWidget] Production Turnstile site key is missing.");
        }
        setStatus("error");
        setErrorMessage(
          isProduction
            ? "Security verification is not configured in production."
            : "Turnstile site key is not configured."
        );
        if (onErrorRef.current) onErrorRef.current("missing-sitekey");
        return;
      }

      if (!window.turnstile) {
        setStatus("loading");
        return;
      }

      // Remove existing widget if already mounted
      if (widgetIdRef.current) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // Ignore removal errors
        }
        widgetIdRef.current = null;
      }

      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }

      try {
        const id = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: (token: string) => {
            if (currentGen === generationRef.current) {
              setStatus("ready");
              setErrorMessage(null);
              onVerifyRef.current(token);
            }
          },
          "expired-callback": () => {
            if (currentGen === generationRef.current && onExpireRef.current) {
              onExpireRef.current();
            }
          },
          "error-callback": (errorCode?: string) => {
            if (currentGen === generationRef.current) {
              setStatus("error");
              setErrorMessage("Security verification failed. Please try again.");
              if (onErrorRef.current) {
                onErrorRef.current(errorCode);
              }
            }
          },
          "timeout-callback": () => {
            if (currentGen === generationRef.current) {
              setStatus("error");
              setErrorMessage("Security verification timed out. Please try again.");
              if (onTimeoutRef.current) {
                onTimeoutRef.current();
              } else if (onExpireRef.current) {
                onExpireRef.current();
              }
            }
          },
          theme,
          size,
          action,
          "refresh-expired": "auto",
        });

        widgetIdRef.current = id;
        setStatus("ready");
        setErrorMessage(null);
      } catch {
        setStatus("error");
        setErrorMessage("Failed to initialize security verification challenge.");
        if (onErrorRef.current) onErrorRef.current("render-error");
      }
    }, [siteKey, theme, size, action, isProduction]);

    // Expose imperative methods to parent
    React.useImperativeHandle(ref, () => ({
      reset: () => {
        setStatus("loading");
        setErrorMessage(null);
        if (typeof window !== "undefined" && window.turnstile && widgetIdRef.current) {
          try {
            window.turnstile.reset(widgetIdRef.current);
            return;
          } catch {
            // If reset fails, re-render the widget
          }
        }
        renderWidget();
      },
      remove: () => {
        generationRef.current++;
        if (typeof window !== "undefined" && window.turnstile && widgetIdRef.current) {
          try {
            window.turnstile.remove(widgetIdRef.current);
          } catch {
            // Ignore removal errors
          }
          widgetIdRef.current = null;
        }
        if (containerRef.current) {
          containerRef.current.innerHTML = "";
        }
      },
      getWidgetId: () => widgetIdRef.current,
      getResponse: () => {
        if (typeof window !== "undefined" && window.turnstile && widgetIdRef.current) {
          try {
            return window.turnstile.getResponse(widgetIdRef.current);
          } catch {
            return undefined;
          }
        }
        return undefined;
      },
    }), [renderWidget]);

    // Load Cloudflare Turnstile script idempotently & mount widget
    React.useEffect(() => {
      let isMounted = true;
      let checkInterval: NodeJS.Timeout | null = null;

      const handleScriptError = () => {
        if (!isMounted) return;
        setStatus("error");
        setErrorMessage("Security check could not be loaded. Please check your connection or ad blocker.");
        if (onErrorRef.current) onErrorRef.current("script-load-error");
      };

      const init = () => {
        if (!isMounted) return;

        if (window.turnstile) {
          renderWidget();
          return;
        }

        // Check if script is already in DOM
        const SCRIPT_ID = "cf-turnstile-script";
        let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;

        if (!script) {
          script = document.createElement("script");
          script.id = SCRIPT_ID;
          script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
          script.async = true;
          script.defer = true;
          script.onerror = handleScriptError;
          document.head.appendChild(script);
        } else {
          script.addEventListener("error", handleScriptError);
        }

        const startTime = Date.now();
        checkInterval = setInterval(() => {
          if (window.turnstile) {
            if (checkInterval) clearInterval(checkInterval);
            if (isMounted) renderWidget();
          } else if (Date.now() - startTime > 10000) {
            // 10 second timeout
            if (checkInterval) clearInterval(checkInterval);
            if (isMounted && !window.turnstile) {
              handleScriptError();
            }
          }
        }, 50);
      };

      init();

      return () => {
        isMounted = false;
        if (checkInterval) clearInterval(checkInterval);
        if (widgetIdRef.current && typeof window !== "undefined" && window.turnstile) {
          try {
            window.turnstile.remove(widgetIdRef.current);
          } catch {
            // Ignore cleanup error
          }
          widgetIdRef.current = null;
        }
      };
    }, [renderWidget]);

    return (
      <div className={`flex flex-col items-center justify-center my-2 ${className}`}>
        <div ref={containerRef} className="min-h-[65px] flex items-center justify-center" />
        {status === "loading" && (
          <div className="text-[11px] text-brand-text-muted animate-pulse flex items-center justify-center gap-1.5 py-1">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-orange" />
            <span>Loading security check...</span>
          </div>
        )}
        {status === "error" && (
          <div className="flex flex-col items-center justify-center gap-1.5 py-1 text-center animate-in fade-in-50 duration-150">
            <div className="flex items-center gap-1 text-[11px] text-red-600 font-medium">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{errorMessage || "Security check failed."}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setStatus("loading");
                setErrorMessage(null);
                renderWidget();
              }}
              className="text-[11px] font-semibold text-brand-orange hover:underline focus:outline-none flex items-center gap-1 mt-0.5"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Retry security check</span>
            </button>
          </div>
        )}
      </div>
    );
  }
);

TurnstileWidget.displayName = "TurnstileWidget";
