import { NextRequest, NextResponse } from 'next/server';

import { sanitizeUser } from '@/lib/auth';
import { getAuthenticatedUser } from '@/lib/request';
import { findUserById } from '@/lib/store';

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  const fullUser = await findUserById(user.id);
  return NextResponse.json({ user: fullUser ? sanitizeUser(fullUser) : null });
}
