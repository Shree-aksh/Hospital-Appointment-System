import { redirect } from 'next/navigation';

import { DashboardClient } from '@/components/dashboard-client';
import { SetupNotice } from '@/components/setup-notice';
import { getDashboardSummary } from '@/lib/store';
import { getCurrentUser } from '@/lib/session';

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  if (!process.env.DATABASE_URL) {
    return <SetupNotice />;
  }

  const summary = await getDashboardSummary(user);

  return (
    <DashboardClient
      user={user}
      doctors={summary.doctors}
      patients={summary.patients}
      appointments={summary.appointments}
      stats={summary.stats}
    />
  );
}
