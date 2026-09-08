"use client";

import * as React from "react";
import { Container } from "@/components/ui/container";
import { Wordmark } from "@/components/brand/wordmark";
import { BrandGlyph } from "@/components/brand/glyph";
import { landingConfig } from "@/config/landing.config";
import { 
  Mail, 
  Phone,
  ArrowUp
} from "lucide-react";

export interface FooterProps {
  onOpenTerms: () => void;
  onOpenPrivacy: () => void;
}

/** Custom SVG icons for social channels */
function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function YoutubeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

export function Footer({ onOpenTerms, onOpenPrivacy }: FooterProps) {
  const { footer } = landingConfig;

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="bg-brand-charcoal text-white pt-16 pb-12 border-t border-brand-border/20">
      <Container size="xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-gray-800">
          
          {/* Brand Info & Mission */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <BrandGlyph size={28} />
              <Wordmark size="md" inverseVeda />
            </div>
            <p className="text-sm text-gray-400 max-w-sm leading-relaxed">
              {footer.description}
            </p>

            {/* Social Media Links from Centralized Config */}
            <div className="pt-2">
              <p className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-3">
                Connect With Us
              </p>
              <div className="flex items-center gap-3 text-gray-400">
                <a
                  href={footer.social.x}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-9 w-9 rounded-lg bg-gray-800/80 hover:bg-brand-orange hover:text-white flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange"
                  aria-label="TopVeda on X"
                >
                  <XIcon className="h-4 w-4" />
                </a>
                <a
                  href={footer.social.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-9 w-9 rounded-lg bg-gray-800/80 hover:bg-brand-orange hover:text-white flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange"
                  aria-label="TopVeda on YouTube"
                >
                  <YoutubeIcon className="h-4 w-4" />
                </a>
                <a
                  href={footer.social.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-9 w-9 rounded-lg bg-gray-800/80 hover:bg-brand-orange hover:text-white flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange"
                  aria-label="TopVeda on Instagram"
                >
                  <InstagramIcon className="h-4 w-4" />
                </a>
                <a
                  href={footer.social.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-9 w-9 rounded-lg bg-gray-800/80 hover:bg-brand-orange hover:text-white flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange"
                  aria-label="TopVeda on Facebook"
                >
                  <FacebookIcon className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>

          {/* Navigation Columns */}
          {footer.columns.map((col) => (
            <div key={col.title} className="space-y-4">
              <h3 className="text-sm font-bold text-gray-200 tracking-wider uppercase">
                {col.title}
              </h3>
              <ul className="space-y-2.5 text-sm text-gray-400">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="hover:text-brand-orange transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* About & Contact Section Targets */}
        <div className="py-8 grid grid-cols-1 md:grid-cols-2 gap-8 border-b border-gray-800 text-xs text-gray-400">
          <div id="about" className="space-y-2">
            <h4 className="font-bold text-gray-200 text-sm">About TopVeda</h4>
            <p className="leading-relaxed">
              TopVeda is an academic learning ecosystem created to deliver equal access to high-quality interactive education, concept drills, and rigorous exam preparation across diverse educational boards.
            </p>
          </div>
          <div id="contact" className="space-y-2">
            <h4 className="font-bold text-gray-200 text-sm">Contact & Support</h4>
            <p className="leading-relaxed">
              Have inquiries regarding our upcoming batches or educator collaborations? Reach our support team.
            </p>
            <div className="flex flex-wrap gap-4 pt-1">
              <span className="flex items-center gap-1.5 text-gray-300">
                <Mail className="h-3.5 w-3.5 text-brand-orange" />
                support@topveda.com
              </span>
              <span className="flex items-center gap-1.5 text-gray-300">
                <Phone className="h-3.5 w-3.5 text-brand-orange" />
                +91 (Support Helpline)
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
          <p>{footer.legal.copyright}</p>

          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={onOpenTerms}
              className="hover:text-brand-orange transition-colors focus:outline-none"
            >
              {footer.legal.termsText}
            </button>
            <button
              type="button"
              onClick={onOpenPrivacy}
              className="hover:text-brand-orange transition-colors focus:outline-none"
            >
              {footer.legal.privacyText}
            </button>
            <button
              type="button"
              onClick={scrollToTop}
              className="h-8 w-8 rounded-lg bg-gray-800 text-gray-400 hover:text-white hover:bg-brand-orange flex items-center justify-center transition-colors focus:outline-none"
              aria-label="Scroll to top"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          </div>
        </div>
      </Container>
    </footer>
  );
}
