import crypto from 'node:crypto';

import { PublicUser, User } from './types';

const PASSWORD_ITERATIONS = 120000;
const PASSWORD_KEYLEN = 64;
const PASSWORD_DIGEST = 'sha512';
const SESSION_COOKIE = 'hospital_session';
const SESSION_SECRET = process.env.AUTH_SECRET ?? 'dev-only-hospital-secret';

export const SESSION_COOKIE_NAME = SESSION_COOKIE;

export function hashPassword(password: string, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto
    .pbkdf2Sync(password, salt, PASSWORD_ITERATIONS, PASSWORD_KEYLEN, PASSWORD_DIGEST)
    .toString('hex');

  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const [salt, hash] = storedHash.split(':');

  if (!salt || !hash) {
    return false;
  }

  const candidate = crypto
    .pbkdf2Sync(password, salt, PASSWORD_ITERATIONS, PASSWORD_KEYLEN, PASSWORD_DIGEST)
    .toString('hex');

  const hashBuffer = Buffer.from(hash, 'hex');
  const candidateBuffer = Buffer.from(candidate, 'hex');

  if (hashBuffer.length !== candidateBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(hashBuffer, candidateBuffer);
}

export function createSessionToken(payload: { userId: string }) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(body).digest('base64url');

  return `${body}.${signature}`;
}

export function parseSessionToken(token: string | undefined | null): { userId: string } | null {
  if (!token) {
    return null;
  }

  const [body, signature] = token.split('.');
  if (!body || !signature) {
    return null;
  }

  const expected = crypto.createHmac('sha256', SESSION_SECRET).update(body).digest('base64url');
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== signatureBuffer.length) {
    return null;
  }

  if (!crypto.timingSafeEqual(expectedBuffer, signatureBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as { userId?: string };
    if (!payload.userId) {
      return null;
    }

    return { userId: payload.userId };
  } catch {
    return null;
  }
}

export function sanitizeUser(user: User): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    patientId: user.patientId
  };
}
