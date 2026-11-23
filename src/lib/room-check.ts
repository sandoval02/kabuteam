export type RoomDevice = { type: string; label: string; watts: number; pesosPerHour: number | null };

export type RoomCheck = {
  readable: boolean;
  peoplePresent: boolean;
  waste: boolean;
  observation: string;
  devices: RoomDevice[];
};

export type RoomEntry = RoomCheck & { at: number; resolved: boolean };

export type RoomVerdict = { tone: "success" | "warning" | "info"; title: string };

export function deviceLabels(c: RoomCheck) {
  return [...new Set(c.devices.map((d) => d.label))].join(", ");
}

export function costPerHour(c: RoomCheck): number | null {
  return c.devices.length > 0 && c.devices[0].pesosPerHour !== null
    ? c.devices.reduce((sum, d) => sum + (d.pesosPerHour ?? 0), 0)
    : null;
}

export function verdict(c: RoomCheck & { resolved?: boolean }): RoomVerdict {
  if (c.resolved) return { tone: "success", title: "Naayos na." };
  if (!c.readable)
    return { tone: "warning", title: "Hindi malinaw. Hold the phone steady with the room in view, then check again." };
  const names = deviceLabels(c);
  if (c.waste) return { tone: "warning", title: `May naiwang bukas, walang tao: ${names}.` };
  if (c.devices.length) return { tone: "info", title: "Someone is in the room, so nothing is wasted." };
  return { tone: "success", title: "All clear. Walang naiwang bukas." };
}

export function resolveAlerts(entries: RoomEntry[], check: RoomCheck): RoomEntry[] {
  if (!check.readable) return entries;
  const stillOn = new Set(check.devices.map((d) => d.type));
  return entries.map((entry) =>
    entry.waste && !entry.resolved && !entry.devices.some((d) => stillOn.has(d.type))
      ? { ...entry, resolved: true }
      : entry,
  );
}
