/* ============================================================
   接続設定（Supabase）
   ※ anonキーは「公開してよい公開鍵」です。管理操作にはパスワードログインが必須。
   ============================================================ */
window.APP_CONFIG = {
  SUPABASE_URL:      "https://gzfqjjyvdmnaolwwxjga.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6ZnFqanl2ZG1uYW9sd3d4amdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzOTEzMTksImV4cCI6MjA5Nzk2NzMxOX0.cuSOddfK_jgdvy5YYLX4uT4vZOYcSuAGf3896IonBWM",

  // 管理者ログイン用の固定メール（変更不要）。
  // Supabase Auth でこのメールのユーザーを作成し、パスワードを設定してください。
  ADMIN_EMAIL: "admin@an-kudo.local"
};
