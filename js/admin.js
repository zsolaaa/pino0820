// admin/login.html + admin/rendelesek.html — shared admin script.

const STATUS_LABELS = {
  new: "Új",
  preparing: "Készül",
  ready: "Kész",
  completed: "Lezárva",
  cancelled: "Törölve",
};
const STATUSES = Object.keys(STATUS_LABELS);

const loginForm = document.getElementById("admin-login-form");
const loginError = document.getElementById("admin-login-error");

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    loginError.style.display = "none";
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: loginForm.password.value }),
      });
      const data = await res.json();
      if (!res.ok) {
        loginError.textContent = data.error || "Hibás jelszó.";
        loginError.style.display = "";
        submitBtn.disabled = false;
        return;
      }
      window.location.href = "rendelesek.html";
    } catch {
      loginError.textContent = "Hálózati hiba történt.";
      loginError.style.display = "";
      submitBtn.disabled = false;
    }
  });
}

const ordersTableBody = document.getElementById("orders-table-body");
const refreshBtn = document.getElementById("refresh-orders");
const statusFilter = document.getElementById("status-filter");
const logoutBtn = document.getElementById("admin-logout");
const soundToggle = document.getElementById("sound-toggle");
const volumeSlider = document.getElementById("volume-slider");
const testSoundBtn = document.getElementById("test-sound");

const AUTO_REFRESH_MS = 20000;
const SOUND_PREF_KEY = "pinocchio-admin-sound";
const VOLUME_PREF_KEY = "pinocchio-admin-volume";

let knownOrderIds = null; // null = first load, no alert yet

function isSoundOn() {
  return localStorage.getItem(SOUND_PREF_KEY) !== "off";
}

function setSoundOn(on) {
  localStorage.setItem(SOUND_PREF_KEY, on ? "on" : "off");
  if (soundToggle) soundToggle.textContent = on ? "🔊 Hang be" : "🔇 Hang ki";
}

function getVolume() {
  const stored = parseInt(localStorage.getItem(VOLUME_PREF_KEY), 10);
  return Number.isFinite(stored) ? Math.min(100, Math.max(0, stored)) / 100 : 0.8;
}

function setVolume(value) {
  localStorage.setItem(VOLUME_PREF_KEY, String(value));
}

// Browsers (Safari/iOS especially) only allow Web Audio to actually produce
// sound if the AudioContext was created/resumed inside a real user gesture
// (click/tap/keydown). Our alert fires from a setInterval callback, which has
// no gesture — so we create ONE context up front and "unlock" it on the very
// first tap anywhere on the page, then reuse + resume() it for every alert.
let sharedAudioCtx = null;

function getAudioContext() {
  if (!sharedAudioCtx) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    sharedAudioCtx = new Ctor();
  }
  return sharedAudioCtx;
}

function unlockAudio() {
  const ctx = getAudioContext();
  if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
}
["click", "touchstart", "keydown"].forEach((evt) =>
  document.addEventListener(evt, unlockAudio, { passive: true })
);

function playTone(ctx, { delay, duration, frequency, peakGain }) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "square";
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, ctx.currentTime + delay);
  gain.gain.exponentialRampToValueAtTime(Math.max(peakGain, 0.0002), ctx.currentTime + delay + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(ctx.currentTime + delay);
  osc.stop(ctx.currentTime + delay + duration + 0.02);
}

function playAlarmPattern(volume) {
  const ctx = getAudioContext();
  if (!ctx) return;
  const resumed = ctx.state === "suspended" ? ctx.resume().catch(() => {}) : Promise.resolve();

  resumed.then(() => {
    const pulseDuration = 0.16;
    const frequencies = [1046, 784]; // alternating two-tone siren
    for (let i = 0; i < 8; i++) {
      playTone(ctx, {
        delay: i * pulseDuration,
        duration: pulseDuration,
        frequency: frequencies[i % 2],
        peakGain: 0.9 * volume,
      });
    }
  });
}

// Loud, siren-style alarm (square wave, alternating high/low pitch, several
// pulses) — designed to cut through a noisy kitchen, unlike a single soft beep.
function playNewOrderSound() {
  if (!isSoundOn()) return;
  const volume = getVolume();
  if (volume <= 0) return;
  playAlarmPattern(volume);
}

// Always plays, ignoring the mute toggle — lets staff confirm the device can
// actually produce sound at all, independent of the alert on/off preference.
function playTestSound() {
  playAlarmPattern(Math.max(getVolume(), 0.5));
}

// Short single beep at the current volume, used to preview the slider and to
// let staff manually confirm the alert is actually audible on their device.
function playPreviewBeep() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const resumed = ctx.state === "suspended" ? ctx.resume().catch(() => {}) : Promise.resolve();
  resumed.then(() => {
    playTone(ctx, { delay: 0, duration: 0.18, frequency: 1046, peakGain: 0.9 * getVolume() });
  });
}

const summaryOrderCount = document.getElementById("summary-order-count");
const summaryRevenue = document.getElementById("summary-revenue");

async function loadSummary() {
  if (!summaryOrderCount) return;

  try {
    const res = await fetch("/api/admin/orders/summary", { credentials: "same-origin" });
    if (res.status === 401) {
      window.location.href = "login.html";
      return;
    }
    if (!res.ok) return;

    const data = await res.json();
    summaryOrderCount.textContent = String(data.order_count);
    summaryRevenue.textContent = PinocchioCart.formatHuf(data.revenue);
  } catch {
    // Silent: the summary tiles just keep their last known values on a transient error.
  }
}

async function loadOrders() {
  if (!ordersTableBody) return;

  loadSummary();

  const filter = statusFilter.value;
  const url = filter ? `/api/admin/orders?status=${encodeURIComponent(filter)}` : "/api/admin/orders";

  try {
    const res = await fetch(url, { credentials: "same-origin" });

    if (res.status === 401) {
      window.location.href = "login.html";
      return;
    }

    if (!res.ok) {
      ordersTableBody.innerHTML = '<tr><td colspan="7">Nem sikerült betölteni a rendeléseket.</td></tr>';
      return;
    }

    const data = await res.json();
    const orders = data.orders || [];

    const currentIds = new Set(orders.map((o) => o.id));
    const newIds = knownOrderIds
      ? new Set([...currentIds].filter((id) => !knownOrderIds.has(id)))
      : new Set();
    if (knownOrderIds && newIds.size > 0) playNewOrderSound();
    knownOrderIds = currentIds;

    renderOrders(orders, newIds);
  } catch {
    ordersTableBody.innerHTML = '<tr><td colspan="7">Hálózati hiba történt a rendelések betöltésekor.</td></tr>';
  }
}

function renderOrders(orders, newIds = new Set()) {
  if (!orders.length) {
    ordersTableBody.innerHTML = '<tr><td colspan="7">Nincs megjeleníthető rendelés.</td></tr>';
    return;
  }

  ordersTableBody.innerHTML = "";
  for (const order of orders) {
    const tr = document.createElement("tr");
    if (newIds.has(order.id)) tr.className = "new-order-flash";

    const itemsList = order.items
      .map((item) => {
        const mods = (item.modifiers || []).map((m) => m.name).join(", ");
        return `<li>${item.quantity}× ${item.product_name}${mods ? ` (+${mods})` : ""}</li>`;
      })
      .join("");

    const fulfillment = order.fulfillment_type === "delivery" ? "Szállítás" : "Elvitel";
    const address = order.fulfillment_type === "delivery" ? `<br>${order.delivery_address}` : "";

    tr.innerHTML = `
      <td>${order.order_number}<br><small>${new Date(order.created_at).toLocaleString("hu-HU")}</small></td>
      <td>${order.customer_name}<br><a href="tel:${order.customer_phone}">${order.customer_phone}</a></td>
      <td>${fulfillment}${address}${order.notes ? `<br><em>${order.notes}</em>` : ""}</td>
      <td class="order-items-cell"><ul>${itemsList}</ul></td>
      <td>${PinocchioCart.formatHuf(order.total)}</td>
      <td></td>
      <td></td>
    `;

    const statusSelect = document.createElement("select");
    statusSelect.className = "status-select";
    for (const s of STATUSES) {
      const opt = document.createElement("option");
      opt.value = s;
      opt.textContent = STATUS_LABELS[s];
      if (s === order.status) opt.selected = true;
      statusSelect.appendChild(opt);
    }
    statusSelect.addEventListener("change", async () => {
      statusSelect.disabled = true;
      const res = await fetch(`/api/admin/orders/${order.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ status: statusSelect.value }),
      });
      if (res.status === 401) {
        window.location.href = "login.html";
        return;
      }
      statusSelect.disabled = false;
      loadSummary();
    });

    tr.children[5].appendChild(statusSelect);
    tr.children[6].innerHTML = `<span class="status-badge ${order.payment_status}">${
      order.payment_status === "paid" ? "Fizetve" : "Fizetetlen"
    }</span>`;

    ordersTableBody.appendChild(tr);
  }
}

const productsList = document.getElementById("products-list");

async function loadProducts() {
  if (!productsList) return;

  try {
    const res = await fetch("/api/admin/products", { credentials: "same-origin" });

    if (res.status === 401) {
      window.location.href = "login.html";
      return;
    }

    if (!res.ok) {
      productsList.textContent = "Nem sikerült betölteni a termékeket.";
      return;
    }

    const data = await res.json();
    renderProducts(data.products || []);
  } catch {
    productsList.textContent = "Hálózati hiba történt a termékek betöltésekor.";
  }
}

function renderProducts(products) {
  if (!products.length) {
    productsList.textContent = "Nincs megjeleníthető termék.";
    return;
  }

  const byCategory = new Map();
  for (const p of products) {
    if (!byCategory.has(p.category)) byCategory.set(p.category, []);
    byCategory.get(p.category).push(p);
  }

  productsList.innerHTML = "";
  for (const [category, items] of byCategory) {
    const section = document.createElement("div");
    section.className = "product-category";

    const heading = document.createElement("h2");
    heading.textContent = category;
    section.appendChild(heading);

    for (const product of items) {
      section.appendChild(renderProductRow(product));
    }

    productsList.appendChild(section);
  }
}

function renderProductRow(product) {
  const row = document.createElement("div");
  row.className = "product-row" + (product.is_available ? "" : " is-unavailable");

  const info = document.createElement("div");
  info.innerHTML = `<span class="product-name">${product.name}</span><span class="product-price">${PinocchioCart.formatHuf(product.price)}</span>`;
  row.appendChild(info);

  const toggleWrap = document.createElement("label");
  toggleWrap.className = "availability-toggle";

  const toggleLabel = document.createElement("span");
  toggleLabel.className = "availability-toggle-label";
  toggleLabel.textContent = product.is_available ? "Elérhető" : "Elfogyott";
  toggleWrap.appendChild(toggleLabel);

  const switchEl = document.createElement("span");
  switchEl.className = "switch";
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = product.is_available;
  const track = document.createElement("span");
  track.className = "switch-track";
  switchEl.appendChild(checkbox);
  switchEl.appendChild(track);
  toggleWrap.appendChild(switchEl);
  row.appendChild(toggleWrap);

  checkbox.addEventListener("change", async () => {
    checkbox.disabled = true;
    const nextAvailable = checkbox.checked;
    const res = await fetch(`/api/admin/products/${product.id}/availability`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ is_available: nextAvailable }),
    });
    if (res.status === 401) {
      window.location.href = "login.html";
      return;
    }
    if (!res.ok) {
      checkbox.checked = !nextAvailable; // revert on failure
      checkbox.disabled = false;
      return;
    }
    row.classList.toggle("is-unavailable", !nextAvailable);
    toggleLabel.textContent = nextAvailable ? "Elérhető" : "Elfogyott";
    checkbox.disabled = false;
  });

  return row;
}

if (productsList) {
  loadProducts();
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await fetch("/api/admin/logout", { method: "POST", credentials: "same-origin" });
    window.location.href = "login.html";
  });
}

if (ordersTableBody) {
  refreshBtn.addEventListener("click", loadOrders);
  statusFilter.addEventListener("change", loadOrders);

  if (soundToggle) {
    setSoundOn(isSoundOn());
    soundToggle.addEventListener("click", () => setSoundOn(!isSoundOn()));
  }

  if (volumeSlider) {
    volumeSlider.value = String(Math.round(getVolume() * 100));
    volumeSlider.addEventListener("input", () => setVolume(volumeSlider.value));
    volumeSlider.addEventListener("change", () => playPreviewBeep());
  }

  if (testSoundBtn) {
    testSoundBtn.addEventListener("click", () => playTestSound());
  }

  loadOrders();
  setInterval(loadOrders, AUTO_REFRESH_MS);
}
