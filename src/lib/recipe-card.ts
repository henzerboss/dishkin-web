import type { Recipe, RecipeCategory } from '@prisma/client';

export interface RecipeCardData {
  id: string;
  title: string;
  type: string;
  authenticityPercent: number;
  description: string | null;
  timeMinutes: number;
  rating: number | null;
  ingredientsJson: string;
  photoUrl: string | null;
  categories: Array<Pick<RecipeCategory, 'id' | 'name'>>;
}

export function toRecipeCardData(
  recipe: Pick<
    Recipe,
    | 'id'
    | 'title'
    | 'type'
    | 'authenticityPercent'
    | 'description'
    | 'timeMinutes'
    | 'rating'
    | 'ingredientsJson'
    | 'photoUrl'
  > & { categories: Array<Pick<RecipeCategory, 'id' | 'name'>> },
): RecipeCardData {
  return {
    id: recipe.id,
    title: recipe.title,
    type: recipe.type,
    authenticityPercent: recipe.authenticityPercent,
    description: recipe.description,
    timeMinutes: recipe.timeMinutes,
    rating: recipe.rating,
    ingredientsJson: recipe.ingredientsJson,
    photoUrl: recipe.photoUrl,
    categories: recipe.categories.map((category) => ({ id: category.id, name: category.name })),
  };
}
