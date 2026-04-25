import { prisma } from '../../config/database'
import { AppError } from '../../middleware/error.middleware'

function formatLesson(lesson: {
  id: string
  instructorId: string
  studentId: string
  vehicleId: string
  date: string
  startTime: string
  endTime: string | null
  durationMinutes: number
  rating: number | null
  notes: string | null
  difficulties: string | null
  status: string
  instructor: { user: { name: string } }
  student: { user: { name: string } }
}) {
  return {
    id: lesson.id,
    instructor_id: lesson.instructorId,
    instructor_name: lesson.instructor.user.name,
    student_id: lesson.studentId,
    student_name: lesson.student.user.name,
    vehicle_id: lesson.vehicleId,
    date: lesson.date,
    start_time: lesson.startTime,
    end_time: lesson.endTime,
    duration_minutes: lesson.durationMinutes,
    rating: lesson.rating ?? undefined,
    notes: lesson.notes ?? undefined,
    difficulties: lesson.difficulties ?? undefined,
    status: lesson.status,
  }
}

const lessonInclude = {
  instructor: { include: { user: true } },
  student: { include: { user: true } },
}

export async function createLesson(data: {
  instructorId: string
  studentId: string
  vehicleId: string
  date: string
  startTime: string
  durationMinutes: number
  notes?: string
}) {
  // Validate instructor exists
  const instructor = await prisma.instructor.findUnique({ where: { id: data.instructorId } })
  if (!instructor) throw new AppError('Instructor not found', 404)

  // Validate student exists
  const student = await prisma.student.findUnique({ where: { id: data.studentId } })
  if (!student) throw new AppError('Student not found', 404)

  // Validate vehicle exists and is usable
  const vehicle = await prisma.vehicle.findUnique({ where: { id: data.vehicleId } })
  if (!vehicle) throw new AppError('Vehicle not found', 404)
  if (vehicle.ownerType !== 'STUDENT' && vehicle.status !== 'APPROVED') {
    throw new AppError('Vehicle is not approved for use', 400)
  }

  // Check for scheduling conflict (overlap detection)
  const lessonsOnDate = await prisma.lesson.findMany({
    where: {
      instructorId: data.instructorId,
      date: data.date,
      status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
    },
    select: { startTime: true, durationMinutes: true },
  })

  const toMinutes = (t: string) => {
    const [h, m] = t.split(':').map(Number)
    return h * 60 + m
  }

  const newStart = toMinutes(data.startTime)
  const newEnd = newStart + data.durationMinutes

  const hasConflict = lessonsOnDate.some((l) => {
    const existingStart = toMinutes(l.startTime)
    const existingEnd = existingStart + l.durationMinutes
    return newStart < existingEnd && existingStart < newEnd
  })

  if (hasConflict) {
    throw new AppError('Instrutor já possui aula neste horário', 409)
  }

  const lesson = await prisma.lesson.create({
    data: {
      instructorId: data.instructorId,
      studentId: data.studentId,
      vehicleId: data.vehicleId,
      date: data.date,
      startTime: data.startTime,
      durationMinutes: data.durationMinutes,
      notes: data.notes,
    },
    include: lessonInclude,
  })

  return formatLesson(lesson)
}

export async function listLessons(params: { studentId?: string; instructorId?: string }) {
  if (!params.studentId && !params.instructorId) {
    throw new AppError('Provide studentId or instructorId', 400)
  }

  const lessons = await prisma.lesson.findMany({
    where: {
      studentId: params.studentId,
      instructorId: params.instructorId,
    },
    include: lessonInclude,
    orderBy: [{ date: 'desc' }, { startTime: 'desc' }],
  })

  return lessons.map(formatLesson)
}

export async function completeLesson(
  id: string,
  data: { rating: number; notes?: string; difficulties?: string }
) {
  const lesson = await prisma.lesson.findUnique({ where: { id } })
  if (!lesson) throw new AppError('Lesson not found', 404)
  if (lesson.status === 'CANCELLED') throw new AppError('Cannot complete a cancelled lesson', 400)
  if (lesson.status === 'COMPLETED') throw new AppError('Lesson already completed', 400)

  const updated = await prisma.lesson.update({
    where: { id },
    data: {
      status: 'COMPLETED',
      rating: data.rating,
      notes: data.notes,
      difficulties: data.difficulties,
    },
    include: lessonInclude,
  })

  return formatLesson(updated)
}

export async function cancelLesson(id: string) {
  const lesson = await prisma.lesson.findUnique({ where: { id } })
  if (!lesson) throw new AppError('Lesson not found', 404)
  if (lesson.status === 'COMPLETED') throw new AppError('Cannot cancel a completed lesson', 400)
  if (lesson.status === 'CANCELLED') throw new AppError('Lesson already cancelled', 400)

  const updated = await prisma.lesson.update({
    where: { id },
    data: { status: 'CANCELLED' },
    include: lessonInclude,
  })

  return formatLesson(updated)
}
