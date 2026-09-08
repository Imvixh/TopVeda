import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary:
          "bg-brand-orange text-white hover:bg-brand-orange-hover shadow-subtle hover:shadow-card hover:-translate-y-0.5",
        secondary:
          "bg-brand-charcoal text-white hover:bg-brand-charcoal-light shadow-subtle hover:shadow-card hover:-translate-y-0.5",
        outline:
          "border border-brand-border bg-brand-surface text-brand-text-primary hover:bg-brand-bg-peach hover:border-brand-orange-border hover:text-brand-orange",
        ghost:
          "text-brand-text-primary hover:bg-brand-bg-peach hover:text-brand-orange",
        peach:
          "bg-brand-bg-peach text-brand-orange hover:bg-brand-orange-subtle border border-brand-orange-border/40",
        destructive:
          "bg-red-600 text-white hover:bg-red-700 shadow-subtle",
      },
      size: {
        sm: "h-8 px-3 text-xs rounded-md gap-1.5",
        md: "h-10 px-4 text-sm rounded-lg gap-2",
        lg: "h-12 px-6 text-base rounded-xl gap-2.5",
        icon: "h-10 w-10 p-0 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
