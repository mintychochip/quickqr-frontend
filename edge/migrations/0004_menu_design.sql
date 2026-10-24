-- A hosted menu's optional owner brand. '{}' means unbranded: the existing quickqr page.
ALTER TABLE links ADD COLUMN menu_design TEXT NOT NULL DEFAULT '{}';
