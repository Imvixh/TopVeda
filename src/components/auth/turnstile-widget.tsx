"use client";

import * as React from "react";

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
          theme?: "light" | "dark" | "auto";
          size?: "normal" | "compact" | "flexible";
          action?: string;
          "refresh-expired"?: "auto" | "manual" | "never";
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
}

export interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
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
      theme = "auto",
      size = "normal",
      action,
      className = "",
    },
    ref
  ) => {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const widgetIdRef = React.useRef<string | null>(null);
    const [isLoaded, setIsLoaded] = React.useState(false);

    // Turnstile Site Key (Public)
    // Production domain: topveda.in
    const siteKey =
      process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY ||
      "1x00000000000000000000AA"; // Cloudflare always-passes test sitekey fallback

    // Expose imperative reset method to parent
    React.useImperativeHandle(ref, () => ({
      reset: () => {
        if (typeof window !== "undefined" && window.turnstile && widgetIdRef.current) {
          try {
            window.turnstile.reset(widgetIdRef.current);
          } catch {
            // Ignore reset failure
          }
        }
      },
    }));

    // Load Cloudflare Turnstile script idempotently
    React.useEffect(() => {
      let isMounted = true;

      const renderWidget = () => {
        if (!isMounted || !containerRef.current || !window.turnstile) return;

        // Prevent double render in React StrictMode
        if (widgetIdRef.current) {
          try {
            window.turnstile.remove(widgetIdRef.current);
          } catch {
            // Ignore removal errors
          }
          widgetIdRef.current = null;
        }

        try {
          const id = window.turnstile.render(containerRef.current, {
            sitekey: siteKey,
            callback: (token: string) => {
              if (isMounted) onVerify(token);
            },
            "expired-callback": () => {
              if (isMounted && onExpire) onExpire();
            },
            "error-callback": () => {
              if (isMounted && onError) onError();
            },
            theme,
            size,
            action,
            "refresh-expired": "auto",
          });

          widgetIdRef.current = id;
          setIsLoaded(true);
        } catch {
          // Gracefully handle render error
        }
      };

      if (typeof window !== "undefined") {
        if (window.turnstile) {
          renderWidget();
        } else {
          // Check if script is already in DOM
          const SCRIPT_ID = "cf-turnstile-script";
          let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;

          if (!script) {
            script = document.createElement("script");
            script.id = SCRIPT_ID;
            script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
            script.async = true;
            script.defer = true;
            document.head.appendChild(script);
          }

          const checkTurnstileInterval = setInterval(() => {
            if (window.turnstile) {
              clearInterval(checkTurnstileInterval);
              renderWidget();
            }
          }, 50);

          return () => {
            clearInterval(checkTurnstileInterval);
            isMounted = false;
            if (widgetIdRef.current && window.turnstile) {
              try {
                window.turnstile.remove(widgetIdRef.current);
              } catch {
                // Ignore cleanup error
              }
            }
          };
        }
      }

      return () => {
        isMounted = false;
        if (widgetIdRef.current && window.turnstile) {
          try {
            window.turnstile.remove(widgetIdRef.current);
          } catch {
            // Ignore cleanup error
          }
        }
      };
    }, [siteKey, theme, size, action, onVerify, onExpire, onError]);

    return (
      <div className={`flex flex-col items-center justify-center my-2 ${className}`}>
        <div ref={containerRef} className="min-h-[65px] flex items-center justify-center" />
        {!isLoaded && (
          <div className="text-[11px] text-brand-text-muted animate-pulse">
            Loading security check...
          </div>
        )}
      </div>
    );
  }
);

TurnstileWidget.displayName = "TurnstileWidget";
