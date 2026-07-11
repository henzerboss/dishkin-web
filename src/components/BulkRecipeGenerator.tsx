'use client';

import { useMemo, useRef, useState } from 'react';
import { CheckCircle2, CircleAlert, LoaderCircle, Play, Square } from 'lucide-react';

interface LanguageOption {
  code: string;
  flag: string;
  native: string;
}

type ItemStatus = 'pending' | 'running' | 'waiting' | 'success' | 'error';

interface GeneratedRecipe {
  id: string;
  title: string;
  url: string;
  imageGenerated: boolean;
}

interface BatchItem {
  key: string;
  dishName: string;
  status: ItemStatus;
  message?: string;
  recipes?: GeneratedRecipe[];
}

interface ApiPayload {
  ok?: boolean;
  error?: string;
  detail?: string;
  retryAfterSeconds?: number;
  recipes?: GeneratedRecipe[];
  warnings?: string[];
}

const MAX_LINES = 300;

function parseDishes(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function errorMessage(payload: ApiPayload, status: number): string {
  if (payload.error === 'ai_unauthorized') {
    return 'evsi.store отклонил запрос к AI-маршруту (401/403). Проверьте доступность маршрута и настройки защиты на evsi.store.';
  }
  if (payload.error === 'invalid_ai_response') return 'AI вернул некорректный набор рецептов.';
  if (payload.error === 'unsupported_locale') return 'Выбран неподдерживаемый язык.';
  if (payload.error === 'save_failed') return 'Не удалось сохранить рецепты в базу сайта.';
  if (status === 401) return 'Сессия администратора истекла. Обновите страницу и войдите снова.';
  return payload.detail ? `${payload.error ?? 'Ошибка'}: ${payload.detail.slice(0, 300)}` : `Ошибка ${status}`;
}

export function BulkRecipeGenerator({ languages }: { languages: LanguageOption[] }) {
  const [text, setText] = useState('');
  const [locale, setLocale] = useState(languages[0]?.code ?? 'en');
  const [items, setItems] = useState<BatchItem[]>([]);
  const [running, setRunning] = useState(false);
  const [finishedMessage, setFinishedMessage] = useState('');
  const stopRef = useRef(false);
  const controllerRef = useRef<AbortController | null>(null);

  const dishes = useMemo(() => parseDishes(text), [text]);
  const successCount = items.filter((item) => item.status === 'success').length;
  const errorCount = items.filter((item) => item.status === 'error').length;
  const processedCount = successCount + errorCount;
  const generatedCount = items.reduce((sum, item) => sum + (item.recipes?.length ?? 0), 0);
  const progress = items.length ? Math.round((processedCount / items.length) * 100) : 0;

  function patchItem(index: number, patch: Partial<BatchItem>) {
    setItems((current) => current.map((item, itemIndex) => (
      itemIndex === index ? { ...item, ...patch } : item
    )));
  }

  async function waitWithStop(milliseconds: number): Promise<boolean> {
    const endAt = Date.now() + milliseconds;
    while (Date.now() < endAt) {
      if (stopRef.current) return false;
      await new Promise((resolve) => setTimeout(resolve, Math.min(1000, endAt - Date.now())));
    }
    return !stopRef.current;
  }

  async function processItem(item: BatchItem, index: number): Promise<void> {
    let transientAttempts = 0;

    while (!stopRef.current) {
      patchItem(index, { status: 'running', message: 'Генерируются 3 рецепта и изображения…' });
      const controller = new AbortController();
      controllerRef.current = controller;

      try {
        const response = await fetch('/api/admin/bulk-generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dishName: item.dishName, locale, requestId: item.key }),
          signal: controller.signal,
        });
        const payload = await response.json().catch(() => ({})) as ApiPayload;

        if (response.ok && payload.ok && payload.recipes?.length) {
          const missingImages = payload.recipes.filter((recipe) => !recipe.imageGenerated).length;
          patchItem(index, {
            status: 'success',
            recipes: payload.recipes,
            message: missingImages
              ? `Сохранено 3 рецепта. Без изображения: ${missingImages}.`
              : 'Сохранено 3 рецепта с изображениями.',
          });
          return;
        }

        if (response.status === 429 || payload.error === 'ai_rate_limited') {
          const retrySeconds = Math.max(30, payload.retryAfterSeconds ?? 300);
          patchItem(index, {
            status: 'waiting',
            message: `Достигнут лимит AI-сервера. Повтор автоматически через ${Math.ceil(retrySeconds / 60)} мин.`,
          });
          if (!await waitWithStop(retrySeconds * 1000)) return;
          continue;
        }

        if (response.status >= 500 && transientAttempts < 2) {
          transientAttempts += 1;
          patchItem(index, {
            status: 'waiting',
            message: `Временная ошибка. Повтор ${transientAttempts}/2 через 15 секунд…`,
          });
          if (!await waitWithStop(15_000)) return;
          continue;
        }

        patchItem(index, { status: 'error', message: errorMessage(payload, response.status) });
        return;
      } catch (error) {
        if (stopRef.current || (error instanceof DOMException && error.name === 'AbortError')) return;
        if (transientAttempts < 2) {
          transientAttempts += 1;
          patchItem(index, {
            status: 'waiting',
            message: `Ошибка сети. Повтор ${transientAttempts}/2 через 15 секунд…`,
          });
          if (!await waitWithStop(15_000)) return;
          continue;
        }
        patchItem(index, { status: 'error', message: 'Сетевая ошибка после повторных попыток.' });
        return;
      } finally {
        if (controllerRef.current === controller) controllerRef.current = null;
      }
    }
  }

  async function start() {
    if (running) return;
    const nextDishes = parseDishes(text);
    if (!nextDishes.length || nextDishes.length > MAX_LINES) return;

    stopRef.current = false;
    setRunning(true);
    setFinishedMessage('');
    const batchId = crypto.randomUUID();
    const initialItems = nextDishes.map((dishName, index) => ({
      key: `${batchId}-${index + 1}`,
      dishName,
      status: 'pending' as const,
    }));
    setItems(initialItems);

    for (let index = 0; index < initialItems.length; index += 1) {
      if (stopRef.current) break;
      await processItem(initialItems[index], index);
    }

    if (stopRef.current) {
      setItems((current) => current.map((item) => (
        item.status === 'running' || item.status === 'waiting'
          ? { ...item, status: 'pending', message: 'Остановлено до сохранения этого блюда.' }
          : item
      )));
    }
    setRunning(false);
    controllerRef.current = null;
    setFinishedMessage(stopRef.current
      ? 'Генерация остановлена. Уже сохранённые рецепты остаются в базе.'
      : 'Обработка списка завершена.');
  }

  function stop() {
    stopRef.current = true;
    controllerRef.current?.abort();
    setFinishedMessage('Останавливаем после текущего запроса…');
  }

  const tooMany = dishes.length > MAX_LINES;
  const canStart = dishes.length > 0 && !tooMany && !running;

  return (
    <div className="grid gap-6">
      <section className="glass rounded-[28px] p-5 sm:p-6">
        <div className="grid gap-5">
          <label className="grid gap-2">
            <span className="font-black">Названия блюд</span>
            <span className="text-sm text-[var(--muted)]">
              Одно название в строке. Максимум 300 непустых строк. Большой список может выполняться долго из-за лимитов AI-сервера — не закрывайте эту страницу до завершения.
            </span>
            <textarea
              className="input min-h-72 resize-y font-mono text-sm leading-6"
              value={text}
              onChange={(event) => setText(event.target.value)}
              disabled={running}
              placeholder={'Борщ\nПаста карбонара\nТом ям'}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-[minmax(220px,360px)_auto] sm:items-end">
            <label className="grid gap-2">
              <span className="font-black">Язык рецептов</span>
              <select className="input" value={locale} onChange={(event) => setLocale(event.target.value)} disabled={running}>
                {languages.map((language) => (
                  <option key={language.code} value={language.code}>
                    {language.flag} {language.native} ({language.code})
                  </option>
                ))}
              </select>
            </label>

            <div className="flex flex-wrap gap-3">
              <button className="btn-primary" type="button" disabled={!canStart} onClick={() => void start()}>
                <Play size={17} /> Запустить генерацию
              </button>
              {running ? (
                <button className="btn-soft" type="button" onClick={stop}>
                  <Square size={16} /> Остановить
                </button>
              ) : null}
            </div>
          </div>

          <div className={`text-sm font-bold ${tooMany ? 'text-red-600' : 'text-[var(--muted)]'}`}>
            Непустых строк: {dishes.length} / {MAX_LINES}
            {tooMany ? ' — удалите лишние строки.' : ''}
          </div>
        </div>
      </section>

      {items.length ? (
        <section className="card p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-black">Прогресс</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Обработано {processedCount} из {items.length} · создано рецептов: {generatedCount} · ошибок: {errorCount}
              </p>
            </div>
            <div className="text-2xl font-black text-[var(--primary-dark)]">{progress}%</div>
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-orange-100">
            <div className="h-full rounded-full bg-[var(--primary)] transition-all" style={{ width: `${progress}%` }} />
          </div>
          {finishedMessage ? <p className="mt-4 font-bold">{finishedMessage}</p> : null}

          <div className="mt-6 grid gap-3">
            {items.map((item, index) => (
              <article key={item.key} className="rounded-2xl border border-black/5 bg-white/70 p-4">
                <div className="flex gap-3">
                  <div className="mt-0.5 shrink-0">
                    {item.status === 'success' ? <CheckCircle2 className="text-emerald-600" size={20} /> : null}
                    {item.status === 'error' ? <CircleAlert className="text-red-600" size={20} /> : null}
                    {item.status === 'running' || item.status === 'waiting' ? <LoaderCircle className="animate-spin text-[var(--primary-dark)]" size={20} /> : null}
                    {item.status === 'pending' ? <span className="block h-5 w-5 rounded-full border-2 border-black/15" /> : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-black">{index + 1}. {item.dishName}</h3>
                    {item.message ? <p className={`mt-1 text-sm ${item.status === 'error' ? 'text-red-700' : 'text-[var(--muted)]'}`}>{item.message}</p> : null}
                    {item.recipes?.length ? (
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
                        {item.recipes.map((recipe) => (
                          <a key={recipe.id} className="font-bold text-[var(--primary-dark)] underline-offset-4 hover:underline" href={recipe.url} target="_blank" rel="noreferrer">
                            {recipe.title}
                          </a>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
