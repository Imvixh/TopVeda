/**
 * Role & Authentication Type Architecture Blueprint
 * Note: Pure type contracts for Phase 1. No auth logic or client is implemented yet.
 */

export type UserRole = "STUDENT" | "ADMIN";

export interface UserProfile {
  id: string;
  email: string;
  phone?: string;
  fullName: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface AuthModalState {
  isOpen: boolean;
  mode: "login" | "register";
}
