"use client";

import * as React from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { StudentSidebar } from "@/components/student/student-sidebar";
import { StudentHeader } from "@/components/student/student-header";
import { FloatingChatbot } from "@/components/student/floating-chatbot";
import {
  StudentStudyMaterialItem,
  EnrolledBatchItem,
} from "@/types/study-material.types";
import {
  FileText,
  Download,
  Eye,
  Search,
  BookOpen,
  Calculator,
  FlaskConical,
  Atom,
  CheckCircle2,
  Sparkles,
  Layers,
  ArrowRight,
  Loader2,
  FileCheck,
  AlertCircle,
  X,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

function getSubjectIcon(subjectName: string) {
  const name = (subjectName || "").toLowerCase();
  if (name.includes("math")) return Calculator;
  if (name.includes("sci") || name.includes("chem") || name.includes("bio")) return FlaskConical;
  if (name.includes("phy")) return Atom;
  if (name.includes("eng") || name.includes("lang")) return BookOpen;
  return FileText;
}

function getTypeBadgeStyle(type: string) {
  switch (type) {
    case "formula_sheet":
      return "bg-rose-50 text-rose-700 border-rose-200";
    case "notes":
      return "bg-sky-50 text-sky-700 border-sky-200";
    case "ncert_solution":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "pyq_paper":
      return "bg-purple-50 text-purple-700 border-purple-200";
    case "worksheet":
      return "bg-amber-50 text-amber-700 border-amber-200";
    default:
      return "bg-slate-50 text-slate-700 border-slate-200";
  }
}

export default function StudyMaterialPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [enrolledBatches, setEnrolledBatches] = React.useState<EnrolledBatchItem[]>([]);
  const [selectedBatchId, setSelectedBatchId] = React.useState<string | null>(null);
  const [materials, setMaterials] = React.useState<StudentStudyMaterialItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isDownloading, setIsDownloading] = React.useState<string | null>(null);

  // Filters
  const [selectedType, setSelectedType] = React.useState<string>("all");
  const [selectedSubject, setSelectedSubject] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState<string>("");

  // Preview Modal
  const [previewMaterial, setPreviewMaterial] = React.useState<StudentStudyMaterialItem | null>(null);

  // Layout states
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);

  // Fetch materials for selected batch
  const fetchMaterials = React.useCallback(async (batchId?: string) => {
    try {
      setIsLoading(true);
      const url = batchId
        ? `/api/student/study-materials?batchId=${encodeURIComponent(batchId)}`
        : "/api/student/study-materials";

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setEnrolledBatches(data.enrolledBatches || []);
        setSelectedBatchId(data.selectedBatchId || null);
        setMaterials(data.materials || []);
      }
    } catch (err) {
      console.error("Failed to load study materials:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!isAuthLoading) {
      fetchMaterials();
    }
  }, [isAuthLoading, fetchMaterials]);

  // Handle batch tab switch
  const handleBatchSelect = (batchId: string) => {
    setSelectedBatchId(batchId);
    fetchMaterials(batchId);
  };

  // Handle Download with authorization & activity recording
  const handleDownload = async (material: StudentStudyMaterialItem) => {
    try {
      setIsDownloading(material.id);
      const res = await fetch(`/api/student/study-materials/${material.id}/download`);
      if (res.ok) {
        const data = await res.json();
        // Trigger download in new tab or direct anchor
        const link = document.createElement("a");
        link.href = data.downloadUrl || material.fileUrl;
        link.target = "_blank";
        link.download = `${material.title.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Update local download count
        setMaterials((prev) =>
          prev.map((m) =>
            m.id === material.id ? { ...m, downloadCount: m.downloadCount + 1 } : m
          )
        );
      } else {
        const err = await res.json();
        alert(err.error || "Failed to download study material.");
      }
    } catch (err) {
      console.error("Download error:", err);
    } finally {
      setIsDownloading(null);
    }
  };

  // Extract unique subjects in current batch
  const availableSubjects = React.useMemo(() => {
    const subjects = new Set<string>();
    materials.forEach((m) => {
      if (m.subjectName) subjects.add(m.subjectName);
    });
    return Array.from(subjects);
  }, [materials]);

  // Filter materials
  const filteredMaterials = React.useMemo(() => {
    return materials.filter((m) => {
      // Material type filter
      if (selectedType !== "all" && m.materialType !== selectedType) {
        return false;
      }
      // Subject filter
      if (selectedSubject !== "all" && m.subjectName !== selectedSubject) {
        return false;
      }
      // Search filter
      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase();
        const matchTitle = m.title.toLowerCase().includes(q);
        const matchSubject = m.subjectName.toLowerCase().includes(q);
        const matchChapter = m.chapterTitle?.toLowerCase().includes(q) || false;
        if (!matchTitle && !matchSubject && !matchChapter) {
          return false;
        }
      }
      return true;
    });
  }, [materials, selectedType, selectedSubject, searchQuery]);

  return (
    <div className="min-h-screen bg-[#FDFDFC] text-brand-text-primary flex flex-col font-sans antialiased">
      {/* Student Sidebar */}
      <StudentSidebar
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
      />

      {/* Main Canvas */}
      <div
        className={cn(
          "flex-1 flex flex-col min-w-0 transition-all duration-300",
          isSidebarCollapsed ? "lg:pl-20" : "lg:pl-64"
        )}
      >
        <StudentHeader
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onToggleSidebar={() => setIsSidebarCollapsed((prev) => !prev)}
          isSidebarCollapsed={isSidebarCollapsed}
        />

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8 max-w-7xl w-full mx-auto space-y-8">
          {/* Header Banner */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-100 mb-2">
                <FileText className="w-3.5 h-3.5" />
                <span>Notes & Revision Vault</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                Study Material
              </h1>
              <p className="text-sm text-slate-500 mt-1 max-w-2xl">
                Exclusive handwritten notes, NCERT solutions, chapter formula sheets, and past year question papers for your enrolled batches.
              </p>
            </div>

            <Link
              href="/student/boards"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-all shadow-sm self-start md:self-auto"
            >
              <Layers className="w-4 h-4 text-amber-400" />
              <span>Explore Boards & Batches</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Enrolled Batch Switcher */}
          {enrolledBatches.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Select Enrolled Batch
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  {enrolledBatches.length} Enrolled {enrolledBatches.length === 1 ? "Batch" : "Batches"}
                </span>
              </div>

              <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none">
                {enrolledBatches.map((batch) => {
                  const isSelected = selectedBatchId === batch.id;
                  return (
                    <button
                      key={batch.id}
                      onClick={() => handleBatchSelect(batch.id)}
                      className={cn(
                        "flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap border shadow-sm",
                        isSelected
                          ? "bg-slate-900 text-white border-slate-900 ring-2 ring-slate-900/10"
                          : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                      )}
                    >
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase",
                          isSelected
                            ? "bg-white/20 text-white"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        )}
                      >
                        {batch.boardLabel}
                      </span>
                      <span>{batch.title}</span>
                      <span
                        className={cn(
                          "px-1.5 py-0.5 rounded-full text-[10px]",
                          isSelected ? "bg-white/10 text-white" : "bg-slate-100 text-slate-500"
                        )}
                      >
                        {batch.materialsCount} docs
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : !isLoading ? (
            /* 0 Enrolled Batches Empty State */
            <div className="bg-gradient-to-br from-amber-50/70 via-orange-50/40 to-yellow-50/30 rounded-2xl border border-amber-200/80 p-8 text-center space-y-4 shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto border border-amber-200 shadow-inner">
                <FileText className="w-6 h-6" />
              </div>
              <div className="max-w-md mx-auto space-y-2">
                <h3 className="text-base font-bold text-slate-900">
                  No Active Batch Enrollments Found
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Study materials, chapter formula sheets, and solved papers are exclusive to enrolled academic batches. Explore our CBSE & State Board batches to unlock all resources.
                </p>
              </div>
              <div className="pt-2">
                <Link
                  href="/student/boards"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-orange hover:bg-brand-orange-hover text-white text-xs font-semibold shadow-md shadow-brand-orange/20 transition-all"
                >
                  <span>Explore Academic Boards</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ) : null}

          {/* Filters & Search Bar */}
          {enrolledBatches.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm space-y-4">
              {/* Type Filter Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {[
                  { id: "all", label: "All Documents" },
                  { id: "formula_sheet", label: "Formula Sheets" },
                  { id: "notes", label: "Revision Notes" },
                  { id: "ncert_solution", label: "NCERT Solutions" },
                  { id: "pyq_paper", label: "Solved PYQs" },
                  { id: "worksheet", label: "Worksheets" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setSelectedType(tab.id)}
                    className={cn(
                      "px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all",
                      selectedType === tab.id
                        ? "bg-brand-orange text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Subject Dropdown & Search Input */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1 border-t border-slate-100">
                {availableSubjects.length > 0 && (
                  <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
                    <span className="text-[11px] font-bold uppercase text-slate-400">Subject:</span>
                    <button
                      onClick={() => setSelectedSubject("all")}
                      className={cn(
                        "px-2.5 py-1 rounded-md text-xs font-medium transition-all",
                        selectedSubject === "all"
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      )}
                    >
                      All
                    </button>
                    {availableSubjects.map((sub) => (
                      <button
                        key={sub}
                        onClick={() => setSelectedSubject(sub)}
                        className={cn(
                          "px-2.5 py-1 rounded-md text-xs font-medium transition-all",
                          selectedSubject === sub
                            ? "bg-slate-900 text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        )}
                      >
                        {sub}
                      </button>
                    ))}
                  </div>
                )}

                <div className="relative flex-1 sm:max-w-xs sm:ml-auto">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search notes or formula sheets..."
                    className="w-full pl-9 pr-8 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Loading Skeleton */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-brand-orange" />
              <p className="text-xs text-slate-500 font-medium">
                Loading verified study materials...
              </p>
            </div>
          )}

          {/* Materials Grid */}
          {!isLoading && enrolledBatches.length > 0 && filteredMaterials.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredMaterials.map((mat) => {
                const Icon = getSubjectIcon(mat.subjectName);
                const isDownloadingThis = isDownloading === mat.id;

                return (
                  <div
                    key={mat.id}
                    className="group bg-white rounded-2xl border border-slate-200/80 hover:border-slate-300 hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden"
                  >
                    {/* Top Content */}
                    <div className="p-5 space-y-4">
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center">
                            <Icon className="w-4 h-4" />
                          </div>
                          <span className="text-xs font-bold text-slate-700">
                            {mat.subjectName}
                          </span>
                        </div>

                        <span
                          className={cn(
                            "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border",
                            getTypeBadgeStyle(mat.materialType)
                          )}
                        >
                          {mat.materialTypeLabel}
                        </span>
                      </div>

                      {/* Title & Chapter */}
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 group-hover:text-brand-orange transition-colors line-clamp-2">
                          {mat.title}
                        </h3>
                        {mat.chapterTitle && (
                          <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                            Chapter: {mat.chapterTitle}
                          </p>
                        )}
                      </div>

                      {/* Meta chips: Pages, Size, Downloads */}
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-1">
                        <span className="flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-slate-400" />
                          {mat.pageCount} Pages
                        </span>
                        <span>•</span>
                        <span>{mat.fileSizeHuman}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-slate-600 font-medium">
                          <Download className="w-3.5 h-3.5 text-slate-400" />
                          {mat.downloadCount} downloads
                        </span>
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="px-5 py-3.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        onClick={() => setPreviewMaterial(mat)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-200/70 transition-all"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Preview</span>
                      </button>

                      <button
                        onClick={() => handleDownload(mat)}
                        disabled={isDownloadingThis}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
                      >
                        {isDownloadingThis ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Downloading...</span>
                          </>
                        ) : (
                          <>
                            <Download className="w-3.5 h-3.5 text-brand-orange" />
                            <span>Download PDF</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 0 Search Results */}
          {!isLoading && enrolledBatches.length > 0 && filteredMaterials.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
              <FileCheck className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">
                No Matching Documents Found
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No study materials match your selected filters. Try clearing your search query or selecting &quot;All Documents&quot;.
              </p>
              <button
                onClick={() => {
                  setSelectedType("all");
                  setSelectedSubject("all");
                  setSearchQuery("");
                }}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition-all"
              >
                Clear All Filters
              </button>
            </div>
          )}
        </main>
      </div>

      {/* In-App Document Preview Modal */}
      {previewMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-bold uppercase border",
                      getTypeBadgeStyle(previewMaterial.materialType)
                    )}
                  >
                    {previewMaterial.materialTypeLabel}
                  </span>
                  <span className="text-xs font-semibold text-slate-600">
                    {previewMaterial.subjectName}
                  </span>
                </div>
                <h2 className="text-sm font-bold text-slate-900 line-clamp-1">
                  {previewMaterial.title}
                </h2>
              </div>

              <button
                onClick={() => setPreviewMaterial(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Document Preview Area */}
            <div className="flex-1 p-6 overflow-y-auto space-y-6">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center mx-auto shadow-sm">
                  <FileText className="w-8 h-8" />
                </div>

                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900">
                    {previewMaterial.title}
                  </h3>
                  {previewMaterial.chapterTitle && (
                    <p className="text-xs text-slate-500">
                      Chapter: {previewMaterial.chapterTitle}
                    </p>
                  )}
                </div>

                {/* Document Metadata Grid */}
                <div className="grid grid-cols-3 gap-3 max-w-md mx-auto pt-2">
                  <div className="bg-white rounded-lg border border-slate-200 p-2.5 text-center">
                    <span className="block text-[10px] uppercase font-bold text-slate-400">Pages</span>
                    <span className="text-xs font-bold text-slate-800">{previewMaterial.pageCount} Pages</span>
                  </div>
                  <div className="bg-white rounded-lg border border-slate-200 p-2.5 text-center">
                    <span className="block text-[10px] uppercase font-bold text-slate-400">File Size</span>
                    <span className="text-xs font-bold text-slate-800">{previewMaterial.fileSizeHuman}</span>
                  </div>
                  <div className="bg-white rounded-lg border border-slate-200 p-2.5 text-center">
                    <span className="block text-[10px] uppercase font-bold text-slate-400">Downloads</span>
                    <span className="text-xs font-bold text-slate-800">{previewMaterial.downloadCount}</span>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg py-2 px-3 max-w-md mx-auto">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="font-medium">Verified by TopVeda Academic Panel</span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                onClick={() => setPreviewMaterial(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/70 transition-all"
              >
                Close
              </button>

              <button
                onClick={() => handleDownload(previewMaterial)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-orange hover:bg-brand-orange-hover text-white text-xs font-bold shadow-md shadow-brand-orange/20 transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Download Full PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating AI Assistant */}
      <FloatingChatbot />
    </div>
  );
}
