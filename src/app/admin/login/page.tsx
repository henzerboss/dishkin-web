import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { LoginForm } from '@/components/LoginForm';

export default async function AdminLoginPage() {
  const session = await auth();
  if (session) redirect('/admin');
  return <div className="container"><LoginForm /></div>;
}
