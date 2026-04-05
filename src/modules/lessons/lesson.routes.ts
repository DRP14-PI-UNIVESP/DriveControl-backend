import { Router } from 'express'
import { authMiddleware, requireRole } from '../../middleware/auth.middleware'
import * as lessonController from './lesson.controller'

export const lessonRoutes = Router()

lessonRoutes.post('/', authMiddleware, requireRole('STUDENT'), lessonController.create)
lessonRoutes.get('/', authMiddleware, lessonController.list)
lessonRoutes.patch('/:id/complete', authMiddleware, requireRole('INSTRUCTOR'), lessonController.complete)
lessonRoutes.patch('/:id/cancel', authMiddleware, lessonController.cancel)
