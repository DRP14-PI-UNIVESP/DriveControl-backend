import { Router } from 'express'
import { authMiddleware, requireRole } from '../../middleware/auth.middleware'
import * as availabilityController from './availability.controller'

export const availabilityRoutes = Router()

availabilityRoutes.post('/', authMiddleware, requireRole('INSTRUCTOR'), availabilityController.create)
availabilityRoutes.get('/', authMiddleware, availabilityController.list)
availabilityRoutes.delete('/:id', authMiddleware, requireRole('INSTRUCTOR'), availabilityController.remove)
