import React from "react";
import { cn } from "@/lib/utils";

export interface BrandGlyphProps {
  size?: number;
  className?: string;
}

/**
 * Temporary Geometric Brand Glyph (Design System Placeholder)
 * Note: Placeholder only. Final brand identity will be refined in the landing page phase.
 */
export function BrandGlyph({ size = 32, className }: BrandGlyphProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      {/* Dynamic upward chevron / pyramid symbolizing ascent & wisdom */}
      <path
        d="M16 3L4 15H11V29H21V15H28L16 3Z"
        fill="#F4511E"
      />
      <path
        d="M16 10L10 16H13V26H19V16H22L16 10Z"
        fill="#121417"
        opacity="0.15"
      />
    </svg>
  );
}
