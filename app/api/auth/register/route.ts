import { NextRequest, NextResponse } from 'next/server';

import { createSessionToken, sanitizeUser, SESSION_COOKIE_NAME } from '@/lib/auth';
import { createPatientUser } from '@/lib/store';
import { jsonError } from '@/lib/request';

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    name?: string;
    email?: string;
    password?: string;
  } | null;

  if (!body?.name || !body.email || !body.password) {
    return jsonError('Name, email, and password are required.');
  }

  try {
    const { user } = await createPatientUser({
      name: body.name,
      email: body.email,
      password: body.password
    });

    const response = NextResponse.json({ user: sanitizeUser(user) }, { status: 201 });
    response.cookies.set(SESSION_COOKIE_NAME, createSessionToken({ userId: user.id }), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 7
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create account.';
    return jsonError(message, 400);
  }
}
