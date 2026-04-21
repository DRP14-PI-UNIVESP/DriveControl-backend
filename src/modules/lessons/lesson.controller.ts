import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import * as lessonService from './lesson.service'
import { prisma } from '../../config/database'
import { AppError } from '../../middleware/error.middleware'

const createSchema = z.object({
  instructorId: z.string().uuid(),
  vehicleId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Start time must be HH:MM'),
  durationMinutes: z.number().int().min(30),
  notes: z.string().optional(),
})

const completeSchema = z.object({
  rating: z.number().min(0).max(10),
  notes: z.string().optional(),
  difficulties: z.string().optional(),
})

const listSchema = z.object({
  studentId: z.string().uuid().optional(),
  instructorId: z.string().uuid().optional(),
})

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = createSchema.parse(req.body)
    const studentId = req.user!.sub

    // Resolve studentId from userId
    const { prisma } = await import('../../config/database')
    const student = await prisma.student.findUnique({ where: { userId: studentId } })
    if (!student) {
      res.status(403).json({ message: 'Only students can schedule lessons' })
      return
    }

    const lesson = await lessonService.createLesson({ ...data, studentId: student.id })
    res.status(201).json(lesson)
  } catch (err) {
    next(err)
  }
}

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const params = listSchema.parse(req.query)
    const lessons = await lessonService.listLessons(params)
    res.json(lessons)
  } catch (err) {
    next(err)
  }
}

export async function complete(req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = completeSchema.parse(req.body)
    const lesson = await lessonService.completeLesson(req.params.id, data)
    res.json(lesson)
  } catch (err) {
    next(err)
  }
}

const createByInstructorSchema = z.object({
  studentEmail: z.string().email(),
  vehicleId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Start time must be HH:MM'),
  durationMinutes: z.number().int().min(30),
  notes: z.string().optional(),
})

export async function createByInstructor(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = createByInstructorSchema.parse(req.body)
    const instructor = await prisma.instructor.findUnique({ where: { userId: req.user!.sub } })
    if (!instructor) {
      res.status(403).json({ message: 'Only instructors can use this endpoint' })
      return
    }
    const studentUser = await prisma.user.findUnique({ where: { email: data.studentEmail } })
    if (!studentUser) throw new AppError('Student not found', 404)
    const student = await prisma.student.findUnique({ where: { userId: studentUser.id } })
    if (!student) throw new AppError('Student not found', 404)
    const lesson = await lessonService.createLesson({
      instructorId: instructor.id,
      studentId: student.id,
      vehicleId: data.vehicleId,
      date: data.date,
      startTime: data.startTime,
      durationMinutes: data.durationMinutes,
      notes: data.notes,
    })
    res.status(201).json(lesson)
  } catch (err) {
    next(err)
  }
}

export async function cancel(req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> {
  try {
    const lesson = await lessonService.cancelLesson(req.params.id)
    res.json(lesson)
  } catch (err) {
    next(err)
  }
}
