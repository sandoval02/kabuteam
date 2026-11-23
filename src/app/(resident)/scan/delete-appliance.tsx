"use client";

import { Trash2 } from "lucide-react";
import { ValidatedForm } from "@/components/form";
import { deleteAppliance } from "../actions";

export function DeleteAppliance({ id, label }: { id: string; label: string }) {
  return (
    <ValidatedForm action={deleteAppliance} className="contents">
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        aria-label={`Remove ${label}`}
        data-confirm-title={`Remove ${label}?`}
        data-confirm-body="It will no longer appear on your receipt. You can add it again any time."
        data-confirm-label="Remove"
        data-confirm-tone="destructive"
        className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-sm text-muted transition-colors duration-100 hover:bg-error-bg hover:text-error"
      >
        <Trash2 size={20} strokeWidth={1.75} aria-hidden />
      </button>
    </ValidatedForm>
  );
}
