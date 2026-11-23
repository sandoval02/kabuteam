"use client";

import { useFormStatus } from "react-dom";
import { LoaderCircle } from "lucide-react";
import { buttonStyles } from "./ui";

export function SubmitButton({
  children,
  pendingText,
  variant = "primary",
  className = "",
  ...props
}: React.ComponentProps<"button"> & { pendingText?: string; variant?: keyof typeof buttonStyles }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={`${buttonStyles[variant]} ${className}`} {...props}>
      {pending && <LoaderCircle size={20} className="animate-spin" aria-hidden />}
      {pending && pendingText ? pendingText : children}
    </button>
  );
}
