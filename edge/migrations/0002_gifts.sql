-- Gift grants and the entitlements they hand out. Apply with `wrangler d1 migrations apply` BEFORE the code that
-- reads these tables is deployed (frontend/README.md).
--
-- An entitlement is a plan a person has until a date. A gift writes one row; paid billing will write the same table,
-- and a person's plan is the best row that has not ended. Timestamps are UTC ISO 8601 text, which sorts correctly.

CREATE TABLE entitlements (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan       TEXT NOT NULL,
  ends_at    TEXT NOT NULL,
  source     TEXT NOT NULL,
  source_id  TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX entitlements_user_ends ON entitlements(user_id, ends_at);

-- Only the SHA-256 of the token is stored, so the database cannot give a link back. The token is shown once, when the
-- grant is made. There is no uses counter: uses are the rows of gift_redemptions, so a count can never drift.
CREATE TABLE gift_grants (
  id         TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  plan       TEXT NOT NULL,
  days       INTEGER NOT NULL,
  max_uses   INTEGER NOT NULL,
  redeem_by  TEXT,
  note       TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  revoked_at TEXT
);

-- One row per person per grant: the unique pair is what makes a double click grant one plan.
CREATE TABLE gift_redemptions (
  id          TEXT PRIMARY KEY,
  grant_id    TEXT NOT NULL REFERENCES gift_grants(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  redeemed_at TEXT NOT NULL,
  ends_at     TEXT NOT NULL,
  UNIQUE (grant_id, user_id)
);
