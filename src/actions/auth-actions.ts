'use server';

import { signIn, signOut } from '@/auth';
import { AuthError } from 'next-auth';

export async function loginAction(_: unknown, formData: FormData) {
  try {
    await signIn('credentials', {
      username: String(formData.get('username') ?? ''),
      password: String(formData.get('password') ?? ''),
      redirectTo: '/admin',
    });
    return { error: '' };
  } catch (error) {
    if (error instanceof AuthError) return { error: 'Invalid username or password' };
    throw error;
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: '/' });
}
