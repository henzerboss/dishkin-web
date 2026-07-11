import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { DatabaseZap, LogOut, Pencil, Search } from 'lucide-react';
import { auth } from '@/auth';
import { logoutAction } from '@/actions/auth-actions';
import { deleteRecipeAction } from '@/actions/admin-actions';
import prisma from '@/lib/prisma';
import { LANGUAGES } from '@/i18n/locales';
import { Pagination } from '@/components/Pagination';
import { safePage } from '@/lib/url';
import { ConfirmDeleteButton } from '@/components/ConfirmDeleteButton';

export const dynamic = 'force-dynamic';
const PAGE_SIZE = 50;

export default async function AdminPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await auth();
  if (!session) redirect('/admin/login');
  const sp = await searchParams;
  const q = String(sp.q ?? '').trim();
  const locale = String(sp.locale ?? '').trim();
  const page = safePage(sp.page);
  const updated = String(sp.updated ?? '') === '1';
  const where = {
    ...(locale ? { locale } : {}),
    ...(q ? { OR: [
      { title: { contains: q } },
      { searchText: { contains: q.toLowerCase() } },
      { cuisine: { contains: q } },
    ] } : {}),
  };
  const [recipes, total] = await Promise.all([
    prisma.recipe.findMany({ where, include: { categories: true }, orderBy: { updatedAt: 'desc' }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    prisma.recipe.count({ where }),
  ]);

  return (
    <div className="container py-8">
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="badge">Dishkin Admin</p>
          <h1 className="mt-3 text-3xl font-black">Website recipes</h1>
          <p className="mt-1 text-[var(--muted)]">{total} recipes found. Delete here removes the recipe only from the website.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link className="btn-primary" href="/admin/generate"><DatabaseZap size={16} /> Массовая генерация</Link>
          <form action={logoutAction}><button className="btn-soft" type="submit"><LogOut size={16} /> Logout</button></form>
        </div>
      </div>

      {updated ? <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 font-bold text-emerald-800">Рецепт сохранён.</div> : null}

      <form className="glass mb-6 grid gap-3 rounded-[28px] p-4 md:grid-cols-[1fr_auto_auto]">
        <label className="relative block">
          <Search className="absolute start-4 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={18} />
          <input className="input ps-11" name="q" placeholder="Search recipes" defaultValue={q} />
        </label>
        <select className="input min-w-44" name="locale" defaultValue={locale}>
          <option value="">All languages</option>
          {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.flag} {l.native}</option>)}
        </select>
        <button className="btn-primary" type="submit">Search</button>
      </form>

      <div className="grid gap-4">
        {recipes.map((r) => (
          <div key={r.id} className="card grid gap-4 p-4 sm:grid-cols-[92px_1fr_auto] sm:items-center">
            <div className="relative h-24 w-24 overflow-hidden rounded-2xl bg-[var(--surface)]">
              {r.photoUrl ? <Image src={r.photoUrl} alt={r.title} fill className="object-cover" /> : null}
            </div>
            <div>
              <div className="mb-2 flex flex-wrap gap-2 text-xs font-bold text-[var(--muted)]">
                <span>{r.locale}</span><span>{r.type}</span><span>{r.updatedAt.toLocaleString()}</span>
              </div>
              <h2 className="text-xl font-black">{r.title}</h2>
              <p className="mt-1 line-clamp-2 text-sm text-[var(--muted)]">{r.description}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {r.categories.map((c) => <span key={c.id} className="badge py-1 text-xs">{c.name}</span>)}
              </div>
              <Link className="mt-3 inline-flex text-sm font-bold text-[var(--primary-dark)]" href={`/${r.locale}/recipes/${r.slug}`} target="_blank">Open recipe</Link>
            </div>
            <div className="flex flex-row gap-2 sm:flex-col sm:items-stretch">
              <Link className="btn-soft" href={`/admin/recipes/${encodeURIComponent(r.id)}/edit`}><Pencil size={16} /> Редактировать</Link>
              <form action={deleteRecipeAction}>
                <input type="hidden" name="id" value={r.id} />
                <ConfirmDeleteButton message="Delete this recipe forever from the website? The mobile app will not be affected." />
              </form>
            </div>
          </div>
        ))}
        {!recipes.length ? <div className="card p-10 text-center text-[var(--muted)]">No recipes yet.</div> : null}
      </div>
      <Pagination locale="en" page={page} pageSize={PAGE_SIZE} total={total} basePath="/admin" params={{ q, locale }} />
    </div>
  );
}
