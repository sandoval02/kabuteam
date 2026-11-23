"use client";

import { useEffect, useId, useRef } from "react";
import { buttonStyles } from "./ui";

export type Confirm = { title: string; body: string; label: string; tone: "primary" | "destructive" };

/** Native <dialog>: focus trap, Esc to close and an inert page come from the browser. */
export function ConfirmDialog({ config, onCancel, onConfirm }: { config: Confirm | null; onCancel: () => void; onConfirm: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  const titleId = `${id}-title`;
  const descriptionId = `${id}-description`;

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (config && !d.open) d.showModal();
    if (!config && d.open) d.close();
  }, [config]);

  // Safari does not support closedby="any" yet; keep light dismiss with a pointer fallback.
  useEffect(() => {
    const d = ref.current;
    if (!d || "closedBy" in HTMLDialogElement.prototype) return;
    let pressedOutside = false;
    const isOutside = (event: PointerEvent) => {
      const rect = d.getBoundingClientRect();
      return event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
    };
    const onPointerDown = (event: PointerEvent) => {
      pressedOutside = isOutside(event);
    };
    const onPointerUp = (event: PointerEvent) => {
      if (pressedOutside && isOutside(event)) d.close();
    };
    d.addEventListener("pointerdown", onPointerDown);
    d.addEventListener("pointerup", onPointerUp);
    return () => {
      d.removeEventListener("pointerdown", onPointerDown);
      d.removeEventListener("pointerup", onPointerUp);
    };
  }, []);

  return (
    <dialog
      ref={ref}
      {...({ closedby: "any" } as React.ComponentProps<"dialog">)}
      onClose={onCancel}
      aria-labelledby={config ? titleId : undefined}
      aria-describedby={config?.body ? descriptionId : undefined}
      className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-lg bg-surface p-0 text-text shadow-sheet backdrop:bg-black/40 backdrop:backdrop-blur-sm"
    >
      {config && (
        <div className="p-5">
          <h2 id={titleId} className="text-h2 font-semibold">
            {config.title}
          </h2>
          {config.body && (
            <p id={descriptionId} className="mt-2 text-muted">
              {config.body}
            </p>
          )}
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" autoFocus className={buttonStyles.secondary} onClick={() => ref.current?.close()}>
              Cancel
            </button>
            <button type="button" className={config.tone === "destructive" ? buttonStyles.destructive : buttonStyles.primary} onClick={onConfirm}>
              {config.label}
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}
