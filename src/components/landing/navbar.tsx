"use client";

import * as React from "react";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/brand/wordmark";
import { BrandGlyph } from "@/components/brand/glyph";
import { landingConfig } from "@/config/landing.config";
import { useAuth } from "@/hooks/use-auth";
import { Menu, X, LogIn, UserPlus, LayoutDashboard, LogOut, Shield } from "lucide-react";

export interface NavbarProps {
  onOpenLogin: () => void;
  onOpenRegister: () => void;
}

export function Navbar({ onOpenLogin, onOpenRegister }: NavbarProps) {
  const { user, profile, role, isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";
  const dashboardHref = isAdmin ? "/admin" : "/student";
  const adminLabel = role === "SUPER_ADMIN" ? "Super Admin" : "Admin Area";

  return (
    <header
      className={`sticky top-0 z-40 w-full transition-all duration-200 ${
        scrolled
          ? "bg-brand-surface/95 backdrop-blur-md border-b border-brand-border shadow-subtle"
          : "bg-brand-bg-warm/90 backdrop-blur-sm border-b border-brand-border/60"
      }`}
    >
      <Container size="xl">
        <div className="flex h-18 items-center justify-between gap-4">
          {/* Brand Logo & Wordmark */}
          <Link
            href="/"
            className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange rounded-lg p-1 transition-transform active:scale-95"
            aria-label="TopVeda Homepage"
          >
            <BrandGlyph size={28} />
            <Wordmark size="md" />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2" aria-label="Main Navigation">
            {landingConfig.navigation.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="px-3.5 py-2 text-sm font-medium text-brand-text-primary/90 hover:text-brand-orange rounded-lg hover:bg-brand-bg-peach/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange"
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Right Action Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <Link href={dashboardHref}>
                  <Button variant="primary" size="sm" className="shadow-subtle">
                    {isAdmin ? (
                      <Shield className="h-4 w-4 mr-1.5" />
                    ) : (
                      <LayoutDashboard className="h-4 w-4 mr-1.5" />
                    )}
                    {isAdmin ? adminLabel : "Student Area"}
                  </Button>
                </Link>

                <div className="flex items-center gap-2 pl-2 border-l border-brand-border">
                  <div className="h-8 w-8 rounded-full bg-brand-bg-peach border border-brand-orange-border flex items-center justify-center text-brand-orange font-bold text-xs">
                    {profile?.fullName ? profile.fullName.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-semibold text-brand-text-primary max-w-[120px] truncate">
                    {profile?.fullName || user?.email}
                  </span>
                  <button
                    onClick={() => logout()}
                    className="p-1.5 rounded-lg text-brand-text-muted hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Sign Out"
                    aria-label="Sign Out"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onOpenLogin}
                  className="text-sm font-semibold"
                >
                  <LogIn className="h-4 w-4 mr-1.5" />
                  Sign In
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={onOpenRegister}
                  className="shadow-subtle"
                >
                  <UserPlus className="h-4 w-4 mr-1.5" />
                  Get Started
                </Button>
              </>
            )}
          </div>

          {/* Mobile Hamburger Button */}
          <div className="flex md:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-brand-text-primary hover:bg-brand-bg-peach hover:text-brand-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange"
              aria-expanded={mobileMenuOpen}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-brand-border bg-brand-surface py-4 px-2 space-y-3 animate-in slide-in-from-top-2 duration-200">
            <nav className="flex flex-col space-y-1">
              {landingConfig.navigation.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={closeMobileMenu}
                  className="px-4 py-2.5 text-sm font-medium text-brand-text-primary hover:text-brand-orange hover:bg-brand-bg-peach rounded-lg transition-colors"
                >
                  {item.label}
                </a>
              ))}
            </nav>
            <div className="pt-3 border-t border-brand-border-subtle flex flex-col gap-2 px-2">
              {isAuthenticated ? (
                <>
                  <div className="flex items-center gap-2.5 px-2 py-1.5 bg-brand-bg-warm rounded-lg">
                    <div className="h-8 w-8 rounded-full bg-brand-bg-peach border border-brand-orange-border flex items-center justify-center text-brand-orange font-bold text-xs">
                      {profile?.fullName ? profile.fullName.charAt(0).toUpperCase() : "U"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-brand-text-primary truncate">
                        {profile?.fullName || user?.email}
                      </p>
                      <p className="text-[10px] text-brand-text-muted">
                        Role: {role || "STUDENT"}
                      </p>
                    </div>
                  </div>
                  <Link href={dashboardHref} onClick={closeMobileMenu}>
                    <Button variant="primary" size="md" className="w-full justify-center">
                      <LayoutDashboard className="h-4 w-4 mr-2" />
                      {isAdmin ? adminLabel : "Student Area"}
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="md"
                    className="w-full justify-center text-red-600 hover:bg-red-50"
                    onClick={() => {
                      closeMobileMenu();
                      logout();
                    }}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="md"
                    className="w-full justify-center"
                    onClick={() => {
                      closeMobileMenu();
                      onOpenLogin();
                    }}
                  >
                    <LogIn className="h-4 w-4 mr-2" />
                    Sign In
                  </Button>
                  <Button
                    variant="primary"
                    size="md"
                    className="w-full justify-center"
                    onClick={() => {
                      closeMobileMenu();
                      onOpenRegister();
                    }}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Get Started
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </Container>
    </header>
  );
}

