-- ============================================================
--  プロフィールを「えま」に更新する SQL（既存DB用）
--  Supabase ダッシュボード → SQL Editor に貼り付けて [Run]
--  ※これを実行すると旧プロフィールの初期データが消えて「えま」になります
-- ============================================================

-- 1) 新しい項目の列を追加（無ければ追加）
alter table public.profile
  add column if not exists age         text,
  add column if not exists height      text,
  add column if not exists bwh         text,
  add column if not exists cup         text,
  add column if not exists blood       text,
  add column if not exists visual      text,
  add column if not exists personality text,
  add column if not exists likes       text,
  add column if not exists shop        text,
  add column if not exists service     text,
  add column if not exists reserve     text,
  add column if not exists heaven_url  text;

-- 2) 内容を「えま」に更新
update public.profile set
  name        = 'えま',
  age         = '永遠の21歳',
  height      = '149cm',
  bwh         = 'B88 W56 H86',
  cup         = 'Eカップ❤',
  blood       = 'B型',
  visual      = 'むちむちぷりてぃがーる',
  personality = '明るい、えっちなお姉さん',
  hobby       = '旅行、ぎゃんぶる、散歩',
  skill       = 'ニャンちゅうのモノマネ、騎♡位',
  likes       = '炭水化物',
  charm       = 'おしりのﾎｸﾛ',
  shop        = '萌えフードル学園大宮本校',
  service     = '甘々いちゃいちゃからすんごいやつまで！',
  reserve     = 'シティヘブンから',
  twitter_url = 'https://x.com/MOE_Emachi',
  heaven_url  = 'https://www.cityheaven.net/saitama/A1101/A110101/moegaku/girlid-44311496/',
  message     = null,
  updated_at  = now()
where id = 1;
