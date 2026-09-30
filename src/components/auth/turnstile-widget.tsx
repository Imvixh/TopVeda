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
    const [isLoaded, setIsLoaded] = React.useState(false);

    // Turnstile Site Key (Public)
    // Development: configured key or official Cloudflare testing sitekey
    // Production: MUST be configured via NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY (no fallback to test key)
    const siteKey =
      process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY ||
      (process.env.NODE_ENV !== "production" ? "1x00000000000000000000AA" : "");

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
      if (!containerRef.current || !window.turnstile) return;

      const currentGen = ++generationRef.current;

      if (!siteKey) {
        if (process.env.NODE_ENV === "production") {
          console.error("[TurnstileWidget] Production Turnstile site key is missing.");
        }
        if (onErrorRef.current) onErrorRef.current("missing-sitekey");
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
              onVerifyRef.current(token);
            }
          },
          "expired-callback": () => {
            if (currentGen === generationRef.current && onExpireRef.current) {
              onExpireRef.current();
            }
          },
          "error-callback": (errorCode?: string) => {
            if (currentGen === generationRef.current && onErrorRef.current) {
              onErrorRef.current(errorCode);
            }
          },
          "timeout-callback": () => {
            if (currentGen === generationRef.current) {
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
        setIsLoaded(true);
      } catch {
        // Gracefully handle render error
      }
    }, [siteKey, theme, size, action]);

    // Expose imperative methods to parent
    React.useImperativeHandle(ref, () => ({
      reset: () => {
        generationRef.current++;
        if (typeof window !== "undefined" && window.turnstile) {
          if (widgetIdRef.current) {
            try {
              window.turnstile.reset(widgetIdRef.current);
              return;
            } catch {
              // If reset fails, re-render the widget
            }
          }
          renderWidget();
        }
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

      const init = () => {
        if (!isMounted) return;
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

          const checkInterval = setInterval(() => {
            if (window.turnstile) {
              clearInterval(checkInterval);
              if (isMounted) renderWidget();
            }
          }, 50);

          return () => {
            clearInterval(checkInterval);
          };
        }
      };

      const cleanupScriptCheck = init();

      return () => {
        isMounted = false;
        if (cleanupScriptCheck) cleanupScriptCheck();
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
