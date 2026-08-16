import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "press inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-none text-[13px] font-medium cursor-pointer transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-45 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_0_18px_-8px_var(--primary)] hover:brightness-110",
        secondary:
          "bg-white/[0.045] text-secondary-foreground shadow-[0_1px_0_0_oklch(1_0_0/4%)_inset] hover:bg-white/[0.09]",
        ghost: "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        outline:
          "bg-white/[0.035] text-foreground hover:bg-white/[0.08] hover:text-accent-foreground",
        danger:
          "bg-destructive text-destructive-foreground shadow-[0_0_18px_-8px_var(--destructive)] hover:brightness-110",
        destructive:
          "bg-destructive text-destructive-foreground shadow-[0_0_18px_-8px_var(--destructive)] hover:brightness-110",
        warning:
          "bg-warning text-warning-foreground shadow-[0_1px_0_0_oklch(1_0_0/22%)_inset] hover:brightness-108",
        success:
          "bg-success text-success-foreground shadow-[0_1px_0_0_oklch(1_0_0/22%)_inset] hover:brightness-108",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4",
        sm: "h-8 rounded-none px-3 text-xs",
        lg: "h-11 rounded-none px-6 text-sm",
        icon: "h-9 w-9",
        "icon-sm": "h-7 w-7 rounded-none",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={!asChild && (loading || props.disabled)}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin" />
            {children}
          </>
        ) : (
          children
        )}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
