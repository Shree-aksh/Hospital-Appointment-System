import { randomUUID } from 'node:crypto';

import { Pool, PoolClient } from 'pg';

import { hashPassword } from './auth';
import {
  Appointment,
  AppointmentStatus,
  AppointmentView,
  AvailabilitySlot,
  DbState,
  Doctor,
  Patient,
  PublicUser,
  User
} from './types';

const DATABASE_URL = process.env.DATABASE_URL;

let pool: Pool | null = null;
let schemaReady: Promise<void> | null = null;

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: User['role'];
  password_hash: string;
  patient_id: string | null;
  created_at: string;
};

type PatientRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  notes: string | null;
  created_at: string;
};

type DoctorRow = {
  id: string;
  name: string;
  specialty: string;
  email: string;
  room: string | null;
};

type AvailabilityRow = {
  doctor_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
};

type AppointmentRow = {
  id: string;
  patient_id: string;
  patient_name: string;
  doctor_id: string;
  doctor_name: string;
  specialty: string;
  date: string;
  start_time: string;
  duration_minutes: number;
  reason: string;
  status: AppointmentStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
};

function minutesFromTime(value: string) {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function timeFromMinutes(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60)
    .toString()
    .padStart(2, '0');
  const minutes = (totalMinutes % 60).toString().padStart(2, '0');

  return `${hours}:${minutes}`;
}

function getWeekday(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day).getDay();
}

function isOverlapping(startA: number, endA: number, startB: number, endB: number) {
  return startA < endB && startB < endA;
}

function getPool() {
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL is required. Configure a PostgreSQL connection string before starting the app.');
  }

  if (!pool) {
    pool = new Pool({ connectionString: DATABASE_URL });
  }

  return pool;
}

async function ensureSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      const activePool = getPool();
      await activePool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          role TEXT NOT NULL CHECK (role IN ('admin', 'staff', 'patient')),
          password_hash TEXT NOT NULL,
          patient_id TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS patients (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          phone TEXT,
          notes TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS doctors (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          specialty TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          room TEXT
        );

        CREATE TABLE IF NOT EXISTS doctor_availability (
          id BIGSERIAL PRIMARY KEY,
          doctor_id TEXT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
          weekday INTEGER NOT NULL CHECK (weekday BETWEEN 0 AND 6),
          start_time TEXT NOT NULL,
          end_time TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS appointments (
          id TEXT PRIMARY KEY,
          patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
          doctor_id TEXT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
          date TEXT NOT NULL,
          start_time TEXT NOT NULL,
          duration_minutes INTEGER NOT NULL,
          reason TEXT NOT NULL,
          status TEXT NOT NULL CHECK (status IN ('scheduled', 'completed', 'cancelled')),
          created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_appointments_date_doctor ON appointments(date, doctor_id);
        CREATE INDEX IF NOT EXISTS idx_appointments_date_patient ON appointments(date, patient_id);
        CREATE INDEX IF NOT EXISTS idx_doctor_availability_doctor_weekday ON doctor_availability(doctor_id, weekday);
      `);

      await maybeSeedInitialAdmin();
    })();
  }

  return schemaReady;
}

async function maybeSeedInitialAdmin() {
  const activePool = getPool();
  const initialAdminEmail = process.env.INITIAL_ADMIN_EMAIL;
  const initialAdminPassword = process.env.INITIAL_ADMIN_PASSWORD;
  const initialAdminName = process.env.INITIAL_ADMIN_NAME ?? 'Hospital Admin';

  if (!initialAdminEmail || !initialAdminPassword) {
    return;
  }

  const userCount = await activePool.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM users');
  if (Number(userCount.rows[0]?.count ?? 0) > 0) {
    return;
  }

  await activePool.query(
    'INSERT INTO users (id, name, email, role, password_hash, patient_id, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
    [randomUUID(), initialAdminName, initialAdminEmail.toLowerCase(), 'admin', hashPassword(initialAdminPassword), null]
  );
}

async function withClient<T>(operation: (client: PoolClient) => Promise<T>) {
  await ensureSchema();
  const client = await getPool().connect();

  try {
    return await operation(client);
  } finally {
    client.release();
  }
}

function mapUserRow(row: UserRow): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    passwordHash: row.password_hash,
    patientId: row.patient_id ?? undefined,
    createdAt: row.created_at
  };
}

function mapPatientRow(row: PatientRow): Patient {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at
  };
}

function mapAvailability(rows: AvailabilityRow[]): AvailabilitySlot[] {
  return rows.map((row) => ({
    weekday: row.weekday,
    startTime: row.start_time,
    endTime: row.end_time
  }));
}

function mapDoctorRow(row: DoctorRow, availability: AvailabilitySlot[]): Doctor {
  return {
    id: row.id,
    name: row.name,
    specialty: row.specialty,
    email: row.email,
    room: row.room ?? undefined,
    availability
  };
}

function mapAppointmentRow(row: AppointmentRow): AppointmentView {
  const window = getAppointmentWindow({ startTime: row.start_time, durationMinutes: row.duration_minutes });

  return {
    id: row.id,
    patientId: row.patient_id,
    patientName: row.patient_name,
    doctorId: row.doctor_id,
    doctorName: row.doctor_name,
    specialty: row.specialty,
    date: row.date,
    startTime: row.start_time,
    endTime: window.endTime,
    durationMinutes: row.duration_minutes,
    reason: row.reason,
    status: row.status,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function getAppointmentWindow(appointment: Pick<Appointment, 'startTime' | 'durationMinutes'>) {
  const start = minutesFromTime(appointment.startTime);
  const end = start + appointment.durationMinutes;

  return { start, end, endTime: timeFromMinutes(end) };
}

async function validateAppointment(client: PoolClient, input: {
  doctorId: string;
  patientId: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  ignoreAppointmentId?: string;
}) {
  const doctorResult = await client.query<DoctorRow>('SELECT id, name, specialty, email, room FROM doctors WHERE id = $1', [input.doctorId]);
  const patientResult = await client.query<PatientRow>('SELECT id, name, email, phone, notes, created_at FROM patients WHERE id = $1', [input.patientId]);

  if (!doctorResult.rows[0]) {
    throw new Error('Selected doctor does not exist.');
  }

  if (!patientResult.rows[0]) {
    throw new Error('Selected patient does not exist.');
  }

  const weekday = getWeekday(input.date);
  const appointmentStart = minutesFromTime(input.startTime);
  const appointmentEnd = appointmentStart + input.durationMinutes;

  const availabilityResult = await client.query<AvailabilityRow>(
    'SELECT doctor_id, weekday, start_time, end_time FROM doctor_availability WHERE doctor_id = $1 AND weekday = $2 ORDER BY start_time ASC',
    [input.doctorId, weekday]
  );

  const hasAvailability = availabilityResult.rows.some((slot) => {
    const slotStart = minutesFromTime(slot.start_time);
    const slotEnd = minutesFromTime(slot.end_time);
    return appointmentStart >= slotStart && appointmentEnd <= slotEnd;
  });

  if (!hasAvailability) {
    throw new Error('Doctor is not available for the requested time window.');
  }

  const conflictResult = await client.query<{
    id: string;
    doctor_id: string;
    patient_id: string;
    start_time: string;
    duration_minutes: number;
  }>(
    `SELECT id, doctor_id, patient_id, start_time, duration_minutes
     FROM appointments
     WHERE date = $1
       AND status != 'cancelled'
       AND (doctor_id = $2 OR patient_id = $3)`,
    [input.date, input.doctorId, input.patientId]
  );

  for (const conflict of conflictResult.rows) {
    if (input.ignoreAppointmentId && conflict.id === input.ignoreAppointmentId) {
      continue;
    }

    const window = getAppointmentWindow({ startTime: conflict.start_time, durationMinutes: conflict.duration_minutes });
    if (!isOverlapping(appointmentStart, appointmentEnd, window.start, window.end)) {
      continue;
    }

    if (conflict.doctor_id === input.doctorId) {
      throw new Error('This doctor already has an appointment in the requested slot.');
    }

    if (conflict.patient_id === input.patientId) {
      throw new Error('This patient already has an overlapping appointment.');
    }
  }
}

async function loadAppointmentView(client: PoolClient, id: string) {
  const result = await client.query<AppointmentRow>(
    `SELECT
      a.id,
      a.patient_id,
      p.name AS patient_name,
      a.doctor_id,
      d.name AS doctor_name,
      d.specialty,
      a.date,
      a.start_time,
      a.duration_minutes,
      a.reason,
      a.status,
      a.created_by,
      a.created_at::text AS created_at,
      a.updated_at::text AS updated_at
    FROM appointments a
    INNER JOIN patients p ON p.id = a.patient_id
    INNER JOIN doctors d ON d.id = a.doctor_id
    WHERE a.id = $1`,
    [id]
  );

  return result.rows[0] ? mapAppointmentRow(result.rows[0]) : null;
}

export async function getDatabase() {
  return withClient(async (client) => {
    const usersResult = await client.query<UserRow>('SELECT id, name, email, role, password_hash, patient_id, created_at::text AS created_at FROM users ORDER BY created_at ASC');
    const patientsResult = await client.query<PatientRow>('SELECT id, name, email, phone, notes, created_at::text AS created_at FROM patients ORDER BY created_at ASC');
    const doctorsResult = await client.query<DoctorRow>('SELECT id, name, specialty, email, room FROM doctors ORDER BY name ASC');
    const availabilityResult = await client.query<AvailabilityRow>(
      'SELECT doctor_id, weekday, start_time, end_time FROM doctor_availability ORDER BY weekday ASC, start_time ASC'
    );
    const appointmentsResult = await client.query<AppointmentRow>(
      `SELECT
        a.id,
        a.patient_id,
        p.name AS patient_name,
        a.doctor_id,
        d.name AS doctor_name,
        d.specialty,
        a.date,
        a.start_time,
        a.duration_minutes,
        a.reason,
        a.status,
        a.created_by,
        a.created_at::text AS created_at,
        a.updated_at::text AS updated_at
      FROM appointments a
      INNER JOIN patients p ON p.id = a.patient_id
      INNER JOIN doctors d ON d.id = a.doctor_id
      ORDER BY a.date ASC, a.start_time ASC`
    );

    return {
      users: usersResult.rows.map(mapUserRow),
      patients: patientsResult.rows.map(mapPatientRow),
      doctors: doctorsResult.rows.map((doctor) =>
        mapDoctorRow(doctor, mapAvailability(availabilityResult.rows.filter((availability) => availability.doctor_id === doctor.id)))
      ),
      appointments: appointmentsResult.rows.map(mapAppointmentRow)
    } as DbState;
  });
}

export async function findUserByEmail(email: string) {
  return withClient(async (client) => {
    const result = await client.query<UserRow>(
      'SELECT id, name, email, role, password_hash, patient_id, created_at::text AS created_at FROM users WHERE lower(email) = lower($1)',
      [email]
    );

    return result.rows[0] ? mapUserRow(result.rows[0]) : null;
  });
}

export async function findUserById(id: string) {
  return withClient(async (client) => {
    const result = await client.query<UserRow>(
      'SELECT id, name, email, role, password_hash, patient_id, created_at::text AS created_at FROM users WHERE id = $1',
      [id]
    );

    return result.rows[0] ? mapUserRow(result.rows[0]) : null;
  });
}

export async function createPatientUser(input: { name: string; email: string; password: string }) {
  return withClient(async (client) => {
    await client.query('BEGIN');

    try {
      const existing = await client.query<{ id: string }>('SELECT id FROM users WHERE lower(email) = lower($1)', [input.email]);
      if (existing.rows[0]) {
        throw new Error('An account with this email already exists.');
      }

      const patientId = randomUUID();
      const userId = randomUUID();
      const now = new Date().toISOString();

      await client.query(
        'INSERT INTO users (id, name, email, role, password_hash, patient_id, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [userId, input.name, input.email.toLowerCase(), 'patient', hashPassword(input.password), patientId, now]
      );
      await client.query(
        'INSERT INTO patients (id, name, email, phone, notes, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
        [patientId, input.name, input.email.toLowerCase(), null, null, now]
      );

      await client.query('COMMIT');

      const user = await findUserById(userId);
      const patient = (await client.query<PatientRow>('SELECT id, name, email, phone, notes, created_at::text AS created_at FROM patients WHERE id = $1', [patientId])).rows[0];

      if (!user || !patient) {
        throw new Error('Failed to create patient account.');
      }

      return { user, patient: mapPatientRow(patient) };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  });
}

export async function getPatients() {
  return withClient(async (client) => {
    const result = await client.query<PatientRow>('SELECT id, name, email, phone, notes, created_at::text AS created_at FROM patients ORDER BY created_at ASC');
    return result.rows.map(mapPatientRow);
  });
}

export async function getDoctors() {
  return withClient(async (client) => {
    const doctorResult = await client.query<DoctorRow>('SELECT id, name, specialty, email, room FROM doctors ORDER BY name ASC');
    const availabilityResult = await client.query<AvailabilityRow>(
      'SELECT doctor_id, weekday, start_time, end_time FROM doctor_availability ORDER BY weekday ASC, start_time ASC'
    );

    return doctorResult.rows.map((doctor) => mapDoctorRow(doctor, mapAvailability(availabilityResult.rows.filter((availability) => availability.doctor_id === doctor.id))));
  });
}

export async function listAppointments(filter?: { user?: PublicUser; doctorId?: string; patientId?: string }) {
  return withClient(async (client) => {
    const clauses = ['1 = 1'];
    const params: Array<string> = [];

    if (filter?.doctorId) {
      clauses.push('a.doctor_id = $' + (params.length + 1));
      params.push(filter.doctorId);
    }

    if (filter?.patientId) {
      clauses.push('a.patient_id = $' + (params.length + 1));
      params.push(filter.patientId);
    }

    if (filter?.user?.role === 'patient' && filter.user.patientId) {
      clauses.push('a.patient_id = $' + (params.length + 1));
      params.push(filter.user.patientId);
    }

    const query = `
      SELECT
        a.id,
        a.patient_id,
        p.name AS patient_name,
        a.doctor_id,
        d.name AS doctor_name,
        d.specialty,
        a.date,
        a.start_time,
        a.duration_minutes,
        a.reason,
        a.status,
        a.created_by,
        a.created_at::text AS created_at,
        a.updated_at::text AS updated_at
      FROM appointments a
      INNER JOIN patients p ON p.id = a.patient_id
      INNER JOIN doctors d ON d.id = a.doctor_id
      WHERE ${clauses.join(' AND ')}
      ORDER BY a.date ASC, a.start_time ASC`;

    const result = await client.query<AppointmentRow>(query, params);
    return result.rows.map(mapAppointmentRow);
  });
}

export async function createAppointment(input: {
  doctorId: string;
  patientId: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  reason: string;
  createdBy: string;
}) {
  return withClient(async (client) => {
    await client.query('BEGIN');

    try {
      await validateAppointment(client, input);
      const now = new Date().toISOString();
      const appointmentId = randomUUID();

      await client.query(
        'INSERT INTO appointments (id, patient_id, doctor_id, date, start_time, duration_minutes, reason, status, created_by, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
        [
          appointmentId,
          input.patientId,
          input.doctorId,
          input.date,
          input.startTime,
          input.durationMinutes,
          input.reason,
          'scheduled',
          input.createdBy,
          now,
          now
        ]
      );

      await client.query('COMMIT');
      const appointment = await loadAppointmentView(client, appointmentId);

      if (!appointment) {
        throw new Error('Unable to create appointment.');
      }

      return appointment;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  });
}

export async function updateAppointment(
  id: string,
  input: {
    doctorId?: string;
    patientId?: string;
    date?: string;
    startTime?: string;
    durationMinutes?: number;
    reason?: string;
    status?: AppointmentStatus;
  }
) {
  return withClient(async (client) => {
    await client.query('BEGIN');

    try {
      const currentResult = await client.query<{
        id: string;
        patient_id: string;
        doctor_id: string;
        date: string;
        start_time: string;
        duration_minutes: number;
        reason: string;
        status: AppointmentStatus;
      }>('SELECT id, patient_id, doctor_id, date, start_time, duration_minutes, reason, status FROM appointments WHERE id = $1', [id]);

      const current = currentResult.rows[0];
      if (!current) {
        throw new Error('Appointment not found.');
      }

      if (input.status === 'cancelled') {
        await client.query('UPDATE appointments SET status = $1, updated_at = $2 WHERE id = $3', ['cancelled', new Date().toISOString(), id]);
        await client.query('COMMIT');
        const appointment = await loadAppointmentView(client, id);
        if (!appointment) {
          throw new Error('Unable to update appointment.');
        }

        return appointment;
      }

      const nextDoctorId = input.doctorId ?? current.doctor_id;
      const nextPatientId = input.patientId ?? current.patient_id;
      const nextDate = input.date ?? current.date;
      const nextStartTime = input.startTime ?? current.start_time;
      const nextDurationMinutes = input.durationMinutes ?? current.duration_minutes;
      const nextReason = input.reason ?? current.reason;
      const nextStatus = input.status ?? current.status;

      await validateAppointment(client, {
        doctorId: nextDoctorId,
        patientId: nextPatientId,
        date: nextDate,
        startTime: nextStartTime,
        durationMinutes: nextDurationMinutes,
        ignoreAppointmentId: id
      });

      await client.query(
        `UPDATE appointments
         SET doctor_id = $1,
             patient_id = $2,
             date = $3,
             start_time = $4,
             duration_minutes = $5,
             reason = $6,
             status = $7,
             updated_at = $8
         WHERE id = $9`,
        [nextDoctorId, nextPatientId, nextDate, nextStartTime, nextDurationMinutes, nextReason, nextStatus, new Date().toISOString(), id]
      );

      await client.query('COMMIT');
      const appointment = await loadAppointmentView(client, id);
      if (!appointment) {
        throw new Error('Unable to update appointment.');
      }

      return appointment;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  });
}

export async function getDashboardSummary(user: PublicUser) {
  return withClient(async (client) => {
    const appointments = await listAppointments({ user });
    const doctors = await getDoctors();
    const patients = await getPatients();
    const today = new Date().toISOString().slice(0, 10);

    const scheduledTodayResult = await client.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM appointments WHERE date = $1', [today]);
    const upcomingResult = await client.query<{ count: string }>("SELECT COUNT(*)::text AS count FROM appointments WHERE status = 'scheduled'");

    return {
      appointments,
      doctors,
      patients,
      stats: {
        doctors: doctors.length,
        patients: patients.length,
        scheduledToday: Number(scheduledTodayResult.rows[0]?.count ?? 0),
        upcomingAppointments: Number(upcomingResult.rows[0]?.count ?? 0)
      }
    };
  });
}
