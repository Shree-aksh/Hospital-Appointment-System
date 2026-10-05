'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { PublicUser, type AppointmentView, type Doctor, type Patient } from '@/lib/types';

interface DashboardClientProps {
  user: PublicUser;
  doctors: Doctor[];
  patients: Patient[];
  appointments: AppointmentView[];
  stats: {
    doctors: number;
    patients: number;
    scheduledToday: number;
    upcomingAppointments: number;
  };
}

const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatAvailability(doctor: Doctor) {
  return doctor.availability
    .map((slot) => `${weekdayLabels[slot.weekday]} ${slot.startTime}–${slot.endTime}`)
    .join(' • ');
}

export function DashboardClient({ user, doctors, patients, appointments, stats }: DashboardClientProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [appointmentState, setAppointmentState] = useState({
    doctorId: doctors[0]?.id ?? '',
    patientId: user.role === 'patient' ? '' : patients[0]?.id ?? '',
    date: new Date().toISOString().slice(0, 10),
    startTime: '09:00',
    durationMinutes: 30,
    reason: ''
  });

  const upcomingAppointments = useMemo(
    () =>
      appointments.filter((appointment) => appointment.status === 'scheduled').slice(0, 8),
    [appointments]
  );

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setFormError('');
    setFormSuccess('');

    const response = await fetch('/api/appointments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(appointmentState)
    });

    const result = (await response.json().catch(() => ({}))) as { error?: string };
    setBusy(false);

    if (!response.ok) {
      setFormError(result.error ?? 'Unable to create appointment.');
      return;
    }

    setFormSuccess('Appointment scheduled successfully.');
    setAppointmentState((current) => ({
      ...current,
      reason: ''
    }));
    router.refresh();
  }

  async function handleCancel(id: string) {
    setBusy(true);
    const response = await fetch(`/api/appointments/${id}`, {
      method: 'DELETE'
    });

    setBusy(false);

    if (!response.ok) {
      const result = (await response.json().catch(() => ({}))) as { error?: string };
      setFormError(result.error ?? 'Unable to cancel appointment.');
      return;
    }

    router.refresh();
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  }

  return (
    <div className="dashboard-shell">
      <header className="dashboard-hero panel">
        <div>
          <div className="section-kicker">Control center</div>
          <h1>Welcome, {user.name}</h1>
          <p className="muted">
            Manage doctor schedules, verify available slots, and keep every booking conflict-free.
          </p>
        </div>
        <div className="dashboard-actions">
          <a className="button button-secondary" href="/appointments">
            View appointments
          </a>
          <a className="button button-secondary" href="/doctors">
            Doctor availability
          </a>
          <button className="button button-primary" onClick={handleLogout} type="button">
            Sign out
          </button>
        </div>
      </header>

      <section className="stat-grid">
        <article className="stat-card panel">
          <span>Doctors</span>
          <strong>{stats.doctors}</strong>
        </article>
        <article className="stat-card panel">
          <span>Patients</span>
          <strong>{stats.patients}</strong>
        </article>
        <article className="stat-card panel">
          <span>Today</span>
          <strong>{stats.scheduledToday}</strong>
        </article>
        <article className="stat-card panel">
          <span>Upcoming</span>
          <strong>{stats.upcomingAppointments}</strong>
        </article>
      </section>

      <section className="dashboard-grid">
        <div className="panel booking-panel">
          <div className="section-header">
            <div>
              <div className="section-kicker">Schedule appointment</div>
              <h2>Book a new slot</h2>
            </div>
          </div>

          <form className="booking-form" onSubmit={handleCreate}>
            <label className="field">
              <span>Doctor</span>
              <select
                value={appointmentState.doctorId}
                onChange={(event) => setAppointmentState((current) => ({ ...current, doctorId: event.target.value }))}
                required
              >
                {doctors.map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>
                    {doctor.name} - {doctor.specialty}
                  </option>
                ))}
              </select>
            </label>

            {user.role !== 'patient' ? (
              <label className="field">
                <span>Patient</span>
                <select
                  value={appointmentState.patientId}
                  onChange={(event) => setAppointmentState((current) => ({ ...current, patientId: event.target.value }))}
                  required
                >
                  {patients.map((patient) => (
                    <option key={patient.id} value={patient.id}>
                      {patient.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <label className="field">
              <span>Date</span>
              <input
                type="date"
                value={appointmentState.date}
                onChange={(event) => setAppointmentState((current) => ({ ...current, date: event.target.value }))}
                required
              />
            </label>

            <label className="field">
              <span>Start time</span>
              <input
                type="time"
                value={appointmentState.startTime}
                onChange={(event) => setAppointmentState((current) => ({ ...current, startTime: event.target.value }))}
                required
              />
            </label>

            <label className="field">
              <span>Duration (minutes)</span>
              <input
                type="number"
                min="15"
                step="15"
                value={appointmentState.durationMinutes}
                onChange={(event) =>
                  setAppointmentState((current) => ({
                    ...current,
                    durationMinutes: Number(event.target.value)
                  }))
                }
                required
              />
            </label>

            <label className="field field-full">
              <span>Reason</span>
              <textarea
                value={appointmentState.reason}
                onChange={(event) => setAppointmentState((current) => ({ ...current, reason: event.target.value }))}
                placeholder="Follow-up consultation, lab review, pre-op clearance..."
                rows={4}
                required
              />
            </label>

            <button className="button button-primary" type="submit" disabled={busy}>
              {busy ? 'Saving...' : 'Book appointment'}
            </button>
          </form>

          {formError ? <div className="notice notice-error">{formError}</div> : null}
          {formSuccess ? <div className="notice notice-success">{formSuccess}</div> : null}
        </div>

        <div className="panel">
          <div className="section-header">
            <div>
              <div className="section-kicker">Doctor availability</div>
              <h2>Current schedules</h2>
            </div>
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
                <p className="availability">{formatAvailability(doctor)}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="section-header">
          <div>
            <div className="section-kicker">Appointments</div>
            <h2>Upcoming bookings</h2>
          </div>
          <a className="button button-secondary" href="/appointments">
            Open full list
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
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {upcomingAppointments.map((appointment) => (
                <tr key={appointment.id}>
                  <td>{appointment.patientName}</td>
                  <td>{appointment.doctorName}</td>
                  <td>{appointment.date}</td>
                  <td>
                    {appointment.startTime} - {appointment.endTime}
                  </td>
                  <td>
                    <span className={`pill pill-${appointment.status}`}>{appointment.status}</span>
                  </td>
                  <td className="table-actions">
                    <button className="ghost-link" type="button" onClick={() => handleCancel(appointment.id)} disabled={busy}>
                      Cancel
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
