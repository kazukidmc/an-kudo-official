# セットアップ手順（あなたがやること）

所要 10分ほど。無料です。クレジットカード不要。

## 1. Supabaseに登録してプロジェクト作成
1. https://supabase.com/ → **Start your project** → GitHubアカウント等でサインイン
2. **New project** をクリック
   - Name: `an-kudo`（何でもOK）
   - Database Password: 適当な強いパスワード（メモしておく。サイトには使いません）
   - Region: `Northeast Asia (Tokyo)` を推奨
3. 作成完了まで1〜2分待つ

## 2. テーブルとアクセス権を作成
1. 左メニュー **SQL Editor** → **+ New query**
2. このフォルダの **`supabase_setup.sql`** の中身を全部コピーして貼り付け
3. 右下 **Run** を押す（"Success" と出ればOK）

## 3. 管理者（あなた）ユーザーを作成
1. 左メニュー **Authentication** → **Users** → **Add user** → **Create new user**
2. 入力：
   - Email: `admin@an-kudo.local` ← **この通りに**（config.jsと一致させる）
   - Password: **あなたが管理に使う合言葉**（これがサイトの🔑で入れるパスワード）
   - **Auto Confirm User: ON**（チェックを入れる）
3. **Create user**

## 4. キーを2つコピーして私に渡す
1. 左メニュー **Project Settings**（歯車）→ **API**
2. 以下の2つをコピーして、チャットに貼ってください：
   - **Project URL**（`https://xxxx.supabase.co`）
   - **anon public** キー（`eyJ...` の長い文字列）

> anon public キーは「公開してよい鍵」です。これだけでは管理操作はできません（あなたのパスworkード＝ログインが必要）。

## 5. あとは私が
- `config.js` にキーを入れて、GitHub Pagesへ公開 → URLをお渡しします。

---
### 使い方（公開後）
- 画面右下の **🔑** を押し、手順3で決めた**合言葉パスワード**を入力 → 管理モード
- 管理モード中だけ：**写真/動画アップロード・コメントへの返信・コメント削除・日記投稿・プロフィール編集** ができます
- もう一度🔑→ログアウト
