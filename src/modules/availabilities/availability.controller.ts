import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import * as availabilityService from './availability.service'
import { prisma } from '../../config/database'

const createSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve ser YYYY-MM-DD'),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Horário deve ser HH:MM'),
  durationMinutes: z.number().int().min(30),
  notes: z.string().optional(),
})

const listSchema = z.object({
  instructorId: z.string().uuid(),
})

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = createSchema.parse(req.body)
    const instructor = await prisma.instructor.findUnique({ where: { userId: req.user!.sub } })
    if (!instructor) {
      res.status(403).json({ message: 'Apenas instrutores podem abrir horários' })
      return
    }
    const slot = await availabilityService.createAvailability({ ...data, instructorId: instructor.id })
    res.status(201).json(slot)
  } catch (err) {
    next(err)
  }
}

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { instructorId } = listSchema.parse(req.query)
    const slots = await availabilityService.listAvailabilities({ instructorId })
    res.json(slots)
  } catch (err) {
    next(err)
  }
}

export async function remove(req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> {
  try {
    const instructor = await prisma.instructor.findUnique({ where: { userId: req.user!.sub } })
    if (!instructor) {
      res.status(403).json({ message: 'Apenas instrutores podem remover horários' })
      return
    }
    await availabilityService.deleteAvailability(req.params.id, instructor.id)
    res.status(204).send()
  } catch (err) {
    next(err)
  }
}
