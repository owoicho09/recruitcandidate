"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@/lib/cn";

export const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn(
      "relative h-6 w-10 shrink-0 rounded-full bg-border-strong transition-colors",
      "data-[state=checked]:bg-accent",
      "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
      className,
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb className="block size-4.5 translate-x-1 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-4.5" />
  </SwitchPrimitive.Root>
));
Switch.displayName = "Switch";
