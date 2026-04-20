import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import * as studentService from './student.service'
import * as studentStatsService from './student.stats.service'

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  cpf: z.string().length(11, 'CPF must have 11 digits'),
  desiredCategory: z.string().min(1),
})

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  desiredCategory: z.string().min(1).optional(),
})

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = createSchema.parse(req.body)
    const student = await studentService.createStudent(data)
    res.status(201).json(student)
  } catch (err) {
    next(err)
  }
}

export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.sub
    const student = await studentService.getStudentByUserId(userId)
    res.json(student)
  } catch (err) {
    next(err)
  }
}

export async function getById(req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> {
  try {
    const student = await studentService.getStudentById(req.params.id)
    res.json(student)
  } catch (err) {
    next(err)
  }
}

export async function update(req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = updateSchema.parse(req.body)
    const student = await studentService.updateStudent(req.params.id, data)
    res.json(student)
  } catch (err) {
    next(err)
  }
}

export async function getStats(req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> {
  try {
    const stats = await studentStatsService.getStudentStats(req.params.id)
    res.json(stats)
  } catch (err) {
    next(err)
  }
}
