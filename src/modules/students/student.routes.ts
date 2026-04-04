import { Router } from 'express'
import { authMiddleware, requireRole } from '../../middleware/auth.middleware'
import * as studentController from './student.controller'

export const studentRoutes = Router()

studentRoutes.post('/', studentController.create)
studentRoutes.get('/me', authMiddleware, requireRole('STUDENT'), studentController.getMe)
studentRoutes.get('/:id', authMiddleware, studentController.getById)
studentRoutes.put('/:id', authMiddleware, requireRole('STUDENT'), studentController.update)
