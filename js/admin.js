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

const AUTO_REFRESH_MS = 20000;
const SOUND_PREF_KEY = "pinocchio-admin-sound";

let knownOrderIds = null; // null = first load, no alert yet

function isSoundOn() {
  return localStorage.getItem(SOUND_PREF_KEY) !== "off";
}

function setSoundOn(on) {
  localStorage.setItem(SOUND_PREF_KEY, on ? "on" : "off");
  if (soundToggle) soundToggle.textContent = on ? "🔊 Hang be" : "🔇 Hang ki";
}

// Two short beeps via Web Audio API — no audio file needed.
function playNewOrderSound() {
  if (!isSoundOn()) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.22].forEach((delay) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + 0.18);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.2);
    });
  } catch {
    // Web Audio unsupported/blocked — silently skip, the visual highlight still shows.
  }
}

async function loadOrders() {
  if (!ordersTableBody) return;

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
    });

    tr.children[5].appendChild(statusSelect);
    tr.children[6].innerHTML = `<span class="status-badge ${order.payment_status}">${
      order.payment_status === "paid" ? "Fizetve" : "Fizetetlen"
    }</span>`;

    ordersTableBody.appendChild(tr);
  }
}

if (ordersTableBody) {
  refreshBtn.addEventListener("click", loadOrders);
  statusFilter.addEventListener("change", loadOrders);
  logoutBtn.addEventListener("click", async () => {
    await fetch("/api/admin/logout", { method: "POST", credentials: "same-origin" });
    window.location.href = "login.html";
  });

  if (soundToggle) {
    setSoundOn(isSoundOn());
    soundToggle.addEventListener("click", () => setSoundOn(!isSoundOn()));
  }

  loadOrders();
  setInterval(loadOrders, AUTO_REFRESH_MS);
}
