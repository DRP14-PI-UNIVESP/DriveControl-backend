import { Router } from 'express'
import { authMiddleware } from '../../middleware/auth.middleware'
import * as authController from './auth.controller'

export const authRoutes = Router()

authRoutes.post('/signin', authController.signin)
authRoutes.get('/me', authMiddleware, authController.getMe)
