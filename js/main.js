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

// Gallery lightbox
const galleryImages = Array.from(document.querySelectorAll(".gallery-image"));
const lightbox = document.getElementById("lightbox");

if (galleryImages.length && lightbox) {
  const lbImg = lightbox.querySelector(".lightbox-img");
  const lbCaption = lightbox.querySelector(".lightbox-caption");
  const lbCount = lightbox.querySelector(".lightbox-count");
  const lbClose = lightbox.querySelector(".lightbox-close");
  const lbPrev = lightbox.querySelector(".lightbox-prev");
  const lbNext = lightbox.querySelector(".lightbox-next");
  const focusables = [lbClose, lbPrev, lbNext];
  let currentIndex = 0;
  let lastFocused = null;

  function render(index) {
    currentIndex = (index + galleryImages.length) % galleryImages.length;
    const source = galleryImages[currentIndex];
    lbImg.src = source.currentSrc || source.src;
    lbImg.alt = source.alt;
    lbCaption.textContent = source.alt;
    lbCount.textContent = `${currentIndex + 1} / ${galleryImages.length}`;
  }

  function openLightbox(index) {
    lastFocused = document.activeElement;
    render(index);
    lightbox.hidden = false;
    document.body.style.overflow = "hidden";
    lbClose.focus();
  }

  function closeLightbox() {
    lightbox.hidden = true;
    document.body.style.overflow = "";
    if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
  }

  galleryImages.forEach((img, index) => {
    img.addEventListener("click", () => openLightbox(index));
    img.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openLightbox(index);
      }
    });
  });

  lbClose.addEventListener("click", closeLightbox);
  lbPrev.addEventListener("click", () => render(currentIndex - 1));
  lbNext.addEventListener("click", () => render(currentIndex + 1));

  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox || e.target.classList.contains("lightbox-figure")) {
      closeLightbox();
    }
  });

  lightbox.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeLightbox();
    } else if (e.key === "ArrowLeft") {
      render(currentIndex - 1);
    } else if (e.key === "ArrowRight") {
      render(currentIndex + 1);
    } else if (e.key === "Tab") {
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });
}
