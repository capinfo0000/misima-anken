---
name: revenge-site
description: >
  株式会社Revenge コーポレートサイト（このリポジトリ misima-anken）の制作・更新・
  検証・納品の手順と規約。ページ文言/構成、ヘッダー・フッター、事業ページ、ポリシー、
  LP、埋め込みRAG、SEO/AIO、お問い合わせ(contact.php)などをこのリポジトリで
  変更・追加・確認・サーバ納品するときに必ず使う。HTMLは生成器 gen.py から出力する
  ため、HTMLを直接編集せず gen.py を編集して再生成する点に注意。
---

# 株式会社Revenge サイト制作スキル

このリポジトリ（`misima-anken`）は **フレームワーク不要の静的サイト**（HTML/CSS/JS）。
ニュースだけ任意で WordPress（`/wp`、ヘッドレス）連携するハイブリッド構成。CoreServer で公開。

- **参考サイト**：`https://peers.jp/`（株式会社ピアズ）。白基調・大型テキストのFV・中程度の演出を参考に、
  Revengeでは「大型テキストで理念を見せるヒーロー（失敗→再挑戦→複合→…の演出）」に転用（文章・画像は独自）。
- **開発スタイル**：アジャイル。早くプロトタイプを見せ、小刻みに修正して仕上げる（特にFV/演出は実機で合意）。
  事業方針の「無料プロトタイプ→本契約→満足まで修正、運用まで継続」とも整合。

> 制作の“考え方と型”（修正が多発する箇所と対処・意思決定の流れ）は汎用スキル
> **`homepage-production`** を参照。本スキルはその型を**この案件に実装したランブック**。

**最重要ルール：ページHTMLは生成器 `gen.py` から出力される。HTMLを直接編集しない。**
文言・構成の変更は `gen.py` を編集 → 再生成 → 検証 → 必要ファイルだけ納品、の順で行う。

- 生成器：`.claude/skills/revenge-site/gen.py`（このスキルに同梱・リポジトリ管理）
- CSS：`css/style.css`（手管理・FLOCSS）／ JS：`js/main.js`・`js/config.js`（手管理）
- 画像：`assets/`（手管理）／ お問い合わせ：`contact.php`（手管理・PHP）

---

## 1. ビルド（再生成）

```bash
python3 .claude/skills/revenge-site/gen.py
```

- 出力先はリポジトリ直下（スクリプト位置から自動解決。`REVENGE_OUT` で上書き可）。
- 生成物：各 `*.html`、`service/service-0N.html`、`robots.txt`、`sitemap.xml`、`llms.txt`。
- `gen.py` を編集したら必ず再生成する。CSS/JS/画像/`contact.php` は手管理（再生成の対象外）。

### gen.py の構造（編集の勘所）
- **共通パーツ関数**：`head(title,desc,path,cur,article_date)` / `header(cur)` / `footer()` /
  `page_hero(sub,title,lead,crumbs)` / `legal(title,sub,crumb_label,slug,sections)` /
  `svc_detail_page(s)` / `write(name,html)`。
- **データ**：`SERVICES`（事業カード＋詳細ページの元データ：`slug/title/img/desc/lead/points/body/extra`）。
  ページ一覧は `pages`（`(ファイル名, title, desc, cur, body)`）。
- **本文**：`*_body`（`index_body`/`services_body`/`contact_body`/`privacy_body`/`security_body`/
  `sitepolicy_body` など）を組み立てて `pages` に載せる。
- **生成ループ**：`head + header(cur) + <main> + body + </main> + footer()` を結合し、
  `rebrand()` → `relink()` → `write()`。
- **SEO/AIO**：`seo_head()`（meta/OGP/JSON-LD）、`robots.txt`/`sitemap.xml`/`llms.txt` を末尾で生成。

### 必ず理解しておく変換
- **`rebrand(html)`**：テンプレ由来の「ミシマ／三島／MISIMA」を「Revenge／今別府/…」へ一括置換。
  新規テキストは最初から「株式会社Revenge」で書く（ブランド表記のみ「Re:venge」）。
- **`relink(html, up)`**：`service/`・`news/` 等サブフォルダ用に相対パスへ `../` を前置。
  `https:` `//` `#` `mailto:` `tel:` `/` で始まるものはスキップ（絶対URLは触らない）。
- **`?v=` は使わない**：以前は CSS/JS のハッシュを全HTMLに `?v=` で焼き込んでいたが、
  「1ファイル変えると全HTMLが変わる」ため**廃止済み**。キャッシュ更新はサーバの
  ETag/Last-Modified に任せる。CSS/JS を変えても HTML は一切変わらない。

---

## 2. ヘッダーは「共有JS方式（方式A）」

**ヘッダーの正（最新版）は `js/main.js` の `injectSharedHeader()` が持つ。**
- 全ページが `js/main.js` を読むため、起動時に各ページの `.l-header` 中身を最新版へ差し替える。
- 既存ロゴリンクの href から相対接頭辞（`""`/`"../"`）を読み取り、サブフォルダでもリンクが壊れない。
- `location.pathname` で現在地（`is-current`）を判定。
- 各HTMLに焼き込まれたヘッダーは **JS無効/クローラ向けのフォールバック**（`gen.py` の `header()` が出力）。
- **今後ヘッダーを変えるときは `js/main.js` の1ファイル差し替えだけ**で全ページに反映される。
  → `gen.py` の `header()`（フォールバック）と `main.js` のテンプレは手動で整合を保つ。

モバイルのハンバーガー開閉・ドロップダウンのアコーディオン（排他開閉）は `main.js` が
`.p-global-nav__parent` を走査して付与（注入後のノードも拾う）。

---

## 3. 検証（ローカル http.server ＋ Playwright）

```bash
python3 -m http.server 8123 --directory /home/user/misima-anken &
```

Playwright（Chromium 同梱）で描画確認：

```bash
NODE_PATH=/opt/node22/lib/node_modules node script.js
# launch: { executablePath: '/opt/pw-browsers/chromium' }
# 決定的なスクショが要るときは emulateMedia({ reducedMotion:'reduce' })
```

確認観点（変更に応じて）：
- ヘッダー注入：PCドロップダウン開閉／モバイルのハンバーガー＋排他アコーディオン／
  サブフォルダ `service/*.html` のリンクが `../` 付きで壊れない／`is-current`／JSエラーなし。
- ポリシー等の本文・見出し・箇条書き・制定日・お問い合わせ窓口。
- 「見た目を変えない」変更のときは変更前後のスクショ比較で無変化を確認。

**ライブ確認の注意**：この環境の Chromium は社内ポリシープロキシ経由で
`revenge.co.jp` に直接つなげない（ERR_CONNECTION_RESET）。ライブ検証は
**`curl` で実ファイルを取得 → ローカルにミラー → http.server で配信 → Playwright**
の手順で行う（実際に配信中の main.js＋HTML の組合せを描画確認できる）。

---

## 4. 納品（サーバへのアップロード）

- CoreServer の公開フォルダ `public_html/` に、**変更に関係するファイルだけ**を
  同じ階層のまま上書きアップロードする（全差し替えは不要）。
  - ヘッダー変更 → `js/main.js` だけ ／ CSS → `css/style.css` だけ ／
    1ページの本文 → そのHTMLだけ ／ お問い合わせ処理 → `contact.php` だけ。
- 納品ファイルは `SendUserFile` で個別に渡す。
- **`差し替えファイル履歴.md`** の先頭に「その N」を追記（新しい変更を上に）。
  「サーバへ上げるファイル」を明記する。
- 変更は必ずローカルで検証してから納品する。

---

## 4b. 本番デプロイZIP（IT事業・RAG初期ナレッジ同梱）

将来 IT事業（service-04・各LP・RAG埋め込み）を含めて本番へ入れるとき用の一括ZIPを作れる。

- ビルド：`python3 .claude/skills/revenge-site/build_deploy_zip.py [出力先.zip]`（既定 `revenge-deploy.zip`、`*.zip`はgit非対象）。
  - 中身：`public_html/`（公開サイト一式・ホワイトリスト同梱）＋ `rag-knowledge/`（RAG初期ナレッジ）＋ `SETUP_README.txt`。
  - **除外（安全側）**：`/wp`・`.env`等の実シークレット・`チャットログ.md`/`差し替えファイル履歴.md`/`docs/` 等の社内資料・`.git`/`.claude`。
- **`rag-knowledge/`**（リポジトリ直下）＝埋め込みRAGの初期ナレッジ（Markdown）。会社概要等は含めず、
  **デジタル4サービス（HP制作/RAG/イベント事前決済/新規開発）＋共通方針(00)** のみ。サービスごと1ファイル＝
  1件直しても再取り込みはそのファイルのみ（埋め込みAPI節約）。RAG側は vault に置き `php scripts/sync_obsidian.php <vault>` で取込。
- 注意：RAGホスト/embed 設定（`RAG_HOST` in gen.py）は RAG本体の最新版に合わせて更新すること。

---

## 5. コミット / ブランチ / ログ

- 作業ブランチ：**`claude/peaceful-lovelace-jhm089`**（指定ブランチのみ push。PRは依頼時のみ）。
- `git push -u origin <branch>`。ネットワーク失敗時のみ指数バックオフ(2/4/8/16s)で最大4回。
- コミットメッセージ末尾：
  ```
  Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
  Claude-Session: <session url>
  ```
- **`チャットログ.md`**：Stop フックが会話を自動追記する（コミット・push する）。
  圧縮(compact)後は SessionStart フックが「チャットログを読め」と指示を注入する
  → 作業再開前に `チャットログ.md` を読むこと。
- コミット後に Stop フックが「未コミットあり」と言うのは、たいてい `チャットログ.md` の
  自動追記。都度コミット＆push してツリーをクリーンに保つ。

---

## 6. セキュリティ / やってはいけないこと

- **WordPress 一式（`/wp/`）は変更しない**。実認証情報を含むため Git に入れない（`.gitignore` 済）。
- **実シークレットはコミットしない**：`wp-config.php` 等、RAG の `.env`・同期トークン等。
- 配布ZIP/7z（`*.zip`/`*.7z`）は `.gitignore` 済。`チャットログ.md` はコミットするが**配布ZIPには含めない**。
- パスワード等は再表示しない。
- **モデル識別子（`claude-*`）をコミット/PR/コード/成果物に含めない**（チャット返信のみ）。
- 外部送信（サーバアップ等）は元に戻しにくい操作。ユーザーの明示指示に従う。

---

## 7. 事業・料金・会社情報（確定分）

- 社名：**株式会社Revenge**（登記名・ドメインはコロン無し。ブランド表記のみ「Re:venge」）。
  代表：今別府 尭／所在地：〒891-0311 鹿児島県指宿市西方9051-1／メール：info@revenge.co.jp。
- 現在の事業＝**3事業**：セールスプロモーション／BPO／教育・研修（`service-01〜03`）。
- **デジタルソリューション(IT)事業は口座開設後に公開予定**（claude/it-jigyo ブランチで準備中／本番は3事業）。
  - **ターゲット＝個人事業主・中小企業**。訴求軸：「小さく始められる（5万円〜/定額）」「IT担当がいなくても大丈夫
    （専門用語を使わない・窓口ひとつ）」「無料プロトタイプ」「公開後も伴走」。コピーはこのトーンで書く。
  - **コピーの禁則（実績が積めるまで）**：「選ばれる理由」「導入実績多数」「No.1」等、**実績が前提の表現は使わない**
    （実績ゼロでは不自然で逆効果＋根拠なきNo.1は景表法リスク）。「特徴」「アピールポイント」「私たちの約束」等、
    **事実ベースの表現**を使う。数値は実在の事実のみ（0円プロトタイプ/修正無制限/5,000円〜等）。
  - 予定メニューと料金（税込・保守は月額）：
    - ホームページ制作：初期 5〜30万円／保守 1〜10万円
    - 埋め込みRAG：初期 5〜20万円／保守 2〜10万円
    - イベント運営 事前決済システム：初期 2万円／保守 5,000円
    - 新規システム開発：お見積り（要相談）
  - 方針：無料ヒアリング→無料プロトタイプ→本契約→満足まで修正。単発収益＋ストック収益の両輪。
  - **埋め込みRAG**：公式 `embed.js`（右下フローティング）で `service-04` に実演設置予定。
    Gemini 無料枠のため「**1日の利用回数に制限あり**」の注記を HP(service-04)側に明記する。
  - 各サービスは個別 **LP** へ誘導し、LPからお問い合わせでCVを取る導線（LP自体も外部流入を想定）。
  - パッケージは今後増える前提 → `gen.py` 内でデータ駆動化しておくと追加が最小差分で済む。

---

## 7b. インフラ構成（ドメイン・サーバ・WP・メール）

汎用の手順・判断は `homepage-production` の §I を参照。本案件の具体は下記。

- **ドメイン**：`revenge.co.jp`（Value Domain で仮登録済み → 登記後アクティベートして公開）。
  商号に「:」不可のため登記名/ドメインはコロン無し「株式会社Revenge」、表示のみ「Re:venge」。
- **サーバ**：CoreServer（Value Domain と同系列）。PHP・無料SSL・独自ドメイン対応。
  公開フォルダは `public_html/`。**差分最小デプロイ**（変更ファイルだけ同階層で上書き）。常時HTTPS。
- **WordPress**：ニュースのみのハイブリッド運用。`/wp`（`config.js` の `MISIMA_WP_BASE="/wp"`）。
  実認証情報を含むため `/wp/` は `.gitignore`（Git非コミット、配布ZIPには同梱）。`wp-sitemap.xml` を robots に併記。
- **メール**：`info@revenge.co.jp`。**Google Workspace で受信・運用中（設定完了済み）**。
  MX は Google（`smtp.google.com.`）、SPF/DKIM/DMARC 設定済み。DNS は Value Domain、Web/旧メールは CoreServer。
  設定手順・レコード仕様は **`google-workspace-setup` スキル**（＋`references/value-domain-dns.md`）を参照。
  - お問い合わせは `contact.php` が **PHP `mail()`** で `info@revenge.co.jp` へ送信。件名/本文はUTF-8統一
    （`mb_send_mail`は使わない＝文字化け対策）。
  - **CoreServer のメール配送は外部化済み**（当該ドメインを外部扱いに設定済み）＝サーバ発（フォーム送信）も
    Gmail に届く。※`google-workspace-setup` スキルは**この設定を完了させたあとに手順を書き起こしたもの**で、
    Value Domain の DNS（MX/SPF/DKIM/DMARC）と CoreServer 配送外部化は実運用で反映済み。
    もしフォールバックや障害切り分けが必要になったら同スキルの Step 3／検証手順を参照。

---

## 7c. 検索エンジン登録（GSC / Bing）＝登録済み（2026-07-15）

別セッションで登録完了。状況の記録（詳細な経緯は別セッションの handoff 参照）。

- **Google Search Console**：ドメインプロパティ `sc-domain:revenge.co.jp`。所有 Google アカウント
  `info@revenge.co.jp`（Workspace）。**所有権は既存の DNS TXT（google-site-verification）で自動確認**。
  - ⚠️ **この所有権確認用 TXT は削除しない**（消すと GSC の確認が外れる）。
  - サイトマップ送信済み：`sitemap.xml`（成功・**13ページ**検出）、`wp/wp-sitemap.xml`（サイトマップインデックス・成功）。
- **Bing Webmaster Tools**：GSC からインポートで追加（GSC認証を引き継ぎ＝サイト確認不要）。
  `sitemap.xml`・`wp/wp-sitemap.xml` を手動送信（処理中）。
- 運用：普段は GSC の「検索パフォーマンス」を月1回。新ページ公開時は URL を「インデックス登録をリクエスト」。

### sitemap 運用の要点（handoff 残タスクB＝対応済み）
- **`gen.py` はこのリポジトリの `.claude/skills/revenge-site/gen.py` にある**（PCローカルには無い＝別セッションが
  「所在不明」とした理由）。`python3 .claude/skills/revenge-site/gen.py` で `sitemap.xml` を生成。
- **静的ページ追加＝自動でサイトマップに載る**（実装済み）：sitemap 生成は出力フォルダ内の `*.html` を
  **実走査**する方式（`_collect_html()`）。`SERVICES`/`pages` にページを足す、あるいは将来 `lp/` 等に HTML を置くだけで、
  再生成時にサイトマップへ自動追加される（URLの手書き不要）。除外フォルダ＝`wp/.git/.claude/node_modules/docs/assets`。
- **`lastmod` は各HTMLの更新日時から自動設定**（実装済み。`BUILD_DATE` 固定値には依存しない）。
- 反映手順：ページ追加 → `gen.py` 再生成 → `sitemap.xml`（＋新HTML）を `public_html/` へアップ。
  GSC は robots 経由で自動再クロールするが、急ぐなら GSC で当該URLの「インデックス登録をリクエスト」。
- ※ `BUILD_DATE`（現状 `2026-07-10`）は JSON-LD の記事 `dateModified` 用に残置（sitemap とは無関係）。

---

## 8. 変更のチェックリスト（毎回）

1. `gen.py`（またはCSS/JS/contact.php）を編集。HTMLは直接編集しない。
2. `python3 .claude/skills/revenge-site/gen.py` で再生成。
3. http.server + Playwright で検証（見た目を変えない指示なら無変化を確認）。
4. `差し替えファイル履歴.md` に「その N」を追記（上げるファイルを明記）。
5. 変更ファイルを `SendUserFile` で納品。
6. `claude/peaceful-lovelace-jhm089` にコミット＆push（トレーラ付き）。`チャットログ.md` も追随。
