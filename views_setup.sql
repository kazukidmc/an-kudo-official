-- ============================================================
--  アクセス数カウント用テーブル（Supabase SQL Editor で 1 回実行）
--  ※これを実行するまで、運営画面のアクセス数は「–」のままです。
-- ============================================================

create table if not exists public.views (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz default now()
);

alter table public.views enable row level security;

-- 記録（INSERT）は誰でもOK（1アクセス=1行）
create policy "anon_insert_view" on public.views for insert to anon          with check (true);
create policy "auth_insert_view" on public.views for insert to authenticated with check (true);

-- 集計（SELECT/COUNT）は運営者（ログイン済）だけ
create policy "admin_read_views" on public.views for select to authenticated using (true);
