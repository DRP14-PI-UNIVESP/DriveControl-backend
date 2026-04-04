import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { AppError } from './error.middleware'

export interface JwtPayload {
  sub: string
  role: string
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload
    }
  }
}

export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const authorization = req.headers.authorization

  if (!authorization?.startsWith('Bearer ')) {
    throw new AppError('Token not provided', 401)
  }

  const token = authorization.split(' ')[1]

  try {
    const secret = process.env.JWT_SECRET ?? 'secret'
    const payload = jwt.verify(token, secret) as JwtPayload
    req.user = payload
    next()
  } catch {
    throw new AppError('Invalid or expired token', 401)
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new AppError('Forbidden', 403)
    }
    next()
  }
}
