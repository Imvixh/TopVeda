/**
 * Platform User Roles Constants
 */
export const ROLES = {
  STUDENT: "STUDENT",
  ADMIN: "ADMIN",
  SUPER_ADMIN: "SUPER_ADMIN",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_PERMISSIONS = {
  [ROLES.STUDENT]: [
    "view:courses",
    "access:enrolled_content",
    "attempt:tests",
    "view:progress",
    "manage:own_profile",
  ],
  [ROLES.ADMIN]: [
    "manage:boards",
    "manage:classes",
    "manage:subjects",
    "manage:courses",
    "manage:chapters",
    "manage:lessons",
    "manage:resources",
    "manage:tests",
    "manage:questions",
    "manage:students",
    "manage:landing_content",
    "manage:platform_settings",
  ],
  [ROLES.SUPER_ADMIN]: [
    "manage:boards",
    "manage:classes",
    "manage:subjects",
    "manage:courses",
    "manage:chapters",
    "manage:lessons",
    "manage:resources",
    "manage:tests",
    "manage:questions",
    "manage:students",
    "manage:landing_content",
    "manage:platform_settings",
    "manage:admins",
    "manage:system_config",
    "view:audit_logs",
  ],
} as const;
