"use client";

import { useRef } from "react";
import { Camera } from "lucide-react";
import { buttonStyles } from "./ui";

const MAX_EDGE = 1600;

/** Downscale to ≤1600px JPEG before upload: smaller, faster, cheaper requests. */
export async function resizeImage(file: File, maxEdge = MAX_EDGE): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("resize failed"))), "image/jpeg", 0.85),
  );
}

/** Opens the phone's rear camera (or file picker on desktop). No library needed. */
export function PhotoCapture({
  label,
  onPhoto,
  disabled,
  variant = "primary",
}: {
  label: string;
  onPhoto: (file: File) => void;
  disabled?: boolean;
  variant?: "primary" | "secondary";
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => input.current?.click()}
        className={`${buttonStyles[variant]} w-full`}
      >
        <Camera size={15} strokeWidth={1.75} aria-hidden />
        {label}
      </button>
      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onPhoto(file);
          e.target.value = "";
        }}
      />
    </>
  );
}

export async function postPhoto<T>(url: string, file: File): Promise<{ data?: T; error?: string }> {
  let body: FormData;
  try {
    body = new FormData();
    body.append("photo", await resizeImage(file), "photo.jpg");
  } catch {
    return { error: "That photo format could not be read. Try a JPEG or PNG photo." };
  }

  try {
    const res = await fetch(url, { method: "POST", body });
    const json = await res.json().catch(() => null);
    if (!json) return { error: "The scan service returned an unexpected response. Try again." };
    return res.ok ? { data: json.data as T } : { error: json.error?.message ?? "Something went wrong." };
  } catch {
    return { error: "No connection. Check your internet and try again." };
  }
}
