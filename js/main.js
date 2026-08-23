// Mobile nav toggle
const navToggle = document.querySelector(".nav-toggle");
const mobileNav = document.getElementById("mobile-nav");

if (navToggle && mobileNav) {
  navToggle.addEventListener("click", () => {
    const isOpen = mobileNav.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });

  mobileNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      mobileNav.classList.remove("open");
      navToggle.setAttribute("aria-expanded", "false");
    });
  });
}

// Fill placeholder image blocks with real photos when present in images/
function loadPhImage(el) {
  const filename = el.getAttribute("data-ph");
  const img = new Image();
  img.onload = () => {
    el.style.backgroundImage = `url("images/${filename}")`;
    el.style.backgroundSize = "cover";
    el.style.backgroundPosition = "center";
    el.classList.add("has-image");
    const label = el.querySelector(".ph-label");
    if (label) label.remove();
  };
  img.src = `images/${filename}`;
}

const phEls = document.querySelectorAll(".ph-image[data-ph]");

// The hero photo is now a native <img> loaded by the browser; everything
// else here is below the fold and loads only as it approaches the viewport.
const lazyEls = Array.from(phEls);
if ("IntersectionObserver" in window && lazyEls.length) {
  const imageObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          loadPhImage(entry.target);
          imageObserver.unobserve(entry.target);
        }
      });
    },
    { rootMargin: "600px 0px" }
  );
  lazyEls.forEach((el) => imageObserver.observe(el));
} else {
  lazyEls.forEach(loadPhImage);
}

// Cookie consent + Google Analytics (GA4)
const GA_MEASUREMENT_ID = "G-GFPRWQK6D2";
const CONSENT_KEY = "pinocchio-cookie-consent";

function loadGoogleAnalytics() {
  if (window.__gaLoaded) return;
  window.__gaLoaded = true;
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag("js", new Date());
  gtag("config", GA_MEASUREMENT_ID);
}

const cookieBanner = document.getElementById("cookie-banner");
const cookieAccept = document.getElementById("cookie-accept");
const cookieReject = document.getElementById("cookie-reject");
const cookieSettingsLink = document.getElementById("cookie-settings-link");

function showCookieBanner() {
  if (cookieBanner) cookieBanner.hidden = false;
}
function hideCookieBanner() {
  if (cookieBanner) cookieBanner.hidden = true;
}

const storedConsent = localStorage.getItem(CONSENT_KEY);
if (storedConsent === "accepted") {
  loadGoogleAnalytics();
} else if (storedConsent !== "rejected") {
  showCookieBanner();
}

if (cookieAccept) {
  cookieAccept.addEventListener("click", () => {
    localStorage.setItem(CONSENT_KEY, "accepted");
    hideCookieBanner();
    loadGoogleAnalytics();
  });
}
if (cookieReject) {
  cookieReject.addEventListener("click", () => {
    localStorage.setItem(CONSENT_KEY, "rejected");
    hideCookieBanner();
  });
}
if (cookieSettingsLink) {
  cookieSettingsLink.addEventListener("click", (e) => {
    e.preventDefault();
    showCookieBanner();
  });
}

// Scroll reveal
const revealEls = document.querySelectorAll("[data-reveal]");

if ("IntersectionObserver" in window && revealEls.length) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
  );
  revealEls.forEach((el) => observer.observe(el));
} else {
  revealEls.forEach((el) => el.classList.add("is-visible"));
}
