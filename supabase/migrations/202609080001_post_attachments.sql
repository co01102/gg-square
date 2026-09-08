-- Downloadable post attachments for any file type.
create table public.post_attachments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  storage_path text not null unique,
  file_name text not null check (char_length(file_name) between 1 and 255),
  content_type text not null default 'application/octet-stream',
  size_bytes bigint not null check (size_bytes between 1 and 26214400),
  position smallint not null check (position between 0 and 2),
  created_at timestamptz not null default now(),
  unique(post_id, position)
);

create index post_attachments_post_idx on public.post_attachments(post_id, position);

alter table public.post_attachments enable row level security;

create policy "Published post attachments are public" on public.post_attachments for select
  using (exists (
    select 1 from public.posts
    where posts.id = post_attachments.post_id and posts.is_published
  ));

create policy "Authors attach post files" on public.post_attachments for insert
  to authenticated with check (exists (
    select 1 from public.posts
    where posts.id = post_attachments.post_id and posts.author_id = (select auth.uid())
  ));

create policy "Authors delete post files" on public.post_attachments for delete
  to authenticated using (exists (
    select 1 from public.posts
    where posts.id = post_attachments.post_id and posts.author_id = (select auth.uid())
  ));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-files',
  'post-files',
  false,
  26214400,
  null
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Public can download published post files" on storage.objects for select
  using (
    bucket_id = 'post-files'
    and exists (
      select 1
      from public.post_attachments
      join public.posts on posts.id = post_attachments.post_id
      where post_attachments.storage_path = storage.objects.name
        and posts.is_published
    )
  );

create policy "Users upload own post files" on storage.objects for insert
  to authenticated with check (
    bucket_id = 'post-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users delete own post files" on storage.objects for delete
  to authenticated using (
    bucket_id = 'post-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
