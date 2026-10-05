import { NextRequest, NextResponse } from 'next/server';

import { createSessionToken, sanitizeUser, SESSION_COOKIE_NAME, verifyPassword } from '@/lib/auth';
import { findUserByEmail } from '@/lib/store';
import { jsonError } from '@/lib/request';

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { email?: string; password?: string } | null;

  if (!body?.email || !body.password) {
    return jsonError('Email and password are required.');
  }

  const user = await findUserByEmail(body.email);
  if (!user || !verifyPassword(body.password, user.passwordHash)) {
    return jsonError('Invalid email or password.', 401);
  }

  const response = NextResponse.json({ user: sanitizeUser(user) });
  response.cookies.set(SESSION_COOKIE_NAME, createSessionToken({ userId: user.id }), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7
  });

  return response;
}
