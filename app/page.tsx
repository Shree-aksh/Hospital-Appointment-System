import Link from 'next/link';
import { redirect } from 'next/navigation';

import { SetupNotice } from '@/components/setup-notice';
import { getCurrentUser } from '@/lib/session';

export default async function HomePage() {
  const user = await getCurrentUser();
  if (user) {
    redirect('/dashboard');
  }

  if (!process.env.DATABASE_URL) {
    return <SetupNotice />;
  }

  return (
    <section className="hero">
      <article className="hero-card">
        <div className="hero-copy">
          <div className="section-kicker">Hospital appointment system</div>
          <h1>Keep appointments, doctors, and patient flow in one controlled schedule.</h1>
          <p>
            MediQueue is a hospital booking workspace with a Node.js backend and SQL persistence for conflict-free
            appointments, recurring doctor availability, and secure patient records.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/login">
              Sign in
            </Link>
            <Link className="button button-secondary" href="/register">
              Create patient account
            </Link>
          </div>
        </div>
      </article>

      <aside className="hero-visual">
        <div className="hero-tile">
          <div>
            <small>Built for</small>
            <h2>Doctors, front desk teams, and patients.</h2>
          </div>
          <strong>Live slot conflict checks</strong>
        </div>
        <div className="hero-chip-grid">
          <div className="hero-chip">
            <strong>Authentication</strong>
            <p className="muted">Secure session cookies and role-based sign-in for live hospital users.</p>
          </div>
          <div className="hero-chip">
            <strong>Scheduling workflows</strong>
            <p className="muted">Recurring doctor availability and overlap protection in the SQL-backed API layer.</p>
          </div>
          <div className="hero-chip">
            <strong>Patient records</strong>
            <p className="muted">Store and retrieve patient data alongside appointments without leaving the app.</p>
          </div>
        </div>
      </aside>
    </section>
  );
}
