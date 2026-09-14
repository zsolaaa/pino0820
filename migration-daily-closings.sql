-- Adds the daily_closings table for the admin daily-closing feature, for the
-- already-provisioned production database (schema.sql has this for a fresh
-- setup). Apply once via:
--   wrangler d1 execute pinocchio --remote --file=./migration-daily-closings.sql

CREATE TABLE daily_closings (
  business_date    TEXT PRIMARY KEY,
  order_count      INTEGER NOT NULL,
  cancelled_count  INTEGER NOT NULL,
  revenue          INTEGER NOT NULL,
  card_revenue     INTEGER NOT NULL,
  cash_revenue     INTEGER NOT NULL,
  closed_at        TEXT NOT NULL DEFAULT (datetime('now'))
);
