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
