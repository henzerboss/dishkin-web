'use client';

import { Trash2 } from 'lucide-react';

export function ConfirmDeleteButton({ message }: { message: string }) {
  return (
    <button
      className="btn-soft border-red-200 text-red-700"
      type="submit"
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      <Trash2 size={16} /> Delete
    </button>
  );
}
