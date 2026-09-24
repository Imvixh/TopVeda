"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  AlertCircle,
  Radio,
  ExternalLink,
  RefreshCw,
  Unlink,
  Loader2,
  ShieldCheck,
  KeyRound,
  Info,
} from "lucide-react";
import { YoutubeIcon } from "@/components/brand/youtube-icon";

interface YouTubeStatusData {
  connected: boolean;
  channelId?: string;
  channelTitle?: string;
  channelThumbnailUrl?: string;
  connectedAt?: string;
  updatedAt?: string;
  error?: string;
}

export default function YouTubeIntegrationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = React.useState<YouTubeStatusData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isDisconnecting, setIsDisconnecting] = React.useState(false);

  const successParam = searchParams.get("success");
  const channelTitleParam = searchParams.get("channelTitle");
  const errorParam = searchParams.get("error");

  const fetchStatus = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/youtube/status");
      if (res.ok) {
        const data: YouTubeStatusData = await res.json();
        setStatus(data);
      } else {
        setStatus({ connected: false });
      }
    } catch {
      setStatus({ connected: false });
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleConnect = () => {
    // Direct browser navigation to server-side OAuth connect route
    window.location.href = "/api/youtube/oauth/connect";
  };

  const handleDisconnect = async () => {
    if (!window.confirm("Are you sure you want to disconnect this YouTube account?")) {
      return;
    }

    try {
      setIsDisconnecting(true);
      const res = await fetch("/api/youtube/disconnect", { method: "POST" });
      if (res.ok) {
        await fetchStatus();
        router.replace("/admin/cms/integrations/youtube");
      }
    } catch (err) {
      console.error("Failed to disconnect YouTube:", err);
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shadow-xs border border-red-100">
              <YoutubeIcon className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-brand-text-primary tracking-tight">
                YouTube Integration
              </h1>
              <p className="text-xs text-brand-text-muted font-medium">
                Server-side Google OAuth 2.0 & YouTube live broadcasting identity for TopVeda
              </p>
            </div>
          </div>
        </div>

        {/* Status Badge */}
        <div>
          {isLoading ? (
            <Badge variant="outline" size="sm" className="gap-1.5 py-1">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking Status...
            </Badge>
          ) : status?.connected ? (
            <Badge variant="success" size="sm" className="gap-1.5 py-1 text-xs font-bold uppercase tracking-wider">
              <CheckCircle2 className="h-3.5 w-3.5" /> Connected
            </Badge>
          ) : (
            <Badge variant="neutral" size="sm" className="gap-1.5 py-1 text-xs font-bold uppercase tracking-wider">
              <AlertCircle className="h-3.5 w-3.5" /> Not Connected
            </Badge>
          )}
        </div>
      </div>

      {/* Flash Alerts from OAuth Redirect */}
      {successParam === "true" && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-3 shadow-2xs">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-0.5">
            <p className="font-bold text-emerald-950">YouTube Account Connected Successfully!</p>
            <p className="text-emerald-800">
              TopVeda is now authenticated with{" "}
              <strong>{channelTitleParam || "your YouTube channel"}</strong>. Refresh tokens are encrypted and securely stored.
            </p>
          </div>
        </div>
      )}

      {errorParam && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 flex items-start gap-3 shadow-2xs">
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-0.5">
            <p className="font-bold text-red-950">Connection Error</p>
            <p className="text-red-800">{decodeURIComponent(errorParam)}</p>
          </div>
        </div>
      )}

      {/* Main Connection Card */}
      <Card className="p-6 sm:p-8 space-y-6 border border-brand-border/80 shadow-sm bg-brand-surface">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-brand-text-primary">
              Channel Connection & Identity
            </h2>
            <p className="text-xs text-brand-text-muted">
              Connect the official TopVeda YouTube channel to enable server-authoritative live broadcast management and streaming identity.
            </p>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={fetchStatus}
            disabled={isLoading}
            className="h-8 text-xs text-brand-text-muted hover:text-brand-text-primary"
            title="Refresh Status"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Loading Skeleton */}
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-7 w-7 animate-spin text-brand-orange" />
            <p className="text-xs font-semibold text-brand-text-muted">
              Querying platform integration status...
            </p>
          </div>
        ) : status?.connected ? (
          /* Connected State */
          <div className="space-y-6">
            <div className="p-4 sm:p-5 rounded-2xl bg-brand-bg-warm/60 border border-brand-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                {status.channelThumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={status.channelThumbnailUrl}
                    alt={status.channelTitle || "YouTube Channel"}
                    className="h-14 w-14 rounded-full border-2 border-brand-surface shadow-xs object-cover shrink-0"
                  />
                ) : (
                  <div className="h-14 w-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0 border border-red-200">
                    <YoutubeIcon className="h-7 w-7" />
                  </div>
                )}

                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold text-brand-text-primary truncate">
                      {status.channelTitle || "Connected YouTube Channel"}
                    </h3>
                    <Badge variant="success" size="sm" className="text-[10px] px-1.5 py-0">
                      Active
                    </Badge>
                  </div>
                  <p className="text-xs font-mono text-brand-text-muted truncate">
                    Channel ID: <span className="text-brand-text-primary font-semibold">{status.channelId || "N/A"}</span>
                  </p>
                  {status.connectedAt && (
                    <p className="text-[11px] text-brand-text-muted">
                      Connected on: {new Date(status.connectedAt).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  )}
                </div>
              </div>

              {status.channelId && (
                <a
                  href={`https://www.youtube.com/channel/${status.channelId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0"
                >
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                    <ExternalLink className="h-3.5 w-3.5" /> View Channel
                  </Button>
                </a>
              )}
            </div>

            {/* Action Bar */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-brand-border">
              <div className="text-xs text-brand-text-muted flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                OAuth credentials and refresh tokens are encrypted with AES-256-GCM.
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDisconnect}
                  disabled={isDisconnecting}
                  className="w-full sm:w-auto text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                >
                  <Unlink className="h-3.5 w-3.5 mr-1.5" />
                  {isDisconnecting ? "Disconnecting..." : "Disconnect"}
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleConnect}
                  className="w-full sm:w-auto text-xs gap-1.5 bg-red-600 hover:bg-red-700 text-white"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Reconnect YouTube
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* Disconnected State */
          <div className="py-8 text-center space-y-6">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center border border-red-100 shadow-xs">
              <Radio className="h-8 w-8" />
            </div>

            <div className="max-w-md mx-auto space-y-2">
              <h3 className="text-base font-bold text-brand-text-primary">
                No YouTube Account Connected
              </h3>
              <p className="text-xs text-brand-text-muted leading-relaxed">
                Connect your Google/YouTube account to grant TopVeda authorization to create and manage live interactive broadcasts for educators.
              </p>
            </div>

            <div className="pt-2">
              <Button
                variant="primary"
                size="md"
                onClick={handleConnect}
                className="gap-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-6 shadow-sm"
              >
                <YoutubeIcon className="h-4 w-4" /> Connect YouTube
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Security & Architecture Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 space-y-2 border border-brand-border bg-brand-surface/70">
          <div className="flex items-center gap-2 text-brand-text-primary font-bold text-xs">
            <KeyRound className="h-4 w-4 text-brand-orange" />
            <span>AES-256-GCM Encryption</span>
          </div>
          <p className="text-[11px] text-brand-text-muted leading-normal">
            Refresh tokens are encrypted at the application layer with authenticated AES-GCM before database storage.
          </p>
        </Card>

        <Card className="p-4 space-y-2 border border-brand-border bg-brand-surface/70">
          <div className="flex items-center gap-2 text-brand-text-primary font-bold text-xs">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>Server-Authoritative Secrets</span>
          </div>
          <p className="text-[11px] text-brand-text-muted leading-normal">
            Client secrets, tokens, and OAuth codes are strictly isolated server-side and never exposed to browsers or logs.
          </p>
        </Card>

        <Card className="p-4 space-y-2 border border-brand-border bg-brand-surface/70">
          <div className="flex items-center gap-2 text-brand-text-primary font-bold text-xs">
            <Info className="h-4 w-4 text-blue-600" />
            <span>Pluggable Streaming Architecture</span>
          </div>
          <p className="text-[11px] text-brand-text-muted leading-normal">
            Implements the unified IStreamingProvider abstraction, allowing seamless coexistence with Cloudflare or future providers.
          </p>
        </Card>
      </div>
    </div>
  );
}
