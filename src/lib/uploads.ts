import { mkdir, unlink, writeFile } from 'fs/promises';
import path from 'path';
import { MAX_IMAGE_BYTES } from './config';

const PUBLIC_UPLOAD_ROOT = path.join(process.cwd(), 'public', 'uploads', 'recipes');
const WEB_ROOT_UPLOAD_ROOT = path.join(process.cwd(), 'uploads', 'recipes');

function uploadRoots() {
  const custom = process.env.DISHKIN_UPLOAD_ROOT?.trim();
  const roots = [PUBLIC_UPLOAD_ROOT, WEB_ROOT_UPLOAD_ROOT];
  if (custom) roots.unshift(path.resolve(custom));
  return [...new Set(roots)];
}

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
  const ext = extFromMime(mime);
  const safeId = recipeId.replace(/[^a-zA-Z0-9_-]/g, '');
  const filename = `${safeId}-${Date.now()}.${ext}`;
  const publicPath = `/uploads/recipes/${year}/${month}/${filename}`;

  // Write to both locations:
  // - public/uploads is used by Next.js itself;
  // - uploads is used by CloudPanel/nginx when it serves static files directly from htdocs.
  for (const root of uploadRoots()) {
    const dir = path.join(root, year, month);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, filename), buffer);
  }

  return publicPath;
}

export async function deletePublicFile(publicPath?: string | null): Promise<void> {
  if (!publicPath || !publicPath.startsWith('/uploads/recipes/')) return;
  const relativePath = publicPath.replace(/^\/uploads\/recipes\//, '');
  for (const root of uploadRoots()) {
    try {
      await unlink(path.join(root, relativePath));
    } catch {
      // File can already be gone; DB hard delete is still the source of truth.
    }
  }
}
