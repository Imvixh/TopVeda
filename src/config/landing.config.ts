import { siteConfig } from "@/config/site.config";

export interface NavItem {
  label: string;
  href: string;
}

export interface PlatformHighlightItem {
  id: string;
  title: string;
  description: string;
  iconName: "Video" | "FileText" | "HelpCircle";
}

export interface LookingForCard {
  id: string;
  badge: string;
  title: string;
  description: string;
  ctaText: string;
  ctaAction: "start-learning" | "teach";
  isPrimary?: boolean;
}

export interface ExamCategoryItem {
  id: string;
  title: string;
  code: string;
  slug: string;
  subtitle: string;
  description: string;
  features: string[];
  isActive: boolean;
}

export interface FeaturedCourseItem {
  id: string;
  title: string;
  slug: string;
  board: string;
  classLevel: string;
  subject: string;
  description: string;
  duration: string;
  lessonsCount: number;
  testsCount: number;
  badgeText: string;
  isPopular?: boolean;
}

export interface WhyTopVedaPillar {
  id: string;
  title: string;
  description: string;
  iconName: "Tv" | "CheckSquare" | "BookOpen" | "MessageSquare" | "TrendingUp" | "Building2";
}

export interface HowItWorksStep {
  stepNumber: number;
  title: string;
  description: string;
  iconName: "Compass" | "PlayCircle" | "PenTool" | "Award";
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: "general" | "courses" | "tests" | "doubts";
}

export const landingConfig = {
  // Navigation
  navigation: [
    { label: "Home", href: "#" },
    { label: "Courses", href: "#courses" },
    { label: "Features", href: "#features" },
    { label: "Exams", href: "#exams" },
    { label: "About", href: "#about" },
    { label: "Contact", href: "#contact" },
  ] as NavItem[],

  // Hero Section
  hero: {
    badge: "Next-Gen Education Platform",
    title: {
      highlight: "Learn Smarter.",
      part2: "Prepare Better.",
      part3: "Achieve More.",
    },
    subtitle:
      "A modern, student-first learning ecosystem combining live interactive classes, comprehensive test series, curated notes, and 24×7 doubt resolution.",
    primaryCta: {
      text: "Start Learning",
      action: "register",
    },
    secondaryCta: {
      text: "Explore Courses",
      href: "#courses",
    },
    trustPoints: [
      "Structured Curriculum",
      "Interactive Doubt Support",
      "Adaptive Practice Tests",
    ],
  },

  // Section 3: Platform Highlights
  platformHighlights: [
    {
      id: "live-classes",
      title: "Daily Live Interactive Classes",
      description:
        "Engage directly with experienced educators through structured, real-time interactive lectures designed for concept clarity.",
      iconName: "Video",
    },
    {
      id: "tests-notes",
      title: "100+ Tests, Sample Papers & Notes",
      description:
        "Access chapter-wise tests, full-length sample papers, formula sheets, and downloadable study material aligned with your syllabus.",
      iconName: "FileText",
    },
    {
      id: "doubt-solving",
      title: "24×7 Doubt Solving Sessions",
      description:
        "Never get stuck on difficult questions with round-the-clock doubt assistance and detailed step-by-step solutions.",
      iconName: "HelpCircle",
    },
  ] as PlatformHighlightItem[],

  // Section 4: What Are You Looking For?
  lookingFor: [
    {
      id: "learn",
      badge: "For Students",
      title: "Want to Learn?",
      description:
        "Access structured board courses, daily live sessions, comprehensive practice tests, and downloadable notes curated for top performance.",
      ctaText: "Start Learning",
      ctaAction: "start-learning",
      isPrimary: true,
    },
    {
      id: "teach",
      badge: "For Educators",
      title: "Want to Teach?",
      description:
        "Join the upcoming TopVeda educator network. Share your pedagogical expertise with thousands of eager learners across the nation.",
      ctaText: "Teach with TopVeda",
      ctaAction: "teach",
      isPrimary: false,
    },
  ] as LookingForCard[],

  // Section 5: Exam Categories (Only Active / Published Categories)
  examCategories: [
    {
      id: "cbse",
      title: "Central Board of Secondary Education",
      code: "CBSE",
      slug: "cbse",
      subtitle: "National Curriculum Standard",
      description:
        "Comprehensive coverage of NCERT curriculum with concept drills, exemplar questions, sample papers, and board exam strategies.",
      features: [
        "Complete NCERT In-Depth Coverage",
        "Competency-Based Questions Practice",
        "Chapter-wise Sample Papers & Solutions",
      ],
      isActive: true,
    },
    {
      id: "bihar-board",
      title: "Bihar School Examination Board",
      code: "BSEB",
      slug: "bihar-board",
      subtitle: "State Board Excellence",
      description:
        "Targeted preparation tailored for BSEB students with bilingual Hindi & English explanations, objective question mastery, and model papers.",
      features: [
        "Bilingual Hindi & English Explanations",
        "50% Objective Pattern Special Drills",
        "Official BSEB Model Paper Walkthroughs",
      ],
      isActive: true,
    },
  ] as ExamCategoryItem[],

  // Section 6: Featured Courses
  featuredCourses: [
    {
      id: "course-cbse-maths",
      title: "Class 10 Mathematics Complete Board Mastery",
      slug: "cbse-class-10-mathematics-mastery",
      board: "CBSE",
      classLevel: "Class 10",
      subject: "Mathematics",
      description:
        "Master Real Numbers, Polynomials, Trigonometry, and Geometry with step-by-step problem-solving and previous year questions.",
      duration: "Full Academic Year",
      lessonsCount: 64,
      testsCount: 24,
      badgeText: "Comprehensive Batch",
      isPopular: true,
    },
    {
      id: "course-cbse-science",
      title: "Class 10 Science & Technology Core Program",
      slug: "cbse-class-10-science-program",
      board: "CBSE",
      classLevel: "Class 10",
      subject: "Science",
      description:
        "Thorough conceptual grounding across Physics, Chemistry, and Biology with interactive practical demonstrations and formula sheets.",
      duration: "Full Academic Year",
      lessonsCount: 72,
      testsCount: 28,
      badgeText: "Concept & Practical",
      isPopular: false,
    },
    {
      id: "course-bseb-maths",
      title: "Class 10 Ganit (Mathematics) Board Special",
      slug: "bseb-class-10-ganit-special",
      board: "Bihar Board",
      classLevel: "Class 10",
      subject: "Mathematics",
      description:
        "Special focus on objective MCQs (50 marks weightage), subjective theorem proofs, and previous 10-year question bank analysis.",
      duration: "Full Academic Year",
      lessonsCount: 58,
      testsCount: 30,
      badgeText: "Bilingual (Hindi/Eng)",
      isPopular: true,
    },
    {
      id: "course-bseb-science",
      title: "Class 10 Vigyan (Science) Board Target Batch",
      slug: "bseb-class-10-vigyan-target",
      board: "Bihar Board",
      classLevel: "Class 10",
      subject: "Science",
      description:
        "Clear explanations in Hindi & English, diagram mastery for Biology, chemical equations balancing, and numerical problem solving.",
      duration: "Full Academic Year",
      lessonsCount: 66,
      testsCount: 25,
      badgeText: "Target Batch",
      isPopular: false,
    },
  ] as FeaturedCourseItem[],

  // Section 7: Why Choose TopVeda
  whyTopVeda: [
    {
      id: "live-classes",
      title: "Daily Live Interactive Classes",
      description:
        "Experience classroom-like engagement with structured daily live lectures and instant teacher interaction.",
      iconName: "Tv",
    },
    {
      id: "tests-practice",
      title: "Tests & Adaptive Practice",
      description:
        "Evaluate preparation with timed quizzes, chapter-end evaluations, and full-length exam simulations.",
      iconName: "CheckSquare",
    },
    {
      id: "notes-resources",
      title: "Notes & Learning Resources",
      description:
        "Download concise chapter notes, formula sheets, NCERT solutions, and curated question banks anytime.",
      iconName: "BookOpen",
    },
    {
      id: "doubt-support",
      title: "24×7 Doubt Solving",
      description:
        "Submit questions anytime and receive clear, step-by-step guidance from subject matter mentors.",
      iconName: "MessageSquare",
    },
    {
      id: "progress-tracking",
      title: "Detailed Progress Tracking",
      description:
        "Monitor your learning trajectory, syllabus completion percentage, test strengths, and focus areas.",
      iconName: "TrendingUp",
    },
    {
      id: "hybrid-approach",
      title: "Online + Offline Synergy",
      description:
        "Flexible digital learning designed to seamlessly complement school schedules and self-study routines.",
      iconName: "Building2",
    },
  ] as WhyTopVedaPillar[],

  // Section 8: How It Works
  howItWorks: [
    {
      stepNumber: 1,
      title: "Choose Your Path",
      description:
        "Select your board, class, and target subjects to get a personalized study syllabus tailored to your exams.",
      iconName: "Compass",
    },
    {
      stepNumber: 2,
      title: "Learn with Daily Live Classes",
      description:
        "Attend interactive daily lectures, follow structured lesson schedules, and review recorded sessions whenever needed.",
      iconName: "PlayCircle",
    },
    {
      stepNumber: 3,
      title: "Practice with Tests & Notes",
      description:
        "Reinforce understanding through chapter quizzes, downloadable study sheets, and curated question banks.",
      iconName: "PenTool",
    },
    {
      stepNumber: 4,
      title: "Improve & Excel",
      description:
        "Identify weak areas through insightful analytics, resolve doubts 24×7, and build exam confidence.",
      iconName: "Award",
    },
  ] as HowItWorksStep[],

  // Section 11: FAQs
  faqs: [
    {
      id: "faq-1",
      question: "What is TopVeda?",
      answer:
        "TopVeda is a modern e-learning platform delivering structured educational courses, daily live interactive classes, comprehensive test series, downloadable study notes, and 24×7 doubt support designed to help students learn effectively and build confidence.",
      category: "general",
    },
    {
      id: "faq-2",
      question: "Which educational boards and classes are currently supported?",
      answer:
        "TopVeda currently provides dedicated courses for CBSE and Bihar Board (BSEB). The platform architecture is designed to expand to additional boards, classes, and competitive exams in upcoming phases.",
      category: "courses",
    },
    {
      id: "faq-3",
      question: "How do I start learning on TopVeda?",
      answer:
        "Getting started is simple: click on 'Start Learning' or 'Register', create your student profile, select your board and subject, and immediately access your learning dashboard and materials.",
      category: "general",
    },
    {
      id: "faq-4",
      question: "Can I access downloadable notes and practice tests?",
      answer:
        "Yes! Every course includes downloadable chapter notes, formula sheets, sample question papers, and interactive tests that you can practice at your own pace.",
      category: "tests",
    },
    {
      id: "faq-5",
      question: "How does the 24×7 doubt solving feature work?",
      answer:
        "Students can submit questions through the learning platform at any time. Our subject matter mentors review questions and provide step-by-step explanations to ensure no concept remains unclear.",
      category: "doubts",
    },
    {
      id: "faq-6",
      question: "Will more classes and subjects be added in the future?",
      answer:
        "Yes. TopVeda is built on an extensible curriculum system. We will continuously roll out additional classes, new subjects, and specialized test series as part of our platform expansion.",
      category: "courses",
    },
  ] as FaqItem[],

  // Section 12: Final CTA
  finalCta: {
    badge: "Start Your Journey",
    title: "Ready to Start Learning?",
    subtitle:
      "Join TopVeda today to access structured live classes, adaptive tests, and expert doubt support.",
    primaryButton: {
      text: "Start Learning",
      action: "register",
    },
    secondaryButton: {
      text: "Explore Courses",
      href: "#courses",
    },
  },

  // Section 13: Footer
  footer: {
    description:
      "A modern, extensible education platform delivering live interactive classes, tests, and comprehensive learning resources for students.",
    columns: [
      {
        title: "Platform",
        links: [
          { label: "Courses", href: "#courses" },
          { label: "Exam Categories", href: "#exams" },
          { label: "Features", href: "#features" },
          { label: "How It Works", href: "#how-it-works" },
        ],
      },
      {
        title: "Resources",
        links: [
          { label: "Practice Tests", href: "#features" },
          { label: "Chapter Notes", href: "#features" },
          { label: "Doubt Support", href: "#features" },
          { label: "FAQs", href: "#faq" },
        ],
      },
      {
        title: "Company",
        links: [
          { label: "About TopVeda", href: "#about" },
          { label: "Contact Us", href: "#contact" },
          { label: "Teach with Us", href: "#looking-for" },
        ],
      },
    ],
    social: siteConfig.links,
    legal: {
      termsText: "Terms & Conditions",
      privacyText: "Privacy Policy",
      copyright: `© ${new Date().getFullYear()} TopVeda. All rights reserved.`,
    },
  },
} as const;

export type LandingConfig = typeof landingConfig;
