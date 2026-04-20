import bcrypt from 'bcryptjs'
import { prisma } from '../../config/database'
import { AppError } from '../../middleware/error.middleware'

function formatStudent(student: {
  id: string
  userId: string
  cpf: string
  desiredCategory: string
  user: { name: string; email: string }
  _count?: { lessons: number }
  lessons?: { rating: number | null }[]
}) {
  const completedLessons = student.lessons?.filter((l) => l.rating !== null) ?? []
  const avgRating =
    completedLessons.length > 0
      ? completedLessons.reduce((sum, l) => sum + (l.rating ?? 0), 0) / completedLessons.length
      : undefined

  return {
    id: student.id,
    user_id: student.userId,
    name: student.user.name,
    email: student.user.email,
    cpf: student.cpf,
    desired_category: student.desiredCategory,
    total_lessons: student._count?.lessons ?? student.lessons?.length ?? 0,
    average_rating: avgRating,
  }
}

export async function createStudent(data: {
  name: string
  email: string
  password: string
  cpf: string
  desiredCategory: string
}) {
  const emailInUse = await prisma.user.findUnique({ where: { email: data.email } })
  if (emailInUse) throw new AppError('Email already in use', 409)

  const cpfInUse = await prisma.student.findUnique({ where: { cpf: data.cpf } })
  if (cpfInUse) throw new AppError('CPF already registered', 409)

  const hashedPassword = await bcrypt.hash(data.password, 10)

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      password: hashedPassword,
      role: 'STUDENT',
      student: {
        create: {
          cpf: data.cpf,
          desiredCategory: data.desiredCategory,
        },
      },
    },
    include: {
      student: true,
    },
  })

  return formatStudent({
    id: user.student!.id,
    userId: user.student!.userId,
    cpf: user.student!.cpf,
    desiredCategory: user.student!.desiredCategory,
    user: { name: user.name, email: user.email },
    _count: { lessons: 0 },
  })
}

export async function getStudentByUserId(userId: string) {
  const student = await prisma.student.findUnique({
    where: { userId },
    include: {
      user: true,
      _count: { select: { lessons: true } },
      lessons: { select: { rating: true }, where: { status: 'COMPLETED' } },
    },
  })

  if (!student) throw new AppError('Student not found', 404)

  return formatStudent(student)
}

export async function getStudentById(id: string) {
  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      user: true,
      _count: { select: { lessons: true } },
      lessons: { select: { rating: true }, where: { status: 'COMPLETED' } },
    },
  })

  if (!student) throw new AppError('Student not found', 404)

  return formatStudent(student)
}

export async function updateStudent(
  id: string,
  data: { name?: string; email?: string; desiredCategory?: string }
) {
  const student = await prisma.student.findUnique({ where: { id } })
  if (!student) throw new AppError('Student not found', 404)

  const updated = await prisma.student.update({
    where: { id },
    data: {
      desiredCategory: data.desiredCategory,
      user: {
        update: {
          name: data.name,
          email: data.email,
        },
      },
    },
    include: {
      user: true,
      _count: { select: { lessons: true } },
      lessons: { select: { rating: true }, where: { status: 'COMPLETED' } },
    },
  })

  return formatStudent(updated)
}
