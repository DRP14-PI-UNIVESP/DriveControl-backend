import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const adminPassword = await bcrypt.hash('admin123', 10)

  await prisma.user.upsert({
    where: { email: 'admin@drivecontrol.com' },
    update: {},
    create: {
      name: 'Administrador',
      email: 'admin@drivecontrol.com',
      password: adminPassword,
      role: 'ADMIN',
    },
  })

  const instructorPassword = await bcrypt.hash('instructor123', 10)

  const instructorUser = await prisma.user.upsert({
    where: { email: 'instrutor@drivecontrol.com' },
    update: {},
    create: {
      name: 'João Instrutor',
      email: 'instrutor@drivecontrol.com',
      password: instructorPassword,
      role: 'INSTRUCTOR',
    },
  })

  await prisma.instructor.upsert({
    where: { userId: instructorUser.id },
    update: {},
    create: {
      userId: instructorUser.id,
      licenseNumber: 'CNH12345678',
      category: 'B',
      licenseStatus: 'ACTIVE',
    },
  })

  const studentPassword = await bcrypt.hash('student123', 10)

  const studentUser = await prisma.user.upsert({
    where: { email: 'aluno@drivecontrol.com' },
    update: {},
    create: {
      name: 'Maria Aluna',
      email: 'aluno@drivecontrol.com',
      password: studentPassword,
      role: 'STUDENT',
    },
  })

  await prisma.student.upsert({
    where: { userId: studentUser.id },
    update: {},
    create: {
      userId: studentUser.id,
      cpf: '12345678901',
      desiredCategory: 'B',
    },
  })

  console.log('Seed completed.')
  console.log('Admin:      admin@drivecontrol.com / admin123')
  console.log('Instructor: instrutor@drivecontrol.com / instructor123')
  console.log('Student:    aluno@drivecontrol.com / student123')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
