// webshop.html — product grid, category tabs, topping picker, cart bar.
// Depends on js/cart.js (window.PinocchioCart) being loaded first.

// "Extra feltétek" is deliberately excluded — those products aren't a
// browsable category, they're only offered as toppings via the modifier
// picker on Pizzák/Pasta cards (see renderGrid's showModifiers check below).
// "Italok" and "Üdítők & kávé" are excluded too — not orderable online.
const CATEGORY_ORDER = ["Pizzák", "Pasta", "Saláta", "Desszertek"];
const MODIFIER_SUBCATEGORY_ORDER = ["Sajtok", "Húsok", "Zöldségek"];

const grid = document.getElementById("product-grid");
const tabsEl = document.getElementById("category-tabs");
const cartBar = document.getElementById("cart-bar");
const cartBarInfo = document.getElementById("cart-bar-info");

let allProducts = [];
let activeCategory = null;

async function fetchProducts() {
  const res = await fetch("/api/products");
  if (!res.ok) throw new Error("Nem sikerült betölteni a termékeket.");
  const data = await res.json();
  return data.products;
}

function renderTabs(categories) {
  tabsEl.innerHTML = "";
  categories.forEach((cat) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "category-tab" + (cat === activeCategory ? " active" : "");
    btn.textContent = cat;
    btn.addEventListener("click", () => {
      activeCategory = cat;
      renderTabs(categories);
      renderGrid();
    });
    tabsEl.appendChild(btn);
  });
}

function productImageStyle(product) {
  return product.image_file ? `background-image: url('images/${encodeURIComponent(product.image_file)}')` : "";
}

function buildModifierPanel(product, modifierProducts) {
  if (!modifierProducts.length) return null;

  const grouped = new Map();
  for (const m of modifierProducts) {
    const key = m.subcategory || "Egyéb";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(m);
  }

  const panel = document.createElement("div");
  panel.className = "modifier-panel";

  const orderedKeys = [
    ...MODIFIER_SUBCATEGORY_ORDER.filter((k) => grouped.has(k)),
    ...Array.from(grouped.keys()).filter((k) => !MODIFIER_SUBCATEGORY_ORDER.includes(k)),
  ];

  for (const key of orderedKeys) {
    const title = document.createElement("p");
    title.className = "modifier-group-title";
    title.textContent = key;
    panel.appendChild(title);

    for (const mod of grouped.get(key)) {
      const label = document.createElement("label");
      label.className = "modifier-option";
      label.innerHTML = `
        <input type="checkbox" value="${mod.id}">
        <span>${mod.name}${mod.is_spicy ? " <em>csípős</em>" : ""}</span>
        <span class="modifier-price">+${PinocchioCart.formatHuf(mod.price)}</span>
      `;
      panel.appendChild(label);
    }
  }

  return panel;
}

function renderCard(product, modifierProducts) {
  const card = document.createElement("article");
  card.className = "product-card";

  const image = document.createElement("div");
  image.className = "product-card-image";
  const styleAttr = productImageStyle(product);
  if (styleAttr) image.setAttribute("style", styleAttr);
  else image.textContent = product.category;
  card.appendChild(image);

  const body = document.createElement("div");
  body.className = "product-card-body";

  const name = document.createElement("h3");
  name.className = "product-card-name";
  name.innerHTML = `${product.name}${product.is_spicy ? " <em>csípős</em>" : ""}`;
  body.appendChild(name);

  if (product.description) {
    const desc = document.createElement("p");
    desc.className = "product-card-desc";
    desc.textContent = product.description;
    body.appendChild(desc);
  }

  const canCustomize = modifierProducts.length > 0;
  let modifierPanel = null;
  if (canCustomize) {
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "modifier-toggle";
    toggle.innerHTML = `
      <span class="modifier-toggle-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      </span>
      <span class="modifier-toggle-label">Extra feltétek hozzáadása</span>
      <span class="modifier-toggle-count" hidden></span>
    `;
    const countEl = toggle.querySelector(".modifier-toggle-count");
    const labelEl = toggle.querySelector(".modifier-toggle-label");

    modifierPanel = buildModifierPanel(product, modifierProducts);

    function refreshCount() {
      const checked = modifierPanel.querySelectorAll("input[type=checkbox]:checked").length;
      if (checked > 0) {
        countEl.hidden = false;
        countEl.textContent = checked;
      } else {
        countEl.hidden = true;
      }
    }
    modifierPanel.addEventListener("change", refreshCount);

    toggle.addEventListener("click", () => {
      const isOpen = modifierPanel.classList.toggle("open");
      toggle.classList.toggle("open", isOpen);
      labelEl.textContent = isOpen ? "Extra feltétek elrejtése" : "Extra feltétek hozzáadása";
    });
    body.appendChild(toggle);
    body.appendChild(modifierPanel);
  }

  const footer = document.createElement("div");
  footer.className = "product-card-footer";

  const price = document.createElement("span");
  price.className = "product-card-price";
  price.textContent = PinocchioCart.formatHuf(product.price);
  footer.appendChild(price);

  const addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.className = "product-card-add";
  addBtn.textContent = "Kosárba";
  addBtn.addEventListener("click", () => {
    const selectedModifiers = modifierPanel
      ? Array.from(modifierPanel.querySelectorAll("input[type=checkbox]:checked")).map((input) => {
          const mod = modifierProducts.find((m) => String(m.id) === input.value);
          return { product_id: mod.id, name: mod.name, price: mod.price };
        })
      : [];

    PinocchioCart.addToCart({
      product_id: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      modifiers: selectedModifiers,
    });

    if (modifierPanel) {
      modifierPanel.querySelectorAll("input[type=checkbox]").forEach((input) => (input.checked = false));
      modifierPanel.dispatchEvent(new Event("change"));
    }
    addBtn.textContent = "Hozzáadva ✓";
    setTimeout(() => (addBtn.textContent = "Kosárba"), 900);
  });
  footer.appendChild(addBtn);

  body.appendChild(footer);
  card.appendChild(body);
  return card;
}

function renderGrid() {
  grid.innerHTML = "";
  const modifierProducts = allProducts.filter((p) => p.is_modifier_eligible);
  const visible = allProducts.filter((p) => p.category === activeCategory);

  if (!visible.length) {
    grid.innerHTML = '<p class="cart-empty">Nincs termék ebben a kategóriában.</p>';
    return;
  }

  for (const product of visible) {
    const showModifiers = product.category === "Pizzák" || product.category === "Pasta";
    grid.appendChild(renderCard(product, showModifiers ? modifierProducts : []));
  }
}

function updateCartBar() {
  const cart = PinocchioCart.getCart();
  const count = PinocchioCart.cartCount(cart);
  if (count === 0) {
    cartBar.classList.remove("visible");
    return;
  }
  cartBar.classList.add("visible");
  cartBarInfo.innerHTML = `<strong>${count} tétel</strong> a kosárban · ${PinocchioCart.formatHuf(
    PinocchioCart.cartSubtotal(cart)
  )}`;
}

window.addEventListener("cart:updated", updateCartBar);

(async function init() {
  try {
    allProducts = await fetchProducts();
  } catch (err) {
    grid.innerHTML = '<p class="cart-empty">A termékek betöltése sikertelen. Frissítsd az oldalt, vagy hívj minket telefonon.</p>';
    return;
  }

  const categories = CATEGORY_ORDER.filter((c) => allProducts.some((p) => p.category === c));
  activeCategory = categories[0];
  renderTabs(categories);
  renderGrid();
  updateCartBar();
})();
