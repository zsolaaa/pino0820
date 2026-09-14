// Shared cart module (localStorage-backed) used by webshop.html and penztar.html.
// Cart line shape: { line_id, product_id, name, price, quantity, modifiers: [{product_id, name, price}] }

// Temporary kill switch for online ordering — mirrors functions/_lib/config.js.
// Flip both to true once the lawyer-reviewed privacy policy / ÁSZF is ready.
window.ORDERING_ENABLED = false;

const CART_KEY = "pinocchio-cart";

// localStorage isn't always writable — private browsing, blocked site data and
// a full quota all make setItem throw. Rather than letting that bubble up
// through every cart action, the cart falls back to memory for the session:
// ordering still works end to end, it just doesn't survive a reload.
// null = storage is in use; an array = storage failed and this is the cart.
let memoryCart = null;

function getCart() {
  if (memoryCart) return memoryCart;
  try {
    const raw = localStorage.getItem(CART_KEY);
    const cart = raw ? JSON.parse(raw) : [];
    return Array.isArray(cart) ? cart : [];
  } catch {
    return [];
  }
}

function saveCart(cart) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    memoryCart = null;
  } catch {
    memoryCart = cart;
  }
  window.dispatchEvent(new CustomEvent("cart:updated", { detail: { cart } }));
}

function makeLineId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function addToCart({ product_id, name, price, quantity, modifiers = [] }) {
  const cart = getCart();
  cart.push({ line_id: makeLineId(), product_id, name, price, quantity, modifiers });
  saveCart(cart);
}

function removeLine(lineId) {
  saveCart(getCart().filter((l) => l.line_id !== lineId));
}

function updateLineQuantity(lineId, quantity) {
  const cart = getCart();
  const line = cart.find((l) => l.line_id === lineId);
  if (!line) return;
  if (quantity < 1) {
    removeLine(lineId);
    return;
  }
  line.quantity = quantity;
  saveCart(cart);
}

function clearCart() {
  saveCart([]);
}

function lineUnitTotal(line) {
  const modsSum = (line.modifiers || []).reduce((sum, m) => sum + m.price, 0);
  return line.price + modsSum;
}

function lineTotal(line) {
  return lineUnitTotal(line) * line.quantity;
}

function cartCount(cart) {
  return cart.reduce((sum, l) => sum + l.quantity, 0);
}

function cartSubtotal(cart) {
  return cart.reduce((sum, l) => sum + lineTotal(l), 0);
}

function formatHuf(amount) {
  return `${amount.toLocaleString("hu-HU")} Ft`;
}

// Current ordering availability: the admin-toggleable temporary pause plus
// the opening-hours window (both computed server-side). Separate from the
// permanent ORDERING_ENABLED kill switch above. Fails open — a transient
// network/API error never blocks ordering on its own; the order-creation
// endpoint enforces both rules either way.
const SHOP_STATUS_FALLBACK = {
  is_paused: false,
  reason: null,
  paused_until: null,
  is_open: true,
  opens_at: null,
  last_order_at: null,
};

async function fetchShopStatus() {
  try {
    const res = await fetch("/api/shop-status");
    if (!res.ok) return { ...SHOP_STATUS_FALLBACK };
    return await res.json();
  } catch {
    return { ...SHOP_STATUS_FALLBACK };
  }
}

// Returns the banner copy + short button label when ordering is blocked,
// or null when orders can be taken right now.
function orderingBlockedInfo(status) {
  if (status.is_paused) {
    return {
      title: "Átmenetileg szünetel az online rendelés",
      message: formatPauseMessage(status.paused_until),
      buttonLabel: "Szünetel",
    };
  }
  if (status.is_open === false) {
    return {
      title: "Most zárva vagyunk",
      message: `Online rendelést minden nap ${status.opens_at} és ${status.last_order_at} között tudsz leadni.`,
      buttonLabel: "Zárva",
    };
  }
  return null;
}

function formatPauseMessage(pausedUntil) {
  if (!pausedUntil) {
    return "Jelenleg átmenetileg nem fogadunk online rendeléseket. Kérjük, próbálja meg később.";
  }
  const until = new Date(pausedUntil.replace(" ", "T") + "Z");
  const timeStr = until.toLocaleTimeString("hu-HU", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Budapest",
  });
  return `Jelenleg átmenetileg nem fogadunk online rendeléseket. Kérjük, próbálja meg ${timeStr} után újra.`;
}

window.PinocchioCart = {
  getCart,
  saveCart,
  addToCart,
  removeLine,
  updateLineQuantity,
  clearCart,
  lineUnitTotal,
  lineTotal,
  cartCount,
  cartSubtotal,
  formatHuf,
  fetchShopStatus,
  formatPauseMessage,
  orderingBlockedInfo,
};
