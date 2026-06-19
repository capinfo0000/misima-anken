/* ============================================================
   株式会社ミシマ — Site interactions (FLOCSS)
   ============================================================ */
(function () {
  "use strict";

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

  /* ---------- Top intro: scroll storytelling → brand reveal ---------- */
  var intro = document.querySelector(".p-intro");
  if (intro) {
    var lines = intro.querySelectorAll(".p-intro__line");
    var statements = intro.querySelector(".p-intro__statements");
    var brand = intro.querySelector(".p-intro__brand");
    var introScroll = intro.querySelector(".p-intro__scroll");
    var introReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var introDone = false; // in-memory: resets on reload only
    var brandAt = 0.72;

    var lockBrand = function () {
      statements.classList.add("is-hide");
      lines.forEach(function (l) { l.classList.remove("is-show"); });
      intro.classList.add("is-brand");
      if (introScroll) introScroll.classList.add("is-hide");
    };

    if (introReduced) {
      lockBrand();
      introDone = true;
    }

    var onIntro = function () {
      if (introDone) return; // once shown, only the brand remains until reload
      var total = intro.offsetHeight - window.innerHeight;
      var p = total > 0 ? Math.min(Math.max(-intro.getBoundingClientRect().top / total, 0), 1) : 0;

      lines.forEach(function (l, idx) {
        var th = 0.06 + idx * (brandAt - 0.10) / lines.length;
        l.classList.toggle("is-show", p >= th);
      });

      if (p >= brandAt) {
        statements.classList.add("is-hide");
        intro.classList.add("is-brand");
        if (introScroll) introScroll.classList.add("is-hide");
      } else {
        statements.classList.remove("is-hide");
        intro.classList.remove("is-brand");
        if (introScroll) introScroll.classList.remove("is-hide");
      }

      if (p >= 0.97) { introDone = true; lockBrand(); }
    };
    window.addEventListener("scroll", onIntro, { passive: true });
    onIntro();
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
})();
