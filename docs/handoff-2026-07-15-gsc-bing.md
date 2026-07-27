---
saved: 2026-07-15
project: C:\Users\yonekura\Desktop\新しいフォルダー (4)
status: completed
topic: revenge.co.jp を Google Search Console と Bing Webmaster Tools に登録
---

## このドキュメントの目的
revenge.co.jp のサーチエンジン登録作業（GSC + Bing）の全記録。別セッションに引き継ぐための自己完結サマリー。**主要タスクは完了済み**。残っているのは任意の改善タスクのみ（ユーザー確認が必要なため、新セッションで勝手に着手しないこと）。

## 対象サイト・アカウント情報
- サイト: **revenge.co.jp**（https で公開済み・CoreServer ホスティング / DNS は Value Domain）
- 所有 Google アカウント: **info@revenge.co.jp**（会社の Google Workspace アカウント）
- サイト構成: 2種類のサイトマップを持つ
  - `https://revenge.co.jp/sitemap.xml` … 静的サイト側（`gen.py` で生成、13ページ）
  - `https://revenge.co.jp/wp/wp-sitemap.xml` … WordPress 自動生成側

---

## 完了したこと

### 1. Google Search Console（GSC）登録 ✅
- プロパティ種別: **ドメインプロパティ**（`sc-domain:revenge.co.jp`）
- 所有権確認: **自動確認で完了**。Workspace 設定時に入れた既存の DNS TXT（google-site-verification）がそのまま使われ、DNS 追加作業は不要だった
- サイトマップ送信:
  - `sitemap.xml` → ステータス「成功しました」/ **13ページ検出**
  - `wp/wp-sitemap.xml` → 型「サイトマップインデックス」/「成功しました」
- 注意: 所有権確認に使われている DNS TXT は削除しないこと（削除すると確認が外れる）

### 2. Bing Webmaster Tools 登録 ✅
- サインイン: **Google アカウント（info@revenge.co.jp）** 経由。2段階認証はユーザーのスマホ（Galaxy A25 5G）で承認
- サイト追加: **「GSC からインポート」** を使用。Google OAuth の読み取り専用権限（Search Console データの表示）をユーザーが許可 → revenge.co.jp が Bing 側に追加された（**サイト確認不要**、GSC 認証を引き継ぎ）
- サイトマップ: GSC インポートでは自動反映されなかったため**手動で2本送信**
  - `sitemap.xml` → 状態「Processing（処理）」
  - `wp/wp-sitemap.xml` → 状態「Processing（処理）」
- 補足: Bing 登録により Yahoo!（一部）や DuckDuckGo にも波及する

### 3. ユーザーへの説明済み事項
- 登録の意味（順位が上がるのではなく、インデックス促進＋検索データの可視化＋問題通知＋クロール依頼ができる窓口ができる）
- **普段見るのは GSC だけでOK**（日本の検索の約9割が Google）。Bing は登録して放置で十分
- GSC の使い方: 主に「検索パフォーマンス」（クリック数・表示回数・キーワード）を月1回見る。新ページ公開時は上部の検索窓に URL を入れて「インデックス登録をリクエスト」

---

## 作業中に判明した事項・トラブルと対処
| 事象 | 原因 | 対処 |
|------|------|------|
| Playwright ブラウザで未ログイン | Playwright はユーザーの実 Chrome と別プロファイル | Claude in Chrome（実 Chrome 操作）に切り替えた |
| 最初の Chrome が madoka6121@me.com でログイン | 誤アカウント | ユーザーが info@revenge.co.jp で入り直し、select_browser で正しい Chrome に再接続 |
| **madoka6121@me.com 側に未確認プロパティが残っている可能性** | 誤アカウントで「続行」を押した直後に中断 | 実害なし。気になる場合は当該アカウントの GSC →「設定 → プロパティを削除」で消せる |

---

## 残タスク（すべて任意・ユーザー確認が必要。新セッションで自動着手しないこと）

### A. データ確認（時間経過待ち）
- GSC: 登録翌日（**2026-07-16 以降**）からデータ表示。「検索パフォーマンス」を確認
- Bing: 反映まで**最大48時間**

### B. sitemap.xml の改善（ユーザーが「追加ページを増やす予定」と明言）
今後のページ追加は **静的ページ（gen.py 生成）** で行う予定。以下の改善をユーザーが検討中：
1. **`gen.py` を改修し、サイト生成時に sitemap.xml を全ページ自動再生成**（新ページ追加のたびの手作業をなくす）
2. **lastmod を生成日で自動設定**（現状は BUILD_DATE 固定値 `2026-07-10`）
3. ソースが手元にない場合は、指定フォルダの HTML を拾って sitemap.xml を吐く**独立スクリプトを新規作成**する案もある

**重要:** `gen.py` と `sitemap.xml` は `C:\Users\yonekura` 配下を深さ6まで検索したが**見つからなかった**。ソースの所在が不明（別フォルダか CoreServer 上のみ）。改修着手前に**ユーザーに gen.py の場所を確認する必要がある**。心当たり候補: `新しいフォルダー (2)`, `(3)`, `RAG` など Desktop 配下のフォルダ。

### C. 静的ページ追加時の手順（改修しない場合の手動フロー）
1. 新 HTML ページを作成
2. sitemap.xml に新 URL を追加（gen.py 再生成 or 手書き）
3. HTML と sitemap.xml を CoreServer の `public_html` に再アップ
4. （任意）GSC の検索窓に新 URL を入れ「インデックス登録をリクエスト」
   - ③でサイトマップを正しく更新していれば④を忘れても数日で自動インデックスされる（④は急ぎ便）

---

## 関連ログ
- 詳細な作業ログ: `~/.claude/logs/新しいフォルダー (4)/2026-07-15.md`（GSC 登録・Bing 登録の2セッション分を記録済み）
