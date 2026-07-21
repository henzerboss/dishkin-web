'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';

export function WrongLocaleCleanupForm({
  action,
  confirmation,
  disabled,
  totalRecipes,
}: {
  action: (formData: FormData) => void | Promise<void>;
  confirmation: string;
  disabled: boolean;
  totalRecipes: number;
}) {
  const [value, setValue] = useState('');
  const ready = !disabled && totalRecipes > 0 && value === confirmation;

  return (
    <form
      action={action}
      className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5"
      onSubmit={(event) => {
        if (!ready || !window.confirm(`Удалить ${totalRecipes} рецептов без возможности восстановления?`)) {
          event.preventDefault();
        }
      }}
    >
      <label className="block text-sm font-bold text-red-950" htmlFor="cleanup-confirmation">
        Для подтверждения введите: <code>{confirmation}</code>
      </label>
      <input
        id="cleanup-confirmation"
        className="input mt-3 border-red-200 bg-white"
        name="confirmation"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        autoComplete="off"
        spellCheck={false}
        disabled={disabled || totalRecipes === 0}
      />
      <button
        className="btn-soft mt-4 border-red-300 text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
        type="submit"
        disabled={!ready}
      >
        <Trash2 size={16} /> Удалить загрязнённые локализации
      </button>
    </form>
  );
}
