import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AlertTriangle, ArrowLeft, Database, ShieldCheck } from 'lucide-react';
import { auth } from '@/auth';
import { cleanupWrongLocaleRecipesAction } from '@/actions/admin-actions';
import { WrongLocaleCleanupForm } from '@/components/WrongLocaleCleanupForm';
import {
  getWrongLocaleCleanupCutoff,
  getWrongLocaleCleanupStats,
  WRONG_LANGUAGE_CONFIRMATION,
  WRONG_LANGUAGE_CUTOFF_ENV,
} from '@/lib/wrong-locale-cleanup';

export const dynamic = 'force-dynamic';

const LANGUAGE_NAMES: Record<string, string> = {
  bg: 'Болгарский',
  hr: 'Хорватский',
  vi: 'Вьетнамский',
  ms: 'Малайский',
};

export default async function CleanupLocalesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!session) redirect('/admin/login');

  const sp = await searchParams;
  const cutoff = getWrongLocaleCleanupCutoff();
  const stats = cutoff ? await getWrongLocaleCleanupStats(cutoff) : [];
  const totals = stats.reduce(
    (sum, stat) => ({
      recipes: sum.recipes + stat.recipes,
      categoryLinks: sum.categoryLinks + stat.categoryLinks,
      votes: sum.votes + stat.votes,
      photos: sum.photos + stat.photos,
    }),
    { recipes: 0, categoryLinks: 0, votes: 0, photos: 0 },
  );
  const cleaned = String(sp.cleaned ?? '') === '1';
  const error = String(sp.error ?? '');

  return (
    <main className="container py-8">
      <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="badge"><Database size={14} /> Dishkin Admin</p>
          <h1 className="mt-3 text-3xl font-black">Очистка ошибочных языков</h1>
          <p className="mt-2 max-w-3xl text-[var(--muted)]">
            Разовая операция для рецептов, которые были сохранены как bg, hr, vi или ms, но сгенерированы на английском.
          </p>
        </div>
        <Link className="btn-soft shrink-0" href="/admin"><ArrowLeft size={16} /> К рецептам</Link>
      </div>


      {error ? (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 font-bold text-red-800">
          {error === 'confirmation'
            ? 'Фраза подтверждения не совпала. Ничего не удалено.'
            : 'Переменная временной границы отсутствует или имеет неверный формат. Ничего не удалено.'}
        </div>
      ) : null}

      {cleaned ? (
        <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 font-bold text-emerald-800">
          Очистка завершена: удалено {String(sp.recipes ?? '0')} рецептов, {String(sp.categories ?? '0')} связей категорий,
          {' '}{String(sp.votes ?? '0')} голосов и {String(sp.photos ?? '0')} файлов изображений.
        </div>
      ) : null}

      {!cutoff ? (
        <section className="card border-amber-200 p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-1 shrink-0 text-amber-600" size={22} />
            <div>
              <h2 className="text-xl font-black">Удаление заблокировано</h2>
              <p className="mt-2 text-[var(--muted)]">
                На сервере не задана корректная переменная <code>{WRONG_LANGUAGE_CUTOFF_ENV}</code>. Она задаёт верхнюю
                границу времени и не позволяет случайно удалить новые, уже правильно сгенерированные рецепты.
              </p>
            </div>
          </div>
        </section>
      ) : (
        <>
          <section className="card p-6">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-1 shrink-0 text-emerald-600" size={22} />
              <div>
                <h2 className="text-xl font-black">Защитные ограничения</h2>
                <p className="mt-2 text-[var(--muted)]">
                  Будут удалены только рецепты с точным locale bg, hr, vi или ms и датой создания не позднее
                  {' '}<strong>{cutoff.toISOString()}</strong>. Категории и голоса удаляются только как дочерние записи этих рецептов.
                  Рецепты и категории locale en не участвуют в запросе, даже когда названия совпадают. Очистку нужно
                  выполнить до повторной генерации этих языков.
                </p>
              </div>
            </div>
          </section>

          <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <article className="card p-5" key={stat.locale}>
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-black">{LANGUAGE_NAMES[stat.locale]}</h2>
                  <span className="badge">{stat.locale}</span>
                </div>
                <dl className="mt-4 grid gap-2 text-sm">
                  <div className="flex justify-between gap-3"><dt className="text-[var(--muted)]">Рецепты</dt><dd className="font-black">{stat.recipes}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-[var(--muted)]">Связи категорий</dt><dd className="font-black">{stat.categoryLinks}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-[var(--muted)]">Голоса</dt><dd className="font-black">{stat.votes}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-[var(--muted)]">Фото</dt><dd className="font-black">{stat.photos}</dd></div>
                </dl>
              </article>
            ))}
          </section>

          <section className="card mt-6 p-6">
            <h2 className="text-xl font-black">Итого к удалению: {totals.recipes} рецептов</h2>
            <p className="mt-2 text-[var(--muted)]">
              Также будут удалены {totals.categoryLinks} связанных записей категорий, {totals.votes} голосов и до {totals.photos} файлов изображений.
            </p>
            <WrongLocaleCleanupForm
              action={cleanupWrongLocaleRecipesAction}
              confirmation={WRONG_LANGUAGE_CONFIRMATION}
              disabled={false}
              totalRecipes={totals.recipes}
            />
          </section>
        </>
      )}
    </main>
  );
}
