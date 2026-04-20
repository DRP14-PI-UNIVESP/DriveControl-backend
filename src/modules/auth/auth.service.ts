import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../../config/database'
import { AppError } from '../../middleware/error.middleware'

export async function signin(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } })

  if (!user) {
    throw new AppError('Invalid credentials', 401)
  }

  const passwordMatch = await bcrypt.compare(password, user.password)

  if (!passwordMatch) {
    throw new AppError('Invalid credentials', 401)
  }

  const secret = process.env.JWT_SECRET ?? 'secret'
  const expiresIn = (process.env.JWT_EXPIRES_IN ?? '7d') as jwt.SignOptions['expiresIn']

  const token = jwt.sign({ sub: user.id, role: user.role }, secret, { expiresIn })

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    token,
  }
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } })

  if (!user) {
    throw new AppError('User not found', 404)
  }

  const secret = process.env.JWT_SECRET ?? 'secret'
  const expiresIn = (process.env.JWT_EXPIRES_IN ?? '7d') as jwt.SignOptions['expiresIn']
  const token = jwt.sign({ sub: user.id, role: user.role }, secret, { expiresIn })

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    token,
  }
}
