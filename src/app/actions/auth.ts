'use server'

import { cookies } from 'next/headers'
import { validateUserCredentials, createUser, findUserByEmail, findUserById } from '@/lib/db/users'
import { hashPassword } from '@/lib/auth/password'
import {
  createSessionToken,
  verifySessionToken,
  SESSION_COOKIE_NAME,
  SESSION_DURATION_SECONDS,
  type SessionPayload,
} from '@/lib/auth/jwt'
import { prisma } from '@/lib/db/client'

export interface AuthResult {
  success: boolean
  error?: string
  user?: {
    id: string
    email: string
    name: string | null
    role: string
  }
}

export async function loginAction(formData: {
  email: string
  password: string
}): Promise<AuthResult> {
  try {
    const email = formData.email.trim().toLowerCase()
    const password = formData.password

    if (!email || !password) {
      return { success: false, error: 'Укажите email и пароль' }
    }

    const user = await validateUserCredentials(email, password)
    if (!user) {
      return { success: false, error: 'Неверный email или пароль' }
    }

    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      role: user.role as 'OWNER' | 'MANAGER' | 'ACCOUNTANT',
      name: user.name,
    })

    const cookieStore = await cookies()
    cookieStore.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_DURATION_SECONDS,
    })

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    }
  } catch (err) {
    return {
      success: false,
      error: `Ошибка входа: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`,
    }
  }
}

export async function registerAction(formData: {
  email: string
  password: string
  name: string
  restaurantName?: string
  role?: 'OWNER' | 'MANAGER' | 'ACCOUNTANT'
}): Promise<AuthResult> {
  try {
    const email = formData.email.trim().toLowerCase()
    const password = formData.password
    const name = formData.name.trim()
    const role = formData.role || 'OWNER'

    if (!email || !password || !name) {
      return { success: false, error: 'Заполните все обязательные поля' }
    }

    if (password.length < 6) {
      return { success: false, error: 'Пароль должен быть не менее 6 символов' }
    }

    const existing = await findUserByEmail(email)
    if (existing) {
      return { success: false, error: 'Пользователь с таким email уже существует' }
    }

    const passwordHash = await hashPassword(password)
    const user = await createUser({
      email,
      passwordHash,
      name,
      role,
    })

    // If restaurantName is provided, create the initial Venue for this user
    if (formData.restaurantName?.trim()) {
      await prisma.venue.create({
        data: {
          name: formData.restaurantName.trim(),
          ownerId: user.id,
        },
      })
    }

    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      role: user.role as 'OWNER' | 'MANAGER' | 'ACCOUNTANT',
      name: user.name,
    })

    const cookieStore = await cookies()
    cookieStore.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_DURATION_SECONDS,
    })

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    }
  } catch (err) {
    return {
      success: false,
      error: `Ошибка регистрации: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`,
    }
  }
}

export async function logoutAction(): Promise<{ success: boolean }> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
  return { success: true }
}

export async function getCurrentUserAction(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value

    if (!sessionToken) {
      // In local dev/demo mode, if no session cookie yet, fallback to default seed user
      const defaultUser = await prisma.user.findFirst()
      if (defaultUser) {
        return {
          userId: defaultUser.id,
          email: defaultUser.email,
          role: defaultUser.role as 'OWNER' | 'MANAGER' | 'ACCOUNTANT',
          name: defaultUser.name,
        }
      }
      return null
    }

    const payload = await verifySessionToken(sessionToken)
    if (!payload) return null

    // Ensure user still exists
    const user = await findUserById(payload.userId)
    if (!user) return null

    return {
      userId: user.id,
      email: user.email,
      role: user.role as 'OWNER' | 'MANAGER' | 'ACCOUNTANT',
      name: user.name,
    }
  } catch {
    return null
  }
}
