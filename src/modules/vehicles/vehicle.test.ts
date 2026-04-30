import request from 'supertest'
import { app } from '../../app'
import { prisma } from '../../config/database'
import bcrypt from 'bcryptjs'

let instructorToken: string
let studentToken: string
let instructorId: string

beforeAll(async () => {
  await prisma.vehicle.deleteMany({ where: { plate: { in: ['TESTV001', 'TESTV002'] } } })
  await prisma.user.deleteMany({
    where: { email: { in: ['test-instructor-v@dc.com', 'test-student-v@dc.com'] } },
  })

  const instructorUser = await prisma.user.create({
    data: {
      name: 'Test Instructor V',
      email: 'test-instructor-v@dc.com',
      password: await bcrypt.hash('pass123', 10),
      role: 'INSTRUCTOR',
      instructor: {
        create: {
          licenseNumber: 'CNH-TEST-V01',
          categories: ['B'],
          licenseStatus: 'ACTIVE',
        },
      },
    },
    include: { instructor: true },
  })
  instructorId = instructorUser.instructor!.id

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

  const instructorSignin = await request(app)
    .post('/auth/signin')
    .send({ email: 'test-instructor-v@dc.com', password: 'pass123' })
  instructorToken = instructorSignin.body.token

  const studentSignin = await request(app)
    .post('/auth/signin')
    .send({ email: 'test-student-v@dc.com', password: 'pass123' })
  studentToken = studentSignin.body.token
})

afterAll(async () => {
  await prisma.vehicle.deleteMany({ where: { plate: { in: ['TESTV001', 'TESTV002'] } } })
  await prisma.user.deleteMany({
    where: { email: { in: ['test-instructor-v@dc.com', 'test-student-v@dc.com'] } },
  })
  await prisma.$disconnect()
})

describe('POST /vehicles', () => {
  it('should create a vehicle as instructor and auto-approve it', async () => {
    const res = await request(app)
      .post('/vehicles')
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({
        plate: 'TESTV001',
        renavam: '00000000003',
        brand: 'Test',
        model: 'Car',
        manufactureYear: 2020,
        color: 'White',
        categories: ['B'],
        ownerType: 'INSTRUCTOR',
        ownerId: instructorId,
        hasDualControl: false,
      })

    expect(res.status).toBe(201)
    expect(res.body.status).toBe('APPROVED')
  })

  it('should return 409 on duplicate plate', async () => {
    const res = await request(app)
      .post('/vehicles')
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({
        plate: 'TESTV001',
        renavam: '00000000099',
        brand: 'Test',
        model: 'Car',
        manufactureYear: 2020,
        color: 'Black',
        categories: ['B'],
        ownerType: 'INSTRUCTOR',
        ownerId: instructorId,
        hasDualControl: false,
      })

    expect(res.status).toBe(409)
  })
})
