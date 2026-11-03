// Single source of truth for the site's pages. Renders the header (logo + Menu dropdown)
// in place, and exposes SITE_PAGES so the home page can build its cards from the same list.
(function () {
  var NAME = "Abhi’s Content System";

  var PAGES = [
    {
      href: "topics.html", name: "Writing Topics", color: "#E0A82E", tint: "#FFF1C9", count: "230 prompts",
      desc: "Every writing prompt across 12 pillars, searchable, with today’s pick highlighted.",
      icon: '<svg class="icon" viewBox="0 0 72 72" aria-hidden="true"><rect x="14" y="12" width="40" height="50" rx="8" fill="#F6D27A"/><rect x="20" y="8" width="40" height="50" rx="8" fill="#E0A82E"/><rect x="28" y="20" width="24" height="4" rx="2" fill="#fff"/><rect x="28" y="30" width="24" height="4" rx="2" fill="#fff" opacity=".8"/><rect x="28" y="40" width="14" height="4" rx="2" fill="#fff" opacity=".6"/></svg>'
    },
    {
      href: "broll.html", name: "B-roll ideas", color: "#F08C66", tint: "#FFE1D2", count: "104 shots",
      desc: "The full shot list for founder films, plus a new shooting tip every visit.",
      icon: '<svg class="icon" viewBox="0 0 72 72" aria-hidden="true"><rect x="10" y="28" width="52" height="34" rx="8" fill="#F08C66"/><path d="M12 16 L58 10 L60 22 L14 28 Z" fill="#F8B79C"/><path d="M22 14.7 L28 26.3 M36 12.9 L42 24.5 M50 11.1 L55 22.6" stroke="#fff" stroke-width="5" stroke-linecap="round"/><circle cx="36" cy="45" r="8" fill="#fff" opacity=".85"/></svg>'
    },
    {
      href: "reels.html", name: "Reel ideas", color: "#9A87F0", tint: "#E9E3FF", count: "100 ideas",
      desc: "Short-form ideas across Seen, Helped and Belong. Three fresh picks every Monday.",
      icon: '<svg class="icon" viewBox="0 0 72 72" aria-hidden="true"><rect x="20" y="6" width="32" height="60" rx="9" fill="#9A87F0"/><rect x="24" y="12" width="24" height="44" rx="5" fill="#C9BEFA"/><path d="M32 26 L44 34 L32 42 Z" fill="#fff"/><rect x="31" y="59" width="10" height="3" rx="1.5" fill="#fff" opacity=".8"/></svg>'
    },
    {
      href: "ads.html", name: "Ads", color: "#4FB585", tint: "#D9F4E6", count: "39 formats",
      desc: "Ad angles and formats, grouped by when to reach for them. Ship 6–8, not all 39.",
      icon: '<svg class="icon" viewBox="0 0 72 72" aria-hidden="true"><path d="M14 30 L46 14 L46 54 L14 40 Z" fill="#4FB585"/><rect x="8" y="28" width="12" height="14" rx="4" fill="#8FD6B2"/><path d="M20 42 L26 58 L34 58 L30 44 Z" fill="#8FD6B2"/><path d="M54 24 Q60 34 54 44" stroke="#4FB585" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M60 18 Q70 34 60 50" stroke="#8FD6B2" stroke-width="4" fill="none" stroke-linecap="round"/></svg>'
    },
    {
      href: "streams.html", name: "Streams", color: "#5E9FE6", tint: "#DCEEFF", count: "8 moves",
      desc: "A livestreaming playbook for new reach, with Dopami’s body-doubling streams as the example.",
      icon: '<svg class="icon" viewBox="0 0 72 72" aria-hidden="true"><circle cx="36" cy="38" r="9" fill="#5E9FE6"/><path d="M22 52 A20 20 0 0 1 22 24" stroke="#A9CCF4" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M50 24 A20 20 0 0 1 50 52" stroke="#A9CCF4" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M13 60 A32 32 0 0 1 13 16" stroke="#5E9FE6" stroke-width="5" fill="none" stroke-linecap="round" opacity=".6"/><path d="M59 16 A32 32 0 0 1 59 60" stroke="#5E9FE6" stroke-width="5" fill="none" stroke-linecap="round" opacity=".6"/></svg>'
    },
    {
      href: "linkedin.html", name: "LinkedIn", color: "#E97FA3", tint: "#FFE0EA", count: "50 / month",
      desc: "50 fresh ADHD prompts every month, plus the 28 posting tactics that help them land.",
      icon: '<svg class="icon" viewBox="0 0 72 72" aria-hidden="true"><path d="M10 18 Q10 10 18 10 H54 Q62 10 62 18 V42 Q62 50 54 50 H30 L18 60 V50 Q10 50 10 42 Z" fill="#E97FA3"/><rect x="20" y="21" width="32" height="4" rx="2" fill="#fff"/><rect x="20" y="31" width="22" height="4" rx="2" fill="#fff" opacity=".75"/><circle cx="56" cy="56" r="9" fill="#F6B8CD"/><path d="M52 56 L55 59 L60 53" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    }
  ];

  window.SITE_NAME = NAME;
  window.SITE_PAGES = PAGES;

  var here = location.pathname.split("/").pop() || "index.html";

  function link(href, label, color, mix) {
    var current = here === href ? ' aria-current="page"' : "";
    return '<a href="' + href + '"' + current + ' style="--c:' + color + (mix ? ";--m:" + mix : "") + '"><span class="swatch"></span>' + label + "</a>";
  }

  var items = link("index.html", "Home", "var(--ink)", "7%") + "<hr />" +
    PAGES.map(function (p) { return link(p.href, p.name, p.color); }).join("");

  var html =
    '<div class="nav">' +
      '<a class="brand" href="index.html"><img class="avatar" src="assets/avatar.png" alt="" width="56" height="56" /><span>' + NAME + "</span></a>" +
      '<div class="menu" id="site-menu">' +
        '<button class="menu-btn" type="button" aria-expanded="false" aria-controls="site-menu-panel"><span>Menu</span>' +
          '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 6 L8 10.5 L12.5 6"/></svg>' +
        "</button>" +
        '<nav class="menu-panel" id="site-menu-panel" aria-label="Pages">' + items + "</nav>" +
      "</div>" +
    "</div>";

  document.currentScript.insertAdjacentHTML("beforebegin", html);

  var menu = document.getElementById("site-menu");
  var btn = menu.querySelector(".menu-btn");
  function setOpen(open) {
    menu.classList.toggle("is-open", open);
    btn.setAttribute("aria-expanded", open ? "true" : "false");
  }
  btn.addEventListener("click", function () { setOpen(!menu.classList.contains("is-open")); });
  document.addEventListener("click", function (e) { if (!menu.contains(e.target)) setOpen(false); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && menu.classList.contains("is-open")) { setOpen(false); btn.focus(); }
  });
  menu.addEventListener("focusout", function (e) {
    if (e.relatedTarget && !menu.contains(e.relatedTarget)) setOpen(false);
  });
})();
