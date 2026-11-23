"use client";

import { useFormStatus } from "react-dom";
import { LoaderCircle } from "lucide-react";
import { buttonStyles } from "./ui";

export function SubmitButton({
  children,
  pendingText,
  variant = "primary",
  className = "",
  disabled,
  ...props
}: React.ComponentProps<"button"> & { pendingText?: string; variant?: keyof typeof buttonStyles }) {
  const { pending } = useFormStatus();
  return (
    <button
      {...props}
      type="submit"
      disabled={pending || disabled}
      aria-busy={pending}
      className={`${buttonStyles[variant]} ${className}`}
    >
      {pending && <LoaderCircle size={15} className="animate-spin" aria-hidden />}
      {pending && pendingText ? pendingText : children}
    </button>
  );
}
