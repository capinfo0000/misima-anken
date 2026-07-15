# misima-anken — 株式会社Revenge コーポレートサイト

**通信業界向けの販売支援・営業支援を行う BPO 企業**（株式会社Revenge）のコーポレートサイト（静的サイト）です。
フレームワーク不要の HTML / CSS / JavaScript のみで構成し、そのまま静的ホスティングに公開できます。
ニュースだけは任意で WordPress（ヘッドレス）連携でき、**静的サイト＋`/wp` のハイブリッド構成**で運用します。

> 生成方式：ページHTMLは生成スクリプト `gen.py`（**`.claude/skills/revenge-site/gen.py`** に同梱・リポジトリ管理）から出力しています。
> 文言・構成の変更は `gen.py` を編集して `python3 .claude/skills/revenge-site/gen.py` で再生成します。CSS(`css/style.css`)・JS(`js/`)・画像(`assets/`)・`contact.php` は手管理です。
> 制作・検証・納品の詳しい手順と規約は `revenge-site` スキル（`.claude/skills/revenge-site/SKILL.md`）にまとめています。
> 案件横断で使える汎用スキル（ホームページ制作の進め方／Google Workspaceメール設定）は
> **`homepage-toolkit` プラグイン**として配布しています（このリポジトリがマーケットプレイス）。
> 他プロジェクト/スマホから使うには：`/plugin marketplace add capinfo0000/misima-anken` →
> `/plugin install homepage-toolkit@capinfo`（詳細は `plugins/homepage-toolkit/README.md`）。

---

## 会社情報（確定分）
| 項目 | 内容 |
|---|---|
| 社名 | 株式会社Revenge（Revenge Co., Ltd. ／ かな：りべんじ） |
| 代表者 | 代表取締役社長　今別府 尭 |
| 所在地 | 〒891-0311 鹿児島県指宿市西方9051-1 |
| メール | info@revenge.co.jp（ドメイン取得後に設定） |
| 事業 | 通信業界向け 販売支援・営業支援 BPO（販売スタッフの手配／イベント運営／営業代行／業務請負 ほか） |
| 設立（登記予定） | 2026年7月7日 |
| 公開ドメイン | revenge.co.jp（Value Domain で仮登録済み。登記→アクティベート後に公開） |

> メモ：日本の商号に「:」は使えないため、**登記名・ドメイン登録名は「株式会社Revenge」**（コロン無し）。
> サイト表示・ロゴのみ「Re:venge」（ブランド表記）。それ以外のテキストは全て「株式会社Revenge」に統一。設立日・電話番号・従業員数等はサイト未掲載（確定後に反映）。

---

## サイト構成（サイトマップ・全26ページ）

```
TOP (index.html)
├── 会社情報
│   ├── 代表メッセージ        message.html
│   ├── 社名の由来            purpose.html
│   ├── 会社概要              profile.html
│   └── グループ会社          group.html
├── 事業内容
│   ├── 一覧                  services.html
│   └── 各事業の詳細          service/service-01.html 〜 service-14.html
├── ニュース
│   ├── 一覧                  news.html
│   └── 記事                  news/news-YYYYMMDD.html
└── その他
    ├── お問い合わせ          contact.html
    ├── プライバシーポリシー   privacy.html
    ├── 情報セキュリティ基本方針 security.html
    └── サイトポリシー        sitepolicy.html
```

- ヘッダー（グローバルナビ）とフッターは全ページ共通。ナビは 会社情報／事業内容／ニュース／お問い合わせ。
- 詳細ページは `service/`・`news/` サブフォルダに格納。**フォルダ構造を保ったまま**公開してください
  （相対パスで解決するため、ドメインが変わっても動作）。
- ※旧構成にあった「沿革」「採用情報」「組織情報」「パーパス」ページは廃止済み。

## ファイル構成

```
.
├── *.html            # ルート直下の各ページ
├── service/          # 事業内容の詳細ページ（service-01〜14.html）
├── news/             # ニュース記事ページ（news-YYYYMMDD.html）
├── css/
│   └── style.css     # デザイントークン（CSS変数）＋全スタイル
├── js/
│   ├── config.js     # WordPress連携設定（MISIMA_WP_BASE）
│   └── main.js       # ナビ/ドロップダウン/スクロール出現/フォーム/WPニュース取得
└── assets/
    ├── img/*.webp    # 画像（代表写真 ceo・書の署名 sign・事業カード service-01〜14 ほか。全webp）
    ├── logo.svg      # ロゴ
    └── favicon.svg   # ファビコン
```

## ローカルでの表示方法

```bash
python3 -m http.server 8000
# ブラウザで http://localhost:8000 を開く
```

---

## ニュースの WordPress 運用（ハイブリッド構成）

サイト本体は静的のまま、**ニュースだけ WordPress の管理画面から更新**できます（ヘッドレス連携）。
本番はルート＝静的サイト、`revenge.co.jp/wp/` ＝ WordPress（ニュース専用バックエンド）。

- 連携設定：`js/config.js` の `window.MISIMA_WP_BASE = "/wp";`（**本番と同期済み**）。
  - `js/main.js` の `loadWpNews()` が `(_BASE)/wp-json/wp/v2/posts?_embed` を取得し、トップと `news.html` を動的表示。
  - **未設定・取得失敗時は、HTMLに書かれた静的ニュースへ自動フォールバック**（現在は静的1件を表示中）。
  - 表示件数は `MISIMA_NEWS_COUNT_TOP`（トップ）/ `MISIMA_NEWS_COUNT_LIST`（一覧）で調整可。
- ⚠️ **連携が動く条件**：WordPress のパーマリンクを「**投稿名**」(`/%postname%/`) に設定すること
  （プレーンのままだと REST がJSONを返さず、静的フォールバックになる）。
- 記事作成：WordPress 管理画面「投稿」→「新規追加」。カテゴリはラベル（例：お知らせ）として表示。

---

## 公開先

- 公開ドメイン：`revenge.co.jp`（登記・アクティベート後に公開）。ホスティングは CORESERVER。
- ルート＝静的サイト、`/wp`＝WordPress（ニュース用）のハイブリッド構成。
- 具体的なデプロイ手順・公開チェックリスト・サーバー/認証情報などの**運用情報は本READMEには記載しない**
  （引き継ぎ資料 `HANDOVER.md`、および作業ログにまとめて管理）。

---

## カスタマイズ

- **色 / フォント / 余白**：`css/style.css` 冒頭の `:root`（CSS変数）。白基調＋虹色アクセント。
- **テキスト / 会社情報 / ニュース / 事業内容**：`gen.py`（scratchpad）を編集して再生成。
- **ロゴ / 画像**：`assets/logo.svg`・`assets/favicon.svg`・`assets/img/*.webp` を差し替え。
- **お問い合わせフォーム**（`contact.html`）：現在は静的デモ動作。実送信にはフォーム送信サービス等が必要。
