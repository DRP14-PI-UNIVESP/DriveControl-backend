import request from 'supertest'
import { app } from '../../app'
import { prisma } from '../../config/database'
import bcrypt from 'bcryptjs'

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: 'test-auth@drivecontrol.com' } })

  await prisma.user.create({
    data: {
      name: 'Test User',
      email: 'test-auth@drivecontrol.com',
      password: await bcrypt.hash('password123', 10),
      role: 'STUDENT',
    },
  })
})

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: 'test-auth@drivecontrol.com' } })
  await prisma.$disconnect()
})

describe('POST /auth/signin', () => {
  it('should return token on valid credentials', async () => {
    const res = await request(app).post('/auth/signin').send({
      email: 'test-auth@drivecontrol.com',
      password: 'password123',
    })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('token')
    expect(res.body).toHaveProperty('role', 'STUDENT')
  })

  it('should return 401 on wrong password', async () => {
    const res = await request(app).post('/auth/signin').send({
      email: 'test-auth@drivecontrol.com',
      password: 'wrongpassword',
    })

    expect(res.status).toBe(401)
  })

  it('should return 401 on unknown email', async () => {
    const res = await request(app).post('/auth/signin').send({
      email: 'unknown@drivecontrol.com',
      password: 'password123',
    })

    expect(res.status).toBe(401)
  })
})

describe('GET /auth/me', () => {
  it('should return 401 without token', async () => {
    const res = await request(app).get('/auth/me')
    expect(res.status).toBe(401)
  })

  it('should return user when token is valid', async () => {
    const signinRes = await request(app).post('/auth/signin').send({
      email: 'test-auth@drivecontrol.com',
      password: 'password123',
    })

    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${signinRes.body.token}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('email', 'test-auth@drivecontrol.com')
  })
})
