-- A site may carry one customer domain, which the owner is expected to forward to the site's public address with
-- their own DNS provider (URL forwarding). Nothing here attaches the name to Cloudflare or issues a certificate.
ALTER TABLE links ADD COLUMN domain TEXT;
ALTER TABLE links ADD COLUMN domain_verified_at TEXT;

-- One site per domain. Null means no domain, and the partial index keeps every other link unaffected.
CREATE UNIQUE INDEX links_domain ON links(domain) WHERE domain IS NOT NULL;
