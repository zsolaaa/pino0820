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
    renderOrders(data.orders || []);
  } catch {
    ordersTableBody.innerHTML = '<tr><td colspan="7">Hálózati hiba történt a rendelések betöltésekor.</td></tr>';
  }
}

function renderOrders(orders) {
  if (!orders.length) {
    ordersTableBody.innerHTML = '<tr><td colspan="7">Nincs megjeleníthető rendelés.</td></tr>';
    return;
  }

  ordersTableBody.innerHTML = "";
  for (const order of orders) {
    const tr = document.createElement("tr");

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
  loadOrders();
}
