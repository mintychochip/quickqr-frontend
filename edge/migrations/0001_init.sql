-- quickqr backend schema, version 1. Applied by `wrangler d1 migrations apply` (and by the tests, in file order).
--
-- D1's free plan allows 100,000 rows written a day and counts every index entry as a row written, so the hot table
-- (scans) has no TEXT primary key and exactly one index: three rows written per scan (row, index entry, and the
-- counter on links). Timestamps are UTC ISO 8601 text, which sorts correctly.

CREATE TABLE users (
  id         TEXT PRIMARY KEY,
  email      TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);

CREATE TABLE oauth_identities (
  provider TEXT NOT NULL,
  subject  TEXT NOT NULL,
  user_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (provider, subject)
);

-- Only the SHA-256 of a session token is stored, never the token.
CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL
);

-- Sign-in state lives ten minutes and is single use.
CREATE TABLE oauth_states (
  state      TEXT PRIMARY KEY,
  provider   TEXT NOT NULL,
  return_to  TEXT NOT NULL,
  as_button  TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE links (
  id              TEXT PRIMARY KEY,
  code            TEXT NOT NULL UNIQUE,
  owner_id        TEXT NOT NULL,
  title           TEXT NOT NULL,
  destination_url TEXT NOT NULL,
  ad_style        TEXT NOT NULL,
  is_active       INTEGER NOT NULL DEFAULT 1,
  kind            TEXT NOT NULL DEFAULT '',
  items           TEXT,
  links           TEXT,
  style           TEXT,
  total_scans     INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);
CREATE INDEX links_owner_created ON links(owner_id, created_at DESC);

-- No raw client address is stored: ip_hash is a keyed hash and ip_prefix is the /24 (IPv4) or /48 (IPv6) network.
CREATE TABLE scans (
  id          INTEGER PRIMARY KEY,
  uid         TEXT NOT NULL,
  link_code   TEXT NOT NULL REFERENCES links(code) ON DELETE CASCADE,
  ts          TEXT NOT NULL,
  ip_hash     TEXT NOT NULL,
  ip_prefix   TEXT NOT NULL,
  user_agent  TEXT NOT NULL,
  device_type TEXT NOT NULL,
  browser     TEXT NOT NULL,
  referrer    TEXT NOT NULL,
  country     TEXT NOT NULL,
  city        TEXT NOT NULL
);
-- Covers every aggregate the analytics endpoints compute, so they read the index and not the table.
CREATE INDEX scans_link_ts ON scans(link_code, ts, device_type, referrer, ip_hash);

CREATE TABLE sponsors (
  id         TEXT PRIMARY KEY,
  brand_name TEXT NOT NULL,
  badge      TEXT NOT NULL,
  headline   TEXT NOT NULL,
  tagline    TEXT NOT NULL,
  cta        TEXT NOT NULL,
  target_url TEXT NOT NULL,
  logo_url   TEXT NOT NULL,
  active     INTEGER NOT NULL
);

INSERT INTO sponsors (id, brand_name, badge, headline, tagline, cta, target_url, logo_url, active) VALUES
  ('spn-fieldnote', 'Fieldnote Paper', 'Sponsored', 'Print the code once', 'This placement keeps dynamic redirects free.',
   'View offer', 'https://example.com/sponsor', 'F', 1);
