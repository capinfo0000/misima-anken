/* ============================================================
   株式会社ミシマ — Site interactions
   ============================================================ */
(function () {
  "use strict";

  /* ---------- Header shrink on scroll + to-top button ---------- */
  const header = document.getElementById("siteHeader");
  const toTop = document.getElementById("toTop");

  function onScroll() {
    const y = window.scrollY;
    header.classList.toggle("is-scrolled", y > 20);
    toTop.classList.toggle("is-visible", y > 600);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  if (toTop) {
    toTop.addEventListener("click", function (e) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  /* ---------- Mobile nav toggle ---------- */
  const navToggle = document.getElementById("navToggle");
  const nav = document.getElementById("primaryNav");

  function closeNav() {
    nav.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
    navToggle.setAttribute("aria-label", "メニューを開く");
  }

  navToggle.addEventListener("click", function () {
    const open = nav.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(open));
    navToggle.setAttribute("aria-label", open ? "メニューを閉じる" : "メニューを開く");
  });

  // Close the mobile menu after selecting a link
  nav.addEventListener("click", function (e) {
    if (e.target.closest("a")) closeNav();
  });

  // Close on Escape
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeNav();
  });

  /* ---------- Dropdown accordions (mobile) ---------- */
  const parents = document.querySelectorAll(".nav__parent");
  parents.forEach(function (btn) {
    btn.addEventListener("click", function () {
      const li = btn.closest(".has-sub");
      const open = li.classList.toggle("is-open");
      btn.setAttribute("aria-expanded", String(open));
      // Close sibling dropdowns
      parents.forEach(function (other) {
        if (other !== btn) {
          const oli = other.closest(".has-sub");
          oli.classList.remove("is-open");
          other.setAttribute("aria-expanded", "false");
        }
      });
    });
  });

  /* ---------- Loader ---------- */
  const loader = document.getElementById("loader");
  if (loader) {
    const hideLoader = function () { loader.classList.add("is-loaded"); };
    window.addEventListener("load", function () { setTimeout(hideLoader, 600); });
    // Safety: never let the loader block the page
    setTimeout(hideLoader, 3500);
  }

  /* ---------- Hero romaji typing ---------- */
  const roman = document.querySelector(".hero__roman[data-text]");
  if (roman) {
    const text = roman.getAttribute("data-text");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      roman.textContent = text;
    } else {
      roman.textContent = "";
      let i = 0;
      const type = function () {
        if (i <= text.length) {
          roman.textContent = text.slice(0, i);
          i++;
          setTimeout(type, 130);
        }
      };
      setTimeout(type, 1100);
    }
  }

  /* ---------- Reveal on scroll ---------- */
  const revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    revealEls.forEach(function (el) {
      io.observe(el);
    });
  } else {
    revealEls.forEach(function (el) {
      el.classList.add("is-visible");
    });
  }

  /* ---------- Contact form (static, demo) ---------- */
  const form = document.getElementById("contactForm");
  const note = document.getElementById("formNote");

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.checkValidity()) {
        note.textContent = "未入力の必須項目があります。ご確認ください。";
        note.className = "form-note is-err";
        form.reportValidity();
        return;
      }
      // Static site: no backend. Show a confirmation message.
      note.textContent = "お問い合わせありがとうございます。内容を送信しました（デモ）。";
      note.className = "form-note is-ok";
      form.reset();
    });
  }
})();
