"use client";

import * as React from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/brand/wordmark";
import { ShieldCheck, FileText } from "lucide-react";

export type LegalType = "terms" | "privacy";

export interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  type?: LegalType;
}

export function LegalModal({
  isOpen,
  onClose,
  type = "terms",
}: LegalModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="lg"
      title={type === "terms" ? "Terms & Conditions" : "Privacy Policy"}
      description={
        type === "terms"
          ? "Please read these terms and conditions carefully before using TopVeda."
          : "Learn how TopVeda protects and handles your personal information."
      }
    >
      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 text-xs text-brand-text-muted leading-relaxed">
        <div className="flex items-center gap-2 p-3 rounded-lg bg-brand-bg-peach border border-brand-orange-border/40 text-brand-text-primary">
          {type === "terms" ? (
            <FileText className="h-5 w-5 text-brand-orange shrink-0" />
          ) : (
            <ShieldCheck className="h-5 w-5 text-brand-orange shrink-0" />
          )}
          <span className="font-medium text-xs">
            Draft version for platform foundation and preview.
          </span>
        </div>

        {type === "terms" ? (
          <>
            <div className="space-y-1.5">
              <h4 className="font-bold text-brand-text-primary text-sm">1. Acceptance of Terms</h4>
              <p>
                By creating an account, browsing courses, or accessing educational materials on TopVeda, you agree to comply with and be bound by these Terms of Service.
              </p>
            </div>

            <div className="space-y-1.5">
              <h4 className="font-bold text-brand-text-primary text-sm">2. Educational Content & Intellectual Property</h4>
              <p>
                All lectures, live classes, study notes, sample questions, and test series provided on TopVeda are for personal, non-commercial educational use only. Unauthorized distribution or copying is strictly prohibited.
              </p>
            </div>

            <div className="space-y-1.5">
              <h4 className="font-bold text-brand-text-primary text-sm">3. Student Account Security</h4>
              <p>
                Users are responsible for maintaining the confidentiality of their credentials and for all activities conducted through their registered account.
              </p>
            </div>

            <div className="space-y-1.5">
              <h4 className="font-bold text-brand-text-primary text-sm">4. Code of Conduct</h4>
              <p>
                Students and educators are expected to maintain respectful behavior during live sessions, doubt resolution interactions, and community discussions.
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-1.5">
              <h4 className="font-bold text-brand-text-primary text-sm">1. Information We Collect</h4>
              <p>
                We collect your name, email address, mobile number, and target educational board/class to personalize your curriculum recommendations and learning progress tracking.
              </p>
            </div>

            <div className="space-y-1.5">
              <h4 className="font-bold text-brand-text-primary text-sm">2. How We Use Information</h4>
              <p>
                Collected data is used strictly for authenticating accounts, delivering live class notifications, recording test assessments, and providing doubt resolution support.
              </p>
            </div>

            <div className="space-y-1.5">
              <h4 className="font-bold text-brand-text-primary text-sm">3. Data Security & Storage</h4>
              <p>
                TopVeda implements industry-standard encryption and security practices to protect user data from unauthorized access, alteration, or disclosure.
              </p>
            </div>
          </>
        )}
      </div>

      <div className="mt-6 flex justify-between items-center border-t border-brand-border-subtle pt-4">
        <Wordmark size="sm" />
        <Button variant="primary" size="sm" onClick={onClose}>
          Understood & Close
        </Button>
      </div>
    </Modal>
  );
}
