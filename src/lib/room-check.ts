export type RoomDevice = {
  type: string;
  label: string;
  watts: number;
  pluggedIn: boolean | null;
  pesosPerHour: number | null;
};

export type RoomCheck = {
  readable: boolean;
  peoplePresent: boolean;
  waste: boolean;
  observation: string;
  devices: RoomDevice[];
};

export type RoomEntry = RoomCheck & { at: number; resolvedAt: number | null };

export type RoomVerdict = { tone: "success" | "warning" | "info"; title: string };

export type MonthWaste = { kwh: number; pesos: number | null };

export function deviceLabels(c: RoomCheck) {
  return [...new Set(c.devices.map((d) => (d.pluggedIn === false ? `${d.label} (not plugged in)` : d.label)))].join(", ");
}

export function energyDevices(c: RoomCheck) {
  return c.devices.filter((d) => d.pluggedIn !== false);
}

export function costPerHour(c: RoomCheck): number | null {
  const active = energyDevices(c);
  if (c.devices.length === 0) return null;
  if (active.length === 0) return 0;
  return active[0].pesosPerHour !== null ? active.reduce((sum, d) => sum + (d.pesosPerHour ?? 0), 0) : null;
}

export function verdict(c: RoomCheck & { resolvedAt?: number | null }): RoomVerdict {
  if (c.resolvedAt) return { tone: "success", title: "Naayos na." };
  if (!c.readable)
    return { tone: "warning", title: "Hindi malinaw. Hold the phone steady with the room in view, then check again." };
  const names = deviceLabels(c);
  if (c.waste) return { tone: "warning", title: `May naiwang bukas, walang tao: ${names}.` };
  if (c.devices.length) return { tone: "info", title: "Someone is in the room, so nothing is wasted." };
  return { tone: "success", title: "All clear. Walang naiwang bukas." };
}

export function resolveAlerts(entries: RoomEntry[], check: RoomCheck, at: number): RoomEntry[] {
  if (!check.readable) return entries;
  if (check.peoplePresent) {
    return entries.map((entry) => (entry.waste && !entry.resolvedAt ? { ...entry, resolvedAt: at } : entry));
  }
  const stillOn = new Set(check.devices.map((d) => d.type));
  return entries.map((entry) =>
    entry.waste && !entry.resolvedAt && !entry.devices.some((d) => stillOn.has(d.type))
      ? { ...entry, resolvedAt: at }
      : entry,
  );
}

export function nextChecks(entries: RoomEntry[], check: RoomCheck, at: number): RoomEntry[] {
  const resolved = resolveAlerts(entries, check, at);
  if (check.waste) {
    const open = resolved.findIndex((entry) => entry.waste && !entry.resolvedAt);
    if (open >= 0) {
      const previous = new Map(resolved[open].devices.map((d) => [d.type, d.pluggedIn]));
      const devices = check.devices.map((d) => ({
        ...d,
        pluggedIn: previous.has(d.type) ? previous.get(d.type)! : d.pluggedIn,
      }));
      const merged = { ...resolved[open], ...check, devices, at: resolved[open].at, resolvedAt: null };
      return [merged, ...resolved.filter((_, i) => i !== open)].slice(0, 10);
    }
  }
  return [{ ...check, at, resolvedAt: null }, ...resolved].slice(0, 10);
}

export function monitoredMs(entry: RoomEntry, now: number): number {
  return Math.max(0, (entry.resolvedAt ?? now) - entry.at);
}

export function monitoredConsumption(entry: RoomCheck, ms: number): { kwh: number; pesos: number | null } {
  const hours = ms / 3_600_000;
  const kwh = (energyDevices(entry).reduce((sum, d) => sum + d.watts, 0) / 1000) * hours;
  const perHour = costPerHour(entry);
  return { kwh, pesos: perHour === null ? null : perHour * hours };
}

export function addMonthWaste(total: MonthWaste, energy: MonthWaste): MonthWaste {
  return {
    kwh: total.kwh + energy.kwh,
    pesos: energy.pesos === null ? total.pesos : (total.pesos ?? 0) + energy.pesos,
  };
}

export function durationLabel(ms: number): string {
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return "under 1 min";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}
