'use client';

import { useActionState } from 'react';
import { loginAction } from '@/actions/auth-actions';

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, { error: '' });
  return (
    <form action={action} className="card mx-auto mt-16 grid max-w-sm gap-4 p-6">
      <div>
        <p className="badge">Dishkin</p>
        <h1 className="mt-3 text-2xl font-black">Admin login</h1>
      </div>
      <input className="input" name="username" placeholder="Username" autoComplete="username" required />
      <input className="input" name="password" placeholder="Password" type="password" autoComplete="current-password" required />
      {state?.error ? <p className="text-sm font-semibold text-red-600">{state.error}</p> : null}
      <button className="btn-primary" disabled={pending}>{pending ? 'Signing in…' : 'Login'}</button>
    </form>
  );
}
