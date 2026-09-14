// penztar.html — cart review + checkout form.
// Depends on js/cart.js (window.PinocchioCart) being loaded first.

const itemsEl = document.getElementById("cart-items");
const summaryEl = document.getElementById("cart-summary");
const priceNoticeEl = document.getElementById("price-update-notice");
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

// The cart lives in localStorage with prices frozen at add-to-cart time, so
// they can go stale (a customer parks a full cart for days, or a price
// changes while items already sit in one). This is purely a UX check — the
// server always re-prices from the DB at order creation regardless — but
// showing the customer a mismatched total before they submit is bad trust,
// so the checkout page reconciles against current prices once on load.
function reconcileCartPrices(cart, products) {
  const priceById = new Map(products.map((p) => [p.id, p.price]));
  let changed = false;

  const reconciled = cart.map((line) => {
    const currentPrice = priceById.get(line.product_id);
    const priceChanged = currentPrice != null && currentPrice !== line.price;

    const newModifiers = (line.modifiers || []).map((mod) => {
      const modCurrentPrice = priceById.get(mod.product_id);
      if (modCurrentPrice != null && modCurrentPrice !== mod.price) {
        changed = true;
        return { ...mod, price: modCurrentPrice };
      }
      return mod;
    });

    if (priceChanged) changed = true;
    if (!priceChanged && newModifiers === line.modifiers) return line;
    return { ...line, price: priceChanged ? currentPrice : line.price, modifiers: newModifiers };
  });

  return { cart: reconciled, changed };
}

async function reconcilePricesOnce() {
  const cart = PinocchioCart.getCart();
  if (!cart.length) return;

  try {
    const res = await fetch("/api/products");
    if (!res.ok) return;
    const data = await res.json();
    const { cart: reconciled, changed } = reconcileCartPrices(cart, data.products || []);
    if (changed) {
      PinocchioCart.saveCart(reconciled);
      if (priceNoticeEl) {
        priceNoticeEl.textContent =
          "Egy vagy több tétel ára frissült a legutóbbi látogatásod óta — az alábbi árak már az aktuálisak.";
        priceNoticeEl.hidden = false;
      }
    }
  } catch {
    // Silent: this is a UX nicety, not the price source of truth.
  }
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

    function failSubmit(message) {
      showError(message);
      submitBtn.disabled = false;
      submitBtn.textContent = "Rendelés leadása";
      if (typeof window.turnstile !== "undefined") window.turnstile.reset();
    }

    // Only the request itself may fall back to the retry message. Anything
    // after a successful response runs outside this try: once the order
    // exists, telling the customer to try again would have them order twice.
    let res;
    let data;
    try {
      res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      data = await res.json();
    } catch (err) {
      failSubmit("Hálózati hiba történt. Próbáld újra, vagy hívj minket telefonon.");
      return;
    }

    if (!res.ok) {
      failSubmit(data.error || "Nem sikerült elküldeni a rendelést.");
      return;
    }

    PinocchioCart.clearCart();
    formSection.style.display = "none";
    document.getElementById("cart-review-section").style.display = "none";
    confirmationEl.style.display = "";
    confirmationEl.querySelector(".order-number").textContent = data.order.order_number;
    confirmationEl.querySelector(".order-total").textContent = PinocchioCart.formatHuf(data.order.total);
  });
}

(async function init() {
  if (!window.ORDERING_ENABLED) {
    const notice = document.getElementById("ordering-paused-notice");
    if (notice) notice.hidden = false;
    document.getElementById("cart-review-section").style.display = "none";
    formSection.style.display = "none";
    return;
  }

  const status = await PinocchioCart.fetchShopStatus();
  const blocked = PinocchioCart.orderingBlockedInfo(status);
  if (blocked) {
    const notice = document.getElementById("temp-pause-notice");
    const title = document.getElementById("temp-pause-title");
    const message = document.getElementById("temp-pause-message");
    if (title) title.textContent = blocked.title;
    if (message) message.textContent = blocked.message;
    if (notice) notice.hidden = false;
    document.getElementById("cart-review-section").style.display = "none";
    formSection.style.display = "none";
    return;
  }

  await reconcilePricesOnce();
  renderCartItems();
  updateDeliveryFieldVisibility();
})();
