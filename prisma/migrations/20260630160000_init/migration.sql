-- CreateTable
CREATE TABLE "Recipe" (
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
    "rating" INTEGER,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "photoUrl" TEXT,
    "appCreatedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "RecipeCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recipeId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "RecipeCategory_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Recipe_slug_key" ON "Recipe"("slug");
CREATE INDEX "Recipe_locale_updatedAt_idx" ON "Recipe"("locale", "updatedAt");
CREATE INDEX "Recipe_locale_rating_idx" ON "Recipe"("locale", "rating");
CREATE INDEX "Recipe_locale_cuisine_idx" ON "Recipe"("locale", "cuisine");
CREATE INDEX "Recipe_locale_type_idx" ON "Recipe"("locale", "type");
CREATE UNIQUE INDEX "RecipeCategory_recipeId_name_key" ON "RecipeCategory"("recipeId", "name");
CREATE INDEX "RecipeCategory_locale_name_idx" ON "RecipeCategory"("locale", "name");
