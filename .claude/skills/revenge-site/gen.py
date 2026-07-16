# -*- coding: utf-8 -*-
"""Static site generator for 株式会社Revenge corporate site (FLOCSS).
Outputs flat .html pages (+ robots/sitemap/llms) to the repo root, with a
shared header/footer. Run it from anywhere:  python3 gen.py

This script lives in the repo at .claude/skills/revenge-site/gen.py (bundled
with the `revenge-site` skill) so it survives across sessions. See the skill's
SKILL.md for the full build → verify → deliver workflow.
"""
import os, re, hashlib, json, html as _html

# 出力先＝リポジトリ直下。既定はこのスクリプト位置(.claude/skills/revenge-site/)から
# 3階層上のリポジトリルート。環境変数 REVENGE_OUT で上書き可。
OUT = os.environ.get("REVENGE_OUT") or os.path.abspath(
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", ".."))

# ---------------------------------------------------------------- SEO / AIO 設定（ブラウザ非表示のメタのみ）
SITE = "https://revenge.co.jp"            # 正規ドメイン
BUILD_DATE = "2026-07-10"                 # sitemap lastmod / 記事 dateModified
OG_IMAGE = SITE + "/assets/img/mv.webp"   # OGP画像（メインビジュアル・既存アセット）
LOGO_URL = SITE + "/assets/img/logo-mark.webp"
ORG_DESC = ("株式会社Revenge（Re:venge）は、鹿児島県指宿市を拠点に、"
            "セールスプロモーション事業・BPO事業・教育／研修事業を展開する企業です。"
            "通信業界を中心に、企業の売上向上と人・組織の成長を支援します。")

def _abs(path):
    """ページ相対パス → 絶対URL。index.html はルートに正規化。"""
    return SITE + "/" if path == "index.html" else SITE + "/" + path

def _ld(obj):
    return '<script type="application/ld+json">' + json.dumps(obj, ensure_ascii=False, separators=(",", ":")) + '</script>'

# 会社（Organization）共通ノード
def _org_node():
    return {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "株式会社Revenge",
        "alternateName": "Re:venge",
        "url": SITE + "/",
        "logo": LOGO_URL,
        "image": OG_IMAGE,
        "description": ORG_DESC,
        "email": "info@revenge.co.jp",
        "foundingDate": "2026-07",
        "areaServed": "JP",
        "address": {
            "@type": "PostalAddress",
            "postalCode": "891-0311",
            "addressRegion": "鹿児島県",
            "addressLocality": "指宿市",
            "streetAddress": "西方9051-1",
            "addressCountry": "JP",
        },
        "founder": {"@type": "Person", "name": "今別府 尭"},
        "contactPoint": {
            "@type": "ContactPoint",
            "contactType": "customer support",
            "email": "info@revenge.co.jp",
            "areaServed": "JP",
            "availableLanguage": ["Japanese"],
        },
    }

def _breadcrumb(title, path, cur):
    """パンくずJSON-LD（ホーム起点）。ブラウザ表示は変えず、AI/検索の構造理解のみ。"""
    items = [("ホーム", SITE + "/")]
    is_detail = "/" in path
    parent = {"services": ("事業内容", "services.html"), "news": ("ニュース", "news.html")}.get(cur)
    if is_detail and parent:
        items.append((parent[0], _abs(parent[1])))
    items.append((title, _abs(path)))
    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": i + 1, "name": nm, "item": url}
            for i, (nm, url) in enumerate(items)
        ],
    }

def seo_head(full_title, desc, path, cur, article_date=None):
    """<head>に入れる非表示のSEO/AIO要素（canonical・robots・OGP・Twitter・JSON-LD）。"""
    url = _abs(path)
    og_type = "article" if article_date else "website"
    e = lambda s: _html.escape(str(s), quote=True)
    tags = [
        '<link rel="canonical" href="%s" />' % url,
        '<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />',
        '<meta property="og:type" content="%s" />' % og_type,
        '<meta property="og:site_name" content="株式会社Revenge" />',
        '<meta property="og:locale" content="ja_JP" />',
        '<meta property="og:title" content="%s" />' % e(full_title),
        '<meta property="og:description" content="%s" />' % e(desc),
        '<meta property="og:url" content="%s" />' % url,
        '<meta property="og:image" content="%s" />' % OG_IMAGE,
        '<meta name="twitter:card" content="summary_large_image" />',
        '<meta name="twitter:title" content="%s" />' % e(full_title),
        '<meta name="twitter:description" content="%s" />' % e(desc),
        '<meta name="twitter:image" content="%s" />' % OG_IMAGE,
    ]
    # JSON-LD
    graph = [_org_node()]
    if path == "index.html":
        graph.append({"@context": "https://schema.org", "@type": "WebSite",
                      "name": "株式会社Revenge", "url": SITE + "/", "inLanguage": "ja",
                      "publisher": {"@type": "Organization", "name": "株式会社Revenge"}})
    else:
        graph.append(_breadcrumb(desc if False else full_title.split(" | ")[0], path, cur))
    if article_date:
        graph.append({
            "@context": "https://schema.org", "@type": "NewsArticle",
            "headline": full_title.split(" | ")[0], "inLanguage": "ja",
            "datePublished": article_date, "dateModified": BUILD_DATE,
            "mainEntityOfPage": url, "image": OG_IMAGE,
            "author": {"@type": "Organization", "name": "株式会社Revenge"},
            "publisher": {"@type": "Organization", "name": "株式会社Revenge",
                          "logo": {"@type": "ImageObject", "url": LOGO_URL}},
        })
    tags += [_ld(g) for g in graph]
    return "\n  " + "\n  ".join(tags)

# ---------------------------------------------------------------- asset version (cache busting)
def _asset_ver():
    h = hashlib.md5()
    for f in ("css/style.css", "js/main.js", "js/config.js"):
        p = os.path.join(OUT, f)
        try:
            with open(p, "rb") as fp: h.update(fp.read())
        except OSError:
            pass
    return h.hexdigest()[:8]
ASSET_VER = _asset_ver()

# ---------------------------------------------------------------- relink (sub-folder path fixup)
# 詳細ページは service/ ・ news/ サブフォルダへ出力。生成時はフラットな相対パス前提なので、
# (1) 詳細ページへのリンク(service-NN.html / news-*.html)をフォルダ付きへ正規化し、
# (2) サブフォルダ内ページではローカル参照すべてに up(=../) を前置して相対パスを正す。
_DETAIL_RE = [
    (re.compile(r'(href=")(service-\d{2}\.html")'), r'\1service/\2'),
    (re.compile(r'(href=")(news-\d+\.html")'), r'\1news/\2'),
]
_SKIP = re.compile(r'^(https?:|//|#|mailto:|tel:|data:|/)')

def relink(html, up):
    for rx, rep in _DETAIL_RE:
        html = rx.sub(rep, html)
    if not up:
        return html
    html = re.sub(r'(href|src)="([^"]+)"',
                  lambda m: m.group(0) if _SKIP.match(m.group(2)) else f'{m.group(1)}="{up}{m.group(2)}"',
                  html)
    html = re.sub(r"url\((['\"]?)([^'\")]+)\1\)",
                  lambda m: m.group(0) if _SKIP.match(m.group(2)) else f"url({m.group(1)}{up}{m.group(2)}{m.group(1)})",
                  html)
    return html

def rebrand(html):
    """ミシマ(仮称) → 株式会社Revenge への名称一括置換（内容のみ）"""
    reps = [
        ("ミシマグループ", "Revengeグループ"),
        ("株式会社ミシマ", "株式会社Revenge"),
        ("ミシマビル", "Revengeビル"),
        ("ミシマ", "Revenge"),
        ("MISIMA", "Revenge"),
        ("三島 太郎", "今別府 尭"),
        ("三島", "今別府"),
    ]
    for a, b in reps:
        html = html.replace(a, b)
    return html

# ---------------------------------------------------------------- head
def head(title, desc, path="index.html", cur="", article_date=None):
    full_title = f"{title} | 株式会社ミシマ"
    seo = seo_head(full_title, desc, path, cur, article_date)
    return f"""<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="{desc}" />
  <title>{full_title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+JP:wght@400;500;700&family=Noto+Serif+JP:wght@400;500;700&display=swap" rel="stylesheet" media="print" onload="this.media='all'" />
  <noscript><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+JP:wght@400;500;700&family=Noto+Serif+JP:wght@400;500;700&display=swap" rel="stylesheet" /></noscript>
  <link rel="stylesheet" href="css/style.css" />
  <link rel="icon" href="assets/favicon.svg" type="image/svg+xml" />{seo}
</head>
<body>"""

# ---------------------------------------------------------------- header
def header(cur=""):
    def c(key): return " is-current" if cur == key else ""
    def a(key): return "is-current" if cur == key else ""
    # ローダー（回転アニメ）はトップページのヒーロー表示時のみ
    loader = ('<div class="c-loader" aria-hidden="true"><div class="c-loader__flower">' + "".join(f'<span class="c-loader__petal" style="--i:{i}"></span>' for i in range(8)) + '</div></div>') if cur == "top" else ""
    return f"""
  {loader}
  <header class="l-header">
    <div class="l-header__inner">
      <p class="l-header__logo"><a href="index.html" aria-label="株式会社Revenge ホーム"><span class="l-header__mark" aria-hidden="true"></span><span class="l-header__word">Re:venge</span></a></p>
      <nav class="p-global-nav" id="globalNav" aria-label="メインナビゲーション">
        <ul class="p-global-nav__list">
          <li class="p-global-nav__item has-sub{c('company')}">
            <button class="p-global-nav__parent" aria-expanded="false">会社情報</button>
            <ul class="p-global-nav__sub">
              <li><a href="message.html">代表メッセージ</a></li>
              <li><a href="purpose.html">社名の由来</a></li>
              <li><a href="profile.html">会社概要</a></li>
            </ul>
          </li>
          <li class="p-global-nav__item"><a href="services.html" class="{a('services')}">事業内容</a></li>
          <li class="p-global-nav__item"><a href="news.html" class="{a('news')}">ニュース</a></li>
          <li class="p-global-nav__item has-sub{c('policy')}">
            <button class="p-global-nav__parent" aria-expanded="false">ポリシー</button>
            <ul class="p-global-nav__sub">
              <li><a href="security.html">情報セキュリティ基本方針</a></li>
              <li><a href="sitepolicy.html">サイトポリシー</a></li>
              <li><a href="privacy.html">プライバシーポリシー</a></li>
            </ul>
          </li>
          <li class="p-global-nav__item"><a href="contact.html" class="p-global-nav__cta">お問い合わせ</a></li>
        </ul>
      </nav>
      <button class="c-hamburger-btn" aria-controls="globalNav" aria-expanded="false" aria-label="メニューを開く">
        <span></span><span></span><span></span>
      </button>
    </div>
  </header>
"""

# ---------------------------------------------------------------- footer
def footer():
    return """
  <footer class="l-footer">
    <div class="l-container l-footer__inner">
      <div class="l-footer__info">
        <div class="l-footer__logo"><span class="l-footer__mark" aria-hidden="true"></span><span class="l-footer__word">Re:venge</span></div>
        <p class="l-footer__address">〒891-0311 鹿児島県指宿市西方9051-1<br />セールスプロモーション・BPO・教育研修で企業の成長を支援</p>
      </div>
      <nav class="l-footer__links" aria-label="フッターナビゲーション">
        <div class="l-footer__cols">
          <div class="l-footer__group">
            <div class="l-footer__col"><h4>COMPANY</h4><ul>
              <li><a href="message.html">代表メッセージ</a></li>
              <li><a href="purpose.html">社名の由来</a></li>
              <li><a href="profile.html">会社概要</a></li>
            </ul></div>
            <div class="l-footer__col"><h4>SERVICE</h4><ul>
              <li><a href="services.html">事業内容</a></li>
            </ul></div>
            <div class="l-footer__col"><h4>NEWS</h4><ul>
              <li><a href="news.html">ニュース一覧</a></li>
            </ul></div>
          </div>
          <div class="l-footer__group">
            <div class="l-footer__col"><h4>OTHERS</h4><ul>
              <li><a href="contact.html">お問い合わせ</a></li>
              <li><a href="privacy.html">プライバシーポリシー</a></li>
              <li><a href="security.html">情報セキュリティ基本方針</a></li>
              <li><a href="sitepolicy.html">サイトポリシー</a></li>
            </ul></div>
          </div>
        </div>
      </nav>
    </div>
    <div class="l-container l-footer__bottom">
      <p class="l-footer__copyright">&copy; 2026 Revenge Co., Ltd. All Rights Reserved.</p>
    </div>
  </footer>

  <a href="#" class="c-to-top" aria-label="ページトップへ戻る">↑</a>
  <script src="js/config.js"></script>
  <script src="js/main.js"></script>
</body>
</html>"""

# ---------------------------------------------------------------- helpers
def page_hero(sub, title, lead="", crumbs=None):
    crumbs = crumbs or []
    items = '<li><a href="index.html">ホーム</a></li>'
    for label, href in crumbs[:-1]:
        items += f'<li><a href="{href}">{label}</a></li>'
    if crumbs:
        items += f'<li aria-current="page">{crumbs[-1][0]}</li>'
    lead_html = f'<p class="p-page-hero__lead">{lead}</p>' if lead else ""
    return f"""
  <div class="p-page-hero">
    <div class="l-container">
      <p class="p-page-hero__sub">{sub}</p>
      <h1 class="p-page-hero__title">{title}</h1>
      {lead_html}
    </div>
  </div>
  <nav class="c-breadcrumb" aria-label="パンくずリスト">
    <div class="l-container"><ol>{items}</ol></div>
  </nav>
"""

def write(name, html):
    path = os.path.join(OUT, name)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(html)
    print("wrote", name)

# ================================================================ SERVICES (data + builders)
# 事業内容＝4事業（セールスプロモーション／BPO／教育・研修／デジタルソリューション）。画像カード＋個別詳細ページ。
# ※ service-01〜03 をここで定義し、デジタルソリューション(service-04)は下で PACKAGES を使って append する。
# title=事業名 / desc=カード説明 / lead=詳細ヒーロー一言 / points=主な業務内容 / body=本文段落。
SERVICES = [
    {"slug":"service-01","title":"セールスプロモーション事業","img":"service-01",
     "desc":"通信業界を中心に、商品・サービスの販売促進を支援。店頭・イベント・企画立案で売上向上に貢献します。",
     "lead":"商品・サービスの販売促進を、企画から現場運営まで支援します。",
     "points":["通信商材販売支援","店頭販売支援","イベント販売支援","セールスプロモーション企画","販売体制構築支援"],
     "body":["通信業界を中心に、商品・サービスの販売促進を支援しております。",
             "販売現場の運営支援、店頭プロモーション、イベント運営、販売戦略の企画立案を通じて、クライアント企業の売上向上に貢献いたします。"]},
    {"slug":"service-02","title":"BPO事業","img":"service-02",
     "desc":"営業・販売・イベント運営などの業務を受託し、企業の業務効率化と事業成長を支援します。",
     "lead":"業務を受託し、企業の効率化と事業成長を支えます。",
     "points":["営業代行","業務請負","現場運営支援","イベント運営代行","プロジェクト運営支援"],
     "body":["営業活動や販売業務、イベント運営などの業務を受託し、企業の業務効率化と事業成長を支援しております。",
             "業務の一部または全体を請け負い、品質向上と生産性向上に貢献いたします。"]},
    {"slug":"service-03","title":"教育・研修事業","img":"service-03",
     "desc":"営業力向上・人材育成・組織力強化を目的とした教育・研修サービスを提供します。",
     "lead":"実践的な研修で、人と組織の成長を支援します。",
     "points":["営業研修","販売研修","人材育成","マネジメント研修","組織構築支援"],
     "body":["営業力向上、人材育成、組織力強化を目的とした教育・研修サービスを提供しております。",
             "未経験者から管理者まで、それぞれの役割に応じた実践的な研修プログラムを実施し、組織全体の成長を支援いたします。"]},
    # デジタルソリューション事業（IT事業）は銀行口座開設後に追加予定のため一旦非表示（コメントアウト）。
    # 追加時はここに service-04 のエントリを戻す（RAG埋め込み・料金・LP等）。
]

def svc_cards(items, reveal=True):
    rc = " reveal" if reveal else ""
    out = []
    for s in items:
        out.append(
            f'<a class="p-top-service__card{rc}" href="{s["slug"]}.html">'
            f'<div class="p-top-service__card-img"><img src="assets/img/{s["img"]}.webp" alt="{s["title"]}" loading="lazy"></div>'
            f'<h3 class="p-top-service__card-title">{s["title"]}</h3>'
            f'<p class="p-top-service__card-desc">{s["desc"]}</p>'
            f'<span class="p-top-service__card-more">詳しく見る</span>'
            f'</a>')
    return "\n        ".join(out)

def svc_detail_page(s):
    body = "".join(f"<p>{p}</p>\n" for p in s["body"])
    pts = "".join(f"<li>{p}</li>" for p in s["points"])
    # 相談ボタン：詳細ページの事業に応じてお問い合わせ種別を自動セット（?type=…）
    ctype = {"service-01": "promotion", "service-02": "bpo", "service-03": "training", "service-04": "digital"}.get(s["slug"], "")
    contact_href = f"contact.html?type={ctype}" if ctype else "contact.html"
    # extra（強み・料金・相談フロー・CTA）は事業説明とは分け、独立セクション群として下に並べる。
    extra = s.get("extra", "")
    # no_default_cta のページは extra 側にCTA（cta_section等）を持つので既定のボタン行は出さない。
    default_cta = "" if s.get("no_default_cta") else f"""  <section class="l-section">
    <div class="l-container">
      <div class="c-btn-wrap">
        <a href="{contact_href}" class="c-btn -fill">このサービスを相談する</a>
        <a href="services.html" class="c-btn">事業内容へ戻る</a>
      </div>
    </div>
  </section>
"""
    # ヒーロー直下のCTA帯（研究知見：FV内CTA＋不安を消すマイクロコピーでCVが上がる）
    hero_cta = "" if not s.get("hero_cta") else f"""  <div class="p-hero-cta reveal">
    <div class="l-container">
      <p class="p-hero-cta__text">ヒアリングのあと、<b>動くプロトタイプを無料</b>でお見せします。</p>
      <a href="{contact_href}" class="c-btn -fill">無料で相談する</a>
      <p class="c-btn-note">メール1本でOK。しつこい営業はいたしません。</p>
    </div>
  </div>
"""
    return page_hero("Service", s["title"], s["lead"],
        [("事業内容", "services.html"), (s["title"], s["slug"] + ".html")]) + hero_cta + f"""
  <section class="l-section">
    <div class="l-container">
      <div class="p-service-single">
        <div class="p-service-single__img reveal -left"><img src="assets/img/{s['img']}.webp" alt="{s['title']}"></div>
        <div class="p-prose reveal -right">
          {body}
          <h3>主な業務内容</h3>
          <ul class="-bullets">{pts}</ul>
        </div>
      </div>
    </div>
  </section>
{extra}{default_cta}{s.get("tail", "")}"""

# ================================================================ デジタルソリューション事業（IT）＝データ駆動
# パッケージをここに1件足すだけで、service-04 の料金カード／個別LP(lp/<slug>.html)／
# サイトマップまで自動反映される（今後パッケージが増える前提の設計）。
# name=名称 / kind=区分 / summary=概要 / init=初期費用 / maint=月額保守(税込。Noneなら要相談) / demo=サイト内RAG実演の対象か
# group=商品タイプ（"custom"=オーダーメイド制作・開発 / "package"=定型パッケージ商品）。セクションを分けて表示する。
PACKAGES = [
    {"slug": "hp", "name": "ホームページ制作", "kind": "オリジナル制作", "group": "custom",
     "summary": "目的・ブランドに合わせた完全オリジナルのサイト/LPを制作。公開後の保守・運用・集客改善まで継続支援します。",
     "init": "5〜30万円", "maint": "1〜10万円"},
    {"slug": "dev", "name": "新規システム開発", "kind": "受託開発", "group": "custom",
     "summary": "業務課題に合わせた新規システムを、企画から開発・運用まで一気通貫でご提供します。",
     "init": "お見積り", "maint": None},
    {"slug": "rag", "name": "埋め込み型RAG", "kind": "パッケージ", "group": "package",
     "summary": "自社の情報を学習したAIチャットをサイトに設置し、問い合わせ対応や社内検索を自動化します。"
                "SaaSの汎用ボットと違い、自社データで個別構築してサイトへ完全埋め込み。<b>今、このページ右下で実際に動いています。</b>",
     "init": "5〜20万円", "maint": "2〜10万円"},
    {"slug": "event", "name": "イベント運営 事前決済システム", "kind": "パッケージ", "group": "package",
     "summary": "イベントの事前申込とオンライン決済をまとめて処理。当日の運営負荷と未収リスクを減らします。",
     "init": "2万円", "maint": "5,000円",
     # 実物スクリーンショット（スマホ実機の画面。左=参加者向け申込画面/右=主催者ダッシュボード）
     "shots": [("pkg-event-form.webp", "参加者向けのイベント申込画面（実物）"),
               ("pkg-event-dash.webp", "主催者向けの管理ダッシュボード（実物）")]},
]

# 商品タイプごとのセクション（順番＝表示順）。sub=英字サブ見出し（c-section-heading 用）。
PKG_GROUPS = [
    ("custom",  "Custom Development", "制作・開発（オーダーメイド）", "ご要望に合わせて、一から制作・開発します。"),
    ("package", "Packages",           "パッケージ商品",             "すぐ導入できる定型パッケージ。低コストで素早く始められます。"),
]

def _pkg_price(p):
    # 全カードで同じ形式（初期／月額保守）に統一。金額が無いものは「要相談」。税込表記は一覧の上部にまとめて記載。
    maint = p["maint"] if p["maint"] is not None else "要相談"
    return (f'<p class="p-pkg__price"><span class="p-pkg__price-row"><span>初期</span><b>{p["init"]}</b></span>'
            f'<span class="p-pkg__price-row"><span>月額保守</span><b>{maint}</b></span></p>')

def _pkg_card(p):
    badge = '<span class="p-pkg__badge">実演中</span>' if p.get("demo") else ""
    # shots＝実物スクリーンショット（あれば概要の下に表示。「実物を見せる」＝信頼訴求）
    shots = ""
    if p.get("shots"):
        imgs = "".join(f'<img src="assets/img/{f}" alt="{alt}" loading="lazy">' for f, alt in p["shots"])
        shots = f'<div class="p-pkg__shots">{imgs}</div>'
    return (
        '<div class="p-pkg">'
        f'<p class="p-pkg__kind">{p["kind"]}{badge}</p>'
        f'<h4 class="p-pkg__name">{p["name"]}</h4>'
        f'<p class="p-pkg__summary">{p["summary"]}</p>'
        f'{shots}'
        f'{_pkg_price(p)}'
        f'<a class="p-pkg__more" href="lp/{p["slug"]}.html">詳しくはこちら<span aria-hidden="true">→</span></a>'
        '</div>')

def _sec_heading(sub, title):
    # 全ページ共通の見出しコンポーネント（英字サブ＋日本語見出し）＝サイトの統一感を担保。
    return (f'<div class="c-section-heading -center reveal">'
            f'<span class="c-section-heading__sub">{sub}</span>'
            f'<h2 class="c-section-heading__title">{title}</h2></div>')

def promise_section():
    # 数字で見せる「Revengeの約束」＝実在の事実のみ（プロトタイプ0円／修正無制限／保守5,000円〜）。
    stats = [
        ("0<small>円</small>", "動くプロトタイプを無料で"),
        ("無制限", "納得いくまで修正"),
        ("5,000<small>円〜</small>", "月額保守（内容に応じて）"),
    ]
    cells = "".join(
        f'<div class="c-stat reveal"><div class="c-stat__num">{n}</div><div class="c-stat__label">{l}</div></div>'
        for n, l in stats)
    return f'''
  <section class="l-section">
    <div class="l-container">
      <div class="p-stats -three">{cells}</div>
    </div>
  </section>
'''

def strengths_section():
    # 「私たちの特徴」＝トップページと同じ c-card（番号付き）で信頼感を訴求。
    items = [
        ("01", "小さく始められる", "ホームページは5万円〜、AIチャットも定額パッケージ。個人事業主・中小企業の予算感で、必要な分だけ導入できます。"),
        ("02", "IT担当がいなくても大丈夫", "専門用語を使わずにご説明し、企画から公開まで窓口ひとつで対応。丸ごとお任せいただけます。"),
        ("03", "まず無料でプロトタイプ", "早い段階で動くプロトタイプを無料で作成。見て・触れて納得してから本契約へ。"),
        ("04", "AIも実用レベルで内製", "生成AIを使った埋め込みRAG（AIチャット）まで自社で実装。このページ右下で実際に動いています。"),
    ]
    cards = "".join(
        f'<div class="c-card reveal"><span class="c-card__num">{n}</span>'
        f'<h3 class="c-card__title">{t}</h3><p class="c-card__text">{d}</p></div>'
        for n, t, d in items)
    return ('''
  <div class="c-band reveal -multi" aria-hidden="true">
    <span class="c-band__bar" style="--c:var(--c-red)"></span>
    <span class="c-band__bar" style="--c:var(--c-orange)"></span>
    <span class="c-band__bar" style="--c:var(--c-green)"></span>
    <span class="c-band__bar" style="--c:var(--c-blue)"></span>
    <span class="c-band__bar" style="--c:var(--c-purple)"></span>
  </div>
  <section class="l-section -tint">
    <div class="l-container">
''' + _sec_heading("Features", "私たちの特徴") + f'''
      <div class="p-top-reasons__grid">{cards}</div>
    </div>
  </section>
''')

PKG_VISIBLE = 3   # 各グループの初期表示件数。これを超えた分は折りたたみ行に入り「もっと見る」で開閉。

def packages_section():
    # 商品タイプごとに別セクション。見出しは共通の c-section-heading を使用。
    # 商品が PKG_VISIBLE 件を超えたら、超過分は閉じた2列目（.p-pkg-grid.-more）に自動で入る。
    out = []
    for i, (gkey, gsub, gtitle, gdesc) in enumerate(PKG_GROUPS):
        items = [p for p in PACKAGES if p.get("group") == gkey]
        if not items:
            continue
        tint = " -tint" if i % 2 == 0 else ""
        vis, rest = items[:PKG_VISIBLE], items[PKG_VISIBLE:]
        # 3件未満の行は件数クラス(-n1/-n2)を付け、少ない枚数でも中央・全幅に広がるようにする
        def _ncls(n):
            return f" -n{n}" if n < 3 else ""
        cards = "".join(_pkg_card(p) for p in vis)
        more = ""
        if rest:
            more_cards = "".join(_pkg_card(p) for p in rest)
            more_label = "もっと見る"
            more = (f'\n      <div class="p-pkg-grid -more{_ncls(len(rest))}" id="pkg-more-{gkey}">{more_cards}</div>'
                    f'\n      <div class="c-btn-wrap"><button type="button" class="c-btn js-pkg-toggle"'
                    f' aria-expanded="false" aria-controls="pkg-more-{gkey}"'
                    f' data-more-label="{more_label}">{more_label}</button></div>')
        out.append(f'''
  <section class="l-section{tint}">
    <div class="l-container">
''' + _sec_heading(gsub, gtitle) + f'''
      <p class="p-lead-text -center reveal">{gdesc}<small>（金額はすべて税込／詳細は無料ヒアリングでご提案）</small></p>
      <div class="p-pkg-grid{_ncls(len(vis))}">{cards}</div>{more}
      <div class="c-btn-wrap"><a href="contact.html?type=digital" class="c-btn">この内容で無料相談する</a></div>
    </div>
  </section>
''')
    return "".join(out)

def flow_section():
    steps = [
        ("無料ヒアリング", "ヒアリングシートをもとに、目的・課題・ご要望をお伺いします（無料）。"),
        ("無料プロトタイプ", "早い段階で動くプロトタイプを無料で作成。イメージを見ながら方向性を決めます。"),
        ("本契約のご判断", "プロトタイプにご納得いただけたら本契約。無理な勧誘はいたしません。"),
        ("納得いくまで修正", "公開まで、ご満足いただけるまで修正します。"),
        ("公開後も継続支援", "保守・運用・集客改善まで継続。単発で終わらせません。"),
    ]
    cards = "".join(
        f'<div class="c-card reveal"><span class="c-card__num">{i:02d}</span>'
        f'<h3 class="c-card__title">{t}</h3><p class="c-card__text">{d}</p></div>'
        for i, (t, d) in enumerate(steps, 1))
    return ('''
  <section class="l-section -tint">
    <div class="l-container">
''' + _sec_heading("Flow", "ご相談の流れ（まずは無料）") + f'''
      <div class="p-top-reasons__grid">{cards}</div>
    </div>
  </section>
''')

def cta_section():
    # サイト共通の p-contact パターンでお問い合わせへ誘導（無料相談を強調）。
    return ('''
  <section class="p-contact l-section">
    <div class="l-container">
''' + _sec_heading("Contact", "まずは無料でご相談ください") + '''
      <p class="p-contact__lead reveal">ヒアリング後、無料でプロトタイプを作成します。ITのご担当者がいなくても大丈夫。専門用語を使わずご説明し、公開後の運用・改善まで伴走します。個人事業主・中小企業の方こそ、お気軽にご相談ください。</p>
      <div class="c-btn-wrap"><a href="contact.html?type=digital" class="c-btn -fill">無料で相談する</a></div>
      <p class="c-btn-note reveal">メール1本でOK。しつこい営業はいたしません。</p>
    </div>
  </section>
''')

# 埋め込みRAG（公式embed.js）＝service-04 だけに設置。右下フローティングの💬チャット。
# data-src 省略時は embed.js と同じ場所の chat/?embed=1 を読む（＝RAGホスト側）。
RAG_HOST = "https://rag.engineer.v2008.coreserver.jp"
RAG_EMBED = (
    '\n  <!-- 埋め込みRAG（このページのみ）。右下に💬チャットボタンを表示 -->\n'
    f'  <script src="{RAG_HOST}/embed.js" data-title="Re:venge AIアシスタント" '
    'data-color="#e60012" data-position="right" '
    f'data-src="{RAG_HOST}/chat/?embed=1"></script>\n')

# service-04（デジタルソリューション事業）を SERVICES に追加＝4事業。
# extra にパッケージ料金＋RAGデモ＋相談フローをまとめて差し込む。
SERVICES.append({
    "slug": "service-04", "title": "デジタルソリューション事業", "img": "service04",
    "desc": "ホームページ制作・埋め込みRAG・イベント運営システム・新規開発まで。ITで事業の成長を支援します。",
    "lead": "個人事業主・中小企業のためのWeb・AI・システム。まず“動くもの”を無料で、触ってから決められます。",
    "hero_cta": True,   # ヒーロー直下にCTA帯（無料相談＋不安を消すマイクロコピー）
    "points": ["ホームページ制作（オリジナル）", "埋め込み型RAG（AIチャット）",
               "イベント運営 事前決済システム", "新規システム開発"],
    "body": ["Web制作からAI活用、業務システムの開発まで。個人事業主・中小企業の「人手が足りない」「ITに詳しい人がいない」を、デジタルの力で解決します。",
             "「作って終わり」にせず、公開後の保守・運用・集客改善まで継続してご一緒します。ITのご担当者がいなくても大丈夫です。"],
    # 並び＝訪問者の関心順：商品(何を・いくらで)→特徴(なぜ当社か)→約束の数字→流れ→CTA
    "extra": packages_section() + strengths_section() + promise_section() + flow_section() + cta_section(),
    "no_default_cta": True,   # 末尾は cta_section（お問い合わせ誘導）を使うので既定のボタン行は出さない
    "tail": RAG_EMBED,        # このページだけ埋め込みRAG（右下チャット）を読み込む
})

# 個別LP（lp/<slug>.html）＝PACKAGES から自動生成。詳細は順次拡充（現状は概要＋料金＋CVのスタブ）。
def lp_page(p):
    return page_hero("Service LP", p["name"], p["summary"],
        [("事業内容", "services.html"),
         ("デジタルソリューション事業", "service/service-04.html"),
         (p["name"], "lp/" + p["slug"] + ".html")]) + f"""
  <section class="l-section">
    <div class="l-container">
      <div class="p-prose">
        <p>{p["summary"]}</p>
        {_pkg_price(p)}
        <p class="p-note">※ このLPは準備中です。事例・機能・料金内訳・導入の流れは順次追加します。</p>
      </div>
      <div class="c-btn-wrap">
        <a href="contact.html?type=digital" class="c-btn -fill">このサービスを相談する</a>
        <a href="service/service-04.html" class="c-btn">デジタルソリューション事業へ戻る</a>
      </div>
    </div>
  </section>
"""

# ================================================================ BUSINESS OBJECTS (事業内容14項目)
BUSINESS_OBJECTS = [
    "通信機器及び通信サービスの販売促進、営業支援及びコンサルティング業務",
    "営業代行業及び販売代行業",
    "業務請負業及び業務受託業",
    "各種商品及びサービスの販売促進、取次、代理店及び仲介業務",
    "イベント、展示会、セミナー及び各種催事の企画、運営、管理及び請負業務",
    "人材育成、教育、研修及びコンサルティング事業",
    "有料職業紹介事業",
    "労働者派遣事業",
    "採用支援、人事コンサルティング及び組織運営支援業務",
    "外国人材の採用支援、就労支援及び定着支援業務",
    "外国人向け生活支援、各種手続支援及びコンサルティング業務",
    "BPO（ビジネス・プロセス・アウトソーシング）事業並びに業務運営受託事業",
    "古物営業法に基づく古物の売買、交換、仲介、輸出入及び販売業",
    "前各号に附帯関連する一切の事業",
]
def objects_ol():
    return '<ol class="p-objects">' + "".join(f"<li>{o}</li>" for o in BUSINESS_OBJECTS) + "</ol>"

# ================================================================ INDEX
index_body = """
  <section class="p-hero" aria-label="メインビジュアル">
    <div class="p-hero__sticky">
      <div class="p-hero__bg" aria-hidden="true"><span class="p-hero__bg-layer -fail"></span><span class="p-hero__bg-layer -retry"></span><span class="p-hero__bg-layer -stack"></span><span class="p-hero__bg-layer -lines"></span></div>
      <div class="p-fv__bars" aria-hidden="true">
        <span class="p-fv__bar" style="--i:0"></span>
        <span class="p-fv__bar" style="--i:1"></span>
        <span class="p-fv__bar" style="--i:2"></span>
        <span class="p-fv__bar" style="--i:3"></span>
        <span class="p-fv__bar" style="--i:4"></span>
        <span class="p-fv__bar" style="--i:5"></span>
        <span class="p-fv__bar" style="--i:6"></span>
      </div>
      <div class="p-hero__morph">
        <div class="p-hero__stack" aria-hidden="true">
          <span class="p-hero__stack-top">失敗</span>
          <span class="p-hero__stack-arrow"><svg viewBox="0 0 24 30" width="48" height="60"><path d="M12 1 L12 24 M3 15 L12 24 L21 15" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
          <span class="p-hero__stack-btm" data-first="失敗" data-second="再挑戦"><span class="p-hero__caret"></span></span>
        </div>
      </div>
      <div class="p-hero__lines" aria-hidden="true">
        <p class="p-hero__line"><i>知らないことで、機会を逃さない。</i></p>
        <p class="p-hero__line"><i>一人ひとりに、もっと多くの選択肢を。</i></p>
        <p class="p-hero__line"><i>過去や環境に、縛られない。</i></p>
        <p class="p-hero__line"><i>新たな挑戦が、人生を好転させる。</i></p>
        <p class="p-hero__line"><i>その「きっかけ」を、私たちが。</i></p>
      </div>
      <div class="p-hero__catch">
        <p class="p-hero__catch-jp"><span class="p-hero__reveal-line"><span class="p-hero__reveal-text">再挑戦する人に、次のステージを。</span></span></p>
        <h1 class="p-hero__catch-copy"><span class="p-hero__reveal-line"><span class="p-hero__reveal-text">THE NEXT STAGE</span></span><span class="p-hero__reveal-line"><span class="p-hero__reveal-text">FOR CHALLENGERS</span></span></h1>
      </div>
      <div class="p-fv__scroll" aria-hidden="true"><span class="p-fv__scroll-label">SCROLL</span><svg class="p-fv__scroll-arrow" viewBox="0 0 24 30" width="56" height="52" aria-hidden="true"><path d="M12 11 L12 24 M3 15 L12 24 L21 15" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
    </div>
  </section>

  <section class="p-top-news l-section">
    <div class="l-container">
      <div class="c-section-heading reveal"><span class="c-section-heading__sub">News</span><h2 class="c-section-heading__title">新着情報</h2></div>
      <ul class="p-top-news__list" data-news-count="5">
        __NEWS_TOP__
      </ul>
      <div class="c-btn-wrap"><a href="news.html" class="c-btn">View More</a></div>
    </div>
  </section>

  <div class="c-band reveal" style="--c:var(--c-blue)" aria-hidden="true">
    <span class="c-band__bar"></span><span class="c-band__bar"></span><span class="c-band__bar"></span>
  </div>

  <section class="p-top-about l-section">
    <div class="l-container">
      <div class="p-top-about__inner">
        <div class="p-top-about__img reveal -left"><img src="assets/img/about.webp" alt="通信の現場で活躍するスタッフ" loading="lazy"></div>
        <div class="reveal -right">
          <div class="c-section-heading -left"><span class="c-section-heading__sub">About Us</span><h2 class="c-section-heading__title">私たちの存在意義</h2></div>
          <p class="p-top-about__text">株式会社Revengeは、セールスプロモーション事業・BPO事業・教育／研修事業を展開しています。通信業界を中心に、販売促進・業務受託・人材育成を通じて、企業の売上向上と人・組織の成長に貢献。「無知による搾取をなくす」という想いのもと、一人ひとりの“人生を変えるきっかけ”を提供し、お客様に寄り添うパートナーであり続けます。</p>
          <a href="purpose.html" class="c-btn">詳しく見る</a>
        </div>
      </div>
    </div>
  </section>

  <section class="p-top-service l-section">
    <div class="l-container">
      <div class="c-section-heading -center reveal"><span class="c-section-heading__sub">Our Services</span><h2 class="c-section-heading__title">事業内容</h2></div>
      <div class="p-top-service__grid">
        __SVC_CARDS__
      </div>
      <div class="c-btn-wrap"><a href="services.html" class="c-btn">事業内容をすべて見る</a></div>
    </div>
  </section>

  <div class="c-band reveal -multi" aria-hidden="true">
    <span class="c-band__bar" style="--c:var(--c-red)"></span>
    <span class="c-band__bar" style="--c:var(--c-orange)"></span>
    <span class="c-band__bar" style="--c:var(--c-green)"></span>
    <span class="c-band__bar" style="--c:var(--c-blue)"></span>
    <span class="c-band__bar" style="--c:var(--c-purple)"></span>
  </div>

  <section class="p-top-reasons l-section">
    <div class="l-container">
      <div class="c-section-heading reveal"><span class="c-section-heading__sub">Our Strengths</span><h2 class="c-section-heading__title">選ばれる理由</h2></div>
      <div class="p-top-reasons__grid">
        <div class="c-card reveal"><span class="c-card__num">01</span><h3 class="c-card__title">通信業界に特化</h3><p class="c-card__text">通信業界に特化した豊富な知識と現場経験を活かし、販売支援・営業支援・イベント運営まで幅広く対応しております。業界特有の課題を理解し、最適なソリューションをご提供いたします。</p></div>
        <div class="c-card reveal"><span class="c-card__num">02</span><h3 class="c-card__title">高品質な現場運営</h3><p class="c-card__text">現場ごとの目的や課題に合わせた柔軟な運営体制を構築し、品質管理を徹底しております。クライアント企業の成果最大化を目指し、責任を持ってサポートいたします。</p></div>
        <div class="c-card reveal"><span class="c-card__num">03</span><h3 class="c-card__title">全国対応</h3><p class="c-card__text">主要都市を中心に全国の案件へ対応しております。地域を問わず、ご要望に応じた最適な運営体制をご提案いたします。</p></div>
        <div class="c-card reveal"><span class="c-card__num">04</span><h3 class="c-card__title">柔軟な提案力</h3><p class="c-card__text">企業ごとの課題やご要望に合わせ、販売支援・営業支援・BPOサービスを組み合わせた最適なソリューションをご提案いたします。課題解決から運営まで一貫してサポートいたします。</p></div>
      </div>
    </div>
  </section>

  <section class="p-top-message l-section">
    <div class="l-container">
      <div class="p-top-message__inner">
        <div class="p-top-message__img reveal -left"><img src="assets/img/ceo.webp" alt="代表取締役社長 今別府 尭" loading="lazy"></div>
        <div class="reveal -right">
          <div class="c-section-heading -left"><span class="c-section-heading__sub">Message</span><h2 class="c-section-heading__title">代表メッセージ</h2></div>
          <p class="p-top-message__lead">挑戦する人に、機会を創る。</p>
          <p class="p-top-message__text">社名「Revenge」には「人生の再挑戦」という想いを込めています。人生には失敗や挫折がありますが、それで人生が決まるわけではありません。大切なのは、何度でも立ち上がり挑戦し続けること。Revengeは、人が成長し、挑戦し、自らの人生を切り拓くための舞台でありたいと考えています。</p>
          <p class="p-top-message__sign">代表取締役社長</p>
          <img class="c-sign-img" src="assets/img/sign.webp" alt="今別府 尭" loading="lazy">
          <a href="message.html" class="c-link-arrow">メッセージ全文を読む</a>
        </div>
      </div>
    </div>
  </section>

  <section class="p-contact l-section">
    <div class="l-container">
      <div class="c-section-heading reveal"><span class="c-section-heading__sub">Contact</span><h2 class="c-section-heading__title">お問い合わせ</h2></div>
      <p class="p-contact__lead reveal">セールスプロモーション・BPO・教育研修に関するご相談など、お気軽にお問い合わせください。企業様・お取引をご検討いただいている皆様からのご相談をお待ちしております。</p>
      <div class="c-btn-wrap"><a href="contact.html" class="c-btn -fill">お問い合わせフォームへ</a></div>
    </div>
  </section>
"""

# ================================================================ SUBPAGES
message_body = page_hero("Message", "代表メッセージ", "挑戦する人に、機会を創る。",
    [("会社情報", "#"), ("代表メッセージ", "message.html")]) + """
  <section class="l-section">
    <div class="l-container">
      <div class="p-message__inner">
        <div class="p-message-photo"><img src="assets/img/ceo.webp" alt="代表取締役 今別府 尭"></div>
        <div class="p-prose">
          <p class="p-prose__lead">挑戦する人に、機会を創る。</p>
          <p>私たちは、「挑戦する人に機会を創る」という想いのもと、株式会社Revengeを設立しました。</p>
          <p>社名である「Revenge」には、「人生の再挑戦」という意味を込めています。</p>
          <p>人生には失敗や挫折があります。<br />思うような結果が出ないこともあります。<br />しかし、それで人生が決まるわけではありません。</p>
          <p>大切なのは、何度でも立ち上がり、挑戦し続けることです。</p>
          <p>私自身、多くの出会いと経験の中で、人の可能性は環境によって大きく変わることを学びました。</p>
          <p>だからこそRevengeは、単なる人材会社や営業会社ではなく、人が成長し、挑戦し、自らの人生を切り拓いていくための舞台でありたいと考えています。</p>
          <p>現在はセールスプロモーション事業、BPO事業、教育研修事業を通じて、企業の発展と人材の成長を支援しております。</p>
          <p>そして将来的には、支社長や子会社社長など、多くのリーダーや経営者を輩出できる組織を目指しています。</p>
        </div>
      </div>
      <div class="p-message__closing-wrap">
        <p class="p-prose__closing"><span class="-quote -img"><img src="assets/img/tama-close1.webp" alt="挑戦する人にチャンスを。" class="c-brush-img"><img src="assets/img/tama-close2.webp" alt="成長したい人に環境を。" class="c-brush-img"></span><span class="-tail">関わるすべての人の可能性を広げることが、私たちの使命です。</span></p>
        <p class="p-prose__sign">株式会社Revenge　代表取締役</p>
        <img class="c-sign-img" src="assets/img/sign.webp" alt="今別府 尭">
      </div>
    </div>
  </section>
"""

purpose_body = page_hero("Our Name", "社名の由来", "私たちの存在意義と、社名にこめた想い。",
    [("会社情報", "#"), ("社名の由来", "purpose.html")]) + """
  <section class="l-section">
    <div class="l-container">
      <div class="p-prose">
        <h2>存在意義</h2>
        <p class="p-prose__lead">再挑戦する人に、次のステージを。</p>
        <p>Revengeは、「挑戦する人と企業に、新たな可能性と成長の機会を提供する」ことを使命としています。</p>
        <p>私たちは、事業を通じて、人と企業の成長を支え、社会に新たな価値を創造します。</p>
        <p>過去の失敗や挫折は、未来への挑戦を諦める理由ではありません。</p>
        <p>一人ひとりが新たな一歩を踏み出し、自らの可能性を広げられる社会を創ること。それが私たちの目指す未来です。</p>
        <h2>社名の由来</h2>
        <p>「Revenge」という社名には、『未来を創るために再挑戦する』という想いを込めています。</p>
        <p>「Re」には「再び・新たに」、「venge」には「強い意志を持って前へ進む」という想いを重ね、過去にとらわれることなく、新たな挑戦によって未来を切り拓いていくという決意を表現しています。</p>
        <p>挑戦には、不安や困難がつきものです。</p>
        <p>だからこそRevengeは、挑戦する人と企業に寄り添い、新たな一歩を支えるパートナーであり続けます。</p>
      </div>
      <div class="p-message__closing-wrap">
        <p class="p-prose__closing"><span class="-quote -img"><img src="assets/img/tama-purpose1.webp" alt="再挑戦する人と企業に" class="c-brush-img"><img src="assets/img/tama-purpose2.webp" alt="次のステージを。" class="c-brush-img"></span><span class="-tail">それが、株式会社Revenge<br />我々のミッションです。</span></p>
      </div>
    </div>
  </section>
"""

profile_body = page_hero("Company Profile", "会社概要", "株式会社ミシマの会社概要です。",
    [("会社情報", "#"), ("会社概要", "profile.html")]) + """
  <section class="l-section">
    <div class="l-container">
      <p class="p-lead-text">セールスプロモーション事業・BPO事業・教育研修事業を通じて、企業の事業成長を支援しております。</p>
      <p class="p-lead-text" style="margin-bottom:2.5rem;">販売支援・営業支援・イベント運営・業務請負・人材育成まで、一貫したサービスを提供し、企業の課題解決に貢献いたします。</p>
      <table class="c-table"><tbody>
        <tr><th>会社名</th><td>株式会社Revenge<br /><span style="font-size:.85em;color:var(--c-text-sub,#666);">※ブランド表記：Re:venge</span></td></tr>
        <tr><th>代表者</th><td>代表取締役社長　今別府 尭</td></tr>
        <tr><th>所在地</th><td>〒891-0311 鹿児島県指宿市西方9051-1</td></tr>
        <tr><th>設立</th><td>2026年7月</td></tr>
        <tr><th>資本金</th><td><span data-countup="1500000" data-suffix="円">1,500,000円</span></td></tr>
        <tr><th>事業内容</th><td>セールスプロモーション事業<br />BPO事業<br />教育・研修事業</td></tr>
        <tr><th>対応エリア</th><td>全国</td></tr>
        <tr><th>お問い合わせ</th><td><a href="contact.html">お問い合わせフォーム</a>よりお気軽にご連絡ください。</td></tr>
        <tr><th>営業時間</th><td>9:00〜18:00（土日祝を除く）</td></tr>
        <tr><th>メールアドレス</th><td><a href="mailto:info@revenge.co.jp">info@revenge.co.jp</a></td></tr>
        <tr><th>法人番号</th><td>取得後掲載</td></tr>
      </tbody></table>
      <div class="c-btn-wrap"><a href="contact.html" class="c-btn -fill">お問い合わせ</a></div>
    </div>
  </section>
  <section class="l-section -soft p-mission">
    <div class="l-container">
      <div class="c-section-heading -center"><span class="c-section-heading__sub">Mission</span><h2 class="c-section-heading__title -img"><img src="assets/img/tama-mission.webp" alt="再挑戦する人に、次のステージを。" class="c-brush-img"></h2></div>
    </div>
  </section>
"""

history_body = page_hero("History", "沿革", "創業からの歩み。",
    [("会社情報", "#"), ("沿革", "history.html")]) + """
  <section class="l-section">
    <div class="l-container">
      <ul class="c-timeline">
        <li><time>2008年</time><p>東京都品川区にて株式会社ミシマを設立。携帯ショップ向け販売スタッフの人材派遣事業を開始。</p></li>
        <li><time>2011年</time><p>大手通信キャリアと取引を開始。コールセンター向け人材派遣に事業を拡大。</p></li>
        <li><time>2014年</time><p>有料職業紹介事業の許可を取得。通信業界に特化した転職支援を開始。</p></li>
        <li><time>2017年</time><p>業務委託（店舗運営受託）事業を開始。携帯ショップの一括運営受託をスタート。</p></li>
        <li><time>2019年</time><p>大阪支社を開設。関西エリアでのサービス提供を本格化。</p></li>
        <li><time>2022年</time><p>独自の研修センターを設立。スタッフの教育・資格取得支援体制を強化。</p></li>
        <li><time>2024年</time><p>名古屋・福岡に営業所を開設。全国対応体制を構築。</p></li>
        <li><time>2026年</time><p>大手通信キャリアと店舗運営業務委託契約を締結。従業員数1,200名規模に。</p></li>
      </ul>
    </div>
  </section>
"""

group_body = page_hero("Group", "グループ会社", "ミシマグループの事業会社をご紹介します。",
    [("会社情報", "#"), ("グループ会社", "group.html")]) + """
  <section class="l-section">
    <div class="l-container">
      <div class="p-top-group__grid">
        <a href="#" class="p-top-group__item"><span class="p-top-group__logo">MISIMA <strong>Staffing</strong></span><span class="p-top-group__desc">通信業界専門の人材派遣</span></a>
        <a href="#" class="p-top-group__item"><span class="p-top-group__logo">MISIMA <strong>Operations</strong></span><span class="p-top-group__desc">携帯ショップ運営受託</span></a>
        <a href="#" class="p-top-group__item"><span class="p-top-group__logo">MISIMA <strong>Connect</strong></span><span class="p-top-group__desc">コールセンター・BPO</span></a>
        <a href="#" class="p-top-group__item"><span class="p-top-group__logo">MISIMA <strong>Academy</strong></span><span class="p-top-group__desc">研修・人材育成</span></a>
      </div>
      <p class="p-lead-text" style="margin-top:2rem;">※掲載しているグループ会社名はすべてダミー（プレースホルダ）です。実際の情報に差し替えてご利用ください。</p>
    </div>
  </section>
"""

services_body = page_hero("Services", "事業内容", "セールスプロモーション・BPO・教育／研修・デジタルソリューションの4事業で、企業の成長を支援します。",
    [("事業内容", "services.html")]) + """
  <section class="p-top-service l-section">
    <div class="l-container">
      <p class="p-lead-text" style="margin-bottom:2.5rem;">セールスプロモーション事業・BPO事業・教育／研修事業に加え、デジタルソリューション事業まで。幅広い領域で、クライアント企業の売上向上と、人・組織の成長、デジタル活用を支援します。</p>
      <div class="p-top-service__grid">
        __SVC_CARDS__
      </div>
      <div class="c-btn-wrap"><a href="contact.html" class="c-btn -fill">事業について相談する</a></div>
    </div>
  </section>
"""

NEWS = [
    {"slug":"news-20260707","date":"2026-07-07","disp":"2026.07.07","cat":"お知らせ","title":"ホームページを新設しました",
     "body":["このたび、株式会社Revengeのコーポレートサイトを新設・公開いたしました。","事業内容や会社情報を掲載しております。今後も情報発信を充実してまいります。"]},
]

# ニュースは WordPress（config.js の MISIMA_WP_BASE）で運用。
# 一覧(.p-top-news__list)は loadWpNews() が WP投稿で差し替える。
# 下記は WP未到達 / JS無効時のフォールバック（リンク切れを作らない案内文）。
NEWS_FALLBACK = ('<li class="p-top-news__item"><span class="p-top-news__link" '
                 'style="display:block;padding:var(--space-3) 0;color:var(--text-muted)">'
                 'ただいまニュースを準備中です。</span></li>')

def news_items_html(items, reveal):
    rc = " reveal" if reveal else ""
    out = []
    for n in items:
        out.append(
            f'<li class="p-top-news__item{rc}"><a class="p-top-news__link" href="{n["slug"]}.html">'
            f'<time class="p-top-news__date" datetime="{n["date"]}">{n["disp"]}</time>'
            f'<span class="c-label-category">{n["cat"]}</span>'
            f'<p class="p-top-news__title">{n["title"]}</p></a></li>')
    return "\n        ".join(out)

def news_detail_page(n):
    body = "".join(f"<p>{p}</p>\n          " for p in n["body"])
    return page_hero("News", n["title"], "", [("ニュース", "news.html"), (n["title"], n["slug"] + ".html")]) + f"""
  <section class="l-section">
    <div class="l-container">
      <div class="p-prose">
        <p class="p-news-meta"><time datetime="{n['date']}">{n['disp']}</time><span class="c-label-category">{n['cat']}</span></p>
        {body}
      </div>
      <div class="c-btn-wrap"><a href="news.html" class="c-btn">ニュース一覧へ戻る</a></div>
    </div>
  </section>
"""

news_body = page_hero("News", "ニュース一覧", "ミシマからのお知らせ・プレスリリース。",
    [("ニュース", "news.html")]) + f"""
  <section class="p-top-news l-section">
    <div class="l-container">
      <ul class="p-top-news__list" data-news-count="20">
        {NEWS_FALLBACK}
      </ul>
    </div>
  </section>
"""

recruit_body = page_hero("Recruit", "採用情報", "あなたの「働きたい」を、通信の現場で。",
    [("採用情報", "recruit.html")]) + """
  <section class="l-section">
    <div class="l-container">
      <div class="p-prose">
        <h2>ミシマで働く魅力</h2>
        <p>未経験からでも安心。充実した研修制度と資格取得支援で、通信業界のプロフェッショナルへと成長できます。全国各地に勤務地があり、ライフスタイルに合わせた働き方が可能です。</p>
      </div>
      <div class="p-stats" style="margin-top:2.5rem;">
        <div class="c-stat"><div class="c-stat__num">85<small>%</small></div><div class="c-stat__label">未経験スタート</div></div>
        <div class="c-stat"><div class="c-stat__num">120<small>名</small></div><div class="c-stat__label">年間採用実績</div></div>
        <div class="c-stat"><div class="c-stat__num">4<small>拠点</small></div><div class="c-stat__label">全国の勤務エリア</div></div>
        <div class="c-stat"><div class="c-stat__num">研修</div><div class="c-stat__label">入社時・資格支援あり</div></div>
      </div>
    </div>
  </section>
  <section class="l-section -soft">
    <div class="l-container">
      <div class="c-section-heading"><span class="c-section-heading__sub">Jobs</span><h2 class="c-section-heading__title">募集職種</h2></div>
      <div class="p-jobs">
        <div class="c-job-card"><div class="c-job-card__head"><span class="c-job-card__title">携帯ショップ販売スタッフ</span><span class="c-label-category">正社員／契約</span></div><dl><dt>仕事内容</dt><dd>携帯ショップでの接客・契約対応・各種プランのご案内</dd><dt>勤務地</dt><dd>東京・大阪・名古屋・福岡（希望考慮）</dd><dt>給与</dt><dd>月給 24万円〜＋各種手当・インセンティブ</dd></dl></div>
        <div class="c-job-card"><div class="c-job-card__head"><span class="c-job-card__title">コールセンタースタッフ</span><span class="c-label-category">契約／派遣</span></div><dl><dt>仕事内容</dt><dd>通信サービスに関するお問い合わせ対応・カスタマーサポート</dd><dt>勤務地</dt><dd>東京・大阪</dd><dt>給与</dt><dd>時給 1,400円〜／月給制も選択可</dd></dl></div>
        <div class="c-job-card"><div class="c-job-card__head"><span class="c-job-card__title">店舗運営マネージャー候補</span><span class="c-label-category">正社員</span></div><dl><dt>仕事内容</dt><dd>受託店舗の運営管理・スタッフ育成・売上管理</dd><dt>勤務地</dt><dd>全国の受託店舗</dd><dt>給与</dt><dd>月給 28万円〜＋役職手当</dd></dl></div>
      </div>
    </div>
  </section>
  <section class="l-section">
    <div class="l-container">
      <div class="c-section-heading"><span class="c-section-heading__sub">Organization</span><h2 class="c-section-heading__title">組織情報</h2></div>
      <div class="p-stats">
        <div class="c-stat"><div class="c-stat__num">1,200<small>名</small></div><div class="c-stat__label">従業員数（スタッフ含む）</div></div>
        <div class="c-stat"><div class="c-stat__num">38<small>歳</small></div><div class="c-stat__label">平均年齢</div></div>
        <div class="c-stat"><div class="c-stat__num">52<small>%</small></div><div class="c-stat__label">女性比率</div></div>
        <div class="c-stat"><div class="c-stat__num">7.2<small>年</small></div><div class="c-stat__label">平均勤続年数</div></div>
      </div>
      <div class="p-prose" style="margin-top:3rem;">
        <h2>組織体制</h2>
        <p>ミシマは、営業部門・運営部門・採用/教育部門・管理部門の4部門体制で事業を運営しています。各拠点（東京本社・大阪支社・名古屋営業所・福岡営業所）が地域の人材ニーズに密着し、本社の研修センターが全社の人材育成を支えています。</p>
        <h3>主な部門</h3>
        <ul class="-bullets">
          <li><strong>営業部門</strong>：通信キャリア・量販店などのクライアント対応、提案</li>
          <li><strong>運営部門</strong>：受託店舗の運営管理、スタッフマネジメント</li>
          <li><strong>採用・教育部門</strong>：採用活動、研修プログラムの企画・運営</li>
          <li><strong>管理部門</strong>：人事・労務・経理・総務</li>
        </ul>
        <h2>働く環境・福利厚生</h2>
        <ul class="-bullets">
          <li>各種社会保険完備／交通費支給</li>
          <li>入社時研修・資格取得支援制度</li>
          <li>昇給・賞与（業績連動）</li>
          <li>産休・育休制度、復職支援</li>
          <li>勤務地・働き方の選択制度</li>
        </ul>
      </div>
      <div class="c-btn-wrap"><a href="contact.html" class="c-btn -fill">エントリー・お問い合わせ</a></div>
    </div>
  </section>
"""

contact_body = page_hero("Contact", "お問い合わせ", "セールスプロモーション・BPO・教育研修に関するご相談など、お気軽にお問い合わせください。企業様・お取引をご検討いただいている皆様からのご相談をお待ちしております。",
    [("お問い合わせ", "contact.html")]) + """
  <section class="l-section">
    <div class="l-container">
      <form class="p-form" id="contactForm" action="contact.php" method="post" novalidate>
        <div aria-hidden="true" style="position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden"><label>サイト（未記入）<input type="text" name="website" tabindex="-1" autocomplete="off" /></label></div>
        <label><span class="p-form__label">会社名</span><input type="text" name="company" placeholder="株式会社〇〇" /></label>
        <label><span class="p-form__label">お名前<span class="p-form__req">必須</span></span><input type="text" name="name" required placeholder="山田 太郎" /></label>
        <label><span class="p-form__label">お問い合わせ種別</span>
          <select name="type"><option value="promotion">セールスプロモーションについて</option><option value="bpo">BPO事業について</option><option value="training">教育・研修事業について</option><option value="digital">デジタルソリューションについて</option><option value="other">その他</option></select>
        </label>
        <label><span class="p-form__label">メールアドレス<span class="p-form__req">必須</span></span><input type="email" name="email" required placeholder="example@example.com" /></label>
        <label><span class="p-form__label">お問い合わせ内容<span class="p-form__req">必須</span></span><textarea name="message" rows="6" required placeholder="お問い合わせ内容をご記入ください"></textarea></label>
        <button type="submit" class="c-btn -fill -full">送信する</button>
        <p class="p-form__note" id="formNote" role="status"></p>
      </form>
      <p class="p-lead-text" style="margin-top:1.5rem;">メールでのお問い合わせ：<strong><a href="mailto:info@revenge.co.jp">info@revenge.co.jp</a></strong>（受付時間 平日 9:00〜18:00）</p>
    </div>
  </section>
"""

def legal(title, sub, crumb_label, slug, sections):
    parts = []
    for h, ps in sections:
        if h:
            parts.append(f"<h2>{h}</h2>\n")
        # 「<」で始まる要素（<ul> など）はそのまま、それ以外は段落として <p> で包む
        parts.extend((p + "\n") if p.lstrip().startswith("<") else f"<p>{p}</p>\n" for p in ps)
    body = "".join(parts)
    return page_hero(sub, title, "", [("その他", "#"), (crumb_label, slug)]) + f"""
  <section class="l-section">
    <div class="l-container">
      <div class="p-prose">
        <p class="p-prose__updated">制定日：2026年7月7日　株式会社Revenge</p>
        {body}
      </div>
    </div>
  </section>
"""

privacy_body = legal("プライバシーポリシー","Privacy Policy","プライバシーポリシー","privacy.html",[
    ("",["株式会社Revenge（以下「当社」といいます。）は、セールスプロモーション事業、BPO事業及び教育・研修事業を展開しております。当社は、お客様、お取引先様、採用応募者様及び従業員等の個人情報を適切に保護することが社会的責任であると認識し、個人情報の保護に関する法律その他関係法令を遵守するとともに、以下の方針に基づき個人情報を適切に取り扱います。"]),
    ("1. 法令等の遵守",["当社は、個人情報の保護に関する法律その他関係法令及びガイドラインを遵守し、個人情報を適切に取り扱います。"]),
    ("2. 個人情報の取得・利用",[
        "当社は、適法かつ公正な手段により個人情報を取得し、以下の目的の範囲内で利用いたします。",
        '<ul class="-bullets"><li>お問い合わせへの対応</li><li>お取引に関する連絡および契約手続き</li><li>セールスプロモーション事業の運営</li><li>BPO事業の運営</li><li>教育・研修事業の運営</li><li>採用活動および採用選考</li><li>法令に基づく対応</li><li>その他、上記に付随する業務</li></ul>',
    ]),
    ("3. 第三者提供",["当社は、法令に基づく場合を除き、ご本人の同意なく個人情報を第三者へ提供いたしません。"]),
    ("4. 安全管理",["当社は、個人情報の漏えい、紛失、破壊、改ざん及び不正アクセス等を防止するため、必要かつ適切な安全管理措置を講じます。"]),
    ("5. 委託先の管理",["当社は、業務遂行上、個人情報の取扱いを外部へ委託する場合には、委託先を適切に選定し、必要かつ適切な監督を行います。"]),
    ("6. 開示・訂正・利用停止等",["当社は、ご本人から自己の個人情報について開示、訂正、追加、削除又は利用停止等の請求があった場合には、法令に基づき適切に対応いたします。"]),
    ("7. お問い合わせ窓口",["個人情報の取扱いに関するお問い合わせは、下記までご連絡ください。<br>株式会社Revenge<br>メールアドレス：info@revenge.co.jp"]),
])
security_body = legal("情報セキュリティ基本方針","Information Security","情報セキュリティ基本方針","security.html",[
    ("",["株式会社Revenge（以下「当社」といいます。）は、お客様、お取引先様及び従業員等からお預かりした情報資産を適切に保護し、安全かつ信頼性の高いサービスを提供するため、情報セキュリティの重要性を認識し、以下の基本方針を定めます。"]),
    ("1. 目的",["当社は、お客様及びお取引先様からお預かりした情報資産並びに当社が保有する情報資産を適切に保護し、安全かつ信頼性の高い事業運営を行うことを目的とします。"]),
    ("2. 情報資産の管理",["当社は、情報資産の機密性、完全性及び可用性を確保するため、適切な管理体制を整備し、不正アクセス、漏えい、紛失、破壊及び改ざん等の防止に努めます。"]),
    ("3. 法令等の遵守",["当社は、情報セキュリティに関する法令、ガイドラインその他関係規範を遵守し、適切な情報管理を行います。"]),
    ("4. 安全管理措置",["当社は、情報資産の重要性に応じて、人的・物理的・技術的・組織的な安全管理措置を講じ、情報セキュリティの維持・向上に努めます。"]),
    ("5. 教育・啓発",["当社は、役員及び従業員に対し、情報セキュリティに関する教育及び啓発を継続的に実施し、情報セキュリティ意識の向上を図ります。"]),
    ("6. インシデントへの対応",["当社は、情報漏えいその他情報セキュリティ上の事故が発生した場合には、速やかに原因究明及び再発防止策を講じ、必要に応じて適切な対応を行います。"]),
    ("7. 継続的改善",["当社は、本基本方針及び情報セキュリティ管理体制について、社会情勢や事業環境の変化に応じて定期的に見直しを行い、継続的な改善に努めます。"]),
])
sitepolicy_body = legal("サイトポリシー","Site Policy","サイトポリシー","sitepolicy.html",[
    ("",["本ウェブサイト（以下「本サイト」といいます。）は、株式会社Revenge（以下「当社」といいます。）が運営しております。本サイトをご利用いただく際は、本サイトポリシーをご確認いただき、ご同意のうえご利用ください。"]),
    ("1. 本サイトに掲載されている情報について",["当社は、本サイトに掲載する情報について、正確性及び最新性の確保に努めておりますが、その完全性、正確性、有用性等を保証するものではありません。本サイトの利用又は掲載情報に基づいて生じたいかなる損害についても、当社に故意又は重大な過失がある場合を除き、責任を負いかねます。"]),
    ("2. 個人情報の収集について",["本サイトでは、お問い合わせフォーム等を通じて、お客様、お取引先様及び採用応募者様の氏名、電話番号、メールアドレスその他必要な個人情報を取得する場合があります。取得した個人情報は、当社のプライバシーポリシーに基づき適切に管理いたします。"]),
    ("3. 個人情報の利用目的",[
        "取得した個人情報は、以下の目的のために利用いたします。",
        '<ul class="-bullets"><li>お問い合わせへの対応</li><li>お取引に関するご連絡及び契約手続き</li><li>セールスプロモーション事業の運営</li><li>BPO事業の運営</li><li>教育・研修事業の運営</li><li>採用活動及び採用選考</li><li>その他、上記に付随する業務</li></ul>',
    ]),
    ("4. 個人情報の管理",["当社は、取得した個人情報について、不正アクセス、漏えい、紛失、改ざん等を防止するため、適切な安全管理措置を講じます。"]),
    ("5. 著作権について",["本サイトに掲載されている文章、画像、ロゴ、デザインその他すべてのコンテンツに関する著作権その他の知的財産権は、当社又は正当な権利を有する第三者に帰属します。当社の事前承諾なく、複製、転載、改変、配布その他これらに類する行為を行うことを禁止します。"]),
    ("6. Cookieについて",["本サイトでは、利便性の向上及び利用状況の分析を目的としてCookieを利用する場合があります。Cookieにより個人を特定できる情報を取得することはありません。なお、お客様はブラウザの設定によりCookieの利用を拒否することができますが、その場合、本サイトの一部機能をご利用いただけない場合があります。"]),
    ("7. Googleアナリティクスについて",["本サイトでは、サービス向上及び利用状況の分析を目的としてGoogleアナリティクスを利用する場合があります。Googleアナリティクスによるデータの収集及び利用については、Google社の利用規約及びプライバシーポリシーに基づき行われます。"]),
    ("8. 本サイトポリシーの変更",["当社は、法令の改正又は事業内容の変更等に応じて、本サイトポリシーを予告なく変更する場合があります。変更後の内容は、本サイトへ掲載した時点で効力を生じるものとします。"]),
])

# ================================================================ BUILD
# サービスのカード/詳細をビルダー出力へ差し込み
index_body = index_body.replace("__SVC_CARDS__", svc_cards(SERVICES, True))
services_body = services_body.replace("__SVC_CARDS__", svc_cards(SERVICES, False))
# トップのニュース：WordPress運用。JS(loadWpNews)がWP投稿で差し替える。
# 初期HTMLはWP未到達/JS無効時のフォールバック文言。
index_body = index_body.replace("__NEWS_TOP__", NEWS_FALLBACK)

pages = [
    ("index.html","人生を変えるきっかけを｜株式会社Revenge","株式会社Revenge — セールスプロモーション事業・BPO事業・教育／研修事業を展開。通信業界を中心に、企業の売上向上と人・組織の成長を支援します。","top",index_body),
    ("message.html","代表メッセージ","株式会社ミシマ 代表メッセージ。","company",message_body),
    ("purpose.html","社名の由来","株式会社ミシマの社名の由来。","company",purpose_body),
    ("profile.html","会社概要","株式会社ミシマの会社概要。","company",profile_body),
    ("services.html","事業内容","通信業界に特化した販売支援・営業支援BPO。","services",services_body),
    ("news.html","ニュース一覧","ミシマからのお知らせ・プレスリリース。","news",news_body),
    ("contact.html","お問い合わせ","株式会社ミシマへのお問い合わせ。","contact",contact_body),
    ("privacy.html","プライバシーポリシー","株式会社ミシマのプライバシーポリシー。","policy",privacy_body),
    ("security.html","情報セキュリティ基本方針","株式会社ミシマの情報セキュリティ基本方針。","policy",security_body),
    ("sitepolicy.html","サイトポリシー","株式会社ミシマのサイトポリシー。","policy",sitepolicy_body),
]
for _s in SERVICES:
    pages.append(("service/" + _s["slug"] + ".html", _s["title"], _s["title"] + "の詳細｜通信業界専門の人材サービス。", "services", svc_detail_page(_s)))
# デジタルソリューションの個別LP（lp/<slug>.html）
#   運用：LPは別環境でブラッシュアップして戻す方針のため、gen.py は「まだ無いLPだけ」スタブ生成する。
#   既存のLP（手動で磨いた版）は上書きしない＝保持。作り直したいときは該当ファイルを削除してから再生成。
#   ※ 既存LPも sitemap には自動で載る（sitemapはファイル実走査）／ヘッダーは main.js が自動注入。
for _p in PACKAGES:
    _lp_path = os.path.join(OUT, "lp", _p["slug"] + ".html")
    if os.path.exists(_lp_path):
        print("keep lp/%s.html (既存を保持＝手動ブラッシュアップ分)" % _p["slug"])
        continue
    pages.append(("lp/" + _p["slug"] + ".html", _p["name"] + "｜デジタルソリューション事業",
                  _p["summary"], "services", lp_page(_p)))
# ニュース詳細ページは生成しない（WordPress運用に一本化）。記事はWP側のURLで公開。

for name, title, desc, cur, body in pages:
    html = head(title, desc, name, cur) + header(cur) + "\n  <main class=\"l-main\">\n" + body + "\n  </main>\n" + footer() + "\n"
    # キャッシュ更新はサーバの ETag / Last-Modified（更新日時）による再検証に任せる。
    # 以前は CSS/JS のハッシュを ?v= で全HTMLに焼き込んでいたが、それだとアセットを
    # 1つ変えるたびに全HTMLの ?v= が変わり「全ファイル差し替え」になっていたため廃止。
    # これで css/js を変えても HTML は一切変わらない（例：ヘッダー変更は main.js のみ）。
    up = "../" * name.count("/")          # サブフォルダ階層ぶんの相対プレフィックス
    write(name, relink(rebrand(html), up))
print("done:", len(pages), "pages")

# ================================================================ SEO/AIO 補助ファイル（ブラウザ非表示）
# robots.txt：全許可＋AIクローラを明示許可（AIO）＋sitemap参照
_AI_BOTS = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-Web",
            "anthropic-ai", "PerplexityBot", "Perplexity-User", "Google-Extended",
            "Applebot-Extended", "Bytespider", "CCBot", "Amazonbot", "cohere-ai", "Meta-ExternalAgent"]
robots = "User-agent: *\nAllow: /\n\n# AIクローラを明示的に許可（AIO対策）\n"
robots += "".join("User-agent: %s\nAllow: /\n\n" % b for b in _AI_BOTS)
robots += "Sitemap: %s/sitemap.xml\n" % SITE
robots += "Sitemap: %s/wp/wp-sitemap.xml\n" % SITE   # WordPress(投稿)側のサイトマップ
write("robots.txt", robots)

# sitemap.xml：出力フォルダ内の *.html を「実際に走査」して自動生成する。
#   → 静的ページを増やすだけ（pages に足す／将来 lp/ 等にHTMLを置く）で、再生成時に自動で載る。
#     URLの手書き追記は不要。lastmod は各HTMLファイルの更新日時から自動設定（日付の手入力も不要）。
import datetime

# サイトマップに含めない（公開ページでない）フォルダ
_SITEMAP_SKIP_DIRS = {"wp", ".git", ".claude", "node_modules", "docs", "assets"}

def _sitemap_priority(rel):
    if rel == "index.html":
        return "1.0"
    # サブフォルダ配下の詳細ページ（service/ news/ lp/ 等）と主要ナビは高め
    if "/" in rel or rel in ("services.html", "news.html", "message.html", "purpose.html", "profile.html"):
        return "0.8"
    return "0.5"

def _collect_html(root):
    found = []
    for dirpath, dirnames, filenames in os.walk(root):
        # 隠しフォルダ・非公開フォルダは辿らない
        dirnames[:] = [d for d in dirnames if d not in _SITEMAP_SKIP_DIRS and not d.startswith(".")]
        for fn in filenames:
            if fn.endswith(".html"):
                full = os.path.join(dirpath, fn)
                rel = os.path.relpath(full, root).replace(os.sep, "/")
                found.append((rel, full))
    # index.html を先頭に、あとはパス順で安定ソート
    return sorted(found, key=lambda x: (x[0] != "index.html", x[0]))

sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
_page_count = 0
for rel, full in _collect_html(OUT):
    lastmod = datetime.date.fromtimestamp(os.path.getmtime(full)).isoformat()
    sm += ("  <url>\n    <loc>%s</loc>\n    <lastmod>%s</lastmod>\n"
           "    <changefreq>weekly</changefreq>\n    <priority>%s</priority>\n  </url>\n"
           % (_abs(rel), lastmod, _sitemap_priority(rel)))
    _page_count += 1
sm += "</urlset>\n"
write("sitemap.xml", sm)
print("sitemap.xml:", _page_count, "URLs (auto-scanned)")

# llms.txt：LLM向けサイト要約（AIO標準フォーマット）
def _llm_link(label, path, note):
    return "- [%s](%s): %s" % (label, _abs(path), note)
_pt = {p[0]: (p[1], p[2]) for p in pages}
llms = "\n".join([
    "# 株式会社Revenge（Re:venge）",
    "",
    "> " + ORG_DESC,
    "",
    "鹿児島県指宿市を拠点とする企業。代表取締役社長：今別府 尭。設立：2026年7月。"
    "事業内容：セールスプロモーション事業／BPO事業／教育・研修事業。対応エリア：全国。"
    "お問い合わせ：info@revenge.co.jp",
    "",
    "## 会社情報",
    _llm_link("代表メッセージ", "message.html", "代表取締役からのメッセージ"),
    _llm_link("社名の由来", "purpose.html", "社名・ブランドに込めた思い"),
    _llm_link("会社概要", "profile.html", "会社名・所在地・設立・資本金などの基本情報"),
    "",
    "## 事業",
    _llm_link("事業内容", "services.html", "4事業の概要"),
    _llm_link("セールスプロモーション事業", "service/service-01.html", "販売支援・営業支援"),
    _llm_link("BPO事業", "service/service-02.html", "業務請負・アウトソーシング"),
    _llm_link("教育・研修事業", "service/service-03.html", "人材育成・研修"),
    _llm_link("デジタルソリューション事業", "service/service-04.html", "HP制作・埋め込みRAG・イベント運営システム・新規開発"),
    "",
    "## デジタルソリューション（LP）",
] + [
    _llm_link(_p["name"], "lp/" + _p["slug"] + ".html", _p["summary"]) for _p in PACKAGES
] + [
    "",
    "## その他",
    _llm_link("ニュース", "news.html", "お知らせ・プレスリリース"),
    _llm_link("お問い合わせ", "contact.html", "お問い合わせフォーム"),
    _llm_link("プライバシーポリシー", "privacy.html", "個人情報の取り扱い"),
    "",
]) + "\n"
write("llms.txt", rebrand(llms))
print("done: robots.txt, sitemap.xml, llms.txt")
