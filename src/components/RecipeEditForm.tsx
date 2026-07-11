'use client';

import { useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import type { Recipe, RecipeCategory } from '@prisma/client';
import { updateRecipeAction } from '@/actions/admin-actions';
import { LANGUAGES } from '@/i18n/locales';
import { recipeIngredients, recipeNutrition, recipeSteps, type RecipeIngredient, type RecipeStep } from '@/lib/recipe';

interface Props {
  recipe: Recipe & { categories: RecipeCategory[] };
}

function emptyIngredient(): RecipeIngredient {
  return { name: '', amount: '', status: 'have' };
}

function emptyStep(order: number): RecipeStep {
  return { order, text: '', timerSeconds: null };
}

export function RecipeEditForm({ recipe }: Props) {
  const parsedIngredients = recipeIngredients(recipe);
  const parsedSteps = recipeSteps(recipe);
  const nutrition = recipeNutrition(recipe);
  const [categories, setCategories] = useState(recipe.categories.map((category) => category.name));
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>(parsedIngredients.length ? parsedIngredients : [emptyIngredient()]);
  const [steps, setSteps] = useState<RecipeStep[]>(parsedSteps.length ? parsedSteps : [emptyStep(1)]);

  const updateIngredient = (index: number, patch: Partial<RecipeIngredient>) => {
    setIngredients((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  };

  const updateStep = (index: number, patch: Partial<RecipeStep>) => {
    setSteps((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  };

  return (
    <form action={updateRecipeAction} className="grid gap-6">
      <input type="hidden" name="id" value={recipe.id} />

      <section className="card grid gap-5 p-5 sm:p-7">
        <div>
          <p className="text-sm font-extrabold uppercase tracking-[0.16em] text-[var(--primary-dark)]">Основное</p>
          <h2 className="mt-1 text-2xl font-black">Данные рецепта</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 font-bold md:col-span-2">
            Название
            <input className="input" name="title" defaultValue={recipe.title} required maxLength={180} />
          </label>

          <label className="grid gap-2 font-bold">
            Язык
            <select className="input" name="locale" defaultValue={recipe.locale} required>
              {LANGUAGES.map((language) => <option key={language.code} value={language.code}>{language.flag} {language.native} ({language.code})</option>)}
            </select>
          </label>

          <label className="grid gap-2 font-bold">
            Тип
            <select className="input" name="type" defaultValue={recipe.type} required>
              <option value="generated">AI / Generated</option>
              <option value="adapted">Adapted</option>
              <option value="verified">Verified</option>
            </select>
          </label>

          <label className="grid gap-2 font-bold">
            Кухня
            <input className="input" name="cuisine" defaultValue={recipe.cuisine ?? ''} maxLength={100} />
          </label>

          <label className="grid gap-2 font-bold">
            Аутентичность, %
            <input className="input" name="authenticityPercent" type="number" min="0" max="100" defaultValue={recipe.authenticityPercent} />
          </label>

          <label className="grid gap-2 font-bold">
            Время, минут
            <input className="input" name="timeMinutes" type="number" min="0" max="1440" defaultValue={recipe.timeMinutes} />
          </label>

          <label className="grid gap-2 font-bold">
            Сложность
            <select className="input" name="difficulty" defaultValue={recipe.difficulty} required>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </label>

          <label className="grid gap-2 font-bold">
            Порции
            <input className="input" name="servings" type="number" min="1" max="100" defaultValue={recipe.servings} />
          </label>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 md:col-span-2">
            <p className="font-bold">Рейтинг рассчитывается автоматически</p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Средняя оценка: {recipe.rating ?? '—'} / 5 · голосов: {recipe.ratingCount}.
              Оценка из приложения и голоса посетителей сайта учитываются вместе.
            </p>
          </div>

          <label className="grid gap-2 font-bold md:col-span-2">
            Описание
            <textarea className="input min-h-32 resize-y" name="description" defaultValue={recipe.description ?? ''} maxLength={1200} />
          </label>
        </div>
      </section>

      <section className="card grid gap-5 p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-extrabold uppercase tracking-[0.16em] text-[var(--primary-dark)]">Категории</p>
            <h2 className="mt-1 text-2xl font-black">Добавление и удаление категорий</h2>
          </div>
          <button className="btn-soft" type="button" onClick={() => setCategories((current) => [...current, ''])}><Plus size={16} /> Добавить категорию</button>
        </div>

        <div className="grid gap-3">
          {categories.map((category, index) => (
            <div key={`category-${index}`} className="grid grid-cols-[1fr_auto] gap-3">
              <input
                className="input"
                name="category"
                value={category}
                maxLength={80}
                placeholder="Например: Завтрак"
                onChange={(event) => setCategories((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))}
              />
              <button className="btn-soft px-4" type="button" aria-label="Удалить категорию" onClick={() => setCategories((current) => current.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={17} /></button>
            </div>
          ))}
          {!categories.length ? <p className="rounded-2xl bg-[var(--surface)] p-4 text-sm text-[var(--muted)]">У рецепта нет категорий. Добавьте их кнопкой выше.</p> : null}
        </div>
      </section>

      <section className="card grid gap-5 p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-extrabold uppercase tracking-[0.16em] text-[var(--primary-dark)]">Состав</p>
            <h2 className="mt-1 text-2xl font-black">Ингредиенты</h2>
          </div>
          <button className="btn-soft" type="button" onClick={() => setIngredients((current) => [...current, emptyIngredient()])}><Plus size={16} /> Добавить ингредиент</button>
        </div>

        <div className="grid gap-3">
          {ingredients.map((ingredient, index) => (
            <div key={`ingredient-${index}`} className="grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 md:grid-cols-[1.4fr_1fr_180px_auto]">
              <input className="input" name="ingredientName" value={ingredient.name} required placeholder="Ингредиент" maxLength={160} onChange={(event) => updateIngredient(index, { name: event.target.value })} />
              <input className="input" name="ingredientAmount" value={ingredient.amount ?? ''} placeholder="Количество" maxLength={120} onChange={(event) => updateIngredient(index, { amount: event.target.value })} />
              <select className="input" name="ingredientStatus" value={ingredient.status ?? (ingredient.have === false ? 'missing' : 'have')} onChange={(event) => updateIngredient(index, { status: event.target.value as RecipeIngredient['status'] })}>
                <option value="have">Есть</option>
                <option value="missing">Нет</option>
                <option value="uncertain">Неизвестно</option>
              </select>
              <button className="btn-soft px-4" type="button" aria-label="Удалить ингредиент" disabled={ingredients.length === 1} onClick={() => setIngredients((current) => current.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={17} /></button>
            </div>
          ))}
        </div>
      </section>

      <section className="card grid gap-5 p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-extrabold uppercase tracking-[0.16em] text-[var(--primary-dark)]">Приготовление</p>
            <h2 className="mt-1 text-2xl font-black">Шаги</h2>
          </div>
          <button className="btn-soft" type="button" onClick={() => setSteps((current) => [...current, emptyStep(current.length + 1)])}><Plus size={16} /> Добавить шаг</button>
        </div>

        <div className="grid gap-3">
          {steps.map((step, index) => (
            <div key={`step-${index}`} className="grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 md:grid-cols-[52px_1fr_180px_auto] md:items-start">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary)] text-lg font-black text-white">{index + 1}</div>
              <textarea className="input min-h-24 resize-y" name="stepText" value={step.text} required maxLength={1800} placeholder="Описание шага" onChange={(event) => updateStep(index, { text: event.target.value })} />
              <input className="input" name="stepTimerSeconds" type="number" min="0" value={step.timerSeconds ?? step.timer_seconds ?? ''} placeholder="Таймер, сек." onChange={(event) => updateStep(index, { timerSeconds: event.target.value ? Number(event.target.value) : null })} />
              <button className="btn-soft px-4" type="button" aria-label="Удалить шаг" disabled={steps.length === 1} onClick={() => setSteps((current) => current.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={17} /></button>
            </div>
          ))}
        </div>
      </section>

      <section className="card grid gap-5 p-5 sm:p-7">
        <div>
          <p className="text-sm font-extrabold uppercase tracking-[0.16em] text-[var(--primary-dark)]">Пищевая ценность</p>
          <h2 className="mt-1 text-2xl font-black">Нутриенты</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="grid gap-2 font-bold">Калории<input className="input" name="nutritionCalories" type="number" step="any" min="0" defaultValue={nutrition?.calories ?? ''} /></label>
          <label className="grid gap-2 font-bold">Белки, г<input className="input" name="nutritionProtein" type="number" step="any" min="0" defaultValue={nutrition?.protein ?? ''} /></label>
          <label className="grid gap-2 font-bold">Углеводы, г<input className="input" name="nutritionCarbs" type="number" step="any" min="0" defaultValue={nutrition?.carbs ?? ''} /></label>
          <label className="grid gap-2 font-bold">Жиры, г<input className="input" name="nutritionFat" type="number" step="any" min="0" defaultValue={nutrition?.fat ?? ''} /></label>
        </div>
      </section>

      <div className="sticky bottom-4 z-20 flex justify-end">
        <button className="btn-primary min-w-52" type="submit"><Save size={18} /> Сохранить рецепт</button>
      </div>
    </form>
  );
}
