"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type ReactNode } from "react";

const PrintingReceipt = dynamic(() => import("./printing-receipt").then((m) => m.PrintingReceipt), {
  ssr: false,
  loading: () => <Skeleton />,
});
const FairScoreDemo = dynamic(() => import("./fair-score-demo").then((m) => m.FairScoreDemo), {
  ssr: false,
  loading: () => <Skeleton />,
});

function Skeleton() {
  return <div aria-hidden className="h-full min-h-40 animate-pulse rounded-md bg-border/40" />;
}

/** Keeps the below-fold demos out of the initial JS until the reader gets close. */
function LazyMount({ children, className }: { children: ReactNode; className: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      const id = window.setTimeout(() => setShow(true), 0);
      return () => window.clearTimeout(id);
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShow(true);
          observer.disconnect();
        }
      },
      { rootMargin: "480px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={className}>
      {show ? children : <Skeleton />}
    </div>
  );
}

export function LazyPrintingReceipt() {
  return (
    <LazyMount className="min-h-[41rem] md:min-h-[30rem]">
      <PrintingReceipt />
    </LazyMount>
  );
}

export function LazyFairScoreDemo() {
  return (
    <LazyMount className="min-h-[30rem] md:min-h-[18rem]">
      <FairScoreDemo />
    </LazyMount>
  );
}
