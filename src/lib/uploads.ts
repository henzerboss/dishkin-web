import { mkdir, unlink, writeFile } from 'fs/promises';
import path from 'path';
import { MAX_IMAGE_BYTES } from './config';

const UPLOAD_ROOT = path.join(process.cwd(), 'public', 'uploads', 'recipes');

function extFromMime(mime?: string): 'jpg' | 'png' | 'webp' {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  return 'jpg';
}

export async function saveRecipeImage(recipeId: string, base64: string, mime?: string): Promise<string> {
  const clean = base64.replace(/^data:image\/\w+;base64,/, '').trim();
  const buffer = Buffer.from(clean, 'base64');
  if (!buffer.length || buffer.length > MAX_IMAGE_BYTES) {
    throw new Error('invalid_image_size');
  }
  const now = new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dir = path.join(UPLOAD_ROOT, year, month);
  await mkdir(dir, { recursive: true });
  const ext = extFromMime(mime);
  const safeId = recipeId.replace(/[^a-zA-Z0-9_-]/g, '');
  const filename = `${safeId}-${Date.now()}.${ext}`;
  const fullPath = path.join(dir, filename);
  await writeFile(fullPath, buffer);
  return `/uploads/recipes/${year}/${month}/${filename}`;
}

export async function deletePublicFile(publicPath?: string | null): Promise<void> {
  if (!publicPath || !publicPath.startsWith('/uploads/recipes/')) return;
  const fullPath = path.join(process.cwd(), 'public', publicPath);
  try {
    await unlink(fullPath);
  } catch {
    // File can already be gone; DB hard delete is still the source of truth.
  }
}
