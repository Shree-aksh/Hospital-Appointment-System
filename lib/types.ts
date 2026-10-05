export type UserRole = 'admin' | 'staff' | 'patient';

export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  passwordHash: string;
  patientId?: string;
  createdAt: string;
}

export interface Patient {
  id: string;
  name: string;
  email: string;
  phone?: string;
  notes?: string;
  createdAt: string;
}

export interface AvailabilitySlot {
  weekday: number;
  startTime: string;
  endTime: string;
}

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  email: string;
  availability: AvailabilitySlot[];
  room?: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  reason: string;
  status: AppointmentStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface DbState {
  users: User[];
  patients: Patient[];
  doctors: Doctor[];
  appointments: Appointment[];
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  patientId?: string;
}

export interface AppointmentView {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  specialty: string;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  reason: string;
  status: AppointmentStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
