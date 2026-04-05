import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import * as instructorService from './instructor.service'
import * as instructorStatsService from './instructor.stats.service'

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  licenseNumber: z.string().min(1),
  category: z.string().min(1),
})

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  licenseNumber: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
})

const listSchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
})

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = createSchema.parse(req.body)
    const instructor = await instructorService.createInstructor(data)
    res.status(201).json(instructor)
  } catch (err) {
    next(err)
  }
}

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const params = listSchema.parse(req.query)
    const instructors = await instructorService.listInstructors(params)
    res.json(instructors)
  } catch (err) {
    next(err)
  }
}

export async function getById(req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> {
  try {
    const instructor = await instructorService.getInstructorById(req.params.id)
    res.json(instructor)
  } catch (err) {
    next(err)
  }
}

export async function update(req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = updateSchema.parse(req.body)
    const instructor = await instructorService.updateInstructor(req.params.id, data)
    res.json(instructor)
  } catch (err) {
    next(err)
  }
}

export async function getStats(req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> {
  try {
    const stats = await instructorStatsService.getInstructorStats(req.params.id)
    res.json(stats)
  } catch (err) {
    next(err)
  }
}
