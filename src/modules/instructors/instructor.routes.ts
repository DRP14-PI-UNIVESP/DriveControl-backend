import { Router } from 'express'
import { authMiddleware, requireRole } from '../../middleware/auth.middleware'
import * as instructorController from './instructor.controller'

export const instructorRoutes = Router()

instructorRoutes.post('/', instructorController.create)
instructorRoutes.get('/', authMiddleware, instructorController.list)
instructorRoutes.get('/:id', authMiddleware, instructorController.getById)
instructorRoutes.put('/:id', authMiddleware, requireRole('INSTRUCTOR'), instructorController.update)
