import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PUBLIC_ROOT = path.join(process.cwd(), 'public', 'uploads', 'recipes');
const WEB_ROOT = path.join(process.cwd(), 'uploads', 'recipes');

function contentType(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  return 'image/jpeg';
}

function safeJoin(root: string, parts: string[]) {
  const cleanParts = parts.map((part) => part.replace(/[^a-zA-Z0-9_.-]/g, '')).filter(Boolean);
  const full = path.join(root, ...cleanParts);
  const relative = path.relative(root, full);
  if (relative.startsWith('..') || path.isAbsolute(relative)) return null;
  return full;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: parts } = await params;
  const custom = process.env.DISHKIN_UPLOAD_ROOT?.trim();
  const roots = [custom ? path.resolve(custom) : null, WEB_ROOT, PUBLIC_ROOT].filter(Boolean) as string[];

  for (const root of roots) {
    const filePath = safeJoin(root, parts || []);
    if (!filePath) continue;
    try {
      const body = await readFile(filePath);
      const arrayBuffer = new Uint8Array(body).buffer;
      return new NextResponse(arrayBuffer, {
        headers: {
          'Content-Type': contentType(filePath),
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    } catch {
      // Try the next root.
    }
  }

  return new NextResponse('Not found', { status: 404 });
}
