"use client";

import { useRef, useTransition } from "react";
import { LoaderCircle, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/avatar";
import { ValidatedForm } from "@/components/form";
import { resizeImage } from "@/components/photo-capture";
import { removeAvatar, uploadAvatar } from "./actions";

/** Big avatar with a pencil to upload a photo (resized to 512px first) and a remove option. */
export function AvatarEditor({ url, initials }: { url: string | null; initials: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();

  function onFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return void toast.error("Choose an image file.");
    start(async () => {
      try {
        const data = new FormData();
        data.append("avatar", new File([await resizeImage(file, 512)], "avatar.jpg", { type: "image/jpeg" }));
        const result = await uploadAvatar({}, data);
        if (result.ok) toast.success(result.ok);
        else toast.error(result.error ?? "Could not upload the photo.");
      } catch {
        toast.error("That photo could not be read. Try another one.");
      }
    });
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <Avatar url={url} initials={initials} size={96} />
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={pending}
          aria-label={url ? "Change photo" : "Upload photo"}
          className="absolute -bottom-1 -right-1 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-primary text-on-primary shadow-sheet transition-transform duration-100 after:absolute after:-inset-1 after:content-[''] active:scale-95 disabled:opacity-60"
        >
          {pending ? <LoaderCircle size={12} className="animate-spin" aria-hidden /> : <Pencil size={12} aria-hidden />}
        </button>
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => {
            onFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
      {url && (
        <ValidatedForm action={removeAvatar} className="contents">
          <button
            type="submit"
            data-confirm-title="Remove your photo?"
            data-confirm-body="Your initials will show instead."
            data-confirm-label="Remove photo"
            data-confirm-tone="destructive"
            className="inline-flex cursor-pointer items-center gap-1.5 text-small font-semibold text-muted hover:text-error"
          >
            <Trash2 size={14} aria-hidden />
            Remove photo
          </button>
        </ValidatedForm>
      )}
    </div>
  );
}
