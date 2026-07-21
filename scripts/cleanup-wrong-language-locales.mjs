import 'dotenv/config';
import { unlink } from 'node:fs/promises';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const locales = ['bg', 'hr', 'vi', 'ms'];
const confirmation = 'DELETE-bg-hr-vi-ms';
const args = new Map(process.argv.slice(2).map((arg) => {
  const [key, ...rest] = arg.replace(/^--/, '').split('=');
  return [key, rest.join('=') || 'true'];
}));

function cutoffFromArgs() {
  const raw = args.get('before') || process.env.DISHKIN_BAD_LOCALE_CLEANUP_BEFORE;
  if (!raw) throw new Error('Missing --before=<ISO date> or DISHKIN_BAD_LOCALE_CLEANUP_BEFORE');
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid cutoff date: ${raw}`);
  return date;
}

function uploadRoots() {
  const roots = [
    path.join(process.cwd(), 'public', 'uploads', 'recipes'),
    path.join(process.cwd(), 'uploads', 'recipes'),
  ];
  const custom = process.env.DISHKIN_UPLOAD_ROOT?.trim();
  if (custom) roots.unshift(path.resolve(custom));
  return [...new Set(roots)];
}

async function deletePhoto(publicPath) {
  if (!publicPath?.startsWith('/uploads/recipes/')) return;
  const relative = publicPath.replace(/^\/uploads\/recipes\//, '');
  await Promise.all(uploadRoots().map(async (root) => {
    try {
      await unlink(path.join(root, relative));
    } catch {
      // Missing files are harmless; the database is the source of truth.
    }
  }));
}

async function stats(cutoff) {
  return Promise.all(locales.map(async (locale) => {
    const rows = await prisma.recipe.findMany({
      where: { locale, createdAt: { lte: cutoff } },
      select: {
        photoUrl: true,
        _count: { select: { categories: true, votes: true } },
      },
    });
    return {
      locale,
      recipes: rows.length,
      categories: rows.reduce((sum, row) => sum + row._count.categories, 0),
      votes: rows.reduce((sum, row) => sum + row._count.votes, 0),
      photos: rows.reduce((sum, row) => sum + (row.photoUrl ? 1 : 0), 0),
    };
  }));
}

async function main() {
  const cutoff = cutoffFromArgs();
  const current = await stats(cutoff);
  console.table(current);
  console.log(`Exact locales: ${locales.join(', ')}`);
  console.log(`Created at or before: ${cutoff.toISOString()}`);
  console.log('English locale rows are not selected. Category rows are deleted only through their selected recipes.');

  if (args.get('execute') !== 'true') {
    console.log('\nDRY RUN ONLY. No data changed.');
    console.log(`Execute with: npm run cleanup:wrong-locales -- --before=${cutoff.toISOString()} --execute --confirm=${confirmation}`);
    return;
  }

  if (args.get('confirm') !== confirmation) {
    throw new Error(`Execution requires --confirm=${confirmation}`);
  }

  const where = { locale: { in: locales }, createdAt: { lte: cutoff } };
  const recipes = await prisma.recipe.findMany({ where, select: { photoUrl: true } });
  const deleted = await prisma.recipe.deleteMany({ where });

  const photoUrls = [...new Set(recipes.map((recipe) => recipe.photoUrl).filter(Boolean))];
  for (let index = 0; index < photoUrls.length; index += 25) {
    await Promise.all(photoUrls.slice(index, index + 25).map(deletePhoto));
  }

  console.log(`\nDeleted recipes: ${deleted.count}`);
  console.log(`Deleted image paths: ${photoUrls.length}`);
  console.log('Related RecipeCategory and RecipeVote rows were removed by ON DELETE CASCADE.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
