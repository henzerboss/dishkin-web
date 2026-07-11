import Image from 'next/image';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { recipeUrl } from '@/lib/url';
import { RecipeEditForm } from '@/components/RecipeEditForm';

export const dynamic = 'force-dynamic';

export default async function EditRecipePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) redirect('/admin/login');

  const { id } = await params;
  const recipe = await prisma.recipe.findUnique({
    where: { id: decodeURIComponent(id) },
    include: { categories: { orderBy: { name: 'asc' } } },
  });
  if (!recipe) notFound();

  return (
    <div className="container py-8">
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <Link className="btn-soft mb-4" href="/admin"><ArrowLeft size={16} /> Назад в админку</Link>
          <p className="badge">Dishkin Admin</p>
          <h1 className="mt-3 text-3xl font-black sm:text-4xl">Редактирование рецепта</h1>
          <p className="mt-2 break-all text-sm text-[var(--muted)]">ID: {recipe.id}</p>
        </div>
        <div className="flex items-center gap-3">
          {recipe.photoUrl ? <div className="relative h-20 w-20 overflow-hidden rounded-2xl border border-[var(--border)]"><Image src={recipe.photoUrl} alt="" fill className="object-cover" /></div> : null}
          <Link className="btn-soft" href={recipeUrl(recipe.locale, recipe.id)} target="_blank"><ExternalLink size={16} /> Открыть на сайте</Link>
        </div>
      </div>

      <RecipeEditForm recipe={recipe} />
    </div>
  );
}
