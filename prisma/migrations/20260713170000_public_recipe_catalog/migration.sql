-- Read-path indexes for the mobile public catalog. No existing data is changed.
CREATE INDEX IF NOT EXISTS "Recipe_locale_rating_ratingCount_updatedAt_idx"
ON "Recipe"("locale", "rating", "ratingCount", "updatedAt");

CREATE INDEX IF NOT EXISTS "Recipe_locale_title_idx"
ON "Recipe"("locale", "title");
