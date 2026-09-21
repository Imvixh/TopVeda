"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import {
  Menu,
  ExternalLink,
  ShieldCheck,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { CMS_NAV_SECTIONS } from "./cms-nav-config";

interface CmsTopbarProps {
  onOpenMobile: () => void;
}

export function CmsTopbar({ onOpenMobile }: CmsTopbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  // Compute breadcrumb title based on current path
  let currentPageTitle = "Dashboard";

  for (const sec of CMS_NAV_SECTIONS) {
    const matchedItem = sec.items.find(
      (item) => item.href === pathname || (item.href !== "/admin/cms" && pathname.startsWith(`${item.href}/`))
    );
    if (matchedItem) {
      currentPageTitle = matchedItem.title;
      break;
    }
  }

  return (
    <header className="sticky top-0 z-20 w-full h-16 bg-brand-surface/95 backdrop-blur-md border-b border-brand-border px-4 sm:px-6 flex items-center justify-between">
      {/* Left Area: Mobile Toggle & Breadcrumbs */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onOpenMobile}
          className="lg:hidden h-9 w-9 text-brand-text-muted hover:text-brand-text-primary"
          title="Open Navigation"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs">
          <Link
            href="/admin"
            className="text-brand-text-muted hover:text-brand-text-primary transition-colors hidden sm:inline-block font-medium"
          >
            Admin
          </Link>
          <ChevronRight className="h-3 w-3 text-brand-border hidden sm:inline-block" />
          <Link
            href="/admin/cms"
            className="text-brand-text-muted hover:text-brand-text-primary transition-colors font-medium"
          >
            CMS Suite
          </Link>
          {pathname !== "/admin/cms" && (
            <>
              <ChevronRight className="h-3 w-3 text-brand-border" />
              <span className="font-bold text-brand-text-primary">
                {currentPageTitle}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Right Area: Status & Quick Actions */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Super Admin Role Badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-orange/10 border border-brand-orange-border text-brand-orange font-bold text-[11px]">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>SUPER_ADMIN</span>
        </div>

        {/* View Student Portal Link */}
        <Link href="/student" target="_blank" rel="noopener noreferrer">
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-8 px-2.5 sm:px-3 text-brand-text-muted hover:text-brand-text-primary"
          >
            <span className="hidden sm:inline mr-1">Preview Student Home</span>
            <span className="sm:hidden mr-1">Student App</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </Link>

        {/* Sign Out Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="text-xs h-8 px-2.5 text-brand-text-muted hover:text-red-600"
          title="Sign Out"
        >
          <LogOut className="h-3.5 w-3.5 sm:mr-1.5" />
          <span className="hidden sm:inline">Sign Out</span>
        </Button>
      </div>
    </header>
  );
}
