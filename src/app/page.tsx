"use client";

import * as React from "react";
import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { PlatformHighlights } from "@/components/landing/platform-highlights";
import { LookingFor } from "@/components/landing/looking-for";
import { ExamCategories } from "@/components/landing/exam-categories";
import { WhyTopVeda } from "@/components/landing/why-topveda";
import { HowItWorks } from "@/components/landing/how-it-works";
import { LearningExperience } from "@/components/landing/learning-experience";
import { Testimonials } from "@/components/landing/testimonials";
import { FAQ } from "@/components/landing/faq";
import { FinalCTA } from "@/components/landing/final-cta";
import { Footer } from "@/components/landing/footer";
import { AuthModal, AuthMode, LoginType, RegistrationType } from "@/components/auth/auth-modal";
import { LegalModal, LegalType } from "@/components/legal/legal-modal";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  // Auth Modal State
  const [authModalOpen, setAuthModalOpen] = React.useState(false);
  const [authMode, setAuthMode] = React.useState<AuthMode>("login");
  const [authLoginType, setAuthLoginType] = React.useState<LoginType>("student");
  const [authRegType, setAuthRegType] = React.useState<RegistrationType>("student");

  // Legal Modal State
  const [legalModalOpen, setLegalModalOpen] = React.useState(false);
  const [legalType, setLegalType] = React.useState<LegalType>("terms");

  // Educator Interest Notice State
  const [teachModalOpen, setTeachModalOpen] = React.useState(false);

  const handleOpenLogin = (portal: LoginType = "student") => {
    setAuthMode("login");
    setAuthLoginType(portal);
    setAuthModalOpen(true);
  };

  const handleOpenRegister = (type: RegistrationType = "student") => {
    setAuthMode("register");
    setAuthRegType(type);
    setAuthModalOpen(true);
  };

  const handleOpenTerms = () => {
    setLegalType("terms");
    setLegalModalOpen(true);
  };

  const handleOpenPrivacy = () => {
    setLegalType("privacy");
    setLegalModalOpen(true);
  };

  const handleTeachClick = () => {
    setTeachModalOpen(true);
  };

  // Check URL query parameters for auth triggers (e.g. ?auth=login or ?auth=register)
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const authParam = params.get("auth");
      const typeParam = params.get("type") || params.get("portal") || params.get("role");

      if (authParam === "login") {
        setTimeout(() => {
          setAuthMode("login");
          setAuthLoginType(typeParam === "admin" ? "admin" : "student");
          setAuthModalOpen(true);
        }, 0);
      } else if (authParam === "admin-login") {
        setTimeout(() => {
          setAuthMode("login");
          setAuthLoginType("admin");
          setAuthModalOpen(true);
        }, 0);
      } else if (authParam === "register") {
        setTimeout(() => {
          setAuthMode("register");
          setAuthRegType(typeParam === "admin" ? "admin" : "student");
          setAuthModalOpen(true);
        }, 0);
      } else if (authParam === "admin-register" || authParam === "admin-application") {
        setTimeout(() => {
          setAuthMode("register");
          setAuthRegType("admin");
          setAuthModalOpen(true);
        }, 0);
      } else if (authParam === "forgot-password" || authParam === "forgot") {
        setTimeout(() => {
          setAuthMode("forgot-password");
          setAuthLoginType(typeParam === "admin" ? "admin" : "student");
          setAuthModalOpen(true);
        }, 0);
      }
    }
  }, []);

  return (
    <div className="min-h-screen bg-brand-bg-warm text-brand-text-primary flex flex-col selection:bg-brand-bg-peach selection:text-brand-orange">
      {/* 1. Navbar */}
      <Navbar
        onOpenLogin={handleOpenLogin}
        onOpenRegister={handleOpenRegister}
      />

      {/* Main Landing Sections */}
      <main className="flex-1">
        {/* 2. Hero Section */}
        <Hero onStartLearning={handleOpenRegister} />

        {/* 3. Platform Highlights */}
        <PlatformHighlights />

        {/* 4. What Are You Looking For? */}
        <LookingFor
          onStartLearning={handleOpenRegister}
          onTeachClick={handleTeachClick}
        />

        {/* 5. Exam Categories (Active Only: CBSE & Bihar Board) */}
        <ExamCategories />

        {/* 6. Why TopVeda */}
        <WhyTopVeda />

        {/* 7. How It Works */}
        <HowItWorks />

        {/* 8. Learning Experience Preview */}
        <LearningExperience />

        {/* 9. Testimonials / Student Success Framework */}
        <Testimonials />

        {/* 10. FAQ Accordion */}
        <FAQ />

        {/* 11. Final Call to Action */}
        <FinalCTA onStartLearning={handleOpenRegister} />
      </main>

      {/* 12. Footer */}
      <Footer
        onOpenTerms={handleOpenTerms}
        onOpenPrivacy={handleOpenPrivacy}
      />

      {/* Auth Modal (UI Only) */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authMode}
        initialLoginType={authLoginType}
        initialRegistrationType={authRegType}
        onOpenTerms={handleOpenTerms}
      />

      {/* Legal Terms & Privacy Modal */}
      <LegalModal
        isOpen={legalModalOpen}
        onClose={() => setLegalModalOpen(false)}
        type={legalType}
      />

      {/* Teach with TopVeda Modal Notice */}
      <Modal
        isOpen={teachModalOpen}
        onClose={() => setTeachModalOpen(false)}
        title="Teach with TopVeda"
        description="Join our upcoming educator network and pedagogical community."
        maxWidth="md"
      >
        <div className="space-y-4 pt-2 text-xs text-brand-text-muted leading-relaxed">
          <div className="p-4 rounded-xl bg-brand-bg-peach border border-brand-orange-border/40 text-brand-text-primary space-y-1">
            <p className="font-bold text-brand-orange">Educator Partner Program</p>
            <p className="text-xs text-brand-text-muted">
              We are assembling passionate educators across CBSE and State Boards. Detailed educator onboarding and curriculum collaboration tools will launch in upcoming platform phases.
            </p>
          </div>
          <p>
            For educator inquiries or early curriculum partnership discussions, feel free to write to <strong className="text-brand-text-primary">support@topveda.com</strong>.
          </p>
          <div className="flex justify-end pt-3 border-t border-brand-border-subtle">
            <Button variant="primary" size="sm" onClick={() => setTeachModalOpen(false)}>
              Understood
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
