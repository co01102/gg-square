-- GG Square initial schema, RLS policies, storage buckets and seed data.
create extension if not exists "pgcrypto";

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (char_length(username) between 2 and 20),
  bio text not null default '' check (char_length(bio) <= 160),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.games (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  icon text not null default 'G',
  color text not null default '#8b5cf6',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  game_id uuid not null references public.games(id) on delete restrict,
  body text not null check (char_length(body) between 1 and 2000),
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.post_images (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  storage_path text not null unique,
  public_url text not null,
  position smallint not null check (position between 0 and 3),
  created_at timestamptz not null default now(),
  unique(post_id, position)
);

create table public.likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index posts_created_at_idx on public.posts(created_at desc);
create index posts_game_created_idx on public.posts(game_id, created_at desc);
create index post_images_post_idx on public.post_images(post_id, position);
create index likes_created_at_idx on public.likes(created_at desc);
create index comments_post_created_idx on public.comments(post_id, created_at);

create or replace function public.set_updated_at()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger posts_updated_at before update on public.posts
for each row execute function public.set_updated_at();
create trigger comments_updated_at before update on public.comments
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare desired_username text;
begin
  desired_username := coalesce(
    nullif(new.raw_user_meta_data ->> 'username', ''),
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    'gamer_' || substr(new.id::text, 1, 8)
  );
  insert into public.profiles (id, username, avatar_url)
  values (
    new.id,
    left(regexp_replace(desired_username, '[^가-힣a-zA-Z0-9_]', '', 'g'), 20),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
exception when unique_violation then
  insert into public.profiles (id, username)
  values (new.id, 'gamer_' || substr(new.id::text, 1, 8))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.games enable row level security;
alter table public.posts enable row level security;
alter table public.post_images enable row level security;
alter table public.likes enable row level security;
alter table public.comments enable row level security;

create policy "Profiles are public" on public.profiles for select using (true);
create policy "Users update own profile" on public.profiles for update
  to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "Active games are public" on public.games for select using (is_active = true);

create policy "Published posts are public" on public.posts for select using (is_published = true);
create policy "Authenticated users create posts" on public.posts for insert
  to authenticated with check ((select auth.uid()) = author_id);
create policy "Authors update own posts" on public.posts for update
  to authenticated using ((select auth.uid()) = author_id) with check ((select auth.uid()) = author_id);
create policy "Authors delete own posts" on public.posts for delete
  to authenticated using ((select auth.uid()) = author_id);

create policy "Published post images are public" on public.post_images for select
  using (exists (select 1 from public.posts where posts.id = post_images.post_id and posts.is_published));
create policy "Authors attach post images" on public.post_images for insert
  to authenticated with check (exists (
    select 1 from public.posts where posts.id = post_images.post_id and posts.author_id = (select auth.uid())
  ));
create policy "Authors delete post images" on public.post_images for delete
  to authenticated using (exists (
    select 1 from public.posts where posts.id = post_images.post_id and posts.author_id = (select auth.uid())
  ));

create policy "Likes are public" on public.likes for select using (true);
create policy "Users create own likes" on public.likes for insert
  to authenticated with check ((select auth.uid()) = user_id);
create policy "Users delete own likes" on public.likes for delete
  to authenticated using ((select auth.uid()) = user_id);

create policy "Comments are public" on public.comments for select using (true);
create policy "Users create own comments" on public.comments for insert
  to authenticated with check ((select auth.uid()) = user_id);
create policy "Users update own comments" on public.comments for update
  to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users delete own comments" on public.comments for delete
  to authenticated using ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('post-images', 'post-images', true, 10485760, array['image/jpeg','image/png','image/webp']),
  ('avatars', 'avatars', true, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "Public can view community images" on storage.objects for select
  using (bucket_id in ('post-images', 'avatars'));
create policy "Users upload own post images" on storage.objects for insert
  to authenticated with check (bucket_id = 'post-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Users delete own post images" on storage.objects for delete
  to authenticated using (bucket_id = 'post-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Users upload own avatars" on storage.objects for insert
  to authenticated with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Users update own avatars" on storage.objects for update
  to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Users delete own avatars" on storage.objects for delete
  to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

insert into public.games (name, slug, icon, color) values
  ('리그 오브 레전드', 'league-of-legends', 'L', '#c8943a'),
  ('발로란트', 'valorant', 'V', '#ff4655'),
  ('오버워치 2', 'overwatch-2', 'O', '#f99e1a'),
  ('로스트아크', 'lost-ark', 'A', '#4ea4da'),
  ('메이플스토리', 'maplestory', 'M', '#ff8a3d'),
  ('배틀그라운드', 'pubg', 'B', '#f2a900'),
  ('기타', 'etc', '+', '#64748b')
on conflict (slug) do nothing;
