-- ============================================================
--  工藤 杏 公式サイト  Supabase セットアップ SQL
--  Supabase ダッシュボード → SQL Editor に貼り付けて [Run]
-- ============================================================

-- ---------- テーブル ----------

-- プロフィール（1行のみ・運営者が編集可）
create table if not exists public.profile (
  id         int primary key default 1,
  name       text,
  yomi       text,
  nickname   text,
  birthday   text,
  sign       text,
  origin     text,
  hobby      text,
  skill      text,
  charm      text,
  message    text,
  twitter_url text,
  updated_at timestamptz default now(),
  constraint single_row check (id = 1)
);

-- ギャラリー（画像・動画）
create table if not exists public.media (
  id         uuid primary key default gen_random_uuid(),
  type       text not null check (type in ('image','video')),
  url        text not null,        -- Storage の公開URL
  poster     text,                 -- 動画サムネ（任意）
  caption    text,
  sort       int  default 0,
  created_at timestamptz default now()
);

-- 日記 / ひとこと（運営者のみ投稿）
create table if not exists public.diary (
  id         uuid primary key default gen_random_uuid(),
  body       text not null,
  created_at timestamptz default now()
);

-- コメント（閲覧者=トップレベルのみ／運営者=返信可）
create table if not exists public.comments (
  id         uuid primary key default gen_random_uuid(),
  name       text,
  body       text not null,
  is_admin   boolean not null default false,
  parent_id  uuid references public.comments(id) on delete cascade,
  created_at timestamptz default now()
);

-- ---------- RLS 有効化 ----------
alter table public.profile  enable row level security;
alter table public.media    enable row level security;
alter table public.diary    enable row level security;
alter table public.comments enable row level security;

-- ---------- 閲覧（全員OK） ----------
create policy "read_profile"  on public.profile  for select using (true);
create policy "read_media"    on public.media    for select using (true);
create policy "read_diary"    on public.diary    for select using (true);
create policy "read_comments" on public.comments for select using (true);

-- ---------- プロフィール：運営者(ログイン済)だけ更新/作成 ----------
create policy "admin_insert_profile" on public.profile for insert to authenticated with check (true);
create policy "admin_update_profile" on public.profile for update to authenticated using (true) with check (true);

-- ---------- ギャラリー：運営者だけ追加/削除 ----------
create policy "admin_write_media" on public.media for all to authenticated using (true) with check (true);

-- ---------- 日記：運営者だけ投稿/削除 ----------
create policy "admin_write_diary" on public.diary for all to authenticated using (true) with check (true);

-- ---------- コメント ----------
-- 閲覧者(匿名)：トップレベル・非運営のコメントのみ投稿可（=閲覧者同士の返信は不可）
create policy "anon_insert_comment" on public.comments for insert to anon
  with check (is_admin = false and parent_id is null);
-- 運営者：返信を含め何でも投稿可
create policy "admin_insert_comment" on public.comments for insert to authenticated with check (true);
-- 運営者：コメント削除（荒らし対策）
create policy "admin_delete_comment" on public.comments for delete to authenticated using (true);

-- ---------- Storage バケット（動画・画像置き場・公開読み取り） ----------
insert into storage.buckets (id, name, public)
values ('media','media', true)
on conflict (id) do nothing;

create policy "media_public_read"  on storage.objects for select using (bucket_id = 'media');
create policy "media_admin_insert" on storage.objects for insert to authenticated with check (bucket_id = 'media');
create policy "media_admin_update" on storage.objects for update to authenticated using (bucket_id = 'media');
create policy "media_admin_delete" on storage.objects for delete to authenticated using (bucket_id = 'media');

-- ---------- プロフィール初期データ ----------
insert into public.profile (id,name,yomi,nickname,birthday,sign,origin,hobby,skill,charm,message,twitter_url)
values (1,'工藤 杏','くどう あん','あんぼお','1999.07.15','かに座','秋田県',
  'パチンコ','パチンコ ♡','プリティおけつ ♡',
  E'いつも応援ありがとう♡\n今日もあんぼおと一緒に異世界RUSHを駆け抜けよ！\n何度だって、キミに会いに行くからね。ﾆｬﾝ♡',
  'https://x.com/qsq_fks')
on conflict (id) do nothing;

-- 完了！
