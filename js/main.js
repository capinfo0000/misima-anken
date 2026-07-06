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

  function onScroll() {
    var y = window.scrollY;
    if (header) header.classList.toggle("is-scrolled", y > 20);
    if (toTop) toTop.classList.toggle("is-visible", y > 600);
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
    window.addEventListener("load", function () { setTimeout(hideLoader, 600); });
    setTimeout(hideLoader, 3500); // safety
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
    var showStack = function () {
      if (!heroMorph) return;
      if (stackCaret && stackCaret.parentNode) stackCaret.parentNode.removeChild(stackCaret);
      if (stackBtmEl) buildSch(stackBtmEl, stackBtmEl.getAttribute("data-second") || "再挑戦", 3); // 消去後、再挑戦を下段に生成
      heroMorph.classList.add("is-stack");                  // 失敗(上)・再挑戦(下)がフェードイン
      setTimeout(function () { heroMorph.classList.add("is-stack-full"); }, 800); // 最後に矢印フェードイン＋波開始
    };

    /* タイピング：失敗を入力→虹→消去→再挑戦を入力→虹→そのまま下段として定着→1秒後にスタックへ */
    var typeMorph = function () {
      if (!stackBtmEl) return;
      var first = stackBtmEl.getAttribute("data-first") || "";
      var second = stackBtmEl.getAttribute("data-second") || "";
      var i = 0, j = 0;
      var addChar = function (ch, idx) { // 黒で1文字ずつ入力（カーソルの前へ挿入）
        var s = document.createElement("span");
        s.className = "p-hero__tch";
        s.textContent = ch;
        s.style.setProperty("--lc", stackPal[idx % stackPal.length]);
        s.style.setProperty("--k", idx);
        if (stackCaret && stackCaret.parentNode === stackBtmEl) stackBtmEl.insertBefore(s, stackCaret);
        else stackBtmEl.appendChild(s);
      };
      var delLast = function () {
        var spans = stackBtmEl.querySelectorAll(".p-hero__tch");
        if (spans.length) { stackBtmEl.removeChild(spans[spans.length - 1]); return true; }
        return false;
      };
      var typeFirst = function () {
        if (i < first.length) { addChar(first[i], i); i++; setTimeout(typeFirst, 340); }
        else { setTimeout(playFirstWave, 600); }
      };
      var playFirstWave = function () { // 消える前に1文字ずつ虹（1回）→ 消去
        heroMorph.classList.add("is-typewave");
        setTimeout(function () { heroMorph.classList.remove("is-typewave"); delFirst(); }, (first.length - 1) * 200 + 800);
      };
      var delFirst = function () {
        if (delLast()) { setTimeout(delFirst, 120); }
        else { setTimeout(typeSecond, 300); }
      };
      var typeSecond = function () {
        if (j < second.length) { addChar(second[j], j); j++; setTimeout(typeSecond, 340); }
        else { setTimeout(playSecondWave, 600); }
      };
      var playSecondWave = function () { // 再挑戦にも虹（1回）→ 1文字ずつ消去 → スタックへ
        heroMorph.classList.add("is-typewave");
        setTimeout(function () { heroMorph.classList.remove("is-typewave"); delSecond(); }, (second.length - 1) * 200 + 800);
      };
      var delSecond = function () {
        if (delLast()) { setTimeout(delSecond, 120); }
        else { setTimeout(showStack, 600); } // 消去後、少し待ってスタックへ
      };
      typeFirst();
    };

    if (heroReduced) {
      if (stackBtmEl) buildSch(stackBtmEl, stackBtmEl.getAttribute("data-second") || "再挑戦", 3); // 再挑戦を即表示
      if (heroMorph) heroMorph.classList.add("is-stack", "is-stack-full");
      if (heroCatch) heroCatch.classList.add("is-show");
    } else {
      setTimeout(typeMorph, 1150); // 虹色バー通過後に開始
      var heroDone = false;
      var morphEnd = 0.14;                 // 冒頭はモーフ（失敗↓挑戦）
      var lineZone = 0.72;                 // 中盤で5行を1画面に積み上げ
      var onHeroScroll = function () {
        if (heroDone) return;
        var total = hero.offsetHeight - window.innerHeight;
        if (total <= 0) return;
        var prog = Math.min(1, Math.max(0, -hero.getBoundingClientRect().top / total));
        var i;
        if (prog >= lineZone) {                    // ④最後の大キャッチ（残る）
          for (i = 0; i < heroLines.length; i++) heroLines[i].classList.remove("is-show"); // 5行は退場
          hero.classList.add("is-lines", "is-catch");
          if (heroCatch) heroCatch.classList.add("is-show");
          if (heroScroll) heroScroll.style.opacity = "0";
          if (prog >= 0.99) heroDone = true;       // 通過後は固定
        } else if (prog >= morphEnd) {             // ③5行を積み上げ
          hero.classList.add("is-lines");
          hero.classList.remove("is-catch");
          if (heroCatch) heroCatch.classList.remove("is-show");
          if (heroScroll) heroScroll.style.opacity = "";
          var lp = (prog - morphEnd) / (lineZone - morphEnd);
          var cur = Math.min(heroLines.length - 1, Math.floor(lp * heroLines.length));
          for (i = 0; i < heroLines.length; i++) heroLines[i].classList.toggle("is-show", i <= cur);
        } else {                                    // ②モーフ表示（初期）
          hero.classList.remove("is-lines", "is-catch");
          if (heroCatch) heroCatch.classList.remove("is-show");
          if (heroScroll) heroScroll.style.opacity = "";
          for (i = 0; i < heroLines.length; i++) heroLines[i].classList.remove("is-show");
        }
      };
      window.addEventListener("scroll", onHeroScroll, { passive: true });
      window.addEventListener("resize", onHeroScroll, { passive: true });
      onHeroScroll();
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

  /* ---------- Contact form (static demo) ---------- */
  var form = document.getElementById("contactForm");
  var note = document.getElementById("formNote");
  if (form) {
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
      note.textContent = "お問い合わせありがとうございます。内容を送信しました（デモ）。";
      note.className = "p-form__note is-ok";
      form.reset();
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
