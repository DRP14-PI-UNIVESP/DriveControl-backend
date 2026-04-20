import express from 'express'
import cors from 'cors'
import { setupSwagger } from './config/swagger'
import { errorMiddleware } from './middleware/error.middleware'
import { authRoutes } from './modules/auth/auth.routes'
import { studentRoutes } from './modules/students/student.routes'
import { instructorRoutes } from './modules/instructors/instructor.routes'
import { vehicleRoutes } from './modules/vehicles/vehicle.routes'
import { lessonRoutes } from './modules/lessons/lesson.routes'

const app = express()

app.use(cors())
app.use(express.json())

setupSwagger(app)

app.get('/health', (_req, res) => res.json({ status: 'ok' }))

app.use('/auth', authRoutes)
app.use('/students', studentRoutes)
app.use('/instructors', instructorRoutes)
app.use('/vehicles', vehicleRoutes)
app.use('/lessons', lessonRoutes)

app.use(errorMiddleware)

export { app }
