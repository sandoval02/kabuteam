-- Baseline the resident confirmed at scan time; used when an admin approves a flagged bill.
alter table public.bills add column baseline_kwh numeric(10, 2);
