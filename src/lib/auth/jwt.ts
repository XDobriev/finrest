import { SignJWT, jwtVerify } from 'jose'

const JWT_SECRET_STRING = process.env.JWT_SECRET || 'finrest-production-secret-key-152fz-secured-minimum-32-chars'
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_STRING)

export interface SessionPayload {
  userId: string
  email: string
  role: 'OWNER' | 'MANAGER' | 'ACCOUNTANT'
  name?: string | null
}

export const SESSION_COOKIE_NAME = 'finrest_session'
export const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7 // 7 days

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET)
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
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
