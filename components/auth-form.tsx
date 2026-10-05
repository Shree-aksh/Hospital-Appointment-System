'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

import { PublicUser } from '@/lib/types';

interface AuthFormProps {
  mode: 'login' | 'register';
  databaseReady: boolean;
}

export function AuthForm({ mode, databaseReady }: AuthFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState<PublicUser | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());
    const response = await fetch(mode === 'login' ? '/api/auth/login' : '/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = (await response.json().catch(() => ({}))) as {
      error?: string;
      user?: PublicUser;
    };

    setLoading(false);

    if (!response.ok) {
      setError(result.error ?? 'Something went wrong.');
      return;
    }

    setUser(result.user ?? null);
    router.push('/dashboard');
    router.refresh();
  }

  const title = mode === 'login' ? 'Welcome back' : 'Create patient account';
  const subtitle =
    mode === 'login'
      ? 'Sign in to manage hospital bookings, availability, and patient workflows.'
      : 'Open a patient account and start booking appointments in a few seconds.';
  return (
    <section className="auth-shell">
      <div className="auth-card">
        <div className="section-kicker">Hospital scheduling</div>
        <h1>{title}</h1>
        <p className="muted">{subtitle}</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'register' ? (
            <label className="field">
              <span>Full name</span>
              <input name="name" required placeholder="Jane Doe" />
            </label>
          ) : null}

          <label className="field">
            <span>Email</span>
            <input name="email" type="email" required placeholder="you@hospital.com" />
          </label>

          <label className="field">
            <span>Password</span>
            <input name="password" type="password" required placeholder="••••••••" />
          </label>

          <button className="button button-primary" type="submit" disabled={loading}>
            {loading ? 'Working...' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        {error ? <div className="notice notice-error">{error}</div> : null}
        {user ? <div className="notice notice-success">Signed in as {user.name}</div> : null}
        {!databaseReady ? (
          <div className="notice notice-error">
            PostgreSQL is not configured in this environment. Add DATABASE_URL before using sign-in or registration.
          </div>
        ) : null}

        <div className="auth-footnote">
          {mode === 'login' ? (
            <>
              New here? <a href="/register">Create an account</a>
            </>
          ) : (
            <>
              Already have access? <a href="/login">Sign in</a>
            </>
          )}
        </div>
      </div>

      <div className="auth-aside panel">
        <h2>Production access</h2>
        <p className="muted">Connect this screen to your live PostgreSQL users table and sign in with your organization account.</p>
        <div className="metric-row">
          <span>Database</span>
          <strong>PostgreSQL</strong>
        </div>
        <div className="metric-row">
          <span>Sessions</span>
          <strong>HTTP only</strong>
        </div>
      </div>
    </section>
  );
}
