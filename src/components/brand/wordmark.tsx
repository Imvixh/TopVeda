import React from "react";
import { cn } from "@/lib/utils";

export interface WordmarkProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  inverseVeda?: boolean; // When on dark backgrounds
  asLink?: boolean;
}

const sizeClasses = {
  sm: "text-lg tracking-tight",
  md: "text-2xl tracking-tight",
  lg: "text-3xl tracking-tight",
  xl: "text-4xl tracking-tighter",
};

/**
 * TopVeda Official Wordmark Primitive
 * - "TOP" in Warm Orange
 * - "VEDA" in Deep Charcoal/Black
 */
export function Wordmark({
  size = "md",
  className,
  inverseVeda = false,
}: WordmarkProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center font-extrabold select-none leading-none font-sans",
        sizeClasses[size],
        className
      )}
      aria-label="TopVeda"
    >
      <span className="text-brand-orange">TOP</span>
      <span
        className={cn(
          inverseVeda ? "text-white" : "text-brand-charcoal",
          "transition-colors duration-150"
        )}
      >
        VEDA
      </span>
    </div>
  );
}
