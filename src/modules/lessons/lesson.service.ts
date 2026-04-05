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

  // Validate vehicle is approved
  const vehicle = await prisma.vehicle.findUnique({ where: { id: data.vehicleId } })
  if (!vehicle) throw new AppError('Vehicle not found', 404)
  if (vehicle.status !== 'APPROVED') throw new AppError('Vehicle is not approved for use', 400)

  // Check for scheduling conflict (same instructor, same date, overlapping time)
  const conflictingLesson = await prisma.lesson.findFirst({
    where: {
      instructorId: data.instructorId,
      date: data.date,
      startTime: data.startTime,
      status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
    },
  })
  if (conflictingLesson) {
    throw new AppError('Instructor already has a lesson scheduled at this time', 409)
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
