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
    /* 英字キャッチは虹色が流れ続けるグラデーション文字（CSSで実装） */
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
    var heroType = hero.querySelector(".p-hero__type");
    var heroMorph = hero.querySelector(".p-hero__morph");
    var heroReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    hero.classList.add("is-play"); // 虹色バーのフリップをロード時に再生

    /* タイピング完了→2秒後：全消去して「失敗↓再挑戦」を積み上げフェードイン */
    var showStack = function () {
      if (!heroMorph) return;
      heroMorph.classList.add("is-stack");                 // 失敗が出現
      setTimeout(function () { heroMorph.classList.add("is-stack-full"); }, 650); // ↓と再挑戦をフェードイン
    };

    /* タイピング風：失敗 を入力 → 消去 → 再挑戦 を入力 */
    var typeMorph = function () {
      if (!heroType) return;
      var first = heroType.getAttribute("data-first") || "";
      var second = heroType.getAttribute("data-second") || "";
      var pal = ["#e60012", "#ed6d1f", "#f5a200", "#009944", "#41a1be", "#1d2088", "#601986", "#e95383"];
      var i = 0, j = 0;
      var addChar = function (ch, idx) { // 打鍵ごとに虹色→黒settleするspanを追加
        var s = document.createElement("span");
        s.className = "p-hero__tch";
        s.textContent = ch;
        s.style.setProperty("--lc", pal[idx % pal.length]);
        heroType.appendChild(s);
      };
      var typeFirst = function () {
        if (i < first.length) { addChar(first[i], i); i++; setTimeout(typeFirst, 180); }
        else { setTimeout(delFirst, 900); }
      };
      var delFirst = function () {
        if (heroType.lastChild) { heroType.removeChild(heroType.lastChild); setTimeout(delFirst, 120); }
        else { setTimeout(typeSecond, 300); }
      };
      var typeSecond = function () {
        if (j < second.length) { addChar(second[j], j); j++; setTimeout(typeSecond, 190); }
        else setTimeout(showStack, 2000); // 完了の2秒後に積み上げ演出へ
      };
      typeFirst();
    };

    if (heroReduced) {
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
