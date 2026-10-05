import { redirect } from 'next/navigation';

import { AuthForm } from '@/components/auth-form';
import { SetupNotice } from '@/components/setup-notice';
import { getCurrentUser } from '@/lib/session';

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect('/dashboard');
  }

  if (!process.env.DATABASE_URL) {
    return <SetupNotice />;
  }

  return <AuthForm mode="login" databaseReady={true} />;
}
