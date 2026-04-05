import request from 'supertest'
import { app } from '../../app'
import { prisma } from '../../config/database'
import bcrypt from 'bcryptjs'

let studentToken: string
let instructorToken: string
let instructorId: string
let studentId: string
let vehicleId: string
let lessonId: string

beforeAll(async () => {
  // Cleanup
  await prisma.lesson.deleteMany({ where: { vehicle: { plate: { in: ['TEST0001', 'TESTPEND1'] } } } })
  await prisma.vehicle.deleteMany({ where: { plate: { in: ['TEST0001', 'TESTPEND1'] } } })
  await prisma.user.deleteMany({
    where: { email: { in: ['test-student@dc.com', 'test-instructor@dc.com'] } },
  })

  // Create instructor
  const instructorUser = await prisma.user.create({
    data: {
      name: 'Test Instructor',
      email: 'test-instructor@dc.com',
      password: await bcrypt.hash('pass123', 10),
      role: 'INSTRUCTOR',
      instructor: {
        create: { licenseNumber: 'TEST-CNH-001', category: 'B', licenseStatus: 'ACTIVE' },
      },
    },
    include: { instructor: true },
  })
  instructorId = instructorUser.instructor!.id

  // Create student
  const studentUser = await prisma.user.create({
    data: {
      name: 'Test Student',
      email: 'test-student@dc.com',
      password: await bcrypt.hash('pass123', 10),
      role: 'STUDENT',
      student: { create: { cpf: '99988877766', desiredCategory: 'B' } },
    },
    include: { student: true },
  })
  studentId = studentUser.student!.id

  // Create approved vehicle
  const vehicle = await prisma.vehicle.create({
    data: {
      plate: 'TEST0001',
      category: 'B',
      ownerType: 'INSTRUCTOR',
      ownerId: instructorId,
      hasDualControl: true,
      status: 'APPROVED',
    },
  })
  vehicleId = vehicle.id

  // Get tokens
  const instructorSignin = await request(app)
    .post('/auth/signin')
    .send({ email: 'test-instructor@dc.com', password: 'pass123' })
  instructorToken = instructorSignin.body.token

  const studentSignin = await request(app)
    .post('/auth/signin')
    .send({ email: 'test-student@dc.com', password: 'pass123' })
  studentToken = studentSignin.body.token
})

afterAll(async () => {
  await prisma.lesson.deleteMany({ where: { vehicle: { plate: { in: ['TEST0001', 'TESTPEND1'] } } } })
  await prisma.vehicle.deleteMany({ where: { plate: { in: ['TEST0001', 'TESTPEND1'] } } })
  await prisma.user.deleteMany({
    where: { email: { in: ['test-student@dc.com', 'test-instructor@dc.com'] } },
  })
  await prisma.$disconnect()
})

describe('POST /lessons', () => {
  it('should create a lesson as student', async () => {
    const res = await request(app)
      .post('/lessons')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        instructorId,
        vehicleId,
        date: '2026-12-01',
        startTime: '09:00',
        durationMinutes: 60,
        notes: 'test-lesson',
      })

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('id')
    expect(res.body.status).toBe('SCHEDULED')
    lessonId = res.body.id
  })

  it('should reject duplicate time slot', async () => {
    const res = await request(app)
      .post('/lessons')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        instructorId,
        vehicleId,
        date: '2026-12-01',
        startTime: '09:00',
        durationMinutes: 60,
        notes: 'test-lesson',
      })

    expect(res.status).toBe(409)
  })

  it('should reject lesson with unapproved vehicle', async () => {
    const unapprovedVehicle = await prisma.vehicle.create({
      data: {
        plate: 'TESTPEND1',
        category: 'B',
        ownerType: 'INSTRUCTOR',
        ownerId: instructorId,
        hasDualControl: false,
        status: 'PENDING',
      },
    })

    const res = await request(app)
      .post('/lessons')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        instructorId,
        vehicleId: unapprovedVehicle.id,
        date: '2026-12-02',
        startTime: '10:00',
        durationMinutes: 60,
        notes: 'test-lesson',
      })

    expect(res.status).toBe(400)
    await prisma.vehicle.delete({ where: { id: unapprovedVehicle.id } })
  })
})

describe('PATCH /lessons/:id/complete', () => {
  it('should complete a lesson as instructor', async () => {
    const res = await request(app)
      .patch(`/lessons/${lessonId}/complete`)
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({ rating: 8, notes: 'Good progress', difficulties: 'Parking' })

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('COMPLETED')
    expect(res.body.rating).toBe(8)
  })
})

describe('PATCH /lessons/:id/cancel', () => {
  it('should not cancel an already completed lesson', async () => {
    const res = await request(app)
      .patch(`/lessons/${lessonId}/cancel`)
      .set('Authorization', `Bearer ${studentToken}`)

    expect(res.status).toBe(400)
  })
})
