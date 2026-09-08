import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-brand-orange focus:ring-offset-2 select-none",
  {
    variants: {
      variant: {
        default:
          "border border-transparent bg-brand-charcoal text-white",
        primary:
          "border border-transparent bg-brand-orange text-white",
        peach:
          "border border-brand-orange-border/50 bg-brand-bg-peach text-brand-orange font-medium",
        outline:
          "border border-brand-border text-brand-text-primary bg-brand-surface",
        neutral:
          "border border-transparent bg-gray-100 text-brand-charcoal",
        success:
          "border border-transparent bg-emerald-50 text-emerald-700 border-emerald-200",
      },
      size: {
        sm: "px-2 py-0.5 text-[11px]",
        md: "px-2.5 py-0.5 text-xs",
        lg: "px-3 py-1 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
