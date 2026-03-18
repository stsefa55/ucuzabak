import type { ButtonHTMLAttributes, PropsWithChildren } from "react";
import { cn } from "../../lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClass: Record<ButtonVariant, string> = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  ghost: "btn-ghost"
};

const sizeClass: Record<ButtonSize, string> = {
  sm: "btn-sm",
  md: ""
};

export function Button({ variant = "primary", size = "md", className, children, ...rest }: PropsWithChildren<ButtonProps>) {
  return (
    <button
      className={cn(variantClass[variant], sizeClass[size], className)}
      {...rest}
    >
      {children}
    </button>
  );
}

