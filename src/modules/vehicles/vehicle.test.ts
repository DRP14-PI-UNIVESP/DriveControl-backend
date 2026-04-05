import request from 'supertest'
import { app } from '../../app'
import { prisma } from '../../config/database'
import bcrypt from 'bcryptjs'

let adminToken: string
let studentToken: string
let vehicleId: string

beforeAll(async () => {
  await prisma.vehicle.deleteMany({ where: { plate: { in: ['TESTV001', 'TESTV002'] } } })
  await prisma.user.deleteMany({
    where: { email: { in: ['test-admin@dc.com', 'test-student-v@dc.com'] } },
  })

  const adminUser = await prisma.user.create({
    data: {
      name: 'Test Admin',
      email: 'test-admin@dc.com',
      password: await bcrypt.hash('pass123', 10),
      role: 'ADMIN',
    },
  })

  const studentUser = await prisma.user.create({
    data: {
      name: 'Test Student V',
      email: 'test-student-v@dc.com',
      password: await bcrypt.hash('pass123', 10),
      role: 'STUDENT',
      student: { create: { cpf: '11122233344', desiredCategory: 'B' } },
    },
    include: { student: true },
  })

  const vehicle = await prisma.vehicle.create({
    data: {
      plate: 'TESTV001',
      category: 'B',
      ownerType: 'STUDENT',
      ownerId: studentUser.student!.id,
      hasDualControl: false,
      status: 'PENDING',
    },
  })
  vehicleId = vehicle.id

  const adminSignin = await request(app)
    .post('/auth/signin')
    .send({ email: 'test-admin@dc.com', password: 'pass123' })
  adminToken = adminSignin.body.token

  const studentSignin = await request(app)
    .post('/auth/signin')
    .send({ email: 'test-student-v@dc.com', password: 'pass123' })
  studentToken = studentSignin.body.token
})

afterAll(async () => {
  await prisma.vehicle.deleteMany({ where: { plate: { in: ['TESTV001', 'TESTV002'] } } })
  await prisma.user.deleteMany({
    where: { email: { in: ['test-admin@dc.com', 'test-student-v@dc.com'] } },
  })
  await prisma.$disconnect()
})

describe('PATCH /vehicles/:id/status', () => {
  it('should approve a vehicle as admin', async () => {
    const res = await request(app)
      .patch(`/vehicles/${vehicleId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'APPROVED' })

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('APPROVED')
    expect(res.body.is_regular).toBe(true)
  })

  it('should reject a vehicle as admin', async () => {
    const res = await request(app)
      .patch(`/vehicles/${vehicleId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'REJECTED' })

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('REJECTED')
    expect(res.body.is_regular).toBe(false)
  })

  it('should forbid non-admin from updating status', async () => {
    const res = await request(app)
      .patch(`/vehicles/${vehicleId}/status`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ status: 'APPROVED' })

    expect(res.status).toBe(403)
  })

  it('should return 400 on invalid status value', async () => {
    const res = await request(app)
      .patch(`/vehicles/${vehicleId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'INVALID' })

    expect(res.status).toBe(400)
  })
})
