import React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export interface TopVedaLogoProps {
  /** Size preset or custom height in pixels */
  size?: "sm" | "md" | "lg" | "xl" | number;
  /** Use light/white text variant for dark backgrounds */
  variant?: "default" | "dark";
  /** Custom CSS classes */
  className?: string;
  /** Image priority loading */
  priority?: boolean;
}

const heightMap: Record<string, number> = {
  sm: 32,
  md: 40,
  lg: 52,
  xl: 64,
};

// Aspect ratio is 981 / 324 = ~3.027777778
const ASPECT_RATIO = 981 / 324;

/**
 * Canonical TopVeda Primary Brand Logo
 * Renders the full horizontal brand mark with educational icon, TOPVEDA wordmark, and tagline
 * strictly preserving exact proportions and visual identity.
 */
export function TopVedaLogo({
  size = "md",
  variant = "default",
  className,
  priority = false,
}: TopVedaLogoProps) {
  const height = typeof size === "number" ? size : heightMap[size] || 40;
  const width = Math.round(height * ASPECT_RATIO);

  const src =
    variant === "dark"
      ? "/brand/topveda-logo-dark.png"
      : "/brand/topveda-logo-transparent.png";

  return (
    <div
      className={cn("inline-flex items-center shrink-0 select-none", className)}
      style={{ height, width }}
    >
      <Image
        src={src}
        alt="TopVeda"
        width={width}
        height={height}
        priority={priority}
        className="h-full w-full object-contain"
        unoptimized
      />
    </div>
  );
}
