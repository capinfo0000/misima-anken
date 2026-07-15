# -*- coding: utf-8 -*-
"""本番デプロイ用ZIPを作成する。

同梱物:
  public_html/    … 公開サイト一式（HTML/CSS/JS/画像/contact.php/sitemap/robots/llms）
  rag-knowledge/  … 埋め込みRAGの初期ナレッジ（Markdown。RAGの vault へ配置して取り込む）
  SETUP_README.txt

除外（安全側）: WordPress(/wp)、.env等の実シークレット、チャットログ/差し替え履歴/docs等の社内資料、
              .git/.claude 等のメタ、既存の *.zip。※公開ファイルはホワイトリスト方式で同梱。

使い方:
  python3 .claude/skills/revenge-site/build_deploy_zip.py [出力先.zip]
  （既定の出力先はリポジトリ直下 revenge-deploy.zip。*.zip は .gitignore 済み）
"""
import os, sys, subprocess, zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(REPO, "revenge-deploy.zip")

# 公開フォルダに入れる公開ファイル（ホワイトリスト）
PUBLIC = [
    "index.html", "message.html", "purpose.html", "profile.html", "services.html",
    "news.html", "contact.html", "privacy.html", "security.html", "sitepolicy.html",
    "contact.php", "sitemap.xml", "robots.txt", "llms.txt",
    "css", "js", "assets", "service", "lp",
]

SETUP_README = (
    "【本番セットアップ手順】\n\n"
    "1. public_html/ … Webサーバの公開フォルダ（revenge.co.jp）へ配置。\n"
    "2. rag-knowledge/ … 埋め込みRAGの vault フォルダへ配置し、\n"
    "     php scripts/sync_obsidian.php <vaultフォルダ>\n"
    "   で取り込む（＝RAGの初期ナレッジ。会社概要等は含めず、デジタル4サービス＋共通方針のみ）。\n"
    "3. RAG本体（coreserver_ready 一式）と .env / APIキーは別途用意。\n\n"
    "※ 本ZIPには WordPress(/wp) と実シークレット（.env・パスワード・APIキー等）は含めていません。\n"
    "※ IT事業（service-04・各LP・RAG埋め込み）を含みます。公開の可否は運用方針に従ってください。\n"
)

def add_path(z, abspath, arcbase):
    if os.path.isdir(abspath):
        for root, dirs, files in os.walk(abspath):
            dirs[:] = [d for d in dirs if not d.startswith(".")]
            for f in files:
                full = os.path.join(root, f)
                rel = os.path.relpath(full, abspath)
                z.write(full, os.path.join(arcbase, rel))
    elif os.path.isfile(abspath):
        z.write(abspath, arcbase)

def main():
    # 最新状態で生成（HTML/sitemap/robots/llms を再生成）
    subprocess.run([sys.executable, os.path.join(HERE, "gen.py")], check=True,
                   stdout=subprocess.DEVNULL)
    if os.path.exists(OUT):
        os.remove(OUT)
    n_pub = n_kb = 0
    with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED) as z:
        for item in PUBLIC:
            p = os.path.join(REPO, item)
            if os.path.exists(p):
                add_path(z, p, os.path.join("public_html", item))
                n_pub += 1
        kb = os.path.join(REPO, "rag-knowledge")
        for f in sorted(os.listdir(kb)) if os.path.isdir(kb) else []:
            if f.endswith(".md"):
                z.write(os.path.join(kb, f), os.path.join("rag-knowledge", f))
                n_kb += 1
        z.writestr("SETUP_README.txt", SETUP_README)
    print("built:", OUT)
    print("  public items:", n_pub, "/ rag-knowledge md:", n_kb)

if __name__ == "__main__":
    main()
