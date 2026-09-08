"use client";

import * as React from "react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/brand/wordmark";
import { BrandGlyph } from "@/components/brand/glyph";
import { landingConfig } from "@/config/landing.config";
import { Menu, X, LogIn, UserPlus } from "lucide-react";

export interface NavbarProps {
  onOpenLogin: () => void;
  onOpenRegister: () => void;
}

export function Navbar({ onOpenLogin, onOpenRegister }: NavbarProps) {
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
          <a
            href="#"
            className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange rounded-lg p-1 transition-transform active:scale-95"
            aria-label="TopVeda Homepage"
          >
            <BrandGlyph size={28} />
            <Wordmark size="md" />
          </a>

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
            </div>
          </div>
        )}
      </Container>
    </header>
  );
}
