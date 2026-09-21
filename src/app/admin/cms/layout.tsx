"use client";

import * as React from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { CmsSidebar } from "@/components/admin/cms/cms-sidebar";
import { CmsTopbar } from "@/components/admin/cms/cms-topbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldAlert, ArrowLeft } from "lucide-react";

export default function SuperAdminCmsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile, isLoading } = useAuth();
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);

  // 1. Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-bg-warm flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-brand-orange" />
          <p className="text-xs font-semibold text-brand-text-muted tracking-wide">
            Verifying Super Admin Authorization...
          </p>
        </div>
      </div>
    );
  }

  // 2. Authorization Check (Super Admin Only)
  const isSuperAdmin = profile?.role === "SUPER_ADMIN";

  if (!user || !isSuperAdmin) {
    return (
      <div className="min-h-screen bg-brand-bg-warm flex items-center justify-center p-4 sm:p-6">
        <Card className="max-w-md w-full p-6 sm:p-8 space-y-6 text-center shadow-lg border-2 border-red-200">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shadow-xs">
            <ShieldAlert className="h-8 w-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-extrabold text-brand-text-primary tracking-tight">
              Access Restricted
            </h1>
            <p className="text-xs text-brand-text-muted leading-relaxed">
              The TopVeda Content Management System is strictly reserved for authenticated{" "}
              <strong className="text-brand-orange">SUPER_ADMIN</strong> accounts. Your current profile role (
              <span className="font-semibold text-brand-text-primary">{profile?.role || "UNAUTHORIZED"}</span>) does not have sufficient clearance.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <Link href="/admin" className="flex-1">
              <Button variant="outline" size="sm" className="w-full">
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Admin Center
              </Button>
            </Link>
            <Link href="/" className="flex-1">
              <Button variant="primary" size="sm" className="w-full">
                Return Home
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // 3. Render Authorized CMS Shell
  return (
    <div className="min-h-screen bg-brand-bg-warm flex">
      {/* Collapsible Left Sidebar */}
      <CmsSidebar
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed((prev) => !prev)}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <CmsTopbar onOpenMobile={() => setIsMobileOpen(true)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
