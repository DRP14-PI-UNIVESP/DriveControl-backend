import { Router } from 'express'
import { authMiddleware, requireRole } from '../../middleware/auth.middleware'
import * as lessonController from './lesson.controller'

export const lessonRoutes = Router()

lessonRoutes.post('/', authMiddleware, requireRole('STUDENT'), lessonController.create)
lessonRoutes.post('/instructor', authMiddleware, requireRole('INSTRUCTOR'), lessonController.createByInstructor)
lessonRoutes.get('/booked-times', authMiddleware, lessonController.getBookedTimes)
lessonRoutes.get('/', authMiddleware, lessonController.list)
lessonRoutes.patch('/:id/complete', authMiddleware, requireRole('INSTRUCTOR'), lessonController.complete)
lessonRoutes.patch('/:id/reschedule', authMiddleware, requireRole('STUDENT'), lessonController.reschedule)
lessonRoutes.patch('/:id/cancel', authMiddleware, lessonController.cancel)
