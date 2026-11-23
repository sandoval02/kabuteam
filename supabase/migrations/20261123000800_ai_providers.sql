-- Extra AI providers the barangay admin adds from the admin page. They run after the providers set in
-- the server environment and before manual entry. API keys are stored encrypted by the app (AES-256-GCM);
-- only server code with the secret key can read this table.
create table public.ai_providers (
  id uuid primary key default gen_random_uuid(),
  preset text not null,                      -- openai, anthropic, gemini, xai, groq, openrouter, custom
  base_url text,                             -- OpenAI-compatible providers only
  model text not null check (char_length(model) between 1 and 120),
  api_key_enc text not null,
  key_hint text not null,                    -- last 4 characters, for display
  last_test jsonb,                           -- { passed, ms, at, log[] }
  created_by uuid references public.profiles on delete set null,
  created_at timestamptz not null default now()
);

alter table public.ai_providers enable row level security;
revoke all on public.ai_providers from anon, authenticated;
grant all on public.ai_providers to service_role;
