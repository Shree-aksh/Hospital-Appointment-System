import { NextRequest, NextResponse } from 'next/server';

import { parseSessionToken, sanitizeUser } from './auth';
import { findUserById } from './store';
import { PublicUser } from './types';

export async function getAuthenticatedUser(request: NextRequest): Promise<PublicUser | null> {
  const token = parseSessionToken(request.cookies.get('hospital_session')?.value);

  if (!token) {
    return null;
  }

  const user = await findUserById(token.userId);
  if (!user) {
    return null;
  }

  return sanitizeUser(user);
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
