import type { Metadata } from 'next';
import Link from 'next/link';

import './globals.css';

export const metadata: Metadata = {
  title: 'MediQueue | Hospital Appointment System',
  description: 'Hospital appointment and slot management built with Next.js and Node.js.'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div className="page-backdrop" />
        <div className="page-shell">
          <header className="topbar">
            <Link className="brand" href="/">
              MediQueue
            </Link>
            <nav className="nav-links">
              <Link href="/dashboard">Dashboard</Link>
              <Link href="/appointments">Appointments</Link>
              <Link href="/doctors">Doctors</Link>
              <Link href="/login">Login</Link>
            </nav>
          </header>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
