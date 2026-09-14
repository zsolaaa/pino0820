-- Adds the order_number_counters table for the atomic order-number generator,
-- for the already-provisioned production database (schema.sql has this for a
-- fresh setup). Apply once via:
--   wrangler d1 execute pinocchio --remote --file=./migration-order-number-counters.sql

CREATE TABLE order_number_counters (
  business_date  TEXT PRIMARY KEY,
  seq            INTEGER NOT NULL DEFAULT 0
);
