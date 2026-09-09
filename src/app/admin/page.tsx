"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Container } from "@/components/ui/container";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/brand/wordmark";
import { BrandGlyph } from "@/components/brand/glyph";
import { useAuth } from "@/hooks/use-auth";
import { 
  ShieldCheck, 
  User, 
  Mail, 
  LogOut, 
  ArrowLeft, 
  Loader2, 
  Layers 
} from "lucide-react";

export default function AdminFoundationPage() {
  const router = useRouter();
  const { user, profile, isLoading, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-bg-warm flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-brand-orange" />
          <p className="text-xs font-semibold text-brand-text-muted">Verifying Admin Authorization...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg-warm flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-30 w-full bg-brand-surface border-b border-brand-border/80">
        <Container size="xl">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <BrandGlyph size={26} />
              <Wordmark size="sm" />
            </Link>

            <div className="flex items-center gap-3">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-1.5" />
                  Homepage
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-1.5" />
                Sign Out
              </Button>
            </div>
          </div>
        </Container>
      </header>

      {/* Main Content */}
      <main className="flex-1 py-10">
        <Container size="md">
          <div className="space-y-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="peach" size="sm">RBAC Foundation</Badge>
                <Badge variant="primary" size="sm">
                  {profile?.role === "SUPER_ADMIN" ? "SUPER ADMIN" : "ADMINISTRATOR"}
                </Badge>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-text-primary tracking-tight">
                {profile?.role === "SUPER_ADMIN" ? "Super Admin Account Foundation" : "Admin Authorization Foundation"}
              </h1>
              <p className="text-sm text-brand-text-muted">
                Server-side role verified. You have authorized administrative access to TopVeda.
              </p>
            </div>

            {/* Admin Profile Overview */}
            <Card className="p-6 sm:p-8 space-y-6 shadow-md">
              <div className="flex items-center gap-4 pb-4 border-b border-brand-border">
                <div className="h-14 w-14 rounded-2xl bg-brand-charcoal text-white flex items-center justify-center font-bold text-xl shadow-md">
                  <ShieldCheck className="h-7 w-7 text-brand-orange" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-brand-text-primary">
                    {profile?.fullName || (profile?.role === "SUPER_ADMIN" ? "Super Administrator" : "System Administrator")}
                  </h2>
                  <p className="text-xs text-brand-text-muted">
                    Role: <span className="font-bold text-brand-orange">{profile?.role || "ADMIN"}</span> • Session active
                  </p>
                </div>
              </div>

              {/* Verified Claims Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="rounded-xl bg-brand-bg-warm/80 border border-brand-border/60 p-4 space-y-1.5">
                  <div className="flex items-center gap-2 text-brand-text-muted font-medium">
                    <User className="h-4 w-4 text-brand-orange" />
                    <span>Administrator Name</span>
                  </div>
                  <p className="font-bold text-brand-text-primary text-sm">
                    {profile?.fullName || "Admin"}
                  </p>
                </div>

                <div className="rounded-xl bg-brand-bg-warm/80 border border-brand-border/60 p-4 space-y-1.5">
                  <div className="flex items-center gap-2 text-brand-text-muted font-medium">
                    <Mail className="h-4 w-4 text-brand-orange" />
                    <span>Admin Email</span>
                  </div>
                  <p className="font-bold text-brand-text-primary text-sm truncate">
                    {user?.email || profile?.email || "admin@topveda.com"}
                  </p>
                </div>
              </div>

              {/* Upcoming CMS Notice */}
              <div className="rounded-xl bg-brand-bg-peach/60 border border-brand-orange-border/70 p-4 text-xs space-y-1.5">
                <div className="flex items-center gap-2 text-brand-orange font-bold">
                  <Layers className="h-4 w-4" />
                  <span>Phase 5 Roadmap Notice</span>
                </div>
                <p className="text-brand-text-muted leading-relaxed">
                  The complete Admin CMS & Course Management Panel (curriculum taxonomy, chapter uploads, test creator, and student analytics) will be developed in Phase 5.
                </p>
              </div>
            </Card>
          </div>
        </Container>
      </main>
    </div>
  );
}
