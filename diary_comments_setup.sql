-- ============================================================
--  日記（えまのひとこと）へのコメント機能  1回だけ実行
--  Supabase → SQL Editor に貼って Run
--  ※これを実行するまで、日記へのコメント投稿はエラーになります。
-- ============================================================

-- 既存の comments テーブルに「どの日記への投稿か」を持たせる列を追加
alter table public.comments
  add column if not exists diary_id uuid references public.diary(id) on delete cascade;

-- 既存のRLSはそのままでOK（閲覧＝全員／匿名はトップレベル投稿のみ／運営は返信・削除）。
-- 追加ポリシーは不要です。
