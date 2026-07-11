import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, DatabaseZap } from 'lucide-react';
import { auth } from '@/auth';
import { BulkRecipeGenerator } from '@/components/BulkRecipeGenerator';
import { LANGUAGES } from '@/i18n/locales';

export const dynamic = 'force-dynamic';

export default async function BulkGenerationPage() {
  const session = await auth();
  if (!session) redirect('/admin/login');

  return (
    <main className="container py-8">
      <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="badge"><DatabaseZap size={14} /> Dishkin Admin</p>
          <h1 className="mt-3 text-3xl font-black">Массовая генерация рецептов</h1>
          <p className="mt-2 max-w-3xl text-[var(--muted)]">
            Для каждого блюда сайт последовательно повторяет сценарий приложения: 4 порции, пустой список продуктов,
            шаг «Из чего готовим» пропущен, остальные настройки не выбраны. AI создаёт три рецепта, после чего они
            сохраняются в базу dishkin.com.
          </p>
        </div>
        <Link className="btn-soft shrink-0" href="/admin"><ArrowLeft size={16} /> К списку рецептов</Link>
      </div>

      <BulkRecipeGenerator languages={LANGUAGES.map(({ code, flag, native }) => ({ code, flag, native }))} />
    </main>
  );
}
