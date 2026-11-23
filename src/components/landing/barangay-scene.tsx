"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type RefObject } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { Vector3, type Mesh } from "three";
import { EXAMPLE_HOUSES, EXAMPLE_WINNER } from "./example-data";

// Colors mirror the design tokens (three.js can't read CSS variables).
type Palette = { wall: string; roof: string; bar: string; winner: string };
const LIGHT: Palette = { wall: "#ffffff", roof: "#121412", bar: "#2b2f2b", winner: "#c6f432" };
const DARK: Palette = { wall: "#242424", roof: "#6b6b6b", bar: "#ededed", winner: "#c6f432" };
const BAR_SCALE = 0.17; // world units per % point
const xOf = (i: number) => (i - (EXAMPLE_HOUSES.length - 1) / 2) * 2.6;

type Labels = (HTMLDivElement | null)[];

function House({
  index,
  reduced,
  colors,
  onHover,
}: {
  index: number;
  reduced: boolean;
  colors: Palette;
  onHover: (i: number | null) => void;
}) {
  const h = EXAMPLE_HOUSES[index];
  const bar = useRef<Mesh>(null);
  const target = Math.max(h.score, 0.5) * BAR_SCALE;
  const isWinner = h.label === EXAMPLE_WINNER.label;

  // Bars grow from the ground once, so the eye lands on the tallest: a small house.
  useFrame((_, dt) => {
    if (!bar.current) return;
    const current = bar.current.scale.y;
    const next = reduced ? target : current + (target - current) * Math.min(1, dt * (2 + index * 0.4));
    bar.current.scale.y = next;
    bar.current.position.y = next / 2;
  });

  const s = h.size;
  return (
    <group
      position={[xOf(index), 0, 0]}
      onPointerOver={(e) => {
        e.stopPropagation();
        onHover(index);
      }}
      onPointerOut={() => onHover(null)}
    >
      <mesh position={[0, s / 2, 0.9]} castShadow receiveShadow>
        <boxGeometry args={[s * 1.3, s, s * 1.1]} />
        <meshStandardMaterial color={colors.wall} roughness={0.9} />
      </mesh>
      <mesh position={[0, s + s * 0.35, 0.9]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[s * 0.98, s * 0.7, 4]} />
        <meshStandardMaterial color={colors.roof} roughness={0.8} />
      </mesh>
      <mesh
        ref={bar}
        name={`bar-${index}`}
        position={[s * 0.65 + 0.4, reduced ? target / 2 : 0.001, 0.9]}
        scale={[1, reduced ? target : 0.001, 1]}
        castShadow
      >
        <boxGeometry args={[0.45, 1, 0.45]} />
        <meshStandardMaterial color={isWinner ? colors.winner : colors.bar} roughness={0.6} />
      </mesh>
    </group>
  );
}

/** Moves the plain-DOM labels to sit above each bar, every frame. No extra React roots. */
function LabelTracker({ labels }: { labels: RefObject<Labels> }) {
  const v = new Vector3();
  useFrame(({ camera, size, scene }) => {
    EXAMPLE_HOUSES.forEach((_, i) => {
      const el = labels.current[i];
      const bar = scene.getObjectByName(`bar-${i}`);
      if (!el || !bar) return;
      bar.getWorldPosition(v);
      v.y += bar.scale.y / 2 + 0.35;
      v.project(camera);
      const x = ((v.x + 1) / 2) * size.width;
      const y = ((1 - v.y) / 2) * size.height;
      el.style.transform = `translate(-50%, -100%) translate(${x}px, ${y}px)`;
      el.style.opacity = v.z > 1 ? "0" : "1";
    });
  });
  return null;
}

const NARROW = "(max-width: 640px)";
const subscribeNarrow = (cb: () => void) => {
  const mq = window.matchMedia(NARROW);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

export default function BarangayScene({ reduced, dark }: { reduced: boolean; dark: boolean }) {
  // Phones get a camera further back so the whole street fits the narrower frame.
  const narrow = useSyncExternalStore(subscribeNarrow, () => window.matchMedia(NARROW).matches, () => false);
  const distance = narrow ? 24 : 19;
  const labels = useRef<Labels>([]);
  const container = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [visible, setVisible] = useState(true);
  const colors = dark ? DARK : LIGHT;

  useEffect(() => {
    const el = container.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.05 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={container} className="relative h-full w-full overflow-hidden">
      <Canvas
        shadows={!narrow}
        dpr={narrow ? 1 : [1, 1.5]}
        frameloop={reduced || narrow ? "demand" : visible ? "always" : "demand"}
        aria-hidden
      >
        <PerspectiveCamera makeDefault key={distance} position={[0.6, (5.5 * distance) / 19, distance]} fov={32} />
        <ambientLight intensity={1.4} />
        <directionalLight
          position={[5, 10, 6]}
          intensity={2.2}
          castShadow={!narrow}
          shadow-mapSize={narrow ? [512, 512] : [1024, 1024]}
        />
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[200, 200]} />
          {/* Shadows only: the houses sit directly on the page background. */}
          <shadowMaterial opacity={dark ? 0.28 : 0.16} />
        </mesh>
        {EXAMPLE_HOUSES.map((h, i) => (
          <House key={h.label} index={i} reduced={reduced || narrow} colors={colors} onHover={setHovered} />
        ))}
        <LabelTracker labels={labels} />
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate={!reduced && !narrow}
          autoRotateSpeed={0.6}
          minPolarAngle={0.6}
          maxPolarAngle={1.25}
          target={[0.6, 1.6, 0]}
        />
      </Canvas>
      {EXAMPLE_HOUSES.map((h, i) => (
        <div
          key={h.label}
          ref={(el) => {
            labels.current[i] = el;
          }}
          aria-hidden
          className={`num pointer-events-none absolute left-0 top-0 whitespace-nowrap rounded-sm px-2 py-0.5 text-small font-semibold opacity-0 shadow-receipt ${
            hovered === i ? "z-10 bg-text text-surface" : "bg-surface text-text"
          }`}
        >
          {hovered === i ? `${h.label} · ${h.now} vs ${h.lastYear} kWh` : `${Number(h.score.toFixed(1))}%`}
        </div>
      ))}
    </div>
  );
}
