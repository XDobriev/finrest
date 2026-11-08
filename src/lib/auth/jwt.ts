import { SignJWT, jwtVerify } from 'jose'

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET
  if (process.env.NODE_ENV === 'production') {
    if (!secret || secret.trim().length < 32) {
      throw new Error('FATAL: JWT_SECRET must be set and at least 32 characters in production')
    }
    return new TextEncoder().encode(secret)
  }
  return new TextEncoder().encode(secret || 'finrest-development-insecure-secret-key-32chars!!')
}

export interface SessionPayload {
  userId: string
  email: string
  role: 'OWNER' | 'MANAGER' | 'ACCOUNTANT'
  name?: string | null
}

export const SESSION_COOKIE_NAME = 'finrest_session'
export const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7 // 7 days

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  const secret = getJwtSecret()
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret)
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const secret = getJwtSecret()
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ['HS256'],
    })
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      role: payload.role as 'OWNER' | 'MANAGER' | 'ACCOUNTANT',
      name: payload.name as string | undefined,
    }
  } catch {
    return null
  }
}
