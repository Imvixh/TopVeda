"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { BrandGlyph } from "@/components/brand/glyph";
import { Wordmark } from "@/components/brand/wordmark";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { CMS_NAV_SECTIONS } from "./cms-nav-config";
import {
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  LogOut,
  ShieldCheck,
  X,
} from "lucide-react";

interface CmsSidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function CmsSidebar({
  isCollapsed,
  onToggleCollapse,
  isMobileOpen = false,
  onCloseMobile,
}: CmsSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-brand-charcoal/50 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-brand-surface border-r border-brand-border transition-all duration-300 ease-in-out lg:static lg:z-30",
          isCollapsed ? "w-20" : "w-72",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Brand & Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-brand-border shrink-0">
          {!isCollapsed ? (
            <Link
              href="/admin/cms"
              className="flex items-center gap-2.5 overflow-hidden group"
            >
              <BrandGlyph size={28} />
              <div className="flex items-center gap-1.5">
                <Wordmark size="sm" />
                <Badge variant="primary" size="sm" className="text-[10px] px-1.5 py-0 font-bold uppercase tracking-wider">
                  CMS
                </Badge>
              </div>
            </Link>
          ) : (
            <Link
              href="/admin/cms"
              className="mx-auto flex items-center justify-center group"
              title="TopVeda CMS Dashboard"
            >
              <BrandGlyph size={28} />
            </Link>
          )}

          {/* Desktop Collapse Toggle */}
          <div className="hidden lg:flex items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleCollapse}
              className="h-7 w-7 text-brand-text-muted hover:text-brand-text-primary rounded-lg"
              title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Mobile Close Button */}
          {onCloseMobile && (
            <div className="flex lg:hidden items-center">
              <Button
                variant="ghost"
                size="icon"
                onClick={onCloseMobile}
                className="h-8 w-8 text-brand-text-muted hover:text-brand-text-primary"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          )}
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin scrollbar-thumb-brand-border">
          {CMS_NAV_SECTIONS.map((section) => (
            <div key={section.section} className="space-y-1">
              {!isCollapsed && (
                <p className="px-3 text-[10px] font-extrabold tracking-wider uppercase text-brand-text-muted/80">
                  {section.section}
                </p>
              )}
              {isCollapsed && (
                <div className="w-full flex justify-center py-1">
                  <div className="w-5 h-[1px] bg-brand-border" />
                </div>
              )}

              <nav className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    item.href === "/admin/cms"
                      ? pathname === "/admin/cms"
                      : pathname === item.href || pathname.startsWith(`${item.href}/`);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onCloseMobile}
                      title={isCollapsed ? item.title : undefined}
                      className={cn(
                        "group flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 relative",
                        isActive
                          ? "bg-brand-orange/10 text-brand-orange shadow-2xs font-bold"
                          : "text-brand-text-muted hover:text-brand-text-primary hover:bg-brand-bg-warm/80",
                        isCollapsed && "justify-center px-0 py-2.5"
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0 transition-colors",
                          isActive
                            ? "text-brand-orange"
                            : "text-brand-text-muted group-hover:text-brand-text-primary"
                        )}
                      />

                      {!isCollapsed && (
                        <span className="truncate flex-1">{item.title}</span>
                      )}

                      {!isCollapsed && item.badge && (
                        <Badge
                          variant={item.badgeVariant || "default"}
                          size="sm"
                          className="ml-auto text-[10px] px-1.5 py-0"
                        >
                          {item.badge}
                        </Badge>
                      )}

                      {/* Active Left Indicator Bar */}
                      {isActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-brand-orange rounded-r-full" />
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>

        {/* Sidebar Footer: Back to Admin & Super Admin Profile */}
        <div className="p-3 border-t border-brand-border shrink-0 space-y-2 bg-brand-bg-warm/50">
          {/* Back to Admin Foundation Link */}
          <Link
            href="/admin"
            className={cn(
              "flex items-center gap-2 px-3 py-2 text-xs font-semibold text-brand-text-muted hover:text-brand-text-primary hover:bg-brand-surface rounded-xl transition-all border border-brand-border/60 shadow-2xs",
              isCollapsed && "justify-center px-0"
            )}
            title="Return to Admin Center"
          >
            <ArrowLeft className="h-4 w-4 shrink-0 text-brand-orange" />
            {!isCollapsed && <span>Admin Center</span>}
          </Link>

          {/* Super Admin User Capsule */}
          {!isCollapsed ? (
            <div className="p-2.5 rounded-xl bg-brand-surface border border-brand-border/80 shadow-2xs">
              <div className="flex items-center justify-between gap-2">
                <Link
                  href="/admin/profile"
                  className="flex items-center gap-2.5 min-w-0 flex-1 hover:opacity-80 transition-opacity"
                  title="View Administrator Profile"
                >
                  <div className="h-8 w-8 rounded-lg bg-brand-charcoal text-white flex items-center justify-center shrink-0">
                    <ShieldCheck className="h-4 w-4 text-brand-orange" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-brand-text-primary truncate">
                      {profile?.fullName || "Super Admin"}
                    </p>
                    <p className="text-[10px] text-brand-orange font-semibold truncate">
                      SUPER_ADMIN
                    </p>
                  </div>
                </Link>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  className="h-7 w-7 text-brand-text-muted hover:text-red-600 shrink-0"
                  title="Sign Out"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Link
                href="/admin/profile"
                className="h-8 w-8 rounded-lg bg-brand-charcoal text-white flex items-center justify-center hover:opacity-80 transition-opacity"
                title="Admin Profile"
              >
                <ShieldCheck className="h-4 w-4 text-brand-orange" />
              </Link>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="h-8 w-8 text-brand-text-muted hover:text-red-600 rounded-lg"
                title="Sign Out"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
