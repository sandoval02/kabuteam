-- Keep every Room check alert (open and resolved) so the list survives a refresh.
-- Still no photos, people or observation; devices are the type, label, watts and ₱/hour.
alter table public.room_alerts alter column resolved_at drop not null;
alter table public.room_alerts alter column kwh drop not null;
alter table public.room_alerts add column devices jsonb not null default '[]'::jsonb;
alter table public.room_alerts
  add constraint room_alerts_times_values_check check (
    (resolved_at is null and kwh is null) or (resolved_at is not null and kwh is not null)
  );
