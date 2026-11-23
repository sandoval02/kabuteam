"use client";

import { useId, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { fairScore, SAVINGS_CAP } from "@/lib/scoring";

type House = { name: string; lastYear: number; min: number; max: number; start: number };
const HOUSES: House[] = [
  { name: "Small house", lastYear: 150, min: 60, max: 200, start: 117 },
  { name: "Big house", lastYear: 1000, min: 600, max: 1200, start: 940 },
];

function HouseControl({ house, value, onChange }: { house: House; value: number; onChange: (n: number) => void }) {
  const id = useId();
  const reduce = useReducedMotion();
  const { score, savingsPct, efficient } = fairScore(value, house.lastYear);
  const saved = house.lastYear - value;
  const height = Math.max(0, score) / SAVINGS_CAP;

  return (
    <div className="flex gap-4 rounded-md bg-surface shadow-receipt p-4">
      <div className="flex h-40 w-14 shrink-0 items-end overflow-hidden rounded-sm bg-bg" aria-hidden>
        <motion.div
          className="w-full rounded-sm bg-primary-bright"
          animate={{ height: `${height * 100}%` }}
          transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 26 }}
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="font-semibold">{house.name}</p>
        <p className="text-small text-muted">Same month last year: {house.lastYear} kWh</p>
        <label htmlFor={id} className="mt-3 text-small font-semibold">
          This month: <span className="num">{value} kWh</span>
        </label>
        <input
          id={id}
          type="range"
          min={house.min}
          max={house.max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="mt-1 h-10 w-full cursor-pointer accent-primary"
        />
        <p className="mt-auto">
          <span className={`num text-amount-lg font-semibold ${score > 0 ? "text-primary" : ""}`}>{score}%</span>
          <span className="ml-2 text-small text-muted">
            {saved >= 0 ? `saved ${saved} kWh` : `used ${-saved} kWh more`}
            {efficient && savingsPct < score ? " · low-usage floor" : ""}
          </span>
        </p>
      </div>
    </div>
  );
}

export function FairScoreDemo() {
  const [values, setValues] = useState(HOUSES.map((h) => h.start));
  const scores = values.map((v, i) => fairScore(v, HOUSES[i].lastYear).score);
  const leader = scores[0] === scores[1] ? null : scores[0] > scores[1] ? HOUSES[0].name : HOUSES[1].name;
  const kwhSaved = values.map((v, i) => HOUSES[i].lastYear - v);

  return (
    <div>
      <div className="grid gap-4 md:grid-cols-2">
        {HOUSES.map((h, i) => (
          <HouseControl key={h.name} house={h} value={values[i]} onChange={(n) => setValues((vs) => vs.map((v, j) => (j === i ? n : v)))} />
        ))}
      </div>
      <p className="mt-4" aria-live="polite">
        {leader ? (
          <>
            <strong>{leader} ranks higher</strong>
            {leader === "Small house" && kwhSaved[1] > kwhSaved[0]
              ? `, even though the big house saved ${kwhSaved[1] - kwhSaved[0]} more kWh.`
              : "."}
          </>
        ) : (
          <strong>It&apos;s a tie.</strong>
        )}{" "}
        <span className="text-muted">Savings count up to {SAVINGS_CAP}%, so an empty house on vacation can&apos;t win.</span>
      </p>
    </div>
  );
}
