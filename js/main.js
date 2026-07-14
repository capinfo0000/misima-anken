/* ============================================================
   株式会社Revenge — サイトの動き（インタラクション）全部入り
   ------------------------------------------------------------
   このファイルは全ページ共通で読み込まれます。
   各機能は「対象の要素がページに在るときだけ動く」よう、
   先頭で querySelector して if で存在チェックしてから処理します。
   （例：ヒーローは index だけ、問い合わせフォームは contact だけ）

   ■ 主な機能（上から順に登場）
     1. 読み込み時は必ずページ最上部から始める
     2. ヘッダーの縮小／スクロールで隠す／ページトップへ戻る
     3. ローダー（花のくるくる）を一定時間で消す
     4. トップの固定ヒーロー演出（失敗→再挑戦→複合→矢印→5行→キャッチ）
     5. スマホのナビ開閉／会社情報ドロップダウン
     6. スクロールで要素をふわっと表示（reveal）＋数値カウントアップ
     7. 問い合わせフォーム送信＋結果モーダル
     8. WordPress（任意）からニュースを差し込む

   ※ 全体を即時関数(IIFE)で包み、"use strict" で安全に。
     変数がグローバルに漏れないようにするための定番の書き方です。
   ============================================================ */
(function () {
  "use strict";

  /* ============================================================
     0. 共有ヘッダーを注入（全ページ共通・ヘッダーの「正」はこの main.js）
     ------------------------------------------------------------
     ヘッダーの中身をこの main.js が持ち、各ページに焼き込まれた
     ヘッダー（<header class="l-header"> の中身）を、読み込み時に
     最新版へまるごと差し替える。
       → 今後ヘッダーを変えたいときは、この main.js だけ差し替えれば
         全ページに反映される（HTMLを1枚ずつ直す必要がない）。
     ・各HTMLに焼き込まれたヘッダーは、JS 無効時やクローラ向けの
       フォールバックとして残している（見た目は同じ）。
     ・サブフォルダ（service/ など）でもリンクが壊れないよう、
       既存ロゴリンクの href から相対パス接頭辞（"" か "../"）を読み取る。
     ※ この後の「ヘッダー縮小」「ナビ開閉」等が要素を取得する前に
       実行する必要があるため、いちばん最初に置く。
     ============================================================ */
  (function injectSharedHeader() {
    var headerEl = document.querySelector(".l-header");
    if (!headerEl) return;                       // ヘッダーが無いページは何もしない

    // 相対パス接頭辞（"" か "../"）を既存ロゴリンクの href から読み取る
    var logoLink = headerEl.querySelector(".l-header__logo a");
    var href = logoLink ? (logoLink.getAttribute("href") || "index.html") : "index.html";
    var idx = href.lastIndexOf("index.html");
    var base = idx >= 0 ? href.slice(0, idx) : "";   // 例: "../index.html" → "../"

    // 現在ページ（ファイル名）から、どのメニューを現在地表示にするか決める
    var file = (location.pathname.split("/").pop() || "index.html");
    var isCompany  = (file === "message.html" || file === "purpose.html" || file === "profile.html");
    var isServices = (file === "services.html" || /^service-\d/.test(file));
    var isNews     = (file.indexOf("news") === 0);
    var isPolicy   = (file === "security.html" || file === "sitepolicy.html" || file === "privacy.html");
    var sub = function (on) { return on ? " is-current" : ""; };   // ドロップダウン<li>用
    var lnk = function (on) { return on ? "is-current" : ""; };    // 単独リンク<a>用

    headerEl.innerHTML =
      '<div class="l-header__inner">' +
        '<p class="l-header__logo"><a href="' + base + 'index.html" aria-label="株式会社Revenge ホーム"><span class="l-header__mark" aria-hidden="true"></span><span class="l-header__word">Re:venge</span></a></p>' +
        '<nav class="p-global-nav" id="globalNav" aria-label="メインナビゲーション">' +
          '<ul class="p-global-nav__list">' +
            '<li class="p-global-nav__item has-sub' + sub(isCompany) + '">' +
              '<button class="p-global-nav__parent" aria-expanded="false">会社情報</button>' +
              '<ul class="p-global-nav__sub">' +
                '<li><a href="' + base + 'message.html">代表メッセージ</a></li>' +
                '<li><a href="' + base + 'purpose.html">社名の由来</a></li>' +
                '<li><a href="' + base + 'profile.html">会社概要</a></li>' +
              '</ul>' +
            '</li>' +
            '<li class="p-global-nav__item"><a href="' + base + 'services.html" class="' + lnk(isServices) + '">事業内容</a></li>' +
            '<li class="p-global-nav__item"><a href="' + base + 'news.html" class="' + lnk(isNews) + '">ニュース</a></li>' +
            '<li class="p-global-nav__item has-sub' + sub(isPolicy) + '">' +
              '<button class="p-global-nav__parent" aria-expanded="false">ポリシー</button>' +
              '<ul class="p-global-nav__sub">' +
                '<li><a href="' + base + 'security.html">情報セキュリティ基本方針</a></li>' +
                '<li><a href="' + base + 'sitepolicy.html">サイトポリシー</a></li>' +
                '<li><a href="' + base + 'privacy.html">プライバシーポリシー</a></li>' +
              '</ul>' +
            '</li>' +
            '<li class="p-global-nav__item"><a href="' + base + 'contact.html" class="p-global-nav__cta">お問い合わせ</a></li>' +
          '</ul>' +
        '</nav>' +
        '<button class="c-hamburger-btn" aria-controls="globalNav" aria-expanded="false" aria-label="メニューを開く">' +
          '<span></span><span></span><span></span>' +
        '</button>' +
      '</div>';
  })();

  /* ============================================================
     1. 再読み込み時は必ず最上部から
     ------------------------------------------------------------
     ブラウザは前回のスクロール位置を復元することがあるので、
     それを止めて (0,0) に固定する。ヒーロー演出が途中から
     始まってしまうのを防ぐ。
     ============================================================ */
  if ("scrollRestoration" in history) { try { history.scrollRestoration = "manual"; } catch (e) {} }
  window.scrollTo(0, 0);
  window.addEventListener("load", function () { window.scrollTo(0, 0); });
  window.addEventListener("pageshow", function () { window.scrollTo(0, 0); });

  /* ============================================================
     2. ヘッダー：スクロールで縮小／下スクロールで隠す／トップへ戻る
     ------------------------------------------------------------
     header … 固定ヘッダー要素（全ページに在る）
     toTop  … 「↑ページトップ」ボタン（全ページに在る）
     lastY  … 直前のスクロール位置。今回との差で「上/下どちらへ動いたか」を判定
     ============================================================ */
  var header = document.querySelector(".l-header");
  var toTop = document.querySelector(".c-to-top");

  var lastY = 0;                                   // 直前のスクロールY（onScroll で更新）
  function onScroll() {
    var y = window.scrollY;                         // 今のスクロール位置
    if (header) {
      header.classList.toggle("is-scrolled", y > 20);                 // 少し下げたらヘッダーを縮小
      var denom = document.documentElement.scrollHeight - window.innerHeight; // スクロール可能な総量
      header.style.setProperty("--scrollp", denom > 0 ? Math.min(1, y / denom) : 0); // 進捗ライン(0〜1)
      if (y > 240 && y > lastY + 4) header.classList.add("is-hidden");        // 下へ動いた→隠す
      else if (y < lastY - 4 || y < 240) header.classList.remove("is-hidden"); // 上へ動いた/最上部→表示
    }
    if (toTop) toTop.classList.toggle("is-visible", y > 600);         // 600px超で「↑」を出す
    lastY = y;                                                        // 次回比較用に記録
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();                                       // 初期状態を反映

  if (toTop) {
    toTop.addEventListener("click", function (e) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });   // 「↑」でなめらかに最上部へ
    });
  }

  /* ============================================================
     3. ローダー（花のくるくる）
     ------------------------------------------------------------
     loader … 全画面のローディング要素（index のヒーロー時のみDOMに在る）
     花が1回転（=0.8秒）し終わる少しあと(850ms)に is-loaded を付けて消す。
     ============================================================ */
  var loader = document.querySelector(".c-loader");
  if (loader) {
    var hideLoader = function () { loader.classList.add("is-loaded"); };
    setTimeout(hideLoader, 850);
  }

  /* ============================================================
     4. トップの固定ヒーロー演出（index だけ）
     ------------------------------------------------------------
     ページを開くと画面を固定し、下記の段階を順に見せる：
       ①失敗 →(スクロール)→ ②再挑戦 →(スクロール)→ ③複合
       →(0.5秒後に自動)→ ④矢印 →(スクロール)→ ⑤5行が自動で流れる
       →(出そろってからスクロール)→ ⑥キャッチ →(スクロール)→ 本編へ解放
     5行の自動表示中はスクロールしても遷移しない（出そろうまでロック）。

     ■ ヒーローで使う主な変数（この if ブロック内で定義）
       hero        … 固定ヒーロー要素（この機能の入口）
       heroLines   … 5行の各行要素（自動表示する対象）
       heroCatch   … 最後の「THE NEXT STAGE」キャッチ要素
       heroMorph   … 失敗/再挑戦/複合/矢印を描くモーフ領域
       stackBtmEl  … モーフ下段（文字を入力/消去する箱）
       first/second… 下段に打つ語（data属性から取得。既定は "再挑戦"）
       ── 非 reduced-motion 時のスクロール制御（L『state』以降で定義）──
       mStep       … 今の段階（0=未開始, 1=失敗 … 6=キャッチ）
       mMax        … 最終段階の番号（=6）
       mBusy       … 遷移アニメ中/ロック中は true（true の間は入力を無視）
       mActive     … ヒーロー制御が有効か（解放後は false）
       mReachedCatch… キャッチ到達済みか（以降は戻さない）
       accum       … 溜めたスクロール量(px)。STEP_LEN 超で1段進む
       STEP_LEN    … 1段進むのに必要なスクロール量(px)
       NLINE       … 自動表示する行数（= heroLines の数, 通常5）
       LINE_GAP    … 5行を1行ずつ出す間隔(ms)
     ============================================================ */
  var hero = document.querySelector(".p-hero");
  if (hero) {
    /* --- (4-1) 英字キャッチを1文字ずつ span 化 ---
       CSSで「黒いカーペットから文字が現れ、数秒おきに虹色の波」を出すため、
       文字ごとに span(.p-hero__cch) を作り、--i(順番)と --lc(色) を付ける。 */
    var catchTexts = hero.querySelectorAll(".p-hero__catch-copy .p-hero__reveal-text");
    if (catchTexts.length) {
      var catchPal = ["#e60012", "#ed6d1f", "#f5a200", "#009944", "#41a1be", "#1d2088", "#601986", "#e95383"];
      var ci = 0;                                   // 文字の通し番号（--i に使う）
      Array.prototype.forEach.call(catchTexts, function (rt) {
        var txt = rt.textContent;
        rt.textContent = "";
        Array.prototype.forEach.call(txt, function (ch) {
          var s = document.createElement("span");
          s.className = "p-hero__cch";
          s.textContent = ch;
          if (ch === " ") s.style.width = ".28em";
          s.style.setProperty("--i", ci);
          s.style.setProperty("--lc", catchPal[ci % catchPal.length]);
          rt.appendChild(s);
          ci++;
        });
        ci++; // 行間もインデックスを1つ空けて、波を連続的に見せる
      });
    }

    /* --- (4-2) 5行のコピーも1文字ずつ span 化（虹色→黒の settle 表示用） --- */
    var heroLines = hero.querySelectorAll(".p-hero__line");   // 5行の各行（自動表示の対象）
    var linePalette = ["#e60012", "#ed6d1f", "#f5a200", "#009944", "#41a1be", "#1d2088", "#601986", "#e95383"];
    Array.prototype.forEach.call(heroLines, function (line) {
      var it = line.querySelector("i");
      if (!it) return;
      var txt = it.textContent;
      it.textContent = "";
      Array.prototype.forEach.call(txt, function (ch, k) {
        var s = document.createElement("span");
        s.className = "p-hero__lch";
        s.textContent = ch;
        if (ch === " ") s.style.width = ".3em";
        s.style.setProperty("--i", k);
        s.style.setProperty("--lc", linePalette[k % linePalette.length]);
        it.appendChild(s);
      });
    });

    /* --- (4-3) ヒーロー内の主要要素を取得 --- */
    var heroCatch = hero.querySelector(".p-hero__catch");        // 最後のキャッチ
    var heroMorph = hero.querySelector(".p-hero__morph");        // 失敗/再挑戦/複合/矢印の描画領域
    var stackTopEl = hero.querySelector(".p-hero__stack-top");   // スタック上段（失敗）
    var stackBtmEl = hero.querySelector(".p-hero__stack-btm");   // スタック下段（文字を打つ箱）
    var stackCaret = stackBtmEl ? stackBtmEl.querySelector(".p-hero__caret") : null; // 入力カーソル
    var stackPal = ["#e60012", "#ed6d1f", "#f5a200", "#009944", "#41a1be", "#1d2088", "#601986", "#e95383"];

    /* 語を1文字ずつ .p-hero__sch にして --i/--lc を付与（矢印ぶん index を1つ空ける） */
    var buildSch = function (el, txt, start) {
      if (!el) return;
      el.textContent = "";
      Array.prototype.forEach.call(txt, function (ch, k) {
        var s = document.createElement("span");
        s.className = "p-hero__sch";
        s.textContent = ch;
        s.style.setProperty("--i", start + k);
        s.style.setProperty("--lc", stackPal[(start + k) % stackPal.length]);
        el.appendChild(s);
      });
    };
    if (stackTopEl) buildSch(stackTopEl, stackTopEl.textContent, 0); // 上段「失敗」= index 0,1

    var heroReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches; // 動きを減らす設定か
    hero.classList.add("is-play"); // 読み込み時に虹色バーのフリップを再生

    /* --- (4-4) モーフ演出の部品（①〜④を作る関数群） ---
       first/second … 下段に打つ語（HTMLの data-first/data-second。既定は "再挑戦"）
       morphTimers   … このブロックで使う全 setTimeout の id 置き場（まとめて中止できる）
       T()           … タイマーを登録しつつ id を morphTimers に記録するヘルパ
       clearMorphTimers() … 登録済みタイマーを全部止める */
    var first = stackBtmEl ? (stackBtmEl.getAttribute("data-first") || "") : "";
    var second = stackBtmEl ? (stackBtmEl.getAttribute("data-second") || "再挑戦") : "再挑戦";
    var morphTimers = [];
    var T = function (fn, ms) { var id = setTimeout(fn, ms); morphTimers.push(id); return id; };
    var clearMorphTimers = function () { morphTimers.forEach(clearTimeout); morphTimers = []; };

    // 下段に文字を1つ挿入（黒文字。カーソルの前へ）
    var addChar = function (ch, idx) {
      var s = document.createElement("span");
      s.className = "p-hero__tch";
      s.textContent = ch;
      s.style.setProperty("--lc", stackPal[idx % stackPal.length]);
      s.style.setProperty("--k", idx);
      if (stackCaret && stackCaret.parentNode === stackBtmEl) stackBtmEl.insertBefore(s, stackCaret);
      else if (stackBtmEl) stackBtmEl.appendChild(s);
    };
    // 下段の最後の1文字を消す（あれば true）
    var delLast = function () {
      if (!stackBtmEl) return false;
      var spans = stackBtmEl.querySelectorAll(".p-hero__tch");
      if (spans.length) { stackBtmEl.removeChild(spans[spans.length - 1]); return true; }
      return false;
    };
    // 語を1文字ずつ「入力」する（340ms間隔）。打ち終わったら cb()
    var typeWord = function (word, cb) {
      var i = 0;
      var step = function () {
        if (i < word.length) {
          addChar(word[i], i);
          i++;
          T(step, 340);
        } else {
          cb();
        }
      };
      step();
    };
    // 入力済みの文字を後ろから1つずつ消す（120ms間隔）。消し終わったら cb()
    var clearWord = function (cb) {
      var step = function () {
        if (delLast()) T(step, 120);
        else cb();
      };
      step();
    };

    /* 段階の中身を作る4つの関数（done を呼ぶと「その段階の完成」を通知） */
    var stage1 = function (done) {                 // ①「失敗」を入力→虹の波を流し続ける
      heroMorph.classList.remove("is-typewave");
      typeWord(first, function () { heroMorph.classList.add("is-typewave"); done(); });
    };
    var stage2 = function (done) {                 // ②「失敗」を消去→「再挑戦」を入力→虹の波
      heroMorph.classList.remove("is-typewave");
      clearWord(function () { typeWord(second, function () { heroMorph.classList.add("is-typewave"); done(); }); });
    };
    var stage3 = function (done) {                 // ③「再挑戦」を消去→失敗/再挑戦のスタック出現
      heroMorph.classList.remove("is-typewave");
      clearWord(function () { T(function () {
        if (stackCaret && stackCaret.parentNode) stackCaret.parentNode.removeChild(stackCaret);
        if (stackBtmEl) buildSch(stackBtmEl, second, 3);
        heroMorph.classList.add("is-stack");
        done();
      }, 300); });
    };
    var stage4 = function (done) { heroMorph.classList.add("is-stack-full"); done(); }; // ④矢印を出す

    /* runStages：curStage を wantStage まで順に進める（1つ完成したら次へ）
       wantStage … どの段階まで見せたいか（goForward が設定）
       curStage  … 今どの段階まで完成しているか
       playing   … 段階アニメの実行中フラグ（多重起動を防ぐ） */
    var stageFns = [stage1, stage2, stage3, stage4];
    var wantStage = 0, curStage = 0, playing = false;
    var runStages = function () {
      if (playing || curStage >= wantStage || curStage >= 4) return;
      playing = true;
      var fn = stageFns[curStage];
      curStage++;
      fn(function () { playing = false; runStages(); });
    };
    // 速いスクロール等で途中を飛ばす場合、④まで即確定する
    var snapToStack = function () {
      if (curStage >= 4) return;
      clearMorphTimers();
      playing = true; curStage = 4; wantStage = 4;
      heroMorph.classList.remove("is-typewave");
      if (stackCaret && stackCaret.parentNode) stackCaret.parentNode.removeChild(stackCaret);
      if (stackBtmEl) buildSch(stackBtmEl, second, 3);
      heroMorph.classList.add("is-stack", "is-stack-full");
    };

    if (heroReduced) {
      /* --- 動きを減らす設定：演出せず、最終形（スタック＋キャッチ）を即表示 --- */
      if (stackBtmEl) buildSch(stackBtmEl, second, 3);
      if (heroMorph) heroMorph.classList.add("is-stack", "is-stack-full");
      if (heroCatch) heroCatch.classList.add("is-show");
    } else {
      /* ========================================================
         (4-5) スクロール制御（通常時）
         --------------------------------------------------------
         画面を固定（overflow:hidden）して、スクロール/スワイプ/キーで
         段階を1つずつ進める。5行だけは到達後に自動で流れる。
         ======================================================== */
      var docEl = document.documentElement;
      docEl.style.overflow = "hidden"; document.body.style.overflow = "hidden";
      hero.style.height = "100svh"; window.scrollTo(0, 0);

      /* 段階：①失敗(1) ②再挑戦(2) ③複合(3) ④矢印(4) ⑤5行(5) ⑥キャッチ(6) */
      var NLINE = heroLines.length;                 // 自動表示する行数（通常5行）
      var LINE_GAP = 700;                           // 5行を1行ずつ出す間隔(ms)
      var mStep = 0;                                // 今の段階（0=未開始〜6=キャッチ）
      var mMax = 6;                                 // 最終段階の番号
      var mBusy = false;                            // true の間は入力を無視（遷移中/5行の自動表示中）
      var mActive = true;                           // ヒーロー制御が有効か（解放後 false）
      var mReachedCatch = false;                    // キャッチ到達済みか（以降は戻さない）

      // 段階に合わせて背景を切り替える（data-bg。キャッチは背景なし）
      var setBg = function (step) {
        var v = step <= 1 ? "fail" : step === 2 ? "retry" : step <= 4 ? "stack" : step === 5 ? "lines" : "";
        if (v) hero.setAttribute("data-bg", v); else hero.removeAttribute("data-bg");
      };

      /* タイマー類：
         busyTimer     … 「一定時間後に mBusy を false に戻す」用
         autoArrowTimer… ③複合の完成後に④矢印を自動表示する用 */
      var busyTimer = null, autoArrowTimer = null;
      var clearBusyTimer = function () { if (busyTimer) { clearTimeout(busyTimer); busyTimer = null; } };
      var clearAutoArrow = function () { if (autoArrowTimer) { clearTimeout(autoArrowTimer); autoArrowTimer = null; } };

      // SCROLL↓インジケーター：操作待ち（遷移中でも自動待ちでもない）ときだけ表示
      var syncHint = function () { if (hero) hero.classList.toggle("is-scrollhint", mActive && !mBusy && !autoArrowTimer); };
      // ms 後に mBusy を解除して SCROLL↓ を出す（＝遷移アニメが終わるまでロック）
      var setBusyFalseAfter = function (ms) { clearBusyTimer(); busyTimer = setTimeout(function () { mBusy = false; syncHint(); }, ms); };

      /* 5行の表示ヘルパ：
         lineTimers            … 5行を出す setTimeout の置き場
         showLines(cnt)        … 先頭 cnt 行を即表示（戻る用）
         revealLinesStaggered()… 1行ずつ時間差で自動表示（本番用） */
      var lineTimers = [];
      var clearLineTimers = function () { for (var i = 0; i < lineTimers.length; i++) clearTimeout(lineTimers[i]); lineTimers = []; };
      var hideLines = function () { clearLineTimers(); for (var i = 0; i < heroLines.length; i++) heroLines[i].classList.remove("is-show"); };
      var showLines = function (cnt) { clearLineTimers(); for (var i = 0; i < heroLines.length; i++) heroLines[i].classList.toggle("is-show", i < cnt); };
      var revealLinesStaggered = function () {
        clearLineTimers();
        for (var i = 0; i < heroLines.length; i++) {
          (function (idx) { lineTimers.push(setTimeout(function () { heroLines[idx].classList.add("is-show"); }, idx * LINE_GAP)); })(i);
        }
      };

      // 戻る操作用：下段の語を黒文字で即描画（アニメ無し）
      var setWordPlain = function (word) {
        if (!stackBtmEl) return;
        stackBtmEl.innerHTML = "";
        Array.prototype.forEach.call(word, function (ch, k) {
          var s = document.createElement("span"); s.className = "p-hero__tch"; s.textContent = ch;
          s.style.setProperty("--lc", stackPal[k % stackPal.length]); s.style.setProperty("--k", k);
          stackBtmEl.appendChild(s);
        });
      };

      // 戻る：段階 n の見た目をアニメ無しで即座に作り直す
      var renderState = function (n) {
        clearMorphTimers(); clearAutoArrow(); clearBusyTimer();
        heroMorph.classList.remove("is-typewave", "is-stack", "is-stack-full");
        hero.classList.remove("is-lines", "is-catch");
        if (heroCatch) heroCatch.classList.remove("is-show");
        hideLines(); playing = false; setBg(n);
        if (n <= 1) { setWordPlain(first); curStage = 1; wantStage = 1; }
        else if (n === 2) { setWordPlain(second); curStage = 2; wantStage = 2; }
        else {
          if (stackBtmEl) { stackBtmEl.innerHTML = ""; buildSch(stackBtmEl, second, 3); }
          heroMorph.classList.add("is-stack");
          if (n >= 4) heroMorph.classList.add("is-stack-full");
          curStage = 4; wantStage = 4;
          if (n === 5) { hero.classList.add("is-lines"); showLines(NLINE); }   // 戻る時は5行すべて表示
          else if (n >= 6) { hero.classList.add("is-lines", "is-catch"); if (heroCatch) heroCatch.classList.add("is-show"); }
        }
        syncHint();
      };

      // 最後まで進んだら固定を解除して通常スクロール（本編）へ
      var release = function () {
        mActive = false; syncHint();
        docEl.style.overflow = ""; document.body.style.overflow = "";
        window.scrollTo(0, hero.offsetHeight);
      };

      /* goForward：1段進める本体（下方向の入力で呼ばれる）
         - mBusy 中は無視
         - 最終段まで来ていたら release()
         - ①〜④はモーフ（③到達で④矢印を0.5秒後に自動表示）
         - ⑤は5行を自動カスケード（出そろうまで mBusy=true でロック）
         - ⑥はキャッチ表示（以降は戻さない） */
      var goForward = function () {
        if (mBusy) return;
        if (mStep >= mMax) { release(); return; }
        clearAutoArrow();
        mBusy = true; syncHint(); mStep++; setBg(mStep);
        if (mStep <= 4) {                          // ①〜④モーフ
          hideLines(); hero.classList.remove("is-lines", "is-catch"); if (heroCatch) heroCatch.classList.remove("is-show");
          wantStage = mStep; runStages();
          if (mStep === 3) {                        // ③複合：出現アニメ(組み立て~0.7s＋fvStackBtm~1.55s)完了の0.5秒後に④矢印
            setBusyFalseAfter(2250);                // 複合が出そろうまでロック（この間ヒントも消える）
            autoArrowTimer = setTimeout(function () {
              if (mActive && mStep === 3) goForward();   // スクロール不要で自動表示
            }, 2750);
          } else {
            /* 失敗→再挑戦(②)は入力アニメが長いので長め。矢印(④)は短め */
            setBusyFalseAfter(mStep === 2 ? 2600 : 480);
          }
        } else if (mStep === 5) {                   // ⑤5行：1行ずつ自動で流れる（出そろうまでスクロール遷移をロック）
          if (curStage < 4) snapToStack();
          hero.classList.add("is-lines"); hero.classList.remove("is-catch"); if (heroCatch) heroCatch.classList.remove("is-show");
          revealLinesStaggered();
          var revealDone = (NLINE - 1) * LINE_GAP + 900; // 全行＋最終行アニメが出そろうまで
          clearBusyTimer();                          // revealDoneまで mBusy=true を維持＝自動表示中のスクロールは無視
          busyTimer = setTimeout(function () { mBusy = false; accum = 0; syncHint(); }, revealDone); // accum=下で定義
        } else {                                    // ⑥キャッチ
          if (curStage < 4) snapToStack();
          hideLines(); hero.classList.add("is-lines", "is-catch"); if (heroCatch) heroCatch.classList.add("is-show");
          mReachedCatch = true;                     // キャッチ到達＝以降は戻らない（リロードまで）
          setBusyFalseAfter(900);
        }
      };
      // goBack：1段戻す（キャッチ到達後や①より前へは戻さない）
      var goBack = function () { if (mBusy || mStep <= 1 || mReachedCatch) return; mStep--; renderState(mStep); };

      // ページ表示から少し置いて①失敗を自動表示（演出のスタート地点）
      setTimeout(function () { if (mStep === 0) { mStep = 1; wantStage = 1; setBg(1); runStages(); syncHint(); } }, 1150);

      /* --- 入力：タッチ（スマホ） ---
         sY … スワイプ開始Y、lastY … 直前Y（差分を accum に足していく）
         ※ lastY は上部(L『onScroll』)の lastY と同名だが、ここは触っている間だけ使う */
      var sY = null, lastY = null;
      window.addEventListener("touchstart", function (e) { if (mActive) { sY = lastY = e.touches[0].clientY; } }, { passive: true });
      window.addEventListener("touchmove", function (e) {
        if (!mActive) return;
        e.preventDefault();
        if (mStep < 2 || lastY == null) return;   // 失敗→再挑戦は touchend で1スワイプ＝1ステップ
        var y = e.touches[0].clientY;
        accum += (lastY - y);                      // 指を上へ動かす＝進む。ドラッグ量(長さ)を累積
        lastY = y;
        advanceByAccum();
      }, { passive: false });
      window.addEventListener("touchend", function (e) {
        if (!mActive || sY == null) return;
        var t = e.changedTouches && e.changedTouches[0];
        var dy = sY - (t ? t.clientY : sY);
        if (mStep < 2) { if (dy > 40) goForward(); else if (dy < -40) goBack(); } // 失敗→再挑戦：強制1ステップ
        sY = lastY = null;
      }, { passive: true });

      /* --- 入力：ホイール（PC） ---
         失敗→再挑戦(mStep<2)までは「1スクロール＝1ステップ」に制限（wheelLock）。
         再挑戦以降はスクロール量を accum に溜め、STEP_LEN 超えるごとに1段。
         wheelLock … 惰性スクロールで一気に進まないためのロック
         accum     … 溜めたスクロール量(px)
         STEP_LEN  … 1段進むのに必要な量(px) */
      var wheelLock = false, wheelTimer = null;
      var relockWheel = function () { clearTimeout(wheelTimer); wheelTimer = setTimeout(function () { wheelLock = false; }, 220); };
      var accum = 0, STEP_LEN = 90;
      var advanceByAccum = function () {           // 溜めた量で1段進める（5行の自動表示中は mBusy で弾かれる）
        if (mBusy) return;
        if (accum >= STEP_LEN) { accum -= STEP_LEN; goForward(); }
        else if (accum <= -STEP_LEN) { accum += STEP_LEN; goBack(); }
      };
      window.addEventListener("wheel", function (e) {
        if (!mActive) return;
        e.preventDefault();                       // ページの通常スクロールを止めて自前制御
        var strict = (mStep < 2);                 // 失敗→再挑戦までは強制1スクロール＝1ステップ
        if (strict) {
          accum = 0;
          if (mBusy) { relockWheel(); return; }
          if (wheelLock) { relockWheel(); return; } // 惰性でも1ステップに制限
          wheelLock = true;
          if (e.deltaY > 0) goForward(); else if (e.deltaY < 0) goBack();
          relockWheel();
          return;
        }
        /* 再挑戦以降：スクロール量を溜めて、一定の「長さ」でステップを進める */
        accum += e.deltaY;
        advanceByAccum();                         // 余りは持ち越し＝スクロール分を無駄にしない
      }, { passive: false });

      /* --- 入力：キーボード（アクセシビリティ） --- */
      window.addEventListener("keydown", function (e) {
        if (!mActive || mBusy) return;
        if (e.key === "ArrowDown" || e.key === "PageDown" || e.key === " " || e.key === "Spacebar") { e.preventDefault(); goForward(); }
        else if (e.key === "ArrowUp" || e.key === "PageUp") { e.preventDefault(); goBack(); }
      });
    }
  }

  /* ============================================================
     5-a. スマホのナビ開閉（ハンバーガー）
     ------------------------------------------------------------
     navToggle … ハンバーガーボタン, nav … グローバルナビ
     開閉に合わせて aria-expanded を更新（アクセシビリティ）。
     リンク押下や Esc で閉じる。
     ============================================================ */
  var navToggle = document.querySelector(".c-hamburger-btn");
  var nav = document.querySelector(".p-global-nav");

  function closeNav() {
    if (!nav) return;
    nav.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
  }

  if (navToggle && nav) {
    navToggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", String(open));
    });
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) closeNav();       // ナビ内リンクを押したら閉じる
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeNav();
    });
  }

  /* ============================================================
     5-b. 「会社情報」ドロップダウン（スマホのアコーディオン）
     ------------------------------------------------------------
     複数の親ボタンのうち、押したもの以外は閉じる（1つだけ開く）。
     ============================================================ */
  var parents = document.querySelectorAll(".p-global-nav__parent");
  parents.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var li = btn.closest(".has-sub");
      var open = li.classList.toggle("is-open");
      btn.setAttribute("aria-expanded", String(open));
      parents.forEach(function (other) {
        if (other !== btn) {
          other.closest(".has-sub").classList.remove("is-open");
          other.setAttribute("aria-expanded", "false");
        }
      });
    });
  });

  /* ============================================================
     6-a. スクロールで要素をふわっと表示（reveal）を全ページに自動付与
     ------------------------------------------------------------
     各セクションの直下要素に .reveal を付け、少しずつ遅延(スタッガー)を掛ける。
     すでに .reveal がある/内部に持つ塊は二重化しない。
     ============================================================ */
  (function autoReveal() {
    var containers = document.querySelectorAll(".l-section .l-container");
    Array.prototype.forEach.call(containers, function (container) {
      var idx = 0;
      Array.prototype.forEach.call(container.children, function (el) {
        if (el.classList.contains("reveal")) return;   // 既存はそのまま
        if (el.querySelector(".reveal")) return;        // 内部にrevealを持つ塊は二重化しない
        var tag = el.tagName;
        if (tag === "SCRIPT" || tag === "STYLE" || tag === "BR" || tag === "HR") return;
        el.classList.add("reveal");
        el.style.transitionDelay = (idx * 0.08) + "s";  // 塊ごとにスタッガー
        idx++;
      });
    });
  })();

  /* ============================================================
     6-b. reveal の発火（画面に入ったら is-visible）
     ------------------------------------------------------------
     IntersectionObserver で「画面内に入った要素」に is-visible を付ける。
     非対応ブラウザでは即表示（フォールバック）。
     ============================================================ */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);              // 一度出したら監視解除
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ============================================================
     6-c. マグネットボタン（PCのみ）＋数値カウントアップ
     ------------------------------------------------------------
     fine   … マウス等の細かいポインタか（＝PC。タッチは対象外）
     reduce … 動きを減らす設定か
     PCかつ reduce でないときだけ、ボタンがカーソルに軽く追従。
     ============================================================ */
  var fine = window.matchMedia("(hover:hover) and (pointer:fine)").matches;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (fine && !reduce) {
    document.querySelectorAll(".c-btn").forEach(function (btn) {
      btn.addEventListener("mousemove", function (e) {
        var r = btn.getBoundingClientRect();
        var x = (e.clientX - r.left - r.width / 2) * 0.28;
        var y = (e.clientY - r.top - r.height / 2) * 0.28 - 2;
        btn.style.transform = "translate(" + x.toFixed(1) + "px," + y.toFixed(1) + "px)";
      });
      btn.addEventListener("mouseleave", function () { btn.style.transform = ""; });
    });
  }
  // 数値カウントアップ：data-countup を持つ要素が画面に入ったら 0→目標値へ
  (function countUp() {
    var nums = document.querySelectorAll("[data-countup]");
    if (!nums.length) return;
    var fmt = function (n) { return n.toLocaleString("ja-JP"); };     // 3桁区切り
    var run = function (el) {
      var target = parseFloat(el.getAttribute("data-countup")) || 0;
      var suffix = el.getAttribute("data-suffix") || "";
      if (reduce) { el.textContent = fmt(target) + suffix; return; }  // 動き無し設定は即最終値
      var dur = 1300, t0 = null;
      var tick = function (ts) {
        if (!t0) t0 = ts;
        var p = Math.min(1, (ts - t0) / dur), e = 1 - Math.pow(1 - p, 3); // ease-out
        el.textContent = fmt(Math.round(target * e)) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    if ("IntersectionObserver" in window) {
      var cio = new IntersectionObserver(function (es) {
        es.forEach(function (en) { if (en.isIntersecting) { run(en.target); cio.unobserve(en.target); } });
      }, { threshold: 0.5 });
      nums.forEach(function (el) { cio.observe(el); });
    } else { nums.forEach(run); }
  })();

  /* ============================================================
     7. 問い合わせフォーム（contact だけ）
     ------------------------------------------------------------
     form … #contactForm, note … 補助メッセージ表示欄
     送信は contact.php へ fetch（JSON）。結果は画面中央のモーダルで通知。
     fetch 非対応時は通常のフォーム送信にフォールバック。
     ============================================================ */
  var form = document.getElementById("contactForm");
  var note = document.getElementById("formNote");
  if (form) {
    /* 結果モーダルはDOMに1つだけ作って使い回す。
       modal … モーダル要素, modalLastFocus … 閉じた後に戻すフォーカス元 */
    var modal = null, modalLastFocus = null;
    function buildModal() {
      var m = document.createElement("div");
      m.className = "c-modal";
      m.id = "formModal";
      m.setAttribute("role", "dialog");
      m.setAttribute("aria-modal", "true");
      m.setAttribute("aria-labelledby", "formModalTitle");
      m.hidden = true;
      m.innerHTML =
        '<div class="c-modal__backdrop" data-close></div>' +
        '<div class="c-modal__panel" role="document">' +
        '<div class="c-modal__icon" aria-hidden="true"></div>' +
        '<h2 class="c-modal__title" id="formModalTitle"></h2>' +
        '<p class="c-modal__text"></p>' +
        '<button type="button" class="c-btn -fill c-modal__close" data-close>閉じる</button>' +
        '</div>';
      document.body.appendChild(m);
      m.addEventListener("click", function (ev) {
        if (ev.target.hasAttribute("data-close")) closeModal();   // 背景/閉じるで閉じる
      });
      document.addEventListener("keydown", function (ev) {
        if (!modal || modal.hidden) return;
        if (ev.key === "Escape") closeModal();
      });
      return m;
    }
    // モーダルを開く（ok=成功か, title=見出し, text=本文HTML）
    function showModal(ok, title, text) {
      if (!modal) modal = buildModal();
      modal.classList.toggle("-err", !ok);
      modal.querySelector(".c-modal__icon").textContent = ok ? "✓" : "!";
      modal.querySelector(".c-modal__title").textContent = title;
      modal.querySelector(".c-modal__text").innerHTML = text;
      modalLastFocus = document.activeElement;
      modal.hidden = false;
      void modal.offsetWidth;                       // reflow → クラス付与でトランジション発火
      modal.classList.add("is-open");
      var closeBtn = modal.querySelector(".c-modal__close");
      if (closeBtn) closeBtn.focus();
    }
    function closeModal() {
      if (!modal) return;
      modal.classList.remove("is-open");
      var hide = function () { modal.hidden = true; };
      if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        hide();
      } else {
        var p = modal.querySelector(".c-modal__panel");
        var done = false;
        var fin = function () { if (done) return; done = true; hide(); };
        p.addEventListener("transitionend", fin, { once: true });
        setTimeout(fin, 500);                         // transitionend が来ない時の保険
      }
      if (modalLastFocus && modalLastFocus.focus) { try { modalLastFocus.focus(); } catch (e) {} }
    }

    /* 事業詳細ページの相談ボタン（?type=…）で問い合わせ種別を自動選択 */
    var qType = new URLSearchParams(window.location.search).get("type");
    if (qType) {
      var typeSel = form.querySelector('select[name="type"]');
      if (typeSel) {
        var opt = Array.prototype.filter.call(typeSel.options, function (o) { return o.value === qType; })[0];
        if (opt) { typeSel.value = qType; }
      }
    }

    // 送信処理：バリデーション → fetch → 結果モーダル
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.checkValidity()) {
        note.textContent = "未入力の必須項目があります。ご確認ください。";
        note.className = "p-form__note is-err";
        form.reportValidity();
        return;
      }
      var btn = form.querySelector('[type="submit"]');
      note.textContent = "送信中…"; note.className = "p-form__note";
      if (btn) btn.disabled = true;
      var action = form.getAttribute("action") || "contact.php";
      if (!window.fetch) { form.submit(); return; } // fetch非対応は通常POSTにフォールバック
      fetch(action, { method: "POST", body: new FormData(form), headers: { "X-Requested-With": "fetch" } })
        .then(function (r) { return r.json().catch(function () { return { ok: r.ok }; }); })
        .then(function (d) {
          if (d && d.ok) {                            // 成功
            note.textContent = "";
            note.className = "p-form__note";
            form.reset();
            showModal(
              true,
              "送信を承りました",
              "この度はお問い合わせいただき、<br>" +
              "誠にありがとうございます。<br>" +
              "内容を確認のうえ、担当者より<br>" +
              "順次ご連絡を差し上げます。<br>" +
              "恐れ入りますが今しばらく<br>" +
              "ご返信をお待ちください。"
            );
          } else {                                    // サーバがエラーを返した
            note.textContent = "";
            note.className = "p-form__note";
            showModal(
              false,
              "送信できませんでした",
              (d && d.msg ? d.msg + "<br>" : "誠に恐れ入りますが、<br>送信を完了できませんでした。<br>") +
              "お手数ですが時間をおいて<br>" +
              "再度お試しいただくか、<br>" +
              "<a href=\"mailto:info@revenge.co.jp\">info@revenge.co.jp</a> まで<br>" +
              "直接ご連絡ください。"
            );
          }
        })
        .catch(function () {                          // 通信そのものが失敗
          note.textContent = "";
          note.className = "p-form__note";
          showModal(
            false,
            "送信できませんでした",
            "通信エラーにより<br>" +
            "送信を完了できませんでした。<br>" +
            "お手数ですが時間をおいて<br>" +
            "再度お試しいただくか、<br>" +
            "<a href=\"mailto:info@revenge.co.jp\">info@revenge.co.jp</a> まで<br>" +
            "直接ご連絡ください。"
          );
        })
        .then(function () { if (btn) btn.disabled = false; }); // 最後に必ずボタンを戻す
    });
  }

  /* ============================================================
     8. WordPress のニュースを差し込む（任意・失敗しても静的のまま）
     ------------------------------------------------------------
     window.MISIMA_WP_BASE（config.js で設定）がある時だけ、
     WP REST から最新記事を取得してトップのニュース一覧を差し替える。
     未設定・取得失敗時は、HTMLに書かれた静的ニュースをそのまま使う。
     ============================================================ */
  (function loadWpNews() {
    var base = (window.MISIMA_WP_BASE || "").replace(/\/+$/, "");
    if (!base) return;                         // WP未設定 → 静的ニュースを維持
    var list = document.querySelector(".p-top-news__list");
    if (!list || !window.fetch) return;
    var count = parseInt(list.getAttribute("data-news-count") || "4", 10);

    var pad = function (n) { return (n < 10 ? "0" : "") + n; };
    var esc = function (s) {                    // HTML特殊文字をエスケープ（XSS対策）
      return String(s).replace(/[&<>"]/g, function (c) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
      });
    };

    fetch(base + "/wp-json/wp/v2/posts?_embed&per_page=" + count)
      .then(function (r) { if (!r.ok) throw new Error("wp"); return r.json(); })
      .then(function (posts) {
        if (!Array.isArray(posts) || !posts.length) return;
        list.innerHTML = posts.map(function (p) {
          var d = new Date(p.date);
          var disp = d.getFullYear() + "." + pad(d.getMonth() + 1) + "." + pad(d.getDate());
          var iso = d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
          var cat = "お知らせ";
          try { cat = p._embedded["wp:term"][0][0].name || cat; } catch (e) {}
          var title = (p.title && p.title.rendered) ? p.title.rendered : "";
          return '<li class="p-top-news__item reveal"><a class="p-top-news__link" href="' + p.link + '">' +
                 '<time class="p-top-news__date" datetime="' + iso + '">' + disp + '</time>' +
                 '<span class="c-label-category">' + esc(cat) + '</span>' +
                 '<p class="p-top-news__title">' + title + '</p></a></li>';
        }).join("");
        list.querySelectorAll(".reveal").forEach(function (el) { el.classList.add("is-visible"); });
      })
      .catch(function () { /* 取得失敗時は静的ニュースのまま */ });
  })();
})();
