import bcrypt from 'bcryptjs'
import { prisma } from '../../config/database'
import { AppError } from '../../middleware/error.middleware'

function formatInstructor(instructor: {
  id: string
  userId: string
  licenseNumber: string
  categories: unknown
  licenseStatus: string
  user: { name: string; email: string }
  _count?: { lessons: number }
  lessons?: { rating: number | null }[]
}) {
  const completedLessons = instructor.lessons?.filter((l) => l.rating !== null) ?? []
  const avgRating =
    completedLessons.length > 0
      ? completedLessons.reduce((sum, l) => sum + (l.rating ?? 0), 0) / completedLessons.length
      : undefined

  return {
    id: instructor.id,
    user_id: instructor.userId,
    name: instructor.user.name,
    email: instructor.user.email,
    license_number: instructor.licenseNumber,
    categories: instructor.categories as string[],
    license_status: instructor.licenseStatus,
    total_lessons: instructor._count?.lessons ?? instructor.lessons?.length ?? 0,
    rating: avgRating,
  }
}

export async function createInstructor(data: {
  name: string
  email: string
  password: string
  licenseNumber: string
  categories: string[]
}) {
  const emailInUse = await prisma.user.findUnique({ where: { email: data.email } })
  if (emailInUse) throw new AppError('Email already in use', 409)

  const licenseInUse = await prisma.instructor.findUnique({
    where: { licenseNumber: data.licenseNumber },
  })
  if (licenseInUse) throw new AppError('License number already registered', 409)

  const hashedPassword = await bcrypt.hash(data.password, 10)

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      password: hashedPassword,
      role: 'INSTRUCTOR',
      instructor: {
        create: {
          licenseNumber: data.licenseNumber,
          categories: data.categories,
        },
      },
    },
    include: { instructor: true },
  })

  return formatInstructor({
    id: user.instructor!.id,
    userId: user.instructor!.userId,
    licenseNumber: user.instructor!.licenseNumber,
    categories: user.instructor!.categories,
    licenseStatus: user.instructor!.licenseStatus,
    user: { name: user.name, email: user.email },
    _count: { lessons: 0 },
  })
}

export async function listInstructors(params: {
  search?: string
  category?: string
  page?: number
  limit?: number
}) {
  const page = params.page ?? 1
  const limit = params.limit ?? 10
  const skip = (page - 1) * limit

  const instructors = await prisma.instructor.findMany({
    where: {
      categories: params.category ? { array_contains: params.category } : undefined,
      user: params.search
        ? { name: { contains: params.search } }
        : undefined,
    },
    include: {
      user: true,
      _count: { select: { lessons: true } },
      lessons: { select: { rating: true }, where: { status: 'COMPLETED' } },
    },
    skip,
    take: limit,
  })

  return instructors.map(formatInstructor)
}

export async function getInstructorById(id: string) {
  const instructor = await prisma.instructor.findUnique({
    where: { id },
    include: {
      user: true,
      _count: { select: { lessons: true } },
      lessons: { select: { rating: true }, where: { status: 'COMPLETED' } },
    },
  })

  if (!instructor) throw new AppError('Instructor not found', 404)

  return formatInstructor(instructor)
}

export async function getInstructorByUserId(userId: string) {
  const instructor = await prisma.instructor.findUnique({
    where: { userId },
    include: {
      user: true,
      _count: { select: { lessons: true } },
      lessons: { select: { rating: true }, where: { status: 'COMPLETED' } },
    },
  })

  if (!instructor) throw new AppError('Instructor not found', 404)

  return formatInstructor(instructor)
}

export async function updateInstructor(
  id: string,
  data: { name?: string; email?: string; licenseNumber?: string; categories?: string[] }
) {
  const instructor = await prisma.instructor.findUnique({ where: { id } })
  if (!instructor) throw new AppError('Instructor not found', 404)

  const updated = await prisma.instructor.update({
    where: { id },
    data: {
      licenseNumber: data.licenseNumber,
      categories: data.categories,
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

  return formatInstructor(updated)
}
