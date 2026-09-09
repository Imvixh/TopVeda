/**
 * TopVeda Authentication & Registration Validation Utilities
 * Enforces strict business rules for names, Gmail domains, 10-digit Indian phone numbers,
 * password strength, and terms acceptance.
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  normalizedValue?: string;
}

/**
 * Validates Full Name.
 * Allows letters, spaces, hyphens, and apostrophes (2-100 characters).
 * Rejects numbers-only and arbitrary numeric symbols.
 */
export function validateFullName(name: string): ValidationResult {
  const trimmed = name.trim();

  if (!trimmed) {
    return { isValid: false, error: "Please enter your full name." };
  }

  if (trimmed.length < 2) {
    return { isValid: false, error: "Full name must be at least 2 characters." };
  }

  if (trimmed.length > 100) {
    return { isValid: false, error: "Full name cannot exceed 100 characters." };
  }

  // Check for presence of numbers
  if (/\d/.test(trimmed)) {
    return { isValid: false, error: "Full name cannot contain numbers." };
  }

  // Name character pattern: unicode letters, spaces, hyphens, apostrophes, periods
  const nameRegex = /^[a-zA-Z\u00C0-\u024F\s'\-\.]+$/;
  if (!nameRegex.test(trimmed)) {
    return { isValid: false, error: "Please enter a valid full name." };
  }

  return { isValid: true, normalizedValue: trimmed };
}

/**
 * Validates and Normalizes Indian 10-digit Mobile Number.
 * Expects exactly 10 digits (without country code in input).
 * Normalizes to standard +91XXXXXXXXXX representation.
 */
export function validateAndNormalizePhone(phone: string): ValidationResult {
  const trimmed = phone.trim();

  if (!trimmed) {
    return { isValid: false, error: "Please enter your mobile number." };
  }

  // Remove any spaces, dashes, or parentheses
  const cleaned = trimmed.replace(/[\s\-\(\)]/g, "");

  // If user entered +91 or 91 prefix, extract the 10 digits
  let digits = cleaned;
  if (cleaned.startsWith("+91") && cleaned.length === 13) {
    digits = cleaned.slice(3);
  } else if (cleaned.startsWith("91") && cleaned.length === 12) {
    digits = cleaned.slice(2);
  }

  // Check if exactly 10 numeric digits
  if (!/^\d{10}$/.test(digits)) {
    return {
      isValid: false,
      error: "Please enter a valid 10-digit Indian mobile number.",
    };
  }

  // Optional: Valid Indian mobile numbers generally start with 6, 7, 8, or 9
  if (!/^[6-9]\d{9}$/.test(digits)) {
    return {
      isValid: false,
      error: "Please enter a valid 10-digit mobile number starting with 6, 7, 8, or 9.",
    };
  }

  return {
    isValid: true,
    normalizedValue: `+91${digits}`,
  };
}

/**
 * Validates Email Address.
 * For TopVeda registration, ONLY @gmail.com addresses are accepted.
 * Normalizes email to lowercase trimmed string.
 */
export function validateEmail(email: string): ValidationResult {
  const trimmed = email.trim().toLowerCase();

  if (!trimmed) {
    return { isValid: false, error: "Please enter your email address." };
  }

  // Standard email format check
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(trimmed)) {
    return { isValid: false, error: "Please enter a valid email address." };
  }

  // Strict Gmail domain verification
  const domain = trimmed.split("@")[1];
  if (domain !== "gmail.com") {
    return {
      isValid: false,
      error: "Please use a Gmail address (@gmail.com).",
    };
  }

  return { isValid: true, normalizedValue: trimmed };
}

/**
 * Validates Password Strength.
 * Minimum 8 characters, at least 1 uppercase, 1 lowercase, 1 number, 1 special character.
 */
export function validatePassword(password: string): ValidationResult {
  if (!password) {
    return { isValid: false, error: "Please enter a password." };
  }

  if (password.length < 8) {
    return { isValid: false, error: "Password must be at least 8 characters long." };
  }

  if (!/[A-Z]/.test(password)) {
    return { isValid: false, error: "Password must contain at least one uppercase letter." };
  }

  if (!/[a-z]/.test(password)) {
    return { isValid: false, error: "Password must contain at least one lowercase letter." };
  }

  if (!/[0-9]/.test(password)) {
    return { isValid: false, error: "Password must contain at least one number." };
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)) {
    return {
      isValid: false,
      error: "Password must contain at least one special character (e.g. @, #, $, !).",
    };
  }

  return { isValid: true };
}

/**
 * Validates that Confirm Password matches Password.
 */
export function validateConfirmPassword(password: string, confirmPassword: string): ValidationResult {
  if (!confirmPassword) {
    return { isValid: false, error: "Please confirm your password." };
  }

  if (password !== confirmPassword) {
    return { isValid: false, error: "Passwords do not match." };
  }

  return { isValid: true };
}

/**
 * Validates Terms & Conditions agreement.
 */
export function validateTerms(agreed: boolean): ValidationResult {
  if (!agreed) {
    return {
      isValid: false,
      error: "You must agree to the Terms & Conditions and Privacy Policy to continue.",
    };
  }

  return { isValid: true };
}
