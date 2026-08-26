// Shared cart module (localStorage-backed) used by webshop.html and penztar.html.
// Cart line shape: { line_id, product_id, name, price, quantity, modifiers: [{product_id, name, price}] }

const CART_KEY = "pinocchio-cart";

function getCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    const cart = raw ? JSON.parse(raw) : [];
    return Array.isArray(cart) ? cart : [];
  } catch {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
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
};
