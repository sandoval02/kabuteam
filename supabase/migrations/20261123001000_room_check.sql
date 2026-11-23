-- Room check photos count toward the same hourly AI cap as bill and sticker scans.
alter table public.extraction_attempts drop constraint extraction_attempts_kind_check;
alter table public.extraction_attempts
  add constraint extraction_attempts_kind_check check (kind in ('bill', 'appliance', 'room'));
