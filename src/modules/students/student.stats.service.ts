import { prisma } from '../../config/database'
import { AppError } from '../../middleware/error.middleware'

export async function getStudentStats(studentId: string) {
  const student = await prisma.student.findUnique({ where: { id: studentId } })
  if (!student) throw new AppError('Student not found', 404)

  const lessons = await prisma.lesson.findMany({
    where: { studentId },
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    select: {
      id: true,
      date: true,
      durationMinutes: true,
      rating: true,
      status: true,
      instructor: { include: { user: true } },
    },
  })

  const completedLessons = lessons.filter((l) => l.status === 'COMPLETED')

  const totalLessons = completedLessons.length
  const totalDrivingMinutes = completedLessons.reduce((sum, l) => sum + l.durationMinutes, 0)

  const ratingsOnly = completedLessons.filter((l) => l.rating !== null)
  const averageRating =
    ratingsOnly.length > 0
      ? ratingsOnly.reduce((sum, l) => sum + (l.rating ?? 0), 0) / ratingsOnly.length
      : null

  const progress = completedLessons.map((l) => ({
    lesson_id: l.id,
    date: l.date,
    duration_minutes: l.durationMinutes,
    rating: l.rating,
    instructor_name: l.instructor.user.name,
  }))

  return {
    total_lessons: totalLessons,
    total_driving_minutes: totalDrivingMinutes,
    average_rating: averageRating,
    progress,
  }
}
