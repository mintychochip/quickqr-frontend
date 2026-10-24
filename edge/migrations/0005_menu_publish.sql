-- A menu's published static site. The menu's QR stays at /r/<code>; the site code names the R2 files.
ALTER TABLE links ADD COLUMN published_site_code TEXT;
