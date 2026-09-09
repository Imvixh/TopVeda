/**
 * TopVeda Admin Application & Verification Type Contracts (Phase 3.1)
 */

export type AdminApplicationStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface AdminApplication {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  documentStoragePath: string;
  documentFileName: string;
  documentFileSize: number;
  documentMimeType: string;
  status: AdminApplicationStatus;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminApplicationSubmission {
  fullName: string;
  email: string;
  phone: string;
  documentStoragePath: string;
  documentFileName: string;
  documentFileSize: number;
  documentMimeType: string;
}

export interface AdminApplicationReviewRequest {
  applicationId: string;
  decision: "APPROVED" | "REJECTED";
  rejectionReason?: string;
}

export interface AdminApplicationReviewResult {
  success: boolean;
  status: AdminApplicationStatus;
  applicationId: string;
  userId: string;
  email: string;
  fullName: string;
  emailSent?: boolean;
  emailError?: string;
}

export interface DocumentUploadMetadata {
  storagePath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}
