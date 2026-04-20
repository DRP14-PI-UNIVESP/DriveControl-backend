import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import * as authService from './auth.service'

const signinSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function signin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = signinSchema.parse(req.body)
    const result = await authService.signin(email, password)
    res.json(result)
  } catch (err) {
    next(err)
  }
}

export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.sub
    const result = await authService.getMe(userId)
    res.json(result)
  } catch (err) {
    next(err)
  }
}
