"use client";

import { useSyncExternalStore } from "react";

const REDUCED = "(prefers-reduced-motion: reduce)";
const DARK = "(prefers-color-scheme: dark)";
const NARROW = "(max-width: 640px)";

const subscribeReduce = (cb: () => void) => {
  const mq = window.matchMedia(REDUCED);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
const getReduce = () => window.matchMedia(REDUCED).matches;

const subscribeDark = (cb: () => void) => {
  const mq = window.matchMedia(DARK);
  const observer = new MutationObserver(cb);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  mq.addEventListener("change", cb);
  return () => {
    mq.removeEventListener("change", cb);
    observer.disconnect();
  };
};
const getDark = () => {
  const choice = document.documentElement.dataset.theme;
  return choice ? choice === "dark" : window.matchMedia(DARK).matches;
};

const subscribeNarrow = (cb: () => void) => {
  const mq = window.matchMedia(NARROW);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
const getNarrow = () => window.matchMedia(NARROW).matches;

/** The OS preference, without pulling in an animation library. */
export function usePrefersReducedMotion() {
  return useSyncExternalStore(subscribeReduce, getReduce, () => false);
}

/** The active theme: an explicit data-theme choice, otherwise the OS preference. */
export function useDarkMode() {
  return useSyncExternalStore(subscribeDark, getDark, () => false);
}

/** Phone-sized screens get the static hero until the reader asks for 3D. */
export function useIsNarrow() {
  return useSyncExternalStore(subscribeNarrow, getNarrow, () => false);
}
