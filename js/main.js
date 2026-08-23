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

// Hero image is above the fold: load it immediately for the best LCP.
const eagerEl = document.querySelector(".hero-image.ph-image[data-ph]");
if (eagerEl) loadPhImage(eagerEl);

// Everything else loads only as it approaches the viewport.
const lazyEls = Array.from(phEls).filter((el) => el !== eagerEl);
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
