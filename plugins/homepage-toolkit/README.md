# homepage-toolkit プラグイン

ホームページ/LP 制作を、どのプロジェクトからでも（PC・スマホ問わず）効率的に進めるための
再利用スキル集です。新規案件のたびにゼロから考えず、このプラグインを入れるだけで
「進め方・ロードマップ・過去の修正多発ポイントと対処・内部SEO/AIO・メール設定手順」が手に入ります。

## 収録スキル
- **homepage-production** … 制作の進め方（アジャイル/プロトタイプ先行）、フェーズ別ロードマップ、
  修正が多発する箇所と対処、参考サイトの集め方、共有ヘッダー等の保守設計、内部SEO/AIO、
  インフラ（ドメイン/サーバ/WP/メール）、検証・納品の型、アンチパターン。
- **google-workspace-setup** … Value Domain(DNS)＋CoreServer＋Google Workspace のメール設定
  手順（所有権TXT→MX→SPF/DKIM/DMARC→CoreServer配送外部化→検証）。DNS構文リファレンス同梱。

> ※ 案件固有の実装ランブック（例：株式会社Revenge の `revenge-site`）は各案件リポジトリ側に置きます。
> 本プラグインは「どの案件でも使う汎用の型」だけを収録しています。

## インストール（PC / スマホの claude.ai/code どちらでも同じ）

セッション内で次のスラッシュコマンドを実行します。

```
/plugin marketplace add capinfo0000/misima-anken
/plugin install homepage-toolkit@capinfo
```

- 1行目：このリポジトリ（ルートの `.claude-plugin/marketplace.json`）をマーケットプレイスとして登録。
- 2行目：`homepage-toolkit` をインストール（`@capinfo` はマーケットプレイス名）。
- インストール後は、その案件で HP 制作の相談をすると自動でスキルが参照されます。
  `/homepage-production` のように直接呼ぶこともできます。

## 更新
このプラグインは `misima-anken` リポジトリの `.claude/skills/`（開発の元）から複製した配布スナップショットです。
内容を更新したら、元のスキルを直し `version` を上げて再コミットしてください（利用側は `/plugin` から更新）。

## スマホから作業したいとき
- claude.ai/code（Web/モバイル）で同じセッションを開けば、上記コマンドをスマホからも実行できます。
- 「スマホからPC本体を操作したい」場合はこのプラグインの範囲外（リモートデスクトップ/SSH等の別手段）。
  ただし claude.ai/code のクラウド実行環境を使えば、PCを介さずスマホだけで新規案件の作業を進められます。
