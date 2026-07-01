'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { deletePublicFile } from '@/lib/uploads';

export async function deleteRecipeAction(formData: FormData) {
  const session = await auth();
  if (!session) redirect('/admin/login');

  const id = String(formData.get('id') ?? '');
  if (!id) return;

  const recipe = await prisma.recipe.findUnique({ where: { id }, select: { photoUrl: true, locale: true, slug: true } });
  if (!recipe) return;

  await prisma.recipe.delete({ where: { id } });
  await deletePublicFile(recipe.photoUrl);
  revalidatePath(`/${recipe.locale}`);
  revalidatePath(`/${recipe.locale}/recipes/${recipe.slug}`);
  revalidatePath('/admin');
}
