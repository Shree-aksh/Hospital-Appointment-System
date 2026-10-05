import { NextRequest, NextResponse } from 'next/server';

import { getAuthenticatedUser } from '@/lib/request';
import { getDatabase, updateAppointment } from '@/lib/store';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: appointmentId } = await context.params;

  if (!appointmentId) {
    return NextResponse.json({ error: 'Appointment not found.' }, { status: 404 });
  }
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    doctorId?: string;
    patientId?: string;
    date?: string;
    startTime?: string;
    durationMinutes?: number;
    reason?: string;
    status?: 'scheduled' | 'completed' | 'cancelled';
  } | null;

  const db = await getDatabase();
  const appointment = db.appointments.find((item) => item.id === appointmentId);

  if (!appointment) {
    return NextResponse.json({ error: 'Appointment not found.' }, { status: 404 });
  }

  if (user.role === 'patient' && appointment.patientId !== user.patientId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const updated = await updateAppointment(appointmentId, {
      doctorId: body?.doctorId,
      patientId: body?.patientId,
      date: body?.date,
      startTime: body?.startTime,
      durationMinutes: body?.durationMinutes,
      reason: body?.reason,
      status: body?.status
    });

    return NextResponse.json({ appointment: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to update appointment.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: appointmentId } = await context.params;

  if (!appointmentId) {
    return NextResponse.json({ error: 'Appointment not found.' }, { status: 404 });
  }
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = await getDatabase();
  const appointment = db.appointments.find((item) => item.id === appointmentId);

  if (!appointment) {
    return NextResponse.json({ error: 'Appointment not found.' }, { status: 404 });
  }

  if (user.role === 'patient' && appointment.patientId !== user.patientId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const updated = await updateAppointment(appointmentId, { status: 'cancelled' });
    return NextResponse.json({ appointment: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to cancel appointment.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
