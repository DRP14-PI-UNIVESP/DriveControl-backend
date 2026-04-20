import { Router } from 'express'
import { authMiddleware, requireRole } from '../../middleware/auth.middleware'
import * as vehicleController from './vehicle.controller'

export const vehicleRoutes = Router()

vehicleRoutes.post('/', authMiddleware, vehicleController.create)
vehicleRoutes.get('/', authMiddleware, vehicleController.list)
vehicleRoutes.get('/:id', authMiddleware, vehicleController.getById)
vehicleRoutes.patch('/:id/status', authMiddleware, requireRole('ADMIN'), vehicleController.updateStatus)
