import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { isSupportedLocale } from '@/i18n/locales';
import { BulkGenerationError, generateAndSaveDish } from '@/lib/bulk-generation';

export const runtime = 'nodejs';
export const maxDuration = 300;

const bodySchema = z.object({
  dishName: z.string().trim().min(1).max(180),
  locale: z.string().trim().toLowerCase().min(2).max(8),
  requestId: z.string().regex(/^[a-zA-Z0-9-]{8,90}$/),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch (error) {
    return NextResponse.json({ error: 'bad_request', detail: String(error) }, { status: 400 });
  }

  if (!isSupportedLocale(body.locale)) {
    return NextResponse.json({ error: 'unsupported_locale' }, { status: 400 });
  }

  try {
    const result = await generateAndSaveDish(body.dishName, body.locale, body.requestId);
    revalidatePath('/admin');
    revalidatePath(`/${body.locale}`);
    for (const recipe of result.recipes) revalidatePath(recipe.url);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof BulkGenerationError) {
      return NextResponse.json({
        error: error.code,
        detail: error.detail,
        retryAfterSeconds: error.retryAfterSeconds,
      }, { status: error.status });
    }
    console.error('[admin-bulk-generate] failed', error);
    return NextResponse.json({ error: 'save_failed', detail: String(error) }, { status: 500 });
  }
}
