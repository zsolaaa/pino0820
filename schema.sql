-- Pinocchio webshop D1 schema
-- Apply once via: wrangler d1 execute pinocchio --file=./schema.sql --remote

CREATE TABLE products (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  slug                  TEXT NOT NULL UNIQUE,
  name                  TEXT NOT NULL,
  category              TEXT NOT NULL,
  subcategory           TEXT,
  description           TEXT,
  price                 INTEGER NOT NULL,
  is_spicy              INTEGER NOT NULL DEFAULT 0,
  image_file             TEXT,
  is_modifier_eligible  INTEGER NOT NULL DEFAULT 0,
  is_available          INTEGER NOT NULL DEFAULT 1,
  sort_order            INTEGER NOT NULL DEFAULT 0,
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_available ON products(is_available);

CREATE TABLE orders (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  order_number       TEXT NOT NULL UNIQUE,
  status             TEXT NOT NULL DEFAULT 'new',
  fulfillment_type   TEXT NOT NULL,
  customer_name      TEXT NOT NULL,
  customer_phone     TEXT NOT NULL,
  customer_email     TEXT,
  delivery_address   TEXT,
  notes              TEXT,
  subtotal           INTEGER NOT NULL,
  delivery_fee       INTEGER NOT NULL DEFAULT 0,
  total              INTEGER NOT NULL,
  payment_method     TEXT NOT NULL DEFAULT 'cod_cash',
  payment_status     TEXT NOT NULL DEFAULT 'unpaid',
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at);

-- Backs the human order number (PZ-YYYYMMDD-0001). A single atomic
-- INSERT ... ON CONFLICT ... RETURNING per generated number, rather than
-- COUNT(*) + 1, so two orders placed at the same moment can't ever compute
-- the same sequence number.
CREATE TABLE order_number_counters (
  business_date  TEXT PRIMARY KEY,
  seq            INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE order_items (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id      INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id    INTEGER NOT NULL REFERENCES products(id),
  product_name  TEXT NOT NULL,
  unit_price    INTEGER NOT NULL,
  quantity      INTEGER NOT NULL,
  line_total    INTEGER NOT NULL
);

CREATE INDEX idx_order_items_order ON order_items(order_id);

CREATE TABLE order_item_modifiers (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  order_item_id  INTEGER NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  product_id     INTEGER NOT NULL REFERENCES products(id),
  name           TEXT NOT NULL,
  price          INTEGER NOT NULL
);

CREATE INDEX idx_modifiers_item ON order_item_modifiers(order_item_id);

-- Singleton row (id = 1) toggled from the admin panel to temporarily pause
-- online ordering (kitchen overload, technical issue, ran out of ingredients,
-- etc.) without a code deploy. Separate from the ORDERING_ENABLED kill switch
-- in functions/_lib/config.js, which is for the pre-launch/legal-review state.
CREATE TABLE shop_status (
  id            INTEGER PRIMARY KEY CHECK (id = 1),
  is_paused     INTEGER NOT NULL DEFAULT 0,
  reason        TEXT,
  paused_until  TEXT,
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO shop_status (id, is_paused) VALUES (1, 0);

-- One row per closed business day (Budapest calendar date). The figures are a
-- snapshot taken at closing time, deliberately not recomputed afterwards, so a
-- later cancellation can't silently rewrite a day that's already been settled.
CREATE TABLE daily_closings (
  business_date    TEXT PRIMARY KEY,
  order_count      INTEGER NOT NULL,
  cancelled_count  INTEGER NOT NULL,
  revenue          INTEGER NOT NULL,
  card_revenue     INTEGER NOT NULL,
  cash_revenue     INTEGER NOT NULL,
  closed_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Fixed-window request counter, used for application-level rate limiting
-- (order creation, admin login) since Cloudflare's zone-level Rate Limiting
-- Rules require a custom domain on the account, which pinocchiobaja.hu isn't
-- yet. window_start is a Unix-minute bucket (Date.now() / 60000, floored).
CREATE TABLE rate_limits (
  rl_key       TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  count        INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (rl_key, window_start)
);
