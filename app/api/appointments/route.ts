import { NextRequest, NextResponse } from 'next/server';

import { getAuthenticatedUser } from '@/lib/request';
import { createAppointment, getPatients, listAppointments } from '@/lib/store';

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const doctorId = url.searchParams.get('doctorId') ?? undefined;
  const patientId = url.searchParams.get('patientId') ?? undefined;
  const appointments = await listAppointments({ user, doctorId, patientId });

  return NextResponse.json({ appointments });
}

export async function POST(request: NextRequest) {
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
  } | null;

  if (!body?.doctorId || !body.date || !body.startTime || !body.reason) {
    return NextResponse.json({ error: 'Doctor, date, start time, and reason are required.' }, { status: 400 });
  }

  const durationMinutes = body.durationMinutes ?? 30;
  const patientId = user.role === 'patient' ? user.patientId : body.patientId;

  if (!patientId) {
    return NextResponse.json({ error: 'Patient selection is required.' }, { status: 400 });
  }

  try {
    const appointment = await createAppointment({
      doctorId: body.doctorId,
      patientId,
      date: body.date,
      startTime: body.startTime,
      durationMinutes,
      reason: body.reason,
      createdBy: user.id
    });

    return NextResponse.json({ appointment }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create appointment.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
