import { NextRequest, NextResponse } from 'next/server';

import { getAuthenticatedUser } from '@/lib/request';
import { getPatients } from '@/lib/store';

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const patients = await getPatients();
  if (user.role === 'patient' && user.patientId) {
    return NextResponse.json({ patients: patients.filter((patient) => patient.id === user.patientId) });
  }

  return NextResponse.json({ patients });
}
