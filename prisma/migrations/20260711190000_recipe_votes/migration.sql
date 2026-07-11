-- Store every website/app rating separately and keep Recipe.rating as a denormalized average.
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Recipe" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "searchText" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "authenticityPercent" INTEGER NOT NULL DEFAULT 0,
    "cuisine" TEXT,
    "description" TEXT,
    "timeMinutes" INTEGER NOT NULL DEFAULT 0,
    "difficulty" TEXT NOT NULL DEFAULT 'medium',
    "servings" INTEGER NOT NULL DEFAULT 2,
    "ingredientsJson" TEXT NOT NULL DEFAULT '[]',
    "stepsJson" TEXT NOT NULL DEFAULT '[]',
    "nutritionJson" TEXT,
    "rating" REAL,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "legacyRatingSum" REAL NOT NULL DEFAULT 0,
    "legacyRatingCount" INTEGER NOT NULL DEFAULT 0,
    "photoUrl" TEXT,
    "appCreatedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

INSERT INTO "new_Recipe" (
    "id", "slug", "locale", "title", "searchText", "type", "authenticityPercent",
    "cuisine", "description", "timeMinutes", "difficulty", "servings",
    "ingredientsJson", "stepsJson", "nutritionJson", "rating", "ratingCount",
    "legacyRatingSum", "legacyRatingCount", "photoUrl", "appCreatedAt", "createdAt", "updatedAt"
)
SELECT
    "id", "slug", "locale", "title", "searchText", "type", "authenticityPercent",
    "cuisine", "description", "timeMinutes", "difficulty", "servings",
    "ingredientsJson", "stepsJson", "nutritionJson", CAST("rating" AS REAL), "ratingCount",
    CASE WHEN "rating" IS NOT NULL AND "ratingCount" > 1 THEN CAST("rating" AS REAL) * "ratingCount" ELSE 0 END,
    CASE WHEN "rating" IS NOT NULL AND "ratingCount" > 1 THEN "ratingCount" ELSE 0 END,
    "photoUrl", "appCreatedAt", "createdAt", "updatedAt"
FROM "Recipe";

DROP TABLE "Recipe";
ALTER TABLE "new_Recipe" RENAME TO "Recipe";

CREATE UNIQUE INDEX "Recipe_slug_key" ON "Recipe"("slug");
CREATE INDEX "Recipe_locale_updatedAt_idx" ON "Recipe"("locale", "updatedAt");
CREATE INDEX "Recipe_updatedAt_idx" ON "Recipe"("updatedAt");
CREATE INDEX "Recipe_locale_rating_idx" ON "Recipe"("locale", "rating");
CREATE INDEX "Recipe_locale_cuisine_idx" ON "Recipe"("locale", "cuisine");
CREATE INDEX "Recipe_locale_type_idx" ON "Recipe"("locale", "type");

CREATE TABLE "RecipeVote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recipeId" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "voterKey" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RecipeVote_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Existing site data was produced by the old app-sync route, which stored one app rating directly.
-- Preserve that rating as the app-origin vote. Larger legacy aggregates remain in the legacy fields above.
INSERT INTO "RecipeVote" ("id", "recipeId", "value", "source", "voterKey", "createdAt", "updatedAt")
SELECT
    lower(hex(randomblob(16))),
    "id",
    CAST(round("rating") AS INTEGER),
    'app',
    'app-origin',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Recipe"
WHERE "rating" IS NOT NULL AND "ratingCount" = 1;

CREATE UNIQUE INDEX "RecipeVote_recipeId_source_voterKey_key" ON "RecipeVote"("recipeId", "source", "voterKey");
CREATE INDEX "RecipeVote_recipeId_idx" ON "RecipeVote"("recipeId");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
