/**
 * Role & Authentication Type Architecture Blueprint
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

export type LoginType = "student" | "admin";

export type RegistrationType = "student" | "admin";

export interface AuthModalState {
  isOpen: boolean;
  mode: AuthMode;
  initialLoginType?: LoginType;
  initialRegistrationType?: RegistrationType;
}

export * from "./admin-application.types";
