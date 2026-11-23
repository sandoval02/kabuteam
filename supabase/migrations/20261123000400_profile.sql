-- Profile page: optional display name and avatar photo.
alter table public.profiles add column display_name text check (char_length(display_name) <= 60);
alter table public.profiles add column avatar_path text;

-- Avatars are shown in the header, so the bucket is public; paths are unguessable (user id + random uuid).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
