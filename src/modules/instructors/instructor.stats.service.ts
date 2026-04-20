import { prisma } from '../../config/database'
import { AppError } from '../../middleware/error.middleware'

export async function getInstructorStats(instructorId: string) {
  const instructor = await prisma.instructor.findUnique({ where: { id: instructorId } })
  if (!instructor) throw new AppError('Instructor not found', 404)

  const lessons = await prisma.lesson.findMany({
    where: { instructorId, status: 'COMPLETED' },
    select: {
      id: true,
      date: true,
      durationMinutes: true,
      rating: true,
      student: { include: { user: true } },
    },
  })

  const totalLessons = lessons.length
  const totalDrivingMinutes = lessons.reduce((sum, l) => sum + l.durationMinutes, 0)

  const ratingsOnly = lessons.filter((l) => l.rating !== null)
  const averageRating =
    ratingsOnly.length > 0
      ? ratingsOnly.reduce((sum, l) => sum + (l.rating ?? 0), 0) / ratingsOnly.length
      : null

  const studentMap = new Map<string, { name: string; lessons: number }>()
  for (const lesson of lessons) {
    const sid = lesson.student.id
    const entry = studentMap.get(sid) ?? { name: lesson.student.user.name, lessons: 0 }
    entry.lessons += 1
    studentMap.set(sid, entry)
  }

  const students = Array.from(studentMap.entries()).map(([id, data]) => ({
    student_id: id,
    student_name: data.name,
    total_lessons: data.lessons,
  }))

  return {
    total_lessons: totalLessons,
    total_driving_minutes: totalDrivingMinutes,
    average_rating: averageRating,
    total_students: studentMap.size,
    students,
  }
}
