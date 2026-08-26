// penztar.html — cart review + checkout form.
// Depends on js/cart.js (window.PinocchioCart) being loaded first.

const itemsEl = document.getElementById("cart-items");
const summaryEl = document.getElementById("cart-summary");
const formSection = document.getElementById("checkout-form-section");
const form = document.getElementById("checkout-form");
const errorEl = document.getElementById("form-error");
const confirmationEl = document.getElementById("order-confirmation");
const deliveryFields = document.getElementById("delivery-fields");
const fulfillmentRadios = form ? form.querySelectorAll('input[name="fulfillment_type"]') : [];

const DELIVERY_FEE = 200;

function renderCartItems() {
  const cart = PinocchioCart.getCart();

  if (!cart.length) {
    itemsEl.innerHTML = '<p class="cart-empty">A kosarad üres. <a href="webshop.html">Nézd meg az étlapot</a> és válassz valamit!</p>';
    summaryEl.innerHTML = "";
    formSection.style.display = "none";
    return;
  }

  formSection.style.display = "";
  itemsEl.innerHTML = "";

  for (const line of cart) {
    const row = document.createElement("div");
    row.className = "cart-item";

    const modsText = (line.modifiers || []).map((m) => m.name).join(", ");

    row.innerHTML = `
      <div class="cart-item-body">
        <div class="cart-item-name">${line.name}</div>
        ${modsText ? `<div class="cart-item-mods">+ ${modsText}</div>` : ""}
        <div class="cart-item-controls">
          <button type="button" class="qty-btn" data-action="dec">−</button>
          <span>${line.quantity}</span>
          <button type="button" class="qty-btn" data-action="inc">+</button>
          <button type="button" class="cart-item-remove">Eltávolítás</button>
        </div>
      </div>
      <div class="cart-item-price">${PinocchioCart.formatHuf(PinocchioCart.lineTotal(line))}</div>
    `;

    row.querySelector('[data-action="dec"]').addEventListener("click", () => {
      PinocchioCart.updateLineQuantity(line.line_id, line.quantity - 1);
    });
    row.querySelector('[data-action="inc"]').addEventListener("click", () => {
      PinocchioCart.updateLineQuantity(line.line_id, line.quantity + 1);
    });
    row.querySelector(".cart-item-remove").addEventListener("click", () => {
      PinocchioCart.removeLine(line.line_id);
    });

    itemsEl.appendChild(row);
  }

  renderSummary(cart);
}

function renderSummary(cart) {
  if (!cart.length) {
    summaryEl.innerHTML = "";
    return;
  }
  const subtotal = PinocchioCart.cartSubtotal(cart);
  const isDelivery = getFulfillmentType() === "delivery";
  const deliveryFee = isDelivery ? DELIVERY_FEE : 0;
  const total = subtotal + deliveryFee;

  summaryEl.innerHTML = `
    <div class="summary-row"><span>Részösszeg</span><span>${PinocchioCart.formatHuf(subtotal)}</span></div>
    <div class="summary-row"><span>Szállítási díj</span><span>${isDelivery ? PinocchioCart.formatHuf(deliveryFee) : "—"}</span></div>
    <div class="summary-row total"><span>Összesen</span><span>${PinocchioCart.formatHuf(total)}</span></div>
  `;
}

function getFulfillmentType() {
  const checked = Array.from(fulfillmentRadios).find((r) => r.checked);
  return checked ? checked.value : "pickup";
}

function updateDeliveryFieldVisibility() {
  const isDelivery = getFulfillmentType() === "delivery";
  deliveryFields.style.display = isDelivery ? "" : "none";
  deliveryFields.querySelector("input").required = isDelivery;
  renderSummary(PinocchioCart.getCart());
}

fulfillmentRadios.forEach((radio) => radio.addEventListener("change", updateDeliveryFieldVisibility));
window.addEventListener("cart:updated", renderCartItems);

function showError(message) {
  errorEl.textContent = message;
  errorEl.style.display = "";
}
function hideError() {
  errorEl.style.display = "none";
}

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideError();

    const cart = PinocchioCart.getCart();
    if (!cart.length) {
      showError("A kosarad üres.");
      return;
    }

    const turnstileInput = document.querySelector('[name="cf-turnstile-response"]');
    const turnstileToken = turnstileInput ? turnstileInput.value : "";
    if (typeof window.turnstile !== "undefined" && !turnstileToken) {
      showError("Kérjük, végezd el a biztonsági ellenőrzést a gomb felett.");
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = "Küldés...";

    const payload = {
      fulfillment_type: getFulfillmentType(),
      customer_name: form.customer_name.value.trim(),
      customer_phone: form.customer_phone.value.trim(),
      customer_email: form.customer_email.value.trim() || null,
      delivery_address: form.delivery_address.value.trim() || null,
      notes: form.notes.value.trim() || null,
      payment_method: form.payment_method.value,
      turnstile_token: turnstileToken,
      items: cart.map((line) => ({
        product_id: line.product_id,
        quantity: line.quantity,
        modifier_product_ids: (line.modifiers || []).map((m) => m.product_id),
      })),
    };

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        showError(data.error || "Nem sikerült elküldeni a rendelést.");
        submitBtn.disabled = false;
        submitBtn.textContent = "Rendelés leadása";
        if (typeof window.turnstile !== "undefined") window.turnstile.reset();
        return;
      }

      PinocchioCart.clearCart();
      formSection.style.display = "none";
      document.getElementById("cart-review-section").style.display = "none";
      confirmationEl.style.display = "";
      confirmationEl.querySelector(".order-number").textContent = data.order.order_number;
      confirmationEl.querySelector(".order-total").textContent = PinocchioCart.formatHuf(data.order.total);
    } catch (err) {
      showError("Hálózati hiba történt. Próbáld újra, vagy hívj minket telefonon.");
      submitBtn.disabled = false;
      submitBtn.textContent = "Rendelés leadása";
      if (typeof window.turnstile !== "undefined") window.turnstile.reset();
    }
  });
}

if (window.ORDERING_ENABLED) {
  renderCartItems();
  updateDeliveryFieldVisibility();
} else {
  const notice = document.getElementById("ordering-paused-notice");
  if (notice) notice.hidden = false;
  document.getElementById("cart-review-section").style.display = "none";
  formSection.style.display = "none";
}
