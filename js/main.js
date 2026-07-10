/* ============================================================
   株式会社ミシマ — Site interactions (FLOCSS)
   ============================================================ */
(function () {
  "use strict";

  /* ---------- Always start at the very top on (re)load ---------- */
  if ("scrollRestoration" in history) { try { history.scrollRestoration = "manual"; } catch (e) {} }
  window.scrollTo(0, 0);
  window.addEventListener("load", function () { window.scrollTo(0, 0); });
  window.addEventListener("pageshow", function () { window.scrollTo(0, 0); });

  /* ---------- Header shrink on scroll + to-top ---------- */
  var header = document.querySelector(".l-header");
  var toTop = document.querySelector(".c-to-top");

  var lastY = 0;
  function onScroll() {
    var y = window.scrollY;
    if (header) {
      header.classList.toggle("is-scrolled", y > 20);
      var denom = document.documentElement.scrollHeight - window.innerHeight;
      header.style.setProperty("--scrollp", denom > 0 ? Math.min(1, y / denom) : 0); // 進捗ライン
      if (y > 240 && y > lastY + 4) header.classList.add("is-hidden");               // 下スクロールで隠す
      else if (y < lastY - 4 || y < 240) header.classList.remove("is-hidden");       // 上スクロール/最上部で表示
    }
    if (toTop) toTop.classList.toggle("is-visible", y > 600);
    lastY = y;
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  if (toTop) {
    toTop.addEventListener("click", function (e) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  /* ---------- Loader ---------- */
  var loader = document.querySelector(".c-loader");
  if (loader) {
    var hideLoader = function () { loader.classList.add("is-loaded"); };
    /* 花が1回転(=0.8秒)し終わったらサイトを表示 */
    setTimeout(hideLoader, 850);
  }

  /* ---------- First View：固定ヒーロー（虹色フリップ→スクロールで5行順送り→最後キャッチが残る） ---------- */
  var hero = document.querySelector(".p-hero");
  if (hero) {
    /* 英字キャッチ：各行(reveal-text)を1文字ずつspan化。CSSで黒カーペット→文字表示＆約5秒おきに虹色の波 */
    var catchTexts = hero.querySelectorAll(".p-hero__catch-copy .p-hero__reveal-text");
    if (catchTexts.length) {
      var catchPal = ["#e60012", "#ed6d1f", "#f5a200", "#009944", "#41a1be", "#1d2088", "#601986", "#e95383"];
      var ci = 0;
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
        ci++; // 行間もインデックスを1つ空けて波を連続的に
      });
    }
    var heroLines = hero.querySelectorAll(".p-hero__line");
    /* 5行も1文字ずつに分割し「虹色→黒」settleで出す */
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
    var heroCatch = hero.querySelector(".p-hero__catch");
    var heroScroll = hero.querySelector(".p-fv__scroll");
    var heroMorph = hero.querySelector(".p-hero__morph");
    var stackEl = hero.querySelector(".p-hero__stack");
    var stackTopEl = hero.querySelector(".p-hero__stack-top");
    var stackBtmEl = hero.querySelector(".p-hero__stack-btm");
    var stackCaret = stackBtmEl ? stackBtmEl.querySelector(".p-hero__caret") : null;
    var stackPal = ["#e60012", "#ed6d1f", "#f5a200", "#009944", "#41a1be", "#1d2088", "#601986", "#e95383"];
    /* 語を1文字ずつ p-hero__sch にして --i/--lc を付与（矢印分は index を1つ空ける） */
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
    if (stackTopEl) buildSch(stackTopEl, stackTopEl.textContent, 0); // 失敗 = 0,1
    var heroReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    hero.classList.add("is-play"); // 虹色バーのフリップをロード時に再生

    /* 入力後、上段(失敗)＋矢印を出して次の挙動へ。FLIP で下段が中央→定位置へ滑らかに移動 */
    /* ---- スクロールで進む4段階モーフ ---- */
    var first = stackBtmEl ? (stackBtmEl.getAttribute("data-first") || "") : "";
    var second = stackBtmEl ? (stackBtmEl.getAttribute("data-second") || "再挑戦") : "再挑戦";
    var morphTimers = [];
    var T = function (fn, ms) { var id = setTimeout(fn, ms); morphTimers.push(id); return id; };
    var clearMorphTimers = function () { morphTimers.forEach(clearTimeout); morphTimers = []; };
    var addChar = function (ch, idx) { // 黒で1文字ずつ入力（カーソルの前へ挿入）
      var s = document.createElement("span");
      s.className = "p-hero__tch";
      s.textContent = ch;
      s.style.setProperty("--lc", stackPal[idx % stackPal.length]);
      s.style.setProperty("--k", idx);
      if (stackCaret && stackCaret.parentNode === stackBtmEl) stackBtmEl.insertBefore(s, stackCaret);
      else if (stackBtmEl) stackBtmEl.appendChild(s);
    };
    var delLast = function () {
      if (!stackBtmEl) return false;
      var spans = stackBtmEl.querySelectorAll(".p-hero__tch");
      if (spans.length) { stackBtmEl.removeChild(spans[spans.length - 1]); return true; }
      return false;
    };
    var typeWord = function (word, cb) { var i = 0; var step = function () { if (i < word.length) { addChar(word[i], i); i++; T(step, 340); } else cb(); }; step(); };
    var rainbowOnce = function (len, cb) { heroMorph.classList.add("is-typewave"); T(function () { heroMorph.classList.remove("is-typewave"); cb(); }, (len - 1) * 200 + 800); };
    var clearWord = function (cb) { var step = function () { if (delLast()) T(step, 120); else cb(); }; step(); };
    var stage1 = function (done) { // ①失敗を入力（黒）→5秒後から虹が流れ続ける
      heroMorph.classList.remove("is-typewave");
      typeWord(first, function () { heroMorph.classList.add("is-typewave"); done(); });
    };
    var stage2 = function (done) { // ②失敗を消去→再挑戦を入力（黒）→5秒後から虹が流れ続ける
      heroMorph.classList.remove("is-typewave"); // 失敗の虹を止める
      clearWord(function () { typeWord(second, function () { heroMorph.classList.add("is-typewave"); done(); }); });
    };
    var stage3 = function (done) { // ③再挑戦を消去→失敗・再挑戦のスタック出現
      heroMorph.classList.remove("is-typewave");
      clearWord(function () { T(function () {
        if (stackCaret && stackCaret.parentNode) stackCaret.parentNode.removeChild(stackCaret);
        if (stackBtmEl) buildSch(stackBtmEl, second, 3);
        heroMorph.classList.add("is-stack");
        done();
      }, 300); });
    };
    var stage4 = function (done) { heroMorph.classList.add("is-stack-full"); done(); }; // ④矢印＋失敗/再挑戦に順番で虹
    var stageFns = [stage1, stage2, stage3, stage4];
    var wantStage = 0, curStage = 0, playing = false;
    var runStages = function () {
      if (playing || curStage >= wantStage || curStage >= 4) return;
      playing = true;
      var fn = stageFns[curStage];
      curStage++;
      fn(function () { playing = false; runStages(); });
    };
    var snapToStack = function () { // 速いスクロール等では最終状態へ即確定
      if (curStage >= 4) return;
      clearMorphTimers();
      playing = true; curStage = 4; wantStage = 4;
      heroMorph.classList.remove("is-typewave");
      if (stackCaret && stackCaret.parentNode) stackCaret.parentNode.removeChild(stackCaret);
      if (stackBtmEl) buildSch(stackBtmEl, second, 3);
      heroMorph.classList.add("is-stack", "is-stack-full");
    };

    if (heroReduced) {
      if (stackBtmEl) buildSch(stackBtmEl, second, 3); // 再挑戦を即表示
      if (heroMorph) heroMorph.classList.add("is-stack", "is-stack-full");
      if (heroCatch) heroCatch.classList.add("is-show");
    } else {
      /* ===== PC/スマホ共通：1ジェスチャ＝1ステップ（スクロールロック。激しいスクロール/フリックでも1つだけ進む） ===== */
      var docEl = document.documentElement;
      docEl.style.overflow = "hidden"; document.body.style.overflow = "hidden";
      hero.style.height = "100svh"; window.scrollTo(0, 0);
      var mStep = 0, mMax = 6, mBusy = false, mActive = true, mReachedCatch = false;
      var setBg = function (step) { // 段階に合わせた背景（キャッチは背景なし）
        var v = step <= 1 ? "fail" : step === 2 ? "retry" : step <= 4 ? "stack" : step === 5 ? "lines" : "";
        if (v) hero.setAttribute("data-bg", v); else hero.removeAttribute("data-bg");
      };
      var lineTimers = [];
      var autoCatchTimer = null;
      var clearAutoCatch = function () { if (autoCatchTimer) { clearTimeout(autoCatchTimer); autoCatchTimer = null; } };
      var clearLineTimers = function () { for (var i = 0; i < lineTimers.length; i++) clearTimeout(lineTimers[i]); lineTimers = []; };
      var hideLines = function () { clearLineTimers(); for (var i = 0; i < heroLines.length; i++) heroLines[i].classList.remove("is-show"); };
      var showLines = function (cnt) { clearLineTimers(); for (var i = 0; i < heroLines.length; i++) heroLines[i].classList.toggle("is-show", i < cnt); };
      /* 5行を時間差で一括表示（行ごとに少しずつ遅らせて出す） */
      var revealLinesStaggered = function () {
        clearLineTimers();
        for (var i = 0; i < heroLines.length; i++) {
          (function (idx) { lineTimers.push(setTimeout(function () { heroLines[idx].classList.add("is-show"); }, idx * 1000)); })(i);
        }
      };
      var setWordPlain = function (word) { // 戻る用に語を黒で即描画（tchクラス＝後で消去アニメも効く）
        if (!stackBtmEl) return;
        stackBtmEl.innerHTML = "";
        Array.prototype.forEach.call(word, function (ch, k) {
          var s = document.createElement("span"); s.className = "p-hero__tch"; s.textContent = ch;
          s.style.setProperty("--lc", stackPal[k % stackPal.length]); s.style.setProperty("--k", k);
          stackBtmEl.appendChild(s);
        });
      };
      var renderState = function (n) { // 戻る：状態nを即座に描画（アニメ無し）
        clearMorphTimers(); clearAutoCatch();
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
          if (n === 5) { hero.classList.add("is-lines"); showLines(heroLines.length); }   // 戻る時は5行すべて表示
          else if (n >= 6) { hero.classList.add("is-lines", "is-catch"); if (heroCatch) heroCatch.classList.add("is-show"); }
        }
      };
      var release = function () { // 最後まで進んだら通常スクロールへ解放
        mActive = false;
        docEl.style.overflow = ""; document.body.style.overflow = "";
        window.scrollTo(0, hero.offsetHeight);
      };
      var goForward = function () {
        if (mBusy) return;
        if (mStep >= mMax) { release(); return; }
        mBusy = true; mStep++; setBg(mStep);
        if (mStep <= 4) {                          // ①〜④モーフ
          hideLines(); hero.classList.remove("is-lines", "is-catch"); if (heroCatch) heroCatch.classList.remove("is-show");
          wantStage = mStep; runStages();
          /* 失敗→再挑戦(②)は強制1ステップなので長め。複合(③)・矢印(④)は緩ゾーンなので短め＝連続スクロールで流れる */
          setTimeout(function () { mBusy = false; }, mStep === 2 ? 2600 : (mStep === 3 ? 700 : 480));
        } else if (mStep === 5) {                   // ⑤5行を時間差で1行ずつ自動表示 → 完成の2秒後に自動でキャッチ
          if (curStage < 4) snapToStack();
          hero.classList.add("is-lines"); hero.classList.remove("is-catch"); if (heroCatch) heroCatch.classList.remove("is-show");
          clearAutoCatch();
          revealLinesStaggered();
          var revealDone = (heroLines.length - 1) * 1000 + 700; // 最後の行＋カスケードが出そろうまで（1秒間隔）
          setTimeout(function () { mBusy = false; }, revealDone);
          autoCatchTimer = setTimeout(function () {  // 5行完成の2秒後に自動でキャッチへ
            if (mActive && mStep === 5 && !mReachedCatch) { mBusy = false; goForward(); }
          }, revealDone + 2000);
        } else {                                    // ⑥キャッチ
          if (curStage < 4) snapToStack();
          hideLines(); hero.classList.add("is-lines", "is-catch"); if (heroCatch) heroCatch.classList.add("is-show");
          mReachedCatch = true;                     // キャッチ到達＝以降は戻らない（リロードまで）
          setTimeout(function () { mBusy = false; }, 900);
        }
      };
      var goBack = function () { if (mBusy || mStep <= 1 || mReachedCatch) return; mStep--; renderState(mStep); };
      /* ---- 全自動再生：失敗→再挑戦→複合→矢印→5行（→自動キャッチ） ---- */
      var autoTimer = null;
      var clearAuto = function () { if (autoTimer) { clearTimeout(autoTimer); autoTimer = null; } };
      var AUTO_READ = 600;                          // 各段階を見せてから次へ進むまでの間
      var autoLoop = function () {
        if (!mActive || mReachedCatch || mStep >= 5) return; // 5行以降はステップ内の自動に任せる
        if (mBusy) { autoTimer = setTimeout(autoLoop, 120); return; } // アニメ中は待つ
        autoTimer = setTimeout(function () {        // 少し見せてから次へ
          if (!mActive || mReachedCatch || mStep >= 5) return;
          if (mBusy) { autoTimer = setTimeout(autoLoop, 120); return; }
          goForward();
          autoTimer = setTimeout(autoLoop, 120);
        }, AUTO_READ);
      };
      setTimeout(function () {                       // ①失敗を自動表示 → 以降も自動で進行
        if (mStep === 0) { mStep = 1; wantStage = 1; setBg(1); runStages(); }
        autoTimer = setTimeout(autoLoop, 2000);      // 失敗を見せてから自動進行開始
      }, 1150);

      /* ---- スクロール/スワイプ：再生中は最後まで一気にスキップ、キャッチ後は本編へ ---- */
      var skipToCatch = function () {                // 演出を早送りして THE NEXT STAGE を表示
        clearAuto(); clearMorphTimers(); clearAutoCatch(); clearLineTimers();
        mBusy = false; mStep = 6; playing = false;
        heroMorph.classList.remove("is-typewave");
        if (stackBtmEl) { stackBtmEl.innerHTML = ""; buildSch(stackBtmEl, second, 3); }
        heroMorph.classList.add("is-stack", "is-stack-full");
        curStage = 4; wantStage = 4;
        hideLines();
        hero.classList.add("is-lines", "is-catch");
        if (heroCatch) heroCatch.classList.add("is-show");
        mReachedCatch = true; setBg(6);
      };
      var onForward = function () {                   // 下方向の操作
        if (!mActive) return;
        if (mReachedCatch) { release(); }             // キャッチ表示後：本編へ解放
        else { skipToCatch(); }                       // 再生中：最後まで一気にスキップ
      };
      window.addEventListener("wheel", function (e) {
        if (!mActive) return;
        e.preventDefault();                           // ページスクロールを止めて制御
        if (e.deltaY > 0) onForward();                // 下スクロール＝スキップ/解放
      }, { passive: false });
      var sY = null;
      window.addEventListener("touchstart", function (e) { if (mActive) sY = e.touches[0].clientY; }, { passive: true });
      window.addEventListener("touchmove", function (e) { if (mActive) e.preventDefault(); }, { passive: false });
      window.addEventListener("touchend", function (e) {
        if (!mActive || sY == null) return;
        var t = e.changedTouches && e.changedTouches[0];
        var dy = sY - (t ? t.clientY : sY); sY = null;
        if (dy > 30) onForward();                     // 上へスワイプ＝スキップ/解放
      }, { passive: true });
      window.addEventListener("keydown", function (e) {
        if (!mActive) return;
        if (e.key === "ArrowDown" || e.key === "PageDown" || e.key === " " || e.key === "Spacebar") { e.preventDefault(); onForward(); }
      });
    }
  }

  /* ---------- MV romaji typing ---------- */
  var roman = document.querySelector(".p-top-mv__roman[data-text]");
  if (roman) {
    var text = roman.getAttribute("data-text");
    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      roman.textContent = text;
    } else {
      roman.textContent = "";
      var i = 0;
      var type = function () {
        if (i <= text.length) {
          roman.textContent = text.slice(0, i);
          i++;
          setTimeout(type, 130);
        }
      };
      setTimeout(type, 1100);
    }
  }

  /* ---------- Top intro: isolated, one-way overlay (page locked) ---------- */
  var intro = document.querySelector(".p-intro");
  if (intro) {
    var opening = intro.querySelector(".p-intro__opening");
    var roulette = intro.querySelector(".p-intro__roulette");
    var lines = intro.querySelectorAll(".p-intro__line");
    var statements = intro.querySelector(".p-intro__statements");
    var mediaImgs = intro.querySelectorAll(".p-intro__media-img");
    var introScroll = intro.querySelector(".p-intro__scroll");
    var burstBox = intro.querySelector(".p-intro__burst");
    var introReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var docEl = document.documentElement;
    var prog = 0, introDone = false, burstDone = false, brandReached = false, brandTime = 0;
    var openUntil = 0.07, brandAt = 0.70;
    var SENS = 1 / 1500; // wheel units needed to complete the intro (~one screen of scrolling)
    var palette = ["#e60012","#ed6d1f","#f5a200","#009944","#41a1be","#1d2088","#601986","#e95383"];

    /* build explosion particles */
    if (burstBox && !introReduced) {
      for (var bi = 0; bi < 64; bi++) {
        var sp = document.createElement("span");
        sp.className = "p-intro__particle";
        var ang = Math.random() * Math.PI * 2, dist = 150 + Math.random() * 420;
        sp.style.setProperty("--tx", Math.cos(ang) * dist + "px");
        sp.style.setProperty("--ty", Math.sin(ang) * dist + "px");
        var sz = 6 + Math.random() * 18;
        sp.style.width = sz + "px"; sp.style.height = sz + "px";
        var col = palette[bi % palette.length];
        sp.style.background = col; sp.style.color = col;
        sp.style.animationDelay = (Math.random() * 0.08) + "s";
        burstBox.appendChild(sp);
      }
    }
    var fireBurst = function () {
      if (burstDone || introReduced) return;
      burstDone = true; intro.classList.add("is-burst");
    };

    var lockScroll = function () { docEl.classList.add("is-intro-lock"); document.body.classList.add("is-intro-lock"); };
    var unlockScroll = function () { docEl.classList.remove("is-intro-lock"); document.body.classList.remove("is-intro-lock"); };

    var render = function () {
      if (introDone) return;
      var p = prog;
      if (p < openUntil) {
        if (opening) opening.classList.remove("is-hide");
        statements.classList.add("is-hide");
        intro.classList.remove("is-story", "is-brand");
        if (introScroll) introScroll.classList.remove("is-hide");
        return;
      }
      if (opening) opening.classList.add("is-hide");
      if (p >= brandAt) {
        statements.classList.add("is-hide");
        intro.classList.remove("is-story");
        intro.classList.add("is-brand");
        fireBurst();
        if (introScroll) introScroll.classList.add("is-hide");
      } else {
        statements.classList.remove("is-hide");
        intro.classList.add("is-story");
        intro.classList.remove("is-brand");
        if (introScroll) introScroll.classList.remove("is-hide");
        var span = brandAt - openUntil;
        lines.forEach(function (l, i) {
          l.classList.toggle("is-show", p >= openUntil + span * i / lines.length);
        });
        if (mediaImgs.length) {
          var frac = (p - openUntil) / span;
          var stage = Math.min(mediaImgs.length - 1, Math.floor(frac * mediaImgs.length));
          mediaImgs.forEach(function (im, i) { im.classList.toggle("is-show", i === stage); });
        }
      }
    };

    var finish = function () {
      if (introDone) return;
      introDone = true;
      intro.classList.add("is-brand"); fireBurst();
      setTimeout(function () {
        unlockScroll();
        intro.classList.add("is-resolved");   // 社名ヒーローとして在流配置で残す
        window.scrollTo(0, 0);
        if (introScroll) introScroll.classList.remove("is-hide"); // 下へ誘導するSCROLLを再表示
      }, 350);
    };

    /* one-way only: downward input advances, upward is ignored.
       社名が出たら、少しの間(演出を見せる)のあと“ひと押し”で本編へ解放する */
    var advance = function (delta) {
      if (introDone || delta <= 0) return;
      if (brandReached) {
        if (Date.now() - brandTime > 450) finish();   // 社名表示後の次のスクロールで解放
        return;
      }
      prog = Math.min(1, prog + delta * SENS);
      render();
      if (prog >= brandAt && !brandReached) { brandReached = true; brandTime = Date.now(); }
    };

    if (introReduced) {
      // skip the sequence entirely; reveal the page
      introDone = true;
      intro.style.display = "none";
    } else {
      lockScroll();

      /* opening word roulette (auto, once) */
      if (roulette) {
        var words = (roulette.getAttribute("data-words") || "").split(",").filter(Boolean);
        var finalWord = roulette.getAttribute("data-final") || roulette.textContent;
        var idx = 0, ticks = 0, maxTicks = 22, delay = 70;
        var spin = function () {
          if (introDone) return;
          roulette.textContent = words.length ? words[idx % words.length] : finalWord;
          idx++; ticks++;
          if (ticks >= maxTicks) { roulette.textContent = finalWord; roulette.classList.add("is-set"); return; }
          delay += (ticks > maxTicks - 7) ? 45 : 5;
          setTimeout(spin, delay);
        };
        setTimeout(spin, 900);
      }

      var onWheel = function (e) { if (introDone) return; e.preventDefault(); advance(e.deltaY); };
      window.addEventListener("wheel", onWheel, { passive: false });

      var ty = null;
      window.addEventListener("touchstart", function (e) { if (introDone) return; ty = e.touches[0].clientY; }, { passive: true });
      window.addEventListener("touchmove", function (e) {
        if (introDone) return;
        e.preventDefault();
        var y = e.touches[0].clientY;
        if (ty !== null) advance((ty - y) * 2.2);
        ty = y;
      }, { passive: false });

      window.addEventListener("keydown", function (e) {
        if (introDone) return;
        if (e.key === "ArrowDown" || e.key === "PageDown" || e.key === " " || e.key === "Spacebar") {
          e.preventDefault(); advance(150);
        }
      });

      render();
    }
  }

  /* ---------- Mobile nav toggle ---------- */
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
      if (e.target.closest("a")) closeNav();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeNav();
    });
  }

  /* ---------- Dropdown accordions (mobile) ---------- */
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

  /* ---------- 全ページにスクロールリビールを自動付与（トップ以外も動くHPに） ---------- */
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

  /* ---------- Reveal on scroll ---------- */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ---------- Magnetic buttons（PCのみ・reduced無効） / Count-up ---------- */
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
  (function countUp() {
    var nums = document.querySelectorAll("[data-countup]");
    if (!nums.length) return;
    var fmt = function (n) { return n.toLocaleString("ja-JP"); };
    var run = function (el) {
      var target = parseFloat(el.getAttribute("data-countup")) || 0;
      var suffix = el.getAttribute("data-suffix") || "";
      if (reduce) { el.textContent = fmt(target) + suffix; return; }
      var dur = 1300, t0 = null;
      var tick = function (ts) {
        if (!t0) t0 = ts;
        var p = Math.min(1, (ts - t0) / dur), e = 1 - Math.pow(1 - p, 3);
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

  /* ---------- Contact form（contact.php へ実送信 / info@revenge.co.jp） ---------- */
  var form = document.getElementById("contactForm");
  var note = document.getElementById("formNote");
  if (form) {
    /* 送信結果ポップアップ（モーダル）。DOMに1つ生成して使い回す */
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
        if (ev.target.hasAttribute("data-close")) closeModal();
      });
      document.addEventListener("keydown", function (ev) {
        if (!modal || modal.hidden) return;
        if (ev.key === "Escape") closeModal();
      });
      return m;
    }
    function showModal(ok, title, text) {
      if (!modal) modal = buildModal();
      modal.classList.toggle("-err", !ok);
      modal.querySelector(".c-modal__icon").textContent = ok ? "✓" : "!";
      modal.querySelector(".c-modal__title").textContent = title;
      modal.querySelector(".c-modal__text").innerHTML = text;
      modalLastFocus = document.activeElement;
      modal.hidden = false;
      /* reflow → クラス付与でトランジション発火 */
      void modal.offsetWidth;
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
        setTimeout(fin, 500);
      }
      if (modalLastFocus && modalLastFocus.focus) { try { modalLastFocus.focus(); } catch (e) {} }
    }

    /* 事業詳細ページの相談ボタン（?type=…）でお問い合わせ種別を自動選択 */
    var qType = new URLSearchParams(window.location.search).get("type");
    if (qType) {
      var typeSel = form.querySelector('select[name="type"]');
      if (typeSel) {
        var opt = Array.prototype.filter.call(typeSel.options, function (o) { return o.value === qType; })[0];
        if (opt) { typeSel.value = qType; }
      }
    }
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
          if (d && d.ok) {
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
          } else {
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
        .catch(function () {
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
        .then(function () { if (btn) btn.disabled = false; });
    });
  }

  /* ---------- News via WordPress REST (optional, graceful fallback) ---------- */
  (function loadWpNews() {
    var base = (window.MISIMA_WP_BASE || "").replace(/\/+$/, "");
    if (!base) return;                         // WP未設定 → 静的ニュースを維持
    var list = document.querySelector(".p-top-news__list");
    if (!list || !window.fetch) return;
    var count = parseInt(list.getAttribute("data-news-count") || "4", 10);

    var pad = function (n) { return (n < 10 ? "0" : "") + n; };
    var esc = function (s) {
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
