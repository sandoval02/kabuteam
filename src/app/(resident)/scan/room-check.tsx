"use client";

import { useEffect, useEffectEvent, useRef, useState, useSyncExternalStore } from "react";
import { Camera, ScanLine } from "lucide-react";
import { PhotoCapture, postPhoto } from "@/components/photo-capture";
import { Button, CheckField, Field, Notice, peso } from "@/components/ui";
import { costPerHour, deviceLabels, resolveAlerts, verdict, type RoomCheck, type RoomEntry } from "@/lib/room-check";

const MINUTE = 60_000;
// The server's 20-per-hour AI cap is the real limit; below 3 minutes it runs out before the hour does.
const MIN_MINUTES = 1;
const MAX_MINUTES = 60;
const CAP_SAFE_MINUTES = 3;

/** Typed auto-check minutes → a whole number in range, or 0 (off, or not a valid number). */
const toMinutes = (text: string) => {
  const m = Number(text);
  return text !== "" && Number.isInteger(m) && m >= MIN_MINUTES && m <= MAX_MINUTES ? m : 0;
};

/** One plain message per getUserMedia failure (from TipidWatch's camera hook). */
function cameraError(err: unknown): string {
  const name = (err as { name?: string } | null)?.name;
  if (name === "NotAllowedError" || name === "SecurityError")
    return "Camera access is blocked. Allow the camera for this site in your browser settings, then try again.";
  if (name === "NotFoundError") return "No camera found on this device. Check a photo instead.";
  if (name === "NotReadableError") return "Another app is using the camera. Close it and try again.";
  return "The camera could not start. Check a photo instead.";
}

/** ₱1.26 read aloud: "1 piso at 26 sentimo". */
function spokenPeso(n: number) {
  const cents = Math.round(n * 100);
  const [pesos, centavos] = [Math.floor(cents / 100), cents % 100];
  return [pesos && `${pesos} piso`, centavos && `${centavos} sentimo`].filter(Boolean).join(" at ") || "0 piso";
}

/** What the voice says: the on-screen verdict, with the cost in words. */
function spoken(c: RoomCheck) {
  const cost = costPerHour(c);
  return `${verdict(c).title}${c.waste && cost !== null ? ` ${spokenPeso(cost)} kada oras.` : ""}`;
}

/** Reads text aloud with the browser's own voice (Filipino where the phone has one); a new line cuts off the last. */
function say(text: string) {
  if (!window.speechSynthesis) return;
  speechSynthesis.cancel();
  const line = new SpeechSynthesisUtterance(text);
  line.lang = "fil-PH";
  speechSynthesis.speak(line);
}

const clock = (at: number) => new Date(at).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" });
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/** Live camera (or a photo) → what was left on with nobody there, in pesos per hour. Photos are never saved. */
export function RoomCheck() {
  const canStream = useSyncExternalStore(
    () => () => {},
    () => !!navigator.mediaDevices?.getUserMedia,
    () => false,
  );
  const root = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [starting, setStarting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checks, setChecks] = useState<RoomEntry[]>([]); // this visit only, newest first
  const [voice, setVoice] = useState(true); // read "Checking the room." and each result aloud
  const [minutesText, setMinutesText] = useState(""); // auto-check interval as typed; empty = off
  const auto = toMinutes(minutesText);
  const [nextAt, setNextAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);

  // Stopping the tracks turns the camera off: when it is stopped, replaced, or this tab unmounts.
  useEffect(() => () => stream?.getTracks().forEach((t) => t.stop()), [stream]);
  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  function stopCamera() {
    setStream(null);
    setNextAt(null);
  }

  async function startCamera() {
    setError(null);
    setStarting(true);
    let s: MediaStream | null = null;
    try {
      s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      const track = s.getVideoTracks()[0];
      video.current!.srcObject = s;
      await video.current!.play();
      // The camera can end on its own (another app takes it, a call comes in), even while play() is starting.
      // Check and listen in the same step, so an end is never missed and a frozen frame never looks live.
      if (track?.readyState !== "live") throw Object.assign(new Error("camera ended"), { name: "NotReadableError" });
      track.addEventListener("ended", () => {
        stopCamera();
        setError(cameraError({ name: "NotReadableError" }));
      });
      const t = Date.now();
      setStream(s);
      setNow(t);
      setNextAt(auto ? t + auto * MINUTE : null);
    } catch (err) {
      s?.getTracks().forEach((t) => t.stop());
      setError(cameraError(err));
    }
    setStarting(false);
  }

  async function runCheck(source: ImageBitmapSource) {
    if (checking) return;
    setChecking(true);
    setError(null);
    // Spoken before any await, so a tap on Check now also unlocks the voice on phones that need a tap first.
    if (voice) say("Checking the room.");
    setNextAt(auto && stream ? Date.now() + auto * MINUTE : null);
    const { data, error } = await postPhoto<{ check: RoomCheck | null }>("/api/extract/room", source);
    setChecking(false);
    const check = data?.check;
    if (!check) {
      // Stop auto-check on any failure, so an hourly limit or outage is not hit again every few minutes.
      const message = `${error ?? "Could not check the room right now. Try again in a few minutes."}${auto ? " Auto-check is off." : ""}`;
      setError(message);
      if (voice) say(message);
      setMinutesText("");
      setNextAt(null);
      return;
    }
    const at = Date.now();
    setChecks((prev) => [{ ...check, at, resolved: false }, ...resolveAlerts(prev, check)].slice(0, 10));
    if (voice) say(spoken(check));
  }

  function resolveAlert(at: number) {
    setChecks((prev) => prev.map((entry) => (entry.at === at && !entry.resolved ? { ...entry, resolved: true } : entry)));
    if (voice) say("Naayos na.");
  }

  // Every second while the camera is on: countdown and due auto-checks. Leaving the tab or the page turns the camera off.
  const onTick = useEffectEvent(() => {
    if (document.hidden || !root.current?.offsetParent) return stopCamera();
    const t = Date.now();
    setNow(t);
    if (nextAt !== null && t >= nextAt && video.current) void runCheck(video.current);
  });
  useEffect(() => {
    if (!stream) return;
    const id = setInterval(() => onTick(), 1000);
    const onVisibility = () => onTick();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [stream]);

  const live = stream !== null;
  const result = checks[0] && <Result entry={checks[0]} />;
  const alerts = checks.filter((c) => c.waste);
  const alertList = alerts.length > 0 && (
    <div>
      <h3 className="mb-1 text-small font-semibold">Alerts this visit</h3>
      <ul className="divide-y divide-border text-small">
        {alerts.map((c) => {
          const resolved = c.resolved;
          const names = deviceLabels(c);
          return (
            <li key={c.at} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <p className="font-semibold">{names}</p>
                <p className="text-muted">
                  <span className="num">{clock(c.at)}</span> ·{" "}
                  <span className={resolved ? "text-success" : "text-warning"}>{resolved ? "Naayos na" : "Bukas pa"}</span>
                </p>
              </div>
              {!resolved && (
                <Button
                  variant="secondary"
                  type="button"
                  className="shrink-0"
                  aria-label={`Naayos na: ${names}, ${clock(c.at)}`}
                  onClick={() => resolveAlert(c.at)}
                >
                  Naayos na ito
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
  const voiceToggle = (
    <CheckField
      label="Speak the result"
      name="room-voice"
      checked={voice}
      onChange={(e) => {
        setVoice(e.target.checked);
        if (!e.target.checked) window.speechSynthesis?.cancel();
      }}
    />
  );
  const secondsLeft = nextAt && now ? Math.max(0, Math.ceil((nextAt - now) / 1000)) : null;

  return (
    <div ref={root} className="flex flex-col gap-3">
      {!live && (
        <>
          <p className="text-small text-muted">
            Point your phone at a room. We tell you what was left on with nobody there, and what it costs you per hour.
          </p>
          <Notice tone="info">Photos are checked by the AI and never saved. Point the camera at the room, not at people.</Notice>
        </>
      )}

      <div hidden={!live && !starting} className="relative overflow-hidden rounded-sm bg-surface-2">
        <video
          ref={video}
          muted
          playsInline
          aria-label="Camera view of the room"
          className={`aspect-square w-full object-cover ${checking ? "opacity-50" : ""}`}
        />
        {checking && (
          <p className="absolute inset-0 flex items-center justify-center gap-2 font-semibold">
            <ScanLine size={16} aria-hidden className="animate-pulse" />
            Checking the room…
          </p>
        )}
      </div>

      {error && <Notice tone="warning">{error}</Notice>}

      {live ? (
        <>
          <Button variant="lime" type="button" disabled={checking} onClick={() => video.current && runCheck(video.current)}>
            <ScanLine size={15} strokeWidth={1.75} aria-hidden />
            {checking ? "Checking…" : "Check now"}
          </Button>
          {result}
          {alertList}
          <Field
            label="Auto-check every (minutes)"
            name="room-auto"
            type="number"
            inputMode="numeric"
            min={MIN_MINUTES}
            max={MAX_MINUTES}
            step={1}
            placeholder="Off"
            value={minutesText}
            onChange={(e) => {
              const minutes = toMinutes(e.target.value);
              const t = Date.now();
              setMinutesText(e.target.value);
              setNow(t);
              setNextAt(minutes ? t + minutes * MINUTE : null);
            }}
            error={minutesText && !auto ? `Use a whole number from ${MIN_MINUTES} to ${MAX_MINUTES}.` : undefined}
            hint={
              auto && secondsLeft !== null
                ? `Next check in ${mmss(secondsLeft)}. Keep this page open and the screen on.${
                    auto < CAP_SAFE_MINUTES ? ` Faster than every ${CAP_SAFE_MINUTES} minutes uses up the 20 checks an hour, then auto-check stops.` : ""
                  }`
                : "Leave empty to check only when you tap. You get 20 AI checks an hour."
            }
          />
          {voiceToggle}
          <Button variant="secondary" type="button" onClick={stopCamera}>
            Stop camera
          </Button>
        </>
      ) : (
        <>
          {canStream && (
            <Button variant="lime" type="button" disabled={starting || checking} onClick={startCamera}>
              <Camera size={15} strokeWidth={1.75} aria-hidden />
              {starting ? "Starting camera…" : "Start camera"}
            </Button>
          )}
          <PhotoCapture
            label={checking ? "Checking the room…" : canStream ? "Check a photo instead" : "Take or upload a room photo"}
            variant={canStream ? "secondary" : "lime"}
            disabled={starting || checking}
            onPhoto={(file) => runCheck(file)}
          />
          {voiceToggle}
          {result}
          {alertList}
        </>
      )}
    </div>
  );
}

function Result({ entry }: { entry: RoomEntry }) {
  const v = verdict(entry);
  const cost = costPerHour(entry);
  const open = entry.waste && !entry.resolved;
  return (
    <div className="flex flex-col gap-2">
      <Notice tone={v.tone}>
        <span className="block font-semibold">{v.title}</span>
        {entry.readable && !entry.resolved && entry.observation && <span className="block">{entry.observation}</span>}
        {open && (
          <span className="block">
            {cost === null ? (
              "Save a bill to see what this costs in pesos."
            ) : (
              <>
                <span className="num font-semibold">{peso(cost)}</span> kada oras habang bukas.
              </>
            )}
          </span>
        )}
      </Notice>
      {!entry.resolved && entry.devices.length > 0 && (
        <ul className="divide-y divide-border">
          {entry.devices.map((d, i) => (
            <li key={i} className="flex items-center justify-between gap-3 py-2">
              <span className="font-semibold">{d.label}</span>
              <span className="num text-small text-muted">
                {d.watts} W{d.pesosPerHour !== null && ` · ${peso(d.pesosPerHour)}/h`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
