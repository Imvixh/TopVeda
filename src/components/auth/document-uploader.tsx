"use client";

import * as React from "react";
import { 
  validateDocumentFile, 
  ALLOWED_DOCUMENT_EXTENSIONS 
} from "@/lib/validation/auth";
import { 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  X, 
  AlertCircle 
} from "lucide-react";

export interface DocumentUploaderProps {
  onFileSelect: (file: File) => void;
  onClear: () => void;
  selectedFile: File | null;
  disabled?: boolean;
}

export function DocumentUploader({
  onFileSelect,
  onClear,
  selectedFile,
  disabled = false,
}: DocumentUploaderProps) {
  const [isDragOver, setIsDragOver] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleFile = (file: File) => {
    setError(null);
    const validation = validateDocumentFile(file);
    if (!validation.isValid) {
      setError(validation.error || "Invalid file.");
      return;
    }
    onFileSelect(file);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragOver(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(0)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold text-brand-text-primary">
        Government / Identity Verification Document <span className="text-red-500">*</span>
      </label>

      {error && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {!selectedFile ? (
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
            isDragOver
              ? "border-brand-orange bg-brand-bg-peach/80 ring-2 ring-brand-orange/20"
              : "border-brand-border bg-brand-surface hover:border-brand-orange-border hover:bg-brand-bg-warm/50"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_DOCUMENT_EXTENSIONS.join(",")}
            onChange={onInputChange}
            disabled={disabled}
            className="hidden"
          />

          <div className="flex flex-col items-center gap-2">
            <div className="h-10 w-10 rounded-xl bg-brand-bg-peach border border-brand-orange-border text-brand-orange flex items-center justify-center shadow-sm">
              <UploadCloud className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-brand-text-primary">
                Click to upload <span className="font-normal text-brand-text-muted">or drag and drop</span>
              </p>
              <p className="text-[11px] text-brand-text-muted mt-0.5">
                Aadhaar, Passport, Voter ID, or Driving License (PDF, JPG, PNG up to 10MB)
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-brand-bg-warm border border-brand-border">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-lg bg-brand-bg-peach text-brand-orange flex items-center justify-center shrink-0 border border-brand-orange-border">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-brand-text-primary truncate">
                {selectedFile.name}
              </p>
              <div className="flex items-center gap-2 text-[10px] text-brand-text-muted">
                <span>{formatFileSize(selectedFile.size)}</span>
                <span>•</span>
                <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                  <CheckCircle2 className="h-3 w-3" /> Ready
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClear}
            disabled={disabled}
            className="p-1 rounded-lg text-brand-text-muted hover:text-red-600 hover:bg-red-50 transition-colors"
            title="Remove file"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
