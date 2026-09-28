import React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export interface BrandGlyphProps {
  /** Size in pixels (width and height) */
  size?: number;
  /** Use dark variant for dark backgrounds */
  variant?: "default" | "dark" | "appIcon";
  /** Optional custom classes */
  className?: string;
  /** Image priority */
  priority?: boolean;
}

/**
 * TopVeda Canonical Educational Symbol Glyph
 * Extracted directly from the official brand identity.
 */
export function BrandGlyph({
  size = 32,
  variant = "default",
  className,
  priority = false,
}: BrandGlyphProps) {
  const src =
    variant === "appIcon"
      ? "/brand/topveda-icon.png"
      : variant === "dark"
      ? "/brand/topveda-symbol-dark.png"
      : "/brand/topveda-symbol.png";

  return (
    <div
      className={cn("inline-flex items-center justify-center shrink-0 select-none", className)}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <Image
        src={src}
        alt="TopVeda Symbol"
        width={size}
        height={size}
        priority={priority}
        className="h-full w-full object-contain"
        unoptimized
      />
    </div>
  );
}
