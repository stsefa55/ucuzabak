import type { HTMLAttributes, PropsWithChildren } from "react";
import { cn } from "../../lib/utils";

export function Badge({ className, children, ...rest }: PropsWithChildren<HTMLAttributes<HTMLSpanElement>>) {
  return (
    <span className={cn("badge", className)} {...rest}>
      {children}
    </span>
  );
}

