"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import {
  Search,
  ArrowLeftRight,
  MessageSquare,
  Bell,
  ChevronDown,
  Menu,
  LogOut,
  User,
  GraduationCap,
  Settings,
} from "lucide-react";

export interface StudentHeaderProps {
  onOpenMobileMenu?: () => void;
  onToggleSidebar?: () => void;
  isSidebarCollapsed?: boolean;
  className?: string;
}

export function StudentHeader({
  onOpenMobileMenu,
  className,
}: StudentHeaderProps) {
  const router = useRouter();
  const { user, profile, logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const displayName = profile?.fullName || "Abhay Kumar";
  const displayClass = "Class 10 · Student";

  return (
    <header
      className={cn(
        "sticky top-0 z-30 w-full bg-white/95 backdrop-blur-md border-b border-brand-border/70 px-4 sm:px-6 py-2.5",
        className
      )}
    >
      <div className="flex items-center justify-between gap-4 max-w-[1440px] mx-auto">
        {/* Mobile Menu Button */}
        <div className="flex items-center gap-2 lg:hidden">
          <button
            onClick={onOpenMobileMenu}
            className="p-2 rounded-lg text-brand-text-muted hover:text-brand-text-primary hover:bg-brand-bg-warm transition-colors"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        {/* Global Search Bar */}
        <div className="flex-1 max-w-xl">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-brand-text-subtle group-focus-within:text-brand-orange transition-colors">
              <Search className="h-4 w-4" />
            </div>
            <input
              type="text"
              placeholder="Search for courses, batches, lectures, notes, tests..."
              className="w-full h-10 pl-10 pr-16 bg-[#F8F9FA] hover:bg-[#F2F4F7] focus:bg-white text-xs text-brand-text-primary placeholder:text-brand-text-subtle rounded-xl border border-transparent focus:border-brand-orange/40 focus:ring-2 focus:ring-brand-orange/10 transition-all outline-none"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-semibold text-brand-text-muted bg-white border border-brand-border rounded-md shadow-2xs">
                Ctrl K
              </kbd>
            </div>
          </div>
        </div>

        {/* Right Utility Icons & Profile Dropdown */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Quick Action Buttons */}
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              className="p-2 rounded-xl text-brand-text-muted hover:text-brand-text-primary hover:bg-[#F8F9FA] transition-colors"
              title="Switch Mode / Exchange"
              aria-label="Switch"
            >
              <ArrowLeftRight className="h-4 w-4" />
            </button>

            <button
              className="p-2 rounded-xl text-brand-text-muted hover:text-brand-text-primary hover:bg-[#F8F9FA] transition-colors"
              title="Discussions"
              aria-label="Discussions"
            >
              <MessageSquare className="h-4 w-4" />
            </button>

            <Link
              href="/student/notifications"
              className="relative p-2 rounded-xl text-brand-text-muted hover:text-brand-text-primary hover:bg-[#F8F9FA] transition-colors"
              title="Notifications"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
            </Link>
          </div>

          <div className="h-6 w-px bg-brand-border/80 hidden sm:block" />

          {/* User Profile Pill */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2.5 p-1 sm:px-2 sm:py-1 rounded-xl hover:bg-[#F8F9FA] transition-colors group select-none text-left"
              aria-expanded={isDropdownOpen}
              aria-haspopup="true"
            >
              <div className="relative w-9 h-9 rounded-full overflow-hidden border border-brand-orange-border/60 bg-brand-bg-peach flex items-center justify-center shrink-0">
                <Image
                  src="/assets/student/student-avatar.jpg"
                  alt={displayName}
                  width={36}
                  height={36}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="hidden md:flex flex-col">
                <span className="text-xs font-bold text-brand-charcoal leading-tight group-hover:text-brand-orange transition-colors">
                  {displayName}
                </span>
                <span className="text-[11px] font-medium text-brand-text-muted leading-tight">
                  {displayClass}
                </span>
              </div>

              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 text-brand-text-muted transition-transform duration-200 hidden sm:block",
                  isDropdownOpen && "rotate-180"
                )}
              />
            </button>

            {/* Profile Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl border border-brand-border/80 shadow-lg py-2 z-50 animate-in fade-in-50 zoom-in-95 duration-100">
                <div className="px-4 py-2 border-b border-brand-border/60">
                  <p className="text-xs font-bold text-brand-text-primary">{displayName}</p>
                  <p className="text-[11px] text-brand-text-muted truncate">
                    {user?.email || profile?.email || "student@topveda.in"}
                  </p>
                </div>

                <div className="py-1">
                  <Link
                    href="/student/profile"
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-brand-text-primary hover:bg-brand-bg-peach hover:text-brand-orange transition-colors"
                  >
                    <User className="h-4 w-4 text-brand-text-muted" />
                    Student Profile
                  </Link>

                  <Link
                    href="/student/learning"
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-brand-text-primary hover:bg-brand-bg-peach hover:text-brand-orange transition-colors"
                  >
                    <GraduationCap className="h-4 w-4 text-brand-text-muted" />
                    My Learning
                  </Link>

                  <Link
                    href="/student/settings"
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-brand-text-primary hover:bg-brand-bg-peach hover:text-brand-orange transition-colors"
                  >
                    <Settings className="h-4 w-4 text-brand-text-muted" />
                    Account Settings
                  </Link>
                </div>

                <div className="pt-1 border-t border-brand-border/60">
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2.5 w-full px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors text-left"
                  >
                    <LogOut className="h-4 w-4 text-red-500" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
