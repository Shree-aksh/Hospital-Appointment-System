import { redirect } from 'next/navigation';

import { SetupNotice } from '@/components/setup-notice';
import { getCurrentUser } from '@/lib/session';
import { listAppointments } from '@/lib/store';

export default async function AppointmentsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  if (!process.env.DATABASE_URL) {
    return <SetupNotice />;
  }

  const appointments = await listAppointments({ user });

  return (
    <section className="panel">
      <div className="section-header">
        <div>
          <div className="section-kicker">Appointments</div>
          <h2>Current schedule</h2>
        </div>
        <a className="button button-secondary" href="/dashboard">
          Back to dashboard
        </a>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Patient</th>
              <th>Doctor</th>
              <th>Date</th>
              <th>Time</th>
              <th>Reason</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {appointments.map((appointment) => (
              <tr key={appointment.id}>
                <td>{appointment.patientName}</td>
                <td>{appointment.doctorName}</td>
                <td>{appointment.date}</td>
                <td>
                  {appointment.startTime} - {appointment.endTime}
                </td>
                <td>{appointment.reason}</td>
                <td>
                  <span className={`pill pill-${appointment.status}`}>{appointment.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
