import { redirect } from 'next/navigation';

import { SetupNotice } from '@/components/setup-notice';
import { getCurrentUser } from '@/lib/session';
import { getDoctors } from '@/lib/store';

const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default async function DoctorsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  if (!process.env.DATABASE_URL) {
    return <SetupNotice />;
  }

  const doctors = await getDoctors();

  return (
    <section className="panel">
      <div className="section-header">
        <div>
          <div className="section-kicker">Doctors</div>
          <h2>Availability overview</h2>
        </div>
        <a className="button button-secondary" href="/dashboard">
          Back to dashboard
        </a>
      </div>

      <div className="doctor-list">
        {doctors.map((doctor) => (
          <article className="doctor-card" key={doctor.id}>
            <div className="doctor-heading">
              <div>
                <strong>{doctor.name}</strong>
                <div className="muted">{doctor.specialty}</div>
              </div>
              <span className="pill">{doctor.room ?? 'Consultation'}</span>
            </div>
            <p className="availability">
              {doctor.availability
                .map((slot) => `${weekdayLabels[slot.weekday]} ${slot.startTime}–${slot.endTime}`)
                .join(' • ')}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
