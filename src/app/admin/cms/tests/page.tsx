"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AdminTestListItem,
  AdminTestStats,
  AcademicTaxonomy,
  AdminTestUpsertPayload,
  AdminQuestionPayload,
} from "@/lib/services/cms-test.service";
import {
  FileCheck2,
  Plus,
  Search,
  RefreshCw,
  Edit2,
  Trash2,
  Eye,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Target,
  BookOpen,
  Calculator,
  FlaskConical,
  Atom,
  Upload,
  FileJson,
  ArrowRight,
  ArrowLeft,
  Copy,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Subject Icon Resolver
function getSubjectIcon(subjectName?: string) {
  const name = (subjectName || "").toLowerCase();
  if (name.includes("math")) return Calculator;
  if (name.includes("sci") || name.includes("phy") || name.includes("chem") || name.includes("bio")) return FlaskConical;
  if (name.includes("eng") || name.includes("lang")) return BookOpen;
  return Atom;
}

// Initial Empty Question Factory
function createEmptyQuestion(order: number, defaultMarks = 4, defaultNegative = 1): AdminQuestionPayload {
  return {
    questionText: "",
    questionType: "single_choice",
    marks: defaultMarks,
    negativeMarks: defaultNegative,
    explanation: "",
    displayOrder: order,
    options: [
      { optionLabel: "A", optionText: "", isCorrect: true, displayOrder: 1 },
      { optionLabel: "B", optionText: "", isCorrect: false, displayOrder: 2 },
      { optionLabel: "C", optionText: "", isCorrect: false, displayOrder: 3 },
      { optionLabel: "D", optionText: "", isCorrect: false, displayOrder: 4 },
    ],
  };
}

export default function AdminTestsPage() {
  // State: Data
  const [tests, setTests] = React.useState<AdminTestListItem[]>([]);
  const [stats, setStats] = React.useState<AdminTestStats>({
    totalTests: 0,
    publishedCount: 0,
    draftCount: 0,
    archivedCount: 0,
    quizCount: 0,
    testCount: 0,
    practiceDrillCount: 0,
    mockExamCount: 0,
    totalQuestions: 0,
    totalAttempts: 0,
  });
  const [taxonomy, setTaxonomy] = React.useState<AcademicTaxonomy>({
    boards: [],
    classes: [],
    subjects: [],
    courses: [],
    chapters: [],
  });

  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [feedback, setFeedback] = React.useState<{ type: "success" | "error"; message: string } | null>(null);

  // State: Filters
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedTypeFilter, setSelectedTypeFilter] = React.useState<string>("ALL");
  const [selectedStatusFilter, setSelectedStatusFilter] = React.useState<string>("ALL");
  const [selectedBoardFilter, setSelectedBoardFilter] = React.useState<string>("ALL");
  const [selectedClassFilter, setSelectedClassFilter] = React.useState<string>("ALL");
  const [selectedSubjectFilter, setSelectedSubjectFilter] = React.useState<string>("ALL");
  const [fetchTrigger, setFetchTrigger] = React.useState(0);

  // State: Create / Edit Wizard Modal
  const [isWizardOpen, setIsWizardOpen] = React.useState(false);
  const [wizardStep, setWizardStep] = React.useState<1 | 2 | 3>(1); // 1: Basic Info, 2: Question Builder, 3: Preview
  const [creationMethod, setCreationMethod] = React.useState<"manual" | "json">("manual");
  const [isSaving, setIsSaving] = React.useState(false);

  // Form State
  const [testId, setTestId] = React.useState<string | undefined>(undefined);
  const [formTitle, setFormTitle] = React.useState("");
  const [formDescription, setFormDescription] = React.useState("");
  const [formType, setFormType] = React.useState("chapter_quiz"); // 'chapter_quiz', 'test', 'practice_drill', 'mock_exam'
  const [formBoardId, setFormBoardId] = React.useState("");
  const [formClassId, setFormClassId] = React.useState("");
  const [formSubjectId, setFormSubjectId] = React.useState("");
  const [formChapterId, setFormChapterId] = React.useState("");
  const [formEnableTimer, setFormEnableTimer] = React.useState(true);
  const [formDurationMinutes, setFormDurationMinutes] = React.useState(20);
  const [formDefaultMarks, setFormDefaultMarks] = React.useState(4);
  const [formNegativeMarking, setFormNegativeMarking] = React.useState(1);
  const [formStatus, setFormStatus] = React.useState<"DRAFT" | "PUBLISHED">("PUBLISHED");
  const [questions, setQuestions] = React.useState<AdminQuestionPayload[]>([createEmptyQuestion(1, 4, 1)]);

  // JSON Import State
  const [jsonInput, setJsonInput] = React.useState("");
  const [jsonValidation, setJsonValidation] = React.useState<{ valid: boolean; errors: string[]; warnings: string[] } | null>(null);
  const [isValidatingJson, setIsValidatingJson] = React.useState(false);

  // Preview Modal for Existing Tests
  const [previewTest, setPreviewTest] = React.useState<AdminTestUpsertPayload | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = React.useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = React.useState(false);

  // Delete / Archive Modal
  const [deleteTarget, setDeleteTarget] = React.useState<AdminTestListItem | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Fetch Data Effect
  React.useEffect(() => {
    let isMounted = true;
    async function fetchData() {
      try {
        const params = new URLSearchParams();
        if (searchQuery) params.set("search", searchQuery);
        if (selectedTypeFilter !== "ALL") params.set("testType", selectedTypeFilter);
        if (selectedStatusFilter !== "ALL") params.set("status", selectedStatusFilter);
        if (selectedBoardFilter !== "ALL") params.set("boardId", selectedBoardFilter);
        if (selectedClassFilter !== "ALL") params.set("classId", selectedClassFilter);
        if (selectedSubjectFilter !== "ALL") params.set("subjectId", selectedSubjectFilter);

        const res = await fetch(`/api/admin/cms/tests?${params.toString()}`);
        if (res.ok && isMounted) {
          const data = await res.json();
          setTests(data.tests || []);
          if (data.stats) setStats(data.stats);
          if (data.taxonomy) setTaxonomy(data.taxonomy);
        } else if (isMounted) {
          const err = await res.json();
          setFeedback({ type: "error", message: err.error || "Failed to load tests catalog." });
        }
      } catch (err: unknown) {
        console.error("Error loading tests:", err);
        if (isMounted) {
          setFeedback({ type: "error", message: "Network error loading tests." });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    }
    void fetchData();
    return () => {
      isMounted = false;
    };
  }, [searchQuery, selectedTypeFilter, selectedStatusFilter, selectedBoardFilter, selectedClassFilter, selectedSubjectFilter, fetchTrigger]);

  const loadData = React.useCallback((showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true);
    else setIsLoading(true);
    setFetchTrigger((prev) => prev + 1);
  }, []);

  // Dependent Chapters list based on selected Course / Board+Class+Subject
  const availableChapters = React.useMemo(() => {
    if (!formBoardId || !formClassId || !formSubjectId) {
      return taxonomy.chapters;
    }
    const matchedCourse = taxonomy.courses.find(
      (c) => c.board_id === formBoardId && c.class_id === formClassId && c.subject_id === formSubjectId
    );
    if (!matchedCourse) return [];
    return taxonomy.chapters.filter((ch) => ch.course_id === matchedCourse.id);
  }, [formBoardId, formClassId, formSubjectId, taxonomy]);

  // Open Create Wizard
  const handleOpenCreateWizard = () => {
    setTestId(undefined);
    setFormTitle("");
    setFormDescription("");
    setFormType("chapter_quiz");
    const defaultBoard = taxonomy.boards[0]?.id || "";
    const defaultClass = taxonomy.classes[0]?.id || "";
    const defaultSubject = taxonomy.subjects[0]?.id || "";
    setFormBoardId(defaultBoard);
    setFormClassId(defaultClass);
    setFormSubjectId(defaultSubject);
    setFormChapterId("");
    setFormEnableTimer(true);
    setFormDurationMinutes(20);
    setFormDefaultMarks(4);
    setFormNegativeMarking(1);
    setFormStatus("PUBLISHED");
    setQuestions([createEmptyQuestion(1, 4, 1)]);
    setCreationMethod("manual");
    setJsonInput("");
    setJsonValidation(null);
    setWizardStep(1);
    setIsWizardOpen(true);
  };

  // Open Edit Wizard
  const handleOpenEditWizard = async (item: AdminTestListItem) => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/admin/cms/tests/${item.id}`);
      if (!res.ok) {
        setFeedback({ type: "error", message: "Failed to load test details for editing." });
        return;
      }
      const data: AdminTestUpsertPayload = await res.json();

      setTestId(data.id);
      setFormTitle(data.title);
      setFormDescription(data.description || "");
      setFormType(data.testType);

      // Resolve Board & Class from course if any
      const course = taxonomy.courses.find((c) => c.id === data.courseId);
      setFormBoardId(course?.board_id || taxonomy.boards[0]?.id || "");
      setFormClassId(course?.class_id || taxonomy.classes[0]?.id || "");
      setFormSubjectId(data.subjectId || course?.subject_id || taxonomy.subjects[0]?.id || "");
      setFormChapterId(data.chapterId || "");

      const isDrill = data.testType === "practice_drill";
      setFormEnableTimer(!isDrill && (data.durationMinutes || 0) > 0);
      setFormDurationMinutes(data.durationMinutes || 20);
      setFormStatus(data.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT");

      const loadedQuestions = data.questions && data.questions.length > 0 ? data.questions : [createEmptyQuestion(1, 4, 1)];
      setQuestions(loadedQuestions);
      setFormDefaultMarks(loadedQuestions[0]?.marks || 4);
      setFormNegativeMarking(loadedQuestions[0]?.negativeMarks || 1);

      setCreationMethod("manual");
      setJsonInput("");
      setJsonValidation(null);
      setWizardStep(1);
      setIsWizardOpen(true);
    } catch (err) {
      console.error("Error editing test:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Open Preview Modal for Existing Test
  const handleOpenPreview = async (item: AdminTestListItem) => {
    try {
      setIsLoadingPreview(true);
      setIsPreviewModalOpen(true);
      const res = await fetch(`/api/admin/cms/tests/${item.id}`);
      if (res.ok) {
        const data = await res.json();
        setPreviewTest(data);
      }
    } catch (err) {
      console.error("Failed to load test preview:", err);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // Step 1 Validation -> Go to Step 2 (Question Builder)
  const handleProceedToStep2 = () => {
    if (!formTitle.trim()) {
      setFeedback({ type: "error", message: "Please enter a test title." });
      return;
    }
    setWizardStep(2);
  };

  // Question Manipulation Handlers
  const handleAddQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      createEmptyQuestion(prev.length + 1, formDefaultMarks, formNegativeMarking),
    ]);
  };

  const handleUpdateQuestion = (index: number, updates: Partial<AdminQuestionPayload>) => {
    setQuestions((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  };

  const handleUpdateOption = (qIndex: number, optIndex: number, text: string) => {
    setQuestions((prev) => {
      const next = [...prev];
      const q = { ...next[qIndex] };
      const options = [...q.options];
      options[optIndex] = { ...options[optIndex], optionText: text };
      q.options = options;
      next[qIndex] = q;
      return next;
    });
  };

  const handleSetCorrectOption = (qIndex: number, optIndex: number) => {
    setQuestions((prev) => {
      const next = [...prev];
      const q = { ...next[qIndex] };
      q.options = q.options.map((opt, idx) => ({
        ...opt,
        isCorrect: idx === optIndex,
      }));
      next[qIndex] = q;
      return next;
    });
  };

  const handleDeleteQuestion = (index: number) => {
    if (questions.length <= 1) {
      setFeedback({ type: "error", message: "A test must have at least one question." });
      return;
    }
    setQuestions((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.map((q, i) => ({ ...q, displayOrder: i + 1 }));
    });
  };

  const handleDuplicateQuestion = (index: number) => {
    setQuestions((prev) => {
      const target = prev[index];
      const duplicated: AdminQuestionPayload = {
        ...target,
        id: undefined,
        displayOrder: prev.length + 1,
        options: target.options.map((opt) => ({ ...opt, id: undefined })),
      };
      return [...prev, duplicated];
    });
  };

  const handleMoveQuestion = (index: number, direction: "up" | "down") => {
    if ((direction === "up" && index === 0) || (direction === "down" && index === questions.length - 1)) return;
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    setQuestions((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[targetIdx];
      next[targetIdx] = temp;
      return next.map((q, i) => ({ ...q, displayOrder: i + 1 }));
    });
  };

  // JSON Validation Handler
  const handleValidateJson = async () => {
    if (!jsonInput.trim()) {
      setJsonValidation({ valid: false, errors: ["Please paste or upload JSON content."], warnings: [] });
      return;
    }
    try {
      setIsValidatingJson(true);
      const res = await fetch("/api/admin/cms/tests/validate-json", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonString: jsonInput }),
      });
      const data = await res.json();
      setJsonValidation(data);

      if (data.valid && data.parsedPayload) {
        const parsed: AdminTestUpsertPayload = data.parsedPayload;
        setFormTitle(parsed.title);
        setFormDescription(parsed.description || "");
        setFormType(parsed.testType);
        if (parsed.subjectId) setFormSubjectId(parsed.subjectId);
        if (parsed.chapterId) setFormChapterId(parsed.chapterId);
        if (parsed.durationMinutes !== undefined) {
          setFormDurationMinutes(parsed.durationMinutes);
          setFormEnableTimer(parsed.durationMinutes > 0);
        }
        if (parsed.questions && parsed.questions.length > 0) {
          const mappedQuestions = parsed.questions.map((q, idx) => ({
            ...q,
            marks: formDefaultMarks,
            negativeMarks: formNegativeMarking,
            displayOrder: idx + 1,
          }));
          setQuestions(mappedQuestions);
        }
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setJsonValidation({ valid: false, errors: [`Validation request failed: ${errorMsg}`], warnings: [] });
    } finally {
      setIsValidatingJson(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setJsonInput(content);
      setJsonValidation(null);
    };
    reader.readAsText(file);
  };

  // Step 2 Validation -> Go to Step 3 (Preview Before Publish)
  const handleProceedToStep3 = () => {
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.questionText.trim()) {
        setFeedback({ type: "error", message: `Question ${i + 1} is missing question text.` });
        return;
      }
      for (const opt of q.options) {
        if (!opt.optionText.trim()) {
          setFeedback({ type: "error", message: `Question ${i + 1} Option ${opt.optionLabel} cannot be empty.` });
          return;
        }
      }
      if (!q.options.some((o) => o.isCorrect)) {
        setFeedback({ type: "error", message: `Question ${i + 1} must have a correct option selected.` });
        return;
      }
    }
    setWizardStep(3);
  };

  // Save Test (Draft or Published)
  const handleSaveTest = async (overrideStatus?: "DRAFT" | "PUBLISHED") => {
    try {
      setIsSaving(true);
      const effectiveStatus = overrideStatus || formStatus;
      // Global marking scheme from Step 1 applied to all questions
      const standardizedQuestions = questions.map((q, idx) => ({
        ...q,
        marks: formDefaultMarks,
        negativeMarks: formNegativeMarking,
        displayOrder: idx + 1,
      }));

      const totalCalculatedMarks = standardizedQuestions.length * formDefaultMarks;
      const durationMinutes = formType === "practice_drill" || !formEnableTimer ? 0 : formDurationMinutes;

      const matchedSubject = taxonomy.subjects.find((s) => s.id === formSubjectId);
      const matchedCourse = taxonomy.courses.find(
        (c) =>
          (!formBoardId || c.board_id === formBoardId) &&
          (!formClassId || c.class_id === formClassId) &&
          (!formSubjectId || c.subject_id === formSubjectId)
      );

      const payload: AdminTestUpsertPayload = {
        id: testId,
        title: formTitle.trim(),
        description: formDescription.trim(),
        testType: formType,
        status: effectiveStatus,
        isVisible: true,
        durationMinutes,
        totalMarks: totalCalculatedMarks,
        passingMarks: Math.round(totalCalculatedMarks * 0.4),
        accessTier: "FREE",
        subjectId: formSubjectId || undefined,
        subjectName: matchedSubject?.name || "General",
        courseId: matchedCourse?.id || undefined,
        chapterId: formChapterId || undefined,
        questions: standardizedQuestions,
      };

      const res = await fetch("/api/admin/cms/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setFeedback({ type: "error", message: data.error || "Failed to save test." });
        return;
      }

      setFeedback({
        type: "success",
        message: effectiveStatus === "PUBLISHED" ? "Test successfully created and published!" : "Draft test saved successfully.",
      });
      setIsWizardOpen(false);
      void loadData(true);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setFeedback({ type: "error", message: `Error saving test: ${errorMsg}` });
    } finally {
      setIsSaving(false);
    }
  };

  // Delete / Archive Execution
  const handleExecuteDelete = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/admin/cms/tests/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({
          type: "success",
          message: data.message || "Test removed successfully.",
        });
        setDeleteTarget(null);
        void loadData(true);
      } else {
        setFeedback({ type: "error", message: data.error || "Failed to delete test." });
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setFeedback({ type: "error", message: `Failed to delete: ${errorMsg}` });
    } finally {
      setIsDeleting(false);
    }
  };

  // Toggle Publish / Draft for Catalog Item
  const handleTogglePublish = async (item: AdminTestListItem) => {
    try {
      const nextStatus = item.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
      const res = await fetch(`/api/admin/cms/tests/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: item.title,
          testType: item.testType,
          status: nextStatus,
          durationMinutes: item.durationMinutes,
          totalMarks: item.totalMarks,
          passingMarks: item.passingMarks,
          subjectId: item.subjectId,
          subjectName: item.subjectName,
          courseId: item.courseId,
          chapterId: item.chapterId,
          questions: [], // Retains existing questions on update
        }),
      });
      if (res.ok) {
        setFeedback({
          type: "success",
          message: nextStatus === "PUBLISHED" ? "Test published to student catalog." : "Test reverted to draft mode.",
        });
        void loadData(true);
      }
    } catch (err) {
      console.error("Toggle error:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-brand-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-brand-orange">
              <FileCheck2 className="h-4 w-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-brand-charcoal tracking-tight">
              Test & Practice Management
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-brand-text-muted">
            Create, manage, and publish quizzes, chapter tests, practice drills, and mock exams.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadData(true)}
            disabled={isRefreshing}
            className="rounded-xl text-xs font-bold gap-1.5"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
            <span>Refresh</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenCreateWizard}
            className="rounded-xl text-xs font-black gap-1.5 shadow-xs bg-brand-orange hover:bg-brand-orange-hover text-white"
          >
            <Plus className="h-4 w-4" />
            <span>Create Test</span>
          </Button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={cn(
            "p-4 rounded-2xl text-xs font-semibold flex items-center justify-between gap-3 border shadow-2xs",
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-rose-50 border-rose-200 text-rose-900"
          )}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs underline font-bold shrink-0 opacity-80 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-brand-border/80 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-brand-text-muted uppercase">Total Tests</span>
          <p className="text-2xl font-black text-brand-charcoal tabular-nums">{stats.totalTests}</p>
        </div>
        <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200/70 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-emerald-700 uppercase">Published</span>
          <p className="text-2xl font-black text-emerald-700 tabular-nums">{stats.publishedCount}</p>
        </div>
        <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/70 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-amber-700 uppercase">Drafts</span>
          <p className="text-2xl font-black text-amber-700 tabular-nums">{stats.draftCount}</p>
        </div>
        <div className="p-4 rounded-2xl bg-orange-50/50 border border-orange-200/70 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-brand-orange uppercase">Drills & Quizzes</span>
          <p className="text-2xl font-black text-brand-orange tabular-nums">{stats.practiceDrillCount + stats.quizCount}</p>
        </div>
        <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-200/70 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-purple-700 uppercase">Mock Exams</span>
          <p className="text-2xl font-black text-purple-700 tabular-nums">{stats.mockExamCount}</p>
        </div>
        <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200/70 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-blue-700 uppercase">Student Attempts</span>
          <p className="text-2xl font-black text-blue-700 tabular-nums">{stats.totalAttempts}</p>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="p-4 rounded-2xl bg-white border border-brand-border space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative lg:col-span-2">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-muted" />
            <Input
              placeholder="Search tests, subjects, chapters..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 rounded-xl text-xs"
            />
          </div>

          {/* Type Filter */}
          <select
            value={selectedTypeFilter}
            onChange={(e) => setSelectedTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-brand-border text-brand-charcoal focus:outline-none focus:ring-1 focus:ring-brand-orange"
          >
            <option value="ALL">All Content Types</option>
            <option value="quiz">Chapter Quizzes</option>
            <option value="test">Test Series</option>
            <option value="drill">Practice Drills</option>
            <option value="mock">Mock Exams</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-brand-border text-brand-charcoal focus:outline-none focus:ring-1 focus:ring-brand-orange"
          >
            <option value="ALL">All Statuses</option>
            <option value="PUBLISHED">Published Only</option>
            <option value="DRAFT">Drafts Only</option>
            <option value="ARCHIVED">Archived Only</option>
          </select>

          {/* Subject Filter */}
          <select
            value={selectedSubjectFilter}
            onChange={(e) => setSelectedSubjectFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-brand-border text-brand-charcoal focus:outline-none focus:ring-1 focus:ring-brand-orange"
          >
            <option value="ALL">All Subjects</option>
            {taxonomy.subjects.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.name}
              </option>
            ))}
          </select>
        </div>

        {/* Secondary Academic Filters: Board & Class */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-brand-border/40 text-xs">
          <span className="font-bold text-brand-text-muted">Targeting:</span>
          <select
            value={selectedBoardFilter}
            onChange={(e) => setSelectedBoardFilter(e.target.value)}
            className="px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-50 border border-brand-border text-brand-charcoal"
          >
            <option value="ALL">All Boards</option>
            {taxonomy.boards.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          <select
            value={selectedClassFilter}
            onChange={(e) => setSelectedClassFilter(e.target.value)}
            className="px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-50 border border-brand-border text-brand-charcoal"
          >
            <option value="ALL">All Classes</option>
            {taxonomy.classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {(selectedTypeFilter !== "ALL" || selectedStatusFilter !== "ALL" || selectedBoardFilter !== "ALL" || selectedClassFilter !== "ALL" || selectedSubjectFilter !== "ALL" || searchQuery) && (
            <button
              onClick={() => {
                setSelectedTypeFilter("ALL");
                setSelectedStatusFilter("ALL");
                setSelectedBoardFilter("ALL");
                setSelectedClassFilter("ALL");
                setSelectedSubjectFilter("ALL");
                setSearchQuery("");
              }}
              className="text-[11px] font-bold text-brand-orange hover:underline ml-auto"
            >
              Reset Filters
            </button>
          )}
        </div>
      </Card>

      {/* Tests Catalog Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 py-8">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-56 rounded-3xl bg-white border border-brand-border p-6 animate-pulse space-y-4">
              <div className="h-6 w-1/3 bg-gray-100 rounded-lg" />
              <div className="h-8 w-3/4 bg-gray-100 rounded-lg" />
              <div className="h-12 w-full bg-gray-100 rounded-lg" />
            </div>
          ))}
        </div>
      ) : tests.length === 0 ? (
        <div className="p-12 rounded-3xl bg-white border border-brand-border text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center text-brand-orange mx-auto">
            <FileCheck2 className="h-7 w-7" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-base font-black text-brand-charcoal">No Tests Found</h3>
            <p className="text-xs text-brand-text-muted">
              No tests match your current search or filter criteria. Click &quot;Create Test&quot; above to add one.
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenCreateWizard}
            className="rounded-xl text-xs font-black bg-brand-orange hover:bg-brand-orange-hover text-white"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            <span>Create Test</span>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tests.map((item) => {
            const SubjectIcon = getSubjectIcon(item.subjectName);

            return (
              <div
                key={item.id}
                className="p-5 sm:p-6 rounded-3xl bg-white border border-brand-border/80 shadow-2xs flex flex-col justify-between space-y-4 hover:shadow-xs transition-shadow"
              >
                {/* Header Row: Subject Badge & Status */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-brand-orange shrink-0">
                        <SubjectIcon className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-bold text-brand-charcoal truncate max-w-[140px]">
                        {item.subjectName}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border",
                          item.status === "PUBLISHED"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : item.status === "DRAFT"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-gray-100 text-gray-700 border-gray-200"
                        )}
                      >
                        {item.status}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 uppercase">
                        {item.testType === "mock_exam"
                          ? "Mock Exam"
                          : item.testType === "practice_drill"
                          ? "Practice Drill"
                          : item.testType === "test"
                          ? "Test Series"
                          : "Quiz"}
                      </span>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div className="space-y-1">
                    <h3 className="text-sm sm:text-base font-black text-brand-charcoal leading-snug line-clamp-2">
                      {item.title}
                    </h3>
                    {item.description && (
                      <p className="text-xs text-brand-text-muted line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    )}
                  </div>

                  {/* Academic Badges */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-brand-text-muted pt-1">
                    {item.boardName && (
                      <span className="px-2 py-0.5 rounded-lg bg-gray-100 text-brand-charcoal font-bold">
                        {item.boardName}
                      </span>
                    )}
                    {item.className && (
                      <span className="px-2 py-0.5 rounded-lg bg-gray-100 text-brand-charcoal font-bold">
                        {item.className}
                      </span>
                    )}
                    {item.chapterTitle && (
                      <span className="px-2 py-0.5 rounded-lg bg-gray-100 text-brand-text-muted truncate max-w-[150px]">
                        {item.chapterTitle}
                      </span>
                    )}
                  </div>
                </div>

                {/* Metrics & Parameters */}
                <div className="space-y-3 pt-3 border-t border-brand-border/40">
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2 rounded-xl bg-gray-50 border border-gray-100 space-y-0.5">
                      <span className="text-[10px] text-brand-text-muted block font-semibold">Duration</span>
                      <span className="font-black text-brand-charcoal">
                        {item.testType === "practice_drill" || item.durationMinutes === 0
                          ? "Untimed"
                          : `${item.durationMinutes}m`}
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-gray-50 border border-gray-100 space-y-0.5">
                      <span className="text-[10px] text-brand-text-muted block font-semibold">Questions</span>
                      <span className="font-black text-brand-charcoal">{item.totalQuestions} Qs</span>
                    </div>
                    <div className="p-2 rounded-xl bg-gray-50 border border-gray-100 space-y-0.5">
                      <span className="text-[10px] text-brand-text-muted block font-semibold">Marks</span>
                      <span className="font-black text-brand-charcoal">{item.totalMarks} M</span>
                    </div>
                  </div>

                  {/* Student Attempts Count */}
                  <div className="flex items-center justify-between text-[11px] font-semibold text-brand-text-muted px-1">
                    <span className="flex items-center gap-1 text-emerald-700">
                      <Target className="h-3 w-3" />
                      {item.attemptsCount} Student {item.attemptsCount === 1 ? "Attempt" : "Attempts"}
                    </span>
                    <button
                      onClick={() => handleTogglePublish(item)}
                      className={cn(
                        "text-[10px] font-bold uppercase underline",
                        item.status === "PUBLISHED" ? "text-amber-700" : "text-emerald-700"
                      )}
                    >
                      {item.status === "PUBLISHED" ? "Revert to Draft" : "Publish Now"}
                    </button>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handleOpenPreview(item)}
                      className="flex-1 py-2 rounded-xl border border-brand-border text-xs font-bold text-brand-charcoal hover:bg-gray-50 flex items-center justify-center gap-1 transition-colors"
                      title="Preview test questions"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>Preview</span>
                    </button>

                    <button
                      onClick={() => handleOpenEditWizard(item)}
                      className="flex-1 py-2 rounded-xl bg-brand-charcoal hover:bg-black text-white text-xs font-bold flex items-center justify-center gap-1 transition-colors shadow-3xs"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      <span>Edit</span>
                    </button>

                    <button
                      onClick={() => setDeleteTarget(item)}
                      className="p-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Delete or Archive Test"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: 3-STEP TEST CREATION / EDIT WIZARD                                */}
      {/* ========================================================================= */}
      {isWizardOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="max-w-4xl w-full bg-white rounded-3xl border border-brand-border shadow-2xl flex flex-col max-h-[90vh] overflow-hidden my-auto">
            {/* Wizard Header */}
            <div className="px-6 py-4 border-b border-brand-border flex items-center justify-between shrink-0 bg-gray-50/50">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-brand-orange text-white uppercase">
                    Step {wizardStep} of 3
                  </span>
                  <h2 className="text-base font-black text-brand-charcoal">
                    {wizardStep === 1
                      ? "Basic Information & Academic Targeting"
                      : wizardStep === 2
                      ? "Question Builder"
                      : "Preview Before Publish"}
                  </h2>
                </div>
                <p className="text-xs text-brand-text-muted">
                  {wizardStep === 1
                    ? "Set test metadata, subject targeting, time limits, and marks scheme."
                    : wizardStep === 2
                    ? "Build questions manually or import via JSON format."
                    : "Review questions and scoring scheme before final deployment."}
                </p>
              </div>

              <button
                onClick={() => setIsWizardOpen(false)}
                className="w-8 h-8 rounded-full border border-brand-border flex items-center justify-center text-brand-text-muted hover:text-brand-charcoal hover:bg-gray-100 transition-colors font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {/* Wizard Body (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* ------------------------------------------------------------- */}
              {/* STEP 1: BASIC INFORMATION & ACADEMIC TARGETING                */}
              {/* ------------------------------------------------------------- */}
              {wizardStep === 1 && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Test Title */}
                    <div className="md:col-span-2 space-y-1.5">
                      <label className="text-xs font-bold text-brand-charcoal">
                        Test Title <span className="text-rose-500">*</span>
                      </label>
                      <Input
                        placeholder="e.g. Class 10 Mathematics Practice Test 01 - Linear Equations"
                        value={formTitle}
                        onChange={(e) => setFormTitle(e.target.value)}
                        className="rounded-xl text-xs"
                      />
                    </div>

                    {/* Description */}
                    <div className="md:col-span-2 space-y-1.5">
                      <label className="text-xs font-bold text-brand-charcoal">
                        Description (Optional)
                      </label>
                      <textarea
                        placeholder="Brief overview of curriculum chapters and concept focus..."
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 rounded-xl text-xs border border-brand-border focus:outline-none focus:ring-1 focus:ring-brand-orange resize-none"
                      />
                    </div>

                    {/* Content Type */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-brand-charcoal">
                        Content Type <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={formType}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormType(val);
                          if (val === "practice_drill") {
                            setFormEnableTimer(false);
                          } else {
                            setFormEnableTimer(true);
                          }
                        }}
                        className="w-full px-3 py-2.5 rounded-xl text-xs font-semibold bg-white border border-brand-border text-brand-charcoal focus:outline-none focus:ring-1 focus:ring-brand-orange"
                      >
                        <option value="chapter_quiz">Quiz (Chapter Quiz)</option>
                        <option value="test">Test (Test Series / Unit Test)</option>
                        <option value="practice_drill">Practice Drill (Untimed)</option>
                        <option value="mock_exam">Mock Test (Full-Length Exam)</option>
                      </select>
                    </div>

                    {/* Status */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-brand-charcoal">
                        Initial Status
                      </label>
                      <select
                        value={formStatus}
                        onChange={(e) => setFormStatus(e.target.value as "DRAFT" | "PUBLISHED")}
                        className="w-full px-3 py-2.5 rounded-xl text-xs font-semibold bg-white border border-brand-border text-brand-charcoal focus:outline-none focus:ring-1 focus:ring-brand-orange"
                      >
                        <option value="PUBLISHED">Publish Immediately</option>
                        <option value="DRAFT">Save as Draft</option>
                      </select>
                    </div>

                    {/* Academic Targeting: Board */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-brand-charcoal">
                        Educational Board <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={formBoardId}
                        onChange={(e) => setFormBoardId(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl text-xs font-semibold bg-white border border-brand-border text-brand-charcoal focus:outline-none focus:ring-1 focus:ring-brand-orange"
                      >
                        {taxonomy.boards.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name} ({b.code})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Academic Targeting: Class Level */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-brand-charcoal">
                        Class Level <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={formClassId}
                        onChange={(e) => setFormClassId(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl text-xs font-semibold bg-white border border-brand-border text-brand-charcoal focus:outline-none focus:ring-1 focus:ring-brand-orange"
                      >
                        {taxonomy.classes.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Academic Targeting: Subject */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-brand-charcoal">
                        Subject <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={formSubjectId}
                        onChange={(e) => setFormSubjectId(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl text-xs font-semibold bg-white border border-brand-border text-brand-charcoal focus:outline-none focus:ring-1 focus:ring-brand-orange"
                      >
                        {taxonomy.subjects.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Academic Targeting: Chapter */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-brand-charcoal">
                        Chapter (Optional Syllabus Mapping)
                      </label>
                      <select
                        value={formChapterId}
                        onChange={(e) => setFormChapterId(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl text-xs font-semibold bg-white border border-brand-border text-brand-charcoal focus:outline-none focus:ring-1 focus:ring-brand-orange"
                      >
                        <option value="">-- General / Full Syllabus --</option>
                        {availableChapters.map((ch) => (
                          <option key={ch.id} value={ch.id}>
                            {ch.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Timing & Scoring Parameters */}
                  <div className="p-4 rounded-2xl bg-gray-50 border border-brand-border space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-wider text-brand-charcoal">
                      Timing & Marking Configuration
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Timer Option */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-brand-charcoal">
                          Duration (Minutes)
                        </label>
                        {formType === "practice_drill" ? (
                          <div className="px-3 py-2 rounded-xl text-xs bg-gray-200/70 text-brand-text-muted font-bold">
                            Untimed (Practice Mode)
                          </div>
                        ) : (
                          <select
                            value={formDurationMinutes}
                            onChange={(e) => setFormDurationMinutes(Number(e.target.value))}
                            className="w-full px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-brand-border text-brand-charcoal"
                          >
                            <option value={10}>10 Minutes</option>
                            <option value={15}>15 Minutes</option>
                            <option value={20}>20 Minutes</option>
                            <option value={30}>30 Minutes</option>
                            <option value={45}>45 Minutes</option>
                            <option value={60}>60 Minutes (1 Hour)</option>
                            <option value={90}>90 Minutes (1.5 Hours)</option>
                            <option value={120}>120 Minutes (2 Hours)</option>
                          </select>
                        )}
                      </div>

                      {/* Default Marks per Question */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-brand-charcoal">
                          Default Marks per Q
                        </label>
                        <Input
                          type="number"
                          min={1}
                          max={50}
                          value={formDefaultMarks}
                          onChange={(e) => setFormDefaultMarks(Number(e.target.value))}
                          className="rounded-xl text-xs"
                        />
                      </div>

                      {/* Negative Marking Scheme */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-brand-charcoal">
                          Negative Marking per Q
                        </label>
                        <Input
                          type="number"
                          step="any"
                          min={0}
                          max={50}
                          placeholder="e.g. 0, 0.2, 0.25, 0.5, 0.75, 1, 1.25"
                          value={formNegativeMarking}
                          onChange={(e) => setFormNegativeMarking(parseFloat(e.target.value) || 0)}
                          className="rounded-xl text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* STEP 2: QUESTION BUILDER (MANUAL OR IMPORT JSON)              */}
              {/* ------------------------------------------------------------- */}
              {wizardStep === 2 && (
                <div className="space-y-6">
                  {/* Option Switcher Tabs */}
                  <div className="flex items-center gap-2 p-1 rounded-2xl bg-gray-100 border border-brand-border/60 max-w-md">
                    <button
                      onClick={() => setCreationMethod("manual")}
                      className={cn(
                        "flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                        creationMethod === "manual"
                          ? "bg-white text-brand-charcoal shadow-xs"
                          : "text-brand-text-muted hover:text-brand-charcoal"
                      )}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      <span>Option 1: Create Yourself</span>
                    </button>

                    <button
                      onClick={() => setCreationMethod("json")}
                      className={cn(
                        "flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                        creationMethod === "json"
                          ? "bg-white text-brand-charcoal shadow-xs"
                          : "text-brand-text-muted hover:text-brand-charcoal"
                      )}
                    >
                      <FileJson className="h-3.5 w-3.5" />
                      <span>Option 2: Import JSON</span>
                    </button>
                  </div>

                  {/* METHOD 1: MANUAL GOOGLE FORMS-STYLE BUILDER */}
                  {creationMethod === "manual" && (
                    <div className="space-y-6">
                      {/* Global Marking Scheme Banner from Step 1 */}
                      <div className="p-3.5 rounded-2xl bg-orange-50/70 border border-orange-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-lg bg-brand-orange text-white font-black text-[10px] uppercase">
                            Global Scheme
                          </span>
                          <span className="font-bold text-brand-charcoal">
                            +{formDefaultMarks} Marks per Q · -{formNegativeMarking} Negative Marking
                          </span>
                        </div>
                        <span className="font-extrabold text-brand-charcoal text-[11px]">
                          Total Marks: {questions.length * formDefaultMarks} Marks ({questions.length} Questions)
                        </span>
                      </div>

                      <div className="flex items-center justify-between pb-2 border-b border-brand-border/60">
                        <span className="text-xs font-black uppercase tracking-wider text-brand-charcoal">
                          Questions ({questions.length} Total)
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleAddQuestion}
                          className="rounded-xl text-xs font-bold gap-1 text-brand-orange border-orange-200 hover:bg-orange-50"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Add Question</span>
                        </Button>
                      </div>

                      <div className="space-y-5">
                        {questions.map((q, qIdx) => (
                          <div
                            key={qIdx}
                            className="p-5 rounded-3xl bg-white border border-brand-border shadow-2xs space-y-4 relative hover:border-brand-orange/40 transition-colors"
                          >
                            {/* Question Card Header */}
                            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                              <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-lg bg-brand-charcoal text-white text-xs font-black flex items-center justify-center">
                                  {qIdx + 1}
                                </span>
                                <span className="text-xs font-black text-brand-charcoal uppercase">
                                  Question {qIdx + 1}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5">
                                {/* Reorder Controls */}
                                <button
                                  type="button"
                                  onClick={() => handleMoveQuestion(qIdx, "up")}
                                  disabled={qIdx === 0}
                                  className="p-1.5 rounded-lg border border-brand-border text-brand-text-muted hover:text-brand-charcoal disabled:opacity-30 transition-colors"
                                  title="Move Up"
                                >
                                  <ChevronUp className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleMoveQuestion(qIdx, "down")}
                                  disabled={qIdx === questions.length - 1}
                                  className="p-1.5 rounded-lg border border-brand-border text-brand-text-muted hover:text-brand-charcoal disabled:opacity-30 transition-colors"
                                  title="Move Down"
                                >
                                  <ChevronDown className="h-3.5 w-3.5" />
                                </button>

                                {/* Duplicate */}
                                <button
                                  type="button"
                                  onClick={() => handleDuplicateQuestion(qIdx)}
                                  className="p-1.5 rounded-lg border border-brand-border text-brand-text-muted hover:text-brand-charcoal transition-colors"
                                  title="Duplicate Question"
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </button>

                                {/* Delete */}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteQuestion(qIdx)}
                                  disabled={questions.length <= 1}
                                  className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 disabled:opacity-30 transition-colors"
                                  title="Delete Question"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Question Textarea */}
                            <div className="space-y-1">
                              <textarea
                                placeholder={`Enter question text for Question ${qIdx + 1}...`}
                                value={q.questionText}
                                onChange={(e) => handleUpdateQuestion(qIdx, { questionText: e.target.value })}
                                rows={2}
                                className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold border border-brand-border focus:outline-none focus:ring-1 focus:ring-brand-orange resize-none"
                              />
                            </div>

                            {/* MCQ Options A, B, C, D */}
                            <div className="space-y-2 pt-1">
                              <span className="text-[11px] font-bold text-brand-text-muted uppercase">
                                Options & Correct Answer Selector:
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                {q.options.map((opt, optIdx) => (
                                  <div
                                    key={optIdx}
                                    className={cn(
                                      "p-2.5 rounded-2xl border flex items-center gap-2.5 transition-all",
                                      opt.isCorrect
                                        ? "bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-300"
                                        : "bg-gray-50/50 border-brand-border"
                                    )}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => handleSetCorrectOption(qIdx, optIdx)}
                                      className={cn(
                                        "w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center shrink-0 transition-all",
                                        opt.isCorrect
                                          ? "bg-emerald-600 text-white shadow-3xs"
                                          : "bg-gray-200 text-brand-charcoal hover:bg-gray-300"
                                      )}
                                      title={opt.isCorrect ? "Correct Answer" : "Click to mark as correct"}
                                    >
                                      {opt.optionLabel}
                                    </button>

                                    <input
                                      type="text"
                                      placeholder={`Option ${opt.optionLabel} text...`}
                                      value={opt.optionText}
                                      onChange={(e) => handleUpdateOption(qIdx, optIdx, e.target.value)}
                                      className="flex-1 bg-transparent text-xs font-semibold focus:outline-none"
                                    />

                                    {opt.isCorrect && (
                                      <span className="text-[10px] font-black text-emerald-700 uppercase shrink-0">
                                        ✓ Correct
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Explanation (Optional) */}
                            <div className="pt-2">
                              <input
                                type="text"
                                placeholder="Concept explanation or step-by-step solution (shown to student after submission)..."
                                value={q.explanation || ""}
                                onChange={(e) => handleUpdateQuestion(qIdx, { explanation: e.target.value })}
                                className="w-full px-3 py-1.5 rounded-xl text-xs bg-brand-bg-warm/50 border border-brand-border/60 focus:outline-none focus:ring-1 focus:ring-brand-orange"
                              />
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Bottom Add Question Button */}
                      <div className="text-center pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleAddQuestion}
                          className="rounded-xl text-xs font-bold gap-1.5 text-brand-orange border-brand-orange hover:bg-orange-50"
                        >
                          <Plus className="h-4 w-4" />
                          <span>+ Add Another Question</span>
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* METHOD 2: IMPORT JSON */}
                  {creationMethod === "json" && (
                    <div className="space-y-4">
                      <div className="p-4 rounded-2xl bg-gray-50 border border-brand-border space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="space-y-0.5">
                            <h4 className="text-xs font-black uppercase tracking-wider text-brand-charcoal flex items-center gap-1.5">
                              <FileJson className="h-4 w-4 text-brand-orange" />
                              JSON Import Specification
                            </h4>
                            <p className="text-[11px] text-brand-text-muted">
                              Upload a .json file or paste raw JSON. All fields and question answer keys will be strictly validated.
                            </p>
                          </div>

                          <label className="px-3 py-1.5 rounded-xl bg-white border border-brand-border hover:bg-gray-100 text-xs font-bold text-brand-charcoal cursor-pointer flex items-center gap-1.5 shrink-0">
                            <Upload className="h-3.5 w-3.5" />
                            <span>Upload .json File</span>
                            <input
                              type="file"
                              accept=".json,application/json"
                              onChange={handleFileUpload}
                              className="hidden"
                            />
                          </label>
                        </div>

                        <textarea
                          placeholder={`{\n  "title": "Class 10 Mathematics Practice Test 01",\n  "description": "Chapter 3 practice test",\n  "type": "practice_drill",\n  "board": "CBSE",\n  "class": 10,\n  "subject": "Mathematics",\n  "chapter": "Pair of Linear Equations",\n  "duration_minutes": 20,\n  "total_marks": 10,\n  "negative_marking": 0,\n  "questions": [\n    {\n      "question": "Which of the following is a linear equation?",\n      "type": "mcq",\n      "marks": 1,\n      "options": [\n        { "id": "A", "text": "2x + 3 = 5" },\n        { "id": "B", "text": "x² + 2 = 0" },\n        { "id": "C", "text": "1/x = 2" },\n        { "id": "D", "text": "x³ = 8" }\n      ],\n      "correct_answer": "A",\n      "explanation": "A linear equation has the highest power of the variable equal to 1."\n    }\n  ]\n}`}
                          value={jsonInput}
                          onChange={(e) => setJsonInput(e.target.value)}
                          rows={12}
                          className="w-full p-3 font-mono text-[11px] rounded-xl border border-brand-border bg-white text-brand-charcoal focus:outline-none focus:ring-1 focus:ring-brand-orange resize-none"
                        />

                        <div className="flex items-center justify-between pt-1">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={handleValidateJson}
                            disabled={isValidatingJson}
                            className="rounded-xl text-xs font-black gap-1.5 bg-brand-charcoal hover:bg-black text-white"
                          >
                            {isValidatingJson ? (
                              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            )}
                            <span>Validate & Populate Builder</span>
                          </Button>
                        </div>
                      </div>

                      {/* JSON Validation Results Display */}
                      {jsonValidation && (
                        <div
                          className={cn(
                            "p-4 rounded-2xl border text-xs space-y-2",
                            jsonValidation.valid
                              ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                              : "bg-rose-50 border-rose-300 text-rose-900"
                          )}
                        >
                          <div className="flex items-center gap-2 font-bold">
                            {jsonValidation.valid ? (
                              <>
                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                <span>JSON validation passed! Questions loaded into builder ({questions.length} items).</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="h-4 w-4 text-rose-600" />
                                <span>JSON validation failed with {jsonValidation.errors.length} error(s):</span>
                              </>
                            )}
                          </div>

                          {!jsonValidation.valid && (
                            <ul className="list-disc list-inside space-y-1 text-[11px] font-medium pl-2">
                              {jsonValidation.errors.map((err, idx) => (
                                <li key={idx}>{err}</li>
                              ))}
                            </ul>
                          )}

                          {jsonValidation.warnings && jsonValidation.warnings.length > 0 && (
                            <div className="pt-1 text-[11px] text-amber-800">
                              <span className="font-bold">Warnings: </span>
                              {jsonValidation.warnings.join("; ")}
                            </div>
                          )}

                          {jsonValidation.valid && (
                            <div className="pt-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCreationMethod("manual")}
                                className="rounded-xl text-xs font-bold bg-white text-emerald-800 border-emerald-300"
                              >
                                View in Visual Builder →
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* STEP 3: PREVIEW BEFORE PUBLISH                                */}
              {/* ------------------------------------------------------------- */}
              {wizardStep === 3 && (
                <div className="space-y-6">
                  {/* Summary Card */}
                  <div className="p-5 rounded-3xl bg-white border border-brand-border shadow-2xs space-y-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-orange-50 text-brand-orange border border-orange-200 uppercase">
                          {formType}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                          Status: {formStatus}
                        </span>
                      </div>
                      <h3 className="text-base sm:text-lg font-black text-brand-charcoal">
                        {formTitle}
                      </h3>
                      {formDescription && (
                        <p className="text-xs text-brand-text-muted">{formDescription}</p>
                      )}
                    </div>

                    {/* Parameters Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-2xl bg-gray-50 border border-gray-100 text-xs">
                      <div>
                        <span className="text-[10px] text-brand-text-muted uppercase font-bold block">Board & Class</span>
                        <span className="font-black text-brand-charcoal">
                          {taxonomy.boards.find((b) => b.id === formBoardId)?.name || "CBSE"} ·{" "}
                          {taxonomy.classes.find((c) => c.id === formClassId)?.name || "Class 10"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-brand-text-muted uppercase font-bold block">Subject</span>
                        <span className="font-black text-brand-charcoal">
                          {taxonomy.subjects.find((s) => s.id === formSubjectId)?.name || "Mathematics"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-brand-text-muted uppercase font-bold block">Duration</span>
                        <span className="font-black text-brand-charcoal">
                          {formType === "practice_drill" || !formEnableTimer ? "Untimed" : `${formDurationMinutes} Mins`}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-brand-text-muted uppercase font-bold block">Total Marks</span>
                        <span className="font-black text-emerald-700">
                          {questions.reduce((acc, q) => acc + (q.marks || 1), 0)} Marks ({questions.length} Qs)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* All Questions Preview */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-wider text-brand-charcoal">
                      All Questions & Answer Keys Preview ({questions.length})
                    </h4>

                    <div className="space-y-4">
                      {questions.map((q, idx) => (
                        <div
                          key={idx}
                          className="p-5 rounded-3xl bg-white border border-brand-border/80 shadow-2xs space-y-3"
                        >
                          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                            <span className="text-xs font-black text-brand-charcoal uppercase">
                              Question {idx + 1}
                            </span>
                            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                              +{q.marks} Marks · -{q.negativeMarks} Negative
                            </span>
                          </div>

                          <p className="text-xs sm:text-sm font-bold text-brand-charcoal leading-relaxed">
                            {q.questionText}
                          </p>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                            {q.options.map((opt) => (
                              <div
                                key={opt.optionLabel}
                                className={cn(
                                  "p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between gap-2",
                                  opt.isCorrect
                                    ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                                    : "bg-gray-50/60 border-brand-border text-brand-text-muted"
                                )}
                              >
                                <div className="flex items-center gap-2">
                                  <span
                                    className={cn(
                                      "w-5 h-5 rounded-md flex items-center justify-center font-bold text-[10px]",
                                      opt.isCorrect ? "bg-emerald-600 text-white" : "bg-gray-200 text-brand-charcoal"
                                    )}
                                  >
                                    {opt.optionLabel}
                                  </span>
                                  <span>{opt.optionText}</span>
                                </div>
                                {opt.isCorrect && (
                                  <span className="text-[10px] font-black text-emerald-700 uppercase">
                                    ✓ Correct Key
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>

                          {q.explanation && (
                            <div className="p-2.5 rounded-xl bg-brand-bg-warm/60 border border-brand-border/40 text-[11px] text-brand-charcoal space-y-0.5">
                              <span className="font-bold text-brand-orange text-[10px] uppercase">
                                Solution Explanation:
                              </span>
                              <p>{q.explanation}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Wizard Footer Controls */}
            <div className="px-6 py-4 border-t border-brand-border flex items-center justify-between shrink-0 bg-gray-50/50">
              {wizardStep > 1 ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setWizardStep((prev) => (prev - 1) as 1 | 2)}
                  className="rounded-xl text-xs font-bold gap-1"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Back</span>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsWizardOpen(false)}
                  className="rounded-xl text-xs font-bold"
                >
                  Cancel
                </Button>
              )}

              <div className="flex items-center gap-2">
                {wizardStep === 1 && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleProceedToStep2}
                    className="rounded-xl text-xs font-black gap-1.5 bg-brand-charcoal hover:bg-black text-white"
                  >
                    <span>Next: Question Builder</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                )}

                {wizardStep === 2 && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleProceedToStep3}
                    className="rounded-xl text-xs font-black gap-1.5 bg-brand-charcoal hover:bg-black text-white"
                  >
                    <span>Next: Preview Test</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                )}

                {wizardStep === 3 && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSaveTest("DRAFT")}
                      disabled={isSaving}
                      className="rounded-xl text-xs font-bold"
                    >
                      Save as Draft
                    </Button>

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleSaveTest("PUBLISHED")}
                      disabled={isSaving}
                      className="rounded-xl text-xs font-black gap-1.5 bg-brand-orange hover:bg-brand-orange-hover text-white shadow-xs"
                    >
                      {isSaving ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      )}
                      <span>Create & Publish Test</span>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: FULL TEST PREVIEW (FOR EXISTING TESTS FROM CATALOG)                */}
      {/* ========================================================================= */}
      {isPreviewModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="max-w-3xl w-full bg-white rounded-3xl border border-brand-border shadow-2xl flex flex-col max-h-[85vh] overflow-hidden my-auto">
            <div className="px-6 py-4 border-b border-brand-border flex items-center justify-between shrink-0 bg-gray-50/50">
              <div className="space-y-0.5">
                <span className="text-[10px] font-extrabold text-brand-orange uppercase tracking-wider">
                  Test Specification Preview
                </span>
                <h3 className="text-base font-black text-brand-charcoal">
                  {previewTest?.title || "Test Questions"}
                </h3>
              </div>
              <button
                onClick={() => setIsPreviewModalOpen(false)}
                className="w-8 h-8 rounded-full border border-brand-border flex items-center justify-center text-brand-text-muted hover:text-brand-charcoal hover:bg-gray-100 transition-colors font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {isLoadingPreview ? (
                <div className="p-8 text-center text-xs font-semibold text-brand-text-muted space-y-2">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto text-brand-orange" />
                  <p>Loading questions and answer keys...</p>
                </div>
              ) : previewTest ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-brand-text-muted uppercase font-bold block">Type</span>
                      <span className="font-bold text-brand-charcoal">{previewTest.testType}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-brand-text-muted uppercase font-bold block">Duration</span>
                      <span className="font-bold text-brand-charcoal">
                        {previewTest.durationMinutes ? `${previewTest.durationMinutes} Mins` : "Untimed"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-brand-text-muted uppercase font-bold block">Total Marks</span>
                      <span className="font-bold text-emerald-700">{previewTest.totalMarks} Marks</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-brand-text-muted uppercase font-bold block">Questions</span>
                      <span className="font-bold text-brand-charcoal">{previewTest.questions?.length || 0} Qs</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {previewTest.questions?.map((q, idx) => (
                      <div key={idx} className="p-5 rounded-3xl bg-white border border-brand-border shadow-2xs space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                          <span className="text-xs font-black text-brand-charcoal uppercase">Question {idx + 1}</span>
                          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                            +{q.marks} Marks · -{q.negativeMarks} Negative
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm font-bold text-brand-charcoal leading-relaxed">{q.questionText}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {q.options.map((opt) => (
                            <div
                              key={opt.optionLabel}
                              className={cn(
                                "p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between gap-2",
                                opt.isCorrect
                                  ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                                  : "bg-gray-50/60 border-brand-border text-brand-text-muted"
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <span
                                  className={cn(
                                    "w-5 h-5 rounded-md flex items-center justify-center font-bold text-[10px]",
                                    opt.isCorrect ? "bg-emerald-600 text-white" : "bg-gray-200 text-brand-charcoal"
                                  )}
                                >
                                  {opt.optionLabel}
                                </span>
                                <span>{opt.optionText}</span>
                              </div>
                              {opt.isCorrect && (
                                <span className="text-[10px] font-black text-emerald-700 uppercase">✓ Correct</span>
                              )}
                            </div>
                          ))}
                        </div>
                        {q.explanation && (
                          <div className="p-2.5 rounded-xl bg-brand-bg-warm/60 border border-brand-border/40 text-[11px] text-brand-charcoal space-y-0.5">
                            <span className="font-bold text-brand-orange text-[10px] uppercase">Solution Explanation:</span>
                            <p>{q.explanation}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="px-6 py-3.5 border-t border-brand-border flex items-center justify-end shrink-0 bg-gray-50/50">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPreviewModalOpen(false)}
                className="rounded-xl text-xs font-bold"
              >
                Close Preview
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DELETE / ARCHIVE CONFIRMATION                                      */}
      {/* ========================================================================= */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-md w-full p-6 sm:p-7 rounded-3xl bg-white border border-brand-border shadow-2xl space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mx-auto">
              <Trash2 className="h-6 w-6" />
            </div>

            <div className="space-y-1.5 text-center">
              <h3 className="text-base font-black text-brand-charcoal">
                Delete or Archive Test?
              </h3>
              <p className="text-xs text-brand-text-muted leading-relaxed">
                Are you sure you want to remove <strong>&quot;{deleteTarget.title}&quot;</strong>?
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
              <span className="font-bold block">Historical Grade Protection:</span>
              <p className="text-[11px] leading-relaxed">
                If students have already taken this test, it will be automatically <strong>Archived</strong> rather than deleted to ensure student scores and progress remain intact.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="py-2.5 rounded-xl border border-brand-border text-xs font-bold text-brand-charcoal hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteDelete}
                disabled={isDeleting}
                className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black transition-colors flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
              >
                {isDeleting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <span>Confirm</span>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
