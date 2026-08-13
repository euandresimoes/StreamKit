import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "press inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-[13px] font-medium cursor-pointer transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-45 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-[image:var(--gradient-primary)] text-primary-foreground shadow-[0_1px_0_0_oklch(1_0_0/25%)_inset,0_8px_20px_-10px_oklch(0_0_0/70%)] hover:brightness-108",
        secondary:
          "bg-secondary text-secondary-foreground border border-border-strong shadow-[0_1px_0_0_oklch(1_0_0/6%)_inset] hover:bg-accent",
        ghost: "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        outline:
          "border border-border-strong bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground",
        danger:
          "bg-destructive text-destructive-foreground shadow-[0_1px_0_0_oklch(1_0_0/18%)_inset] hover:brightness-110",
        destructive:
          "bg-destructive text-destructive-foreground shadow-[0_1px_0_0_oklch(1_0_0/18%)_inset] hover:brightness-110",
        warning:
          "bg-warning text-warning-foreground shadow-[0_1px_0_0_oklch(1_0_0/22%)_inset] hover:brightness-108",
        success:
          "bg-success text-success-foreground shadow-[0_1px_0_0_oklch(1_0_0/22%)_inset] hover:brightness-108",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-11 rounded-2xl px-6 text-sm",
        icon: "h-9 w-9",
        "icon-sm": "h-7 w-7 rounded-lg",
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
