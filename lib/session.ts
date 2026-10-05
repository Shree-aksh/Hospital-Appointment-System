import { cookies } from 'next/headers';

import { SESSION_COOKIE_NAME, parseSessionToken, sanitizeUser } from './auth';
import { findUserById } from './store';
import { PublicUser } from './types';

export async function getCurrentUser(): Promise<PublicUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const payload = parseSessionToken(token);

    if (!payload) {
      return null;
    }

    const user = await findUserById(payload.userId);
    if (!user) {
      return null;
    }

    return sanitizeUser(user);
  } catch {
    return null;
  }
}
