-- Adds the shop_status singleton table for the temporary order-pause admin
-- feature, for the already-provisioned production database (schema.sql
-- already has this for a fresh setup). Apply once via:
--   wrangler d1 execute pinocchio --remote --file=./migration-shop-status.sql

CREATE TABLE shop_status (
  id            INTEGER PRIMARY KEY CHECK (id = 1),
  is_paused     INTEGER NOT NULL DEFAULT 0,
  reason        TEXT,
  paused_until  TEXT,
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO shop_status (id, is_paused) VALUES (1, 0);
