"use client";

import * as React from "react";
import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { PlatformHighlights } from "@/components/landing/platform-highlights";
import { LookingFor } from "@/components/landing/looking-for";
import { ExamCategories } from "@/components/landing/exam-categories";
import { FeaturedCourses } from "@/components/landing/featured-courses";
import { WhyTopVeda } from "@/components/landing/why-topveda";
import { HowItWorks } from "@/components/landing/how-it-works";
import { LearningExperience } from "@/components/landing/learning-experience";
import { Testimonials } from "@/components/landing/testimonials";
import { FAQ } from "@/components/landing/faq";
import { FinalCTA } from "@/components/landing/final-cta";
import { Footer } from "@/components/landing/footer";
import { AuthModal, AuthMode } from "@/components/auth/auth-modal";
import { LegalModal, LegalType } from "@/components/legal/legal-modal";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FeaturedCourseItem } from "@/config/landing.config";
import { BookOpen, Clock, FileCheck2, CheckCircle2, ArrowRight } from "lucide-react";

export default function LandingPage() {
  // Auth Modal State
  const [authModalOpen, setAuthModalOpen] = React.useState(false);
  const [authMode, setAuthMode] = React.useState<AuthMode>("login");

  // Legal Modal State
  const [legalModalOpen, setLegalModalOpen] = React.useState(false);
  const [legalType, setLegalType] = React.useState<LegalType>("terms");

  // Course Details Modal State
  const [selectedCourse, setSelectedCourse] = React.useState<FeaturedCourseItem | null>(null);

  // Educator Interest Notice State
  const [teachModalOpen, setTeachModalOpen] = React.useState(false);

  const handleOpenLogin = () => {
    setAuthMode("login");
    setAuthModalOpen(true);
  };

  const handleOpenRegister = () => {
    setAuthMode("register");
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

  const handleSelectCourse = (course: FeaturedCourseItem) => {
    setSelectedCourse(course);
  };

  const handleTeachClick = () => {
    setTeachModalOpen(true);
  };

  // Check URL query parameters for auth triggers (e.g. ?auth=login or ?auth=register)
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const authParam = params.get("auth");
      if (authParam === "login") {
        setTimeout(() => {
          setAuthMode("login");
          setAuthModalOpen(true);
        }, 0);
      } else if (authParam === "register") {
        setTimeout(() => {
          setAuthMode("register");
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

        {/* 6. Featured Courses */}
        <FeaturedCourses onSelectCourse={handleSelectCourse} />

        {/* 7. Why TopVeda */}
        <WhyTopVeda />

        {/* 8. How It Works */}
        <HowItWorks />

        {/* 9. Learning Experience Preview */}
        <LearningExperience />

        {/* 10. Testimonials / Student Success Framework */}
        <Testimonials />

        {/* 11. FAQ Accordion */}
        <FAQ />

        {/* 12. Final Call to Action */}
        <FinalCTA onStartLearning={handleOpenRegister} />
      </main>

      {/* 13. Footer */}
      <Footer
        onOpenTerms={handleOpenTerms}
        onOpenPrivacy={handleOpenPrivacy}
      />

      {/* Auth Modal (UI Only) */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authMode}
        onOpenTerms={handleOpenTerms}
      />

      {/* Legal Terms & Privacy Modal */}
      <LegalModal
        isOpen={legalModalOpen}
        onClose={() => setLegalModalOpen(false)}
        type={legalType}
      />

      {/* Course Details Quick Modal */}
      {selectedCourse && (
        <Modal
          isOpen={Boolean(selectedCourse)}
          onClose={() => setSelectedCourse(null)}
          title={selectedCourse.title}
          description={`${selectedCourse.board} • ${selectedCourse.classLevel} • ${selectedCourse.subject}`}
          maxWidth="lg"
        >
          <div className="space-y-4 pt-2">
            <p className="text-sm text-brand-text-muted leading-relaxed">
              {selectedCourse.description}
            </p>

            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="rounded-lg bg-brand-bg-warm p-3 border border-brand-border text-center">
                <Clock className="h-4 w-4 text-brand-orange mx-auto mb-1" />
                <p className="text-[11px] text-brand-text-muted">Duration</p>
                <p className="text-xs font-bold text-brand-text-primary mt-0.5">{selectedCourse.duration}</p>
              </div>
              <div className="rounded-lg bg-brand-bg-warm p-3 border border-brand-border text-center">
                <BookOpen className="h-4 w-4 text-brand-orange mx-auto mb-1" />
                <p className="text-[11px] text-brand-text-muted">Curriculum</p>
                <p className="text-xs font-bold text-brand-text-primary mt-0.5">{selectedCourse.lessonsCount} Lessons</p>
              </div>
              <div className="rounded-lg bg-brand-bg-warm p-3 border border-brand-border text-center">
                <FileCheck2 className="h-4 w-4 text-brand-orange mx-auto mb-1" />
                <p className="text-[11px] text-brand-text-muted">Assessments</p>
                <p className="text-xs font-bold text-brand-text-primary mt-0.5">{selectedCourse.testsCount} Tests</p>
              </div>
            </div>

            <div className="rounded-lg bg-brand-bg-peach p-4 border border-brand-orange-border/40 space-y-2">
              <p className="text-xs font-bold text-brand-text-primary">Course Inclusions:</p>
              <ul className="text-xs text-brand-text-muted space-y-1">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  Daily live interactive lectures & complete recordings
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  Comprehensive NCERT/State Board chapter notes (PDF)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  24×7 doubt resolution support
                </li>
              </ul>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-brand-border-subtle">
              <Button
                variant="outline"
                size="md"
                onClick={() => setSelectedCourse(null)}
              >
                Close
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  setSelectedCourse(null);
                  handleOpenRegister();
                }}
              >
                Enroll & Start Learning
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </div>
          </div>
        </Modal>
      )}

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
