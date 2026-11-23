-- Indexes for the reads used by the dashboard, ranking, admin and store pages.
create index if not exists bills_household_period_idx on public.bills (household_id, period_end desc);
create index if not exists bills_status_created_idx on public.bills (status, created_at);
create index if not exists appliances_household_created_idx on public.appliances (household_id, created_at);
create index if not exists scores_board_score_idx on public.scores (barangay_id, score_month, score desc);
create index if not exists profiles_barangay_idx on public.profiles (barangay_id);
create index if not exists stores_barangay_idx on public.stores (barangay_id);
create index if not exists vouchers_store_redeemed_idx on public.vouchers (store_id, redeemed_at desc);
create index if not exists vouchers_household_created_idx on public.vouchers (household_id, created_at desc);
