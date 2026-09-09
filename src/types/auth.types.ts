/**
 * Role & Authentication Type Architecture Blueprint
 * Note: Pure type contracts for Phase 1. No auth logic or client is implemented yet.
 */

export type UserRole = "STUDENT" | "ADMIN" | "SUPER_ADMIN";

export interface UserProfile {
  id: string;
  email: string;
  phone?: string;
  fullName: string;
  role: UserRole;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export type AuthMode = "login" | "register" | "forgot-password";

export interface AuthModalState {
  isOpen: boolean;
  mode: AuthMode;
}

