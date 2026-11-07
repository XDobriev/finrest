import { prisma } from './client'
import { verifyPassword } from '../auth/password'
import type { User } from '@prisma/client'

export async function createUser(data: {
  email: string
  passwordHash?: string
  name?: string
  role?: string
}): Promise<User> {
  return prisma.user.create({
    data: {
      email: data.email.toLowerCase().trim(),
      passwordHash: data.passwordHash,
      name: data.name,
      role: data.role || 'OWNER',
    },
  })
}

export async function findUserByEmail(email: string): Promise<User | null> {
  return prisma.user.findUnique({
    where: {
      email: email.toLowerCase().trim(),
    },
    include: {
      venues: true,
    },
  })
}

export async function findUserById(id: string): Promise<User | null> {
  return prisma.user.findUnique({
    where: { id },
    include: {
      venues: true,
    },
  })
}

export async function validateUserCredentials(
  email: string,
  plainPassword: string
): Promise<User | null> {
  const user = await findUserByEmail(email)
  if (!user || !user.passwordHash) {
    return null
  }

  const isValid = await verifyPassword(plainPassword, user.passwordHash)
  if (!isValid) {
    return null
  }

  return user
}
