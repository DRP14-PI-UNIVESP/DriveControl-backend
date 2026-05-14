import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// ============================================================================
// Helpers
// ============================================================================

function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '')
    .toLowerCase()
}

/**
 * Gera um CPF válido (passa pelo algoritmo de dígito verificador).
 * Usa um seed determinístico para garantir idempotência.
 */
function generateValidCpf(seed: number): string {
  const base = (100000000 + seed).toString().slice(-9)
  const digits = base.split('').map(Number)

  let sum = 0
  for (let i = 0; i < 9; i++) sum += digits[i] * (10 - i)
  let d1 = (sum * 10) % 11
  if (d1 === 10) d1 = 0
  digits.push(d1)

  sum = 0
  for (let i = 0; i < 10; i++) sum += digits[i] * (11 - i)
  let d2 = (sum * 10) % 11
  if (d2 === 10) d2 = 0
  digits.push(d2)

  return digits.join('')
}

function plateFor(index: number, prefix: string): string {
  // 7-char no formato AAA0000 (suficiente pra unicidade)
  const block = prefix.padEnd(3, 'X').slice(0, 3).toUpperCase()
  return `${block}${(1000 + index).toString().padStart(4, '0')}`
}

// Decide aulas por aluno — distribuição variada entre 2 e 20
function lessonsForStudent(index: number): number {
  const tiers = [2, 3, 5, 7, 9, 12, 15, 18]
  return tiers[index % tiers.length]
}

// Decide quais alunos têm veículo próprio (~10 alunos)
function studentOwnsVehicle(index: number): boolean {
  return [2, 8, 14, 20, 26, 32, 38, 44, 50, 56].includes(index)
}

// ============================================================================
// Constantes
// ============================================================================

const DOMAINS = ['gmail.com', 'hotmail.com', 'yahoo.com', 'outlook.com', 'uol.com.br', 'bol.com.br']

const CITIES = [
  'São Paulo, SP - Vila Mariana',
  'São Paulo, SP - Santo Amaro',
  'São Paulo, SP - Tatuapé',
  'São Paulo, SP - Santana',
  'São Paulo, SP - Pinheiros',
  'Campinas, SP',
  'Santos, SP',
  'Guarulhos, SP',
  'São Bernardo do Campo, SP',
  'São Paulo, SP - Itaim Bibi',
  'São Paulo, SP - Moema',
  'São Paulo, SP - Mooca',
  'São Paulo, SP - Penha',
  'São Paulo, SP - Lapa',
  'São Paulo, SP - Saúde',
  'Osasco, SP',
  'Diadema, SP',
  'Santo André, SP',
  'São Caetano do Sul, SP',
  'Ribeirão Preto, SP',
  'Sorocaba, SP',
  'Jundiaí, SP',
  'Mogi das Cruzes, SP',
  'Taboão da Serra, SP',
]

interface InstructorSeed {
  firstName: string
  surname: string
  domainIdx: number
  cats: string[]
  cityIdx: number
}

const INSTRUCTOR_PROFILES: InstructorSeed[] = [
  { firstName: 'Carlos',    surname: 'Mendes',     domainIdx: 0, cats: ['A', 'B'], cityIdx: 0 },
  { firstName: 'Pedro',     surname: 'Almeida',    domainIdx: 1, cats: ['B'],      cityIdx: 1 },
  { firstName: 'Roberto',   surname: 'Santos',     domainIdx: 2, cats: ['A'],      cityIdx: 2 },
  { firstName: 'Lucas',     surname: 'Ferreira',   domainIdx: 0, cats: ['A', 'B'], cityIdx: 3 },
  { firstName: 'André',     surname: 'Oliveira',   domainIdx: 1, cats: ['B'],      cityIdx: 4 },
  { firstName: 'Marcelo',   surname: 'Costa',      domainIdx: 0, cats: ['A', 'B'], cityIdx: 5 },
  { firstName: 'Bruno',     surname: 'Lima',       domainIdx: 3, cats: ['B'],      cityIdx: 6 },
  { firstName: 'Diego',     surname: 'Souza',      domainIdx: 0, cats: ['A'],      cityIdx: 7 },
  { firstName: 'Felipe',    surname: 'Rocha',      domainIdx: 1, cats: ['A', 'B'], cityIdx: 8 },
  { firstName: 'Henrique',  surname: 'Carvalho',   domainIdx: 0, cats: ['B'],      cityIdx: 9 },
  { firstName: 'Mariana',   surname: 'Barbosa',    domainIdx: 1, cats: ['A', 'B'], cityIdx: 10 },
  { firstName: 'Thiago',    surname: 'Gomes',      domainIdx: 2, cats: ['B'],      cityIdx: 11 },
  { firstName: 'Beatriz',   surname: 'Martins',    domainIdx: 3, cats: ['B'],      cityIdx: 12 },
  { firstName: 'Rodrigo',   surname: 'Araújo',     domainIdx: 0, cats: ['A'],      cityIdx: 13 },
  { firstName: 'Camila',    surname: 'Ribeiro',    domainIdx: 1, cats: ['A', 'B'], cityIdx: 14 },
  { firstName: 'Gustavo',   surname: 'Cardoso',    domainIdx: 4, cats: ['B'],      cityIdx: 15 },
  { firstName: 'Patrícia',  surname: 'Cunha',      domainIdx: 0, cats: ['B'],      cityIdx: 16 },
  { firstName: 'Vinicius',  surname: 'Dias',       domainIdx: 1, cats: ['A', 'B'], cityIdx: 17 },
  { firstName: 'Larissa',   surname: 'Moreira',    domainIdx: 0, cats: ['B'],      cityIdx: 18 },
  { firstName: 'Eduardo',   surname: 'Nascimento', domainIdx: 3, cats: ['A'],      cityIdx: 19 },
  { firstName: 'Renata',    surname: 'Pinto',      domainIdx: 0, cats: ['B'],      cityIdx: 20 },
  { firstName: 'Daniel',    surname: 'Vieira',     domainIdx: 1, cats: ['A', 'B'], cityIdx: 21 },
  { firstName: 'Fernanda',  surname: 'Castro',     domainIdx: 0, cats: ['B'],      cityIdx: 22 },
  { firstName: 'Otávio',    surname: 'Correia',    domainIdx: 2, cats: ['A'],      cityIdx: 23 },
]

const STUDENT_FIRST_NAMES = [
  'Juliana', 'Ana', 'Beatriz', 'Camila', 'Fernanda', 'Gabriel', 'Heitor', 'Isabela', 'Rafael',
  'Sofia', 'Manuela', 'Helena', 'Alice', 'Laura', 'Valentina', 'Heloísa', 'Lara', 'Cecília',
  'Antonella', 'Lívia', 'Olivia', 'Aurora', 'Yasmin', 'Esther', 'Marina', 'Joana', 'Pietra',
  'Miguel', 'Arthur', 'Bernardo', 'Theo', 'Davi', 'Lorenzo', 'Enzo', 'Murilo', 'Nicolas',
  'Benício', 'Joaquim', 'Antônio', 'Levi', 'Caio', 'Vicente', 'Anthony', 'Yuri', 'Erick',
  'Tatiana', 'Bianca', 'Carolina', 'Débora', 'Letícia', 'Amanda', 'Carla', 'Bruna', 'Vitória',
  'Jorge', 'Mateus', 'Alex', 'Diogo', 'Renan',
]

const STUDENT_SURNAMES = [
  'Pereira', 'Cardoso', 'Lima', 'Santos', 'Costa', 'Souza', 'Almeida', 'Ferreira', 'Mendes',
  'Freitas', 'Pacheco', 'Coelho', 'Lopes', 'Tavares', 'Borges', 'Monteiro', 'Cavalcanti',
  'Macedo', 'Sales', 'Magalhães', 'Antunes', 'Duarte', 'Esteves', 'Guimarães', 'Iglesias',
]

interface StudentSeed {
  firstName: string
  surname: string
  domainIdx: number
  desiredCategory: string
}

function buildStudentProfiles(count: number): StudentSeed[] {
  const result: StudentSeed[] = []
  const seen = new Set<string>()
  let i = 0
  while (result.length < count && i < count * 20) {
    const firstName = STUDENT_FIRST_NAMES[(i * 7) % STUDENT_FIRST_NAMES.length]
    const surname = STUDENT_SURNAMES[Math.floor(i / 3) % STUDENT_SURNAMES.length]
    const key = `${firstName} ${surname}`
    if (!seen.has(key)) {
      seen.add(key)
      result.push({
        firstName,
        surname,
        domainIdx: i % DOMAINS.length,
        desiredCategory: i % 4 === 0 ? 'A' : 'B',
      })
    }
    i++
  }
  return result
}

const STUDENT_PROFILES = buildStudentProfiles(59)

const INSTRUCTOR_VEHICLE_MODELS = [
  { brand: 'Volkswagen', model: 'Gol',         color: 'Branco',   isMoto: false },
  { brand: 'Chevrolet',  model: 'Onix',        color: 'Prata',    isMoto: false },
  { brand: 'Honda',      model: 'CG 160',      color: 'Vermelho', isMoto: true  },
  { brand: 'Fiat',       model: 'Mobi',        color: 'Preto',    isMoto: false },
  { brand: 'Renault',    model: 'Kwid',        color: 'Azul',     isMoto: false },
  { brand: 'Hyundai',    model: 'HB20',        color: 'Branco',   isMoto: false },
  { brand: 'Yamaha',     model: 'Factor 150',  color: 'Vermelho', isMoto: true  },
  { brand: 'Toyota',     model: 'Etios',       color: 'Cinza',    isMoto: false },
  { brand: 'Volkswagen', model: 'Polo',        color: 'Preto',    isMoto: false },
  { brand: 'Fiat',       model: 'Argo',        color: 'Prata',    isMoto: false },
  { brand: 'Honda',      model: 'Civic',       color: 'Preto',    isMoto: false },
  { brand: 'Toyota',     model: 'Yaris',       color: 'Branco',   isMoto: false },
  { brand: 'Honda',      model: 'PCX 150',     color: 'Preto',    isMoto: true  },
  { brand: 'Fiat',       model: 'Uno',         color: 'Vermelho', isMoto: false },
  { brand: 'Chevrolet',  model: 'Prisma',      color: 'Prata',    isMoto: false },
  { brand: 'Hyundai',    model: 'Creta',       color: 'Branco',   isMoto: false },
  { brand: 'Renault',    model: 'Sandero',     color: 'Cinza',    isMoto: false },
  { brand: 'Yamaha',     model: 'YBR 125',     color: 'Azul',     isMoto: true  },
  { brand: 'Volkswagen', model: 'Voyage',      color: 'Branco',   isMoto: false },
  { brand: 'Nissan',     model: 'March',       color: 'Preto',    isMoto: false },
  { brand: 'Ford',       model: 'Ka',          color: 'Prata',    isMoto: false },
  { brand: 'Peugeot',    model: '208',         color: 'Vermelho', isMoto: false },
  { brand: 'Citroën',    model: 'C3',          color: 'Branco',   isMoto: false },
  { brand: 'Honda',      model: 'Biz',         color: 'Vermelho', isMoto: true  },
]

const STUDENT_VEHICLE_MODELS_B = [
  { brand: 'Volkswagen', model: 'Polo',  color: 'Vermelho' },
  { brand: 'Fiat',       model: 'Cronos', color: 'Branco' },
  { brand: 'Hyundai',    model: 'HB20',   color: 'Azul' },
  { brand: 'Chevrolet',  model: 'Tracker', color: 'Cinza' },
  { brand: 'Renault',    model: 'Duster',  color: 'Preto' },
  { brand: 'Toyota',     model: 'Corolla', color: 'Prata' },
  { brand: 'Honda',      model: 'Fit',    color: 'Branco' },
  { brand: 'Jeep',       model: 'Renegade', color: 'Vermelho' },
]

const STUDENT_VEHICLE_MODELS_A = [
  { brand: 'Honda',  model: 'CB 500', color: 'Preto' },
  { brand: 'Yamaha', model: 'MT-03',  color: 'Azul' },
]

const RATING_NOTES = [
  'Excelente aula, instrutor muito didático!',
  'Aprendi bastante hoje, super recomendo.',
  'Aula tranquila, evoluí bem nas balizas.',
  'Instrutor paciente e atencioso.',
  'Faltou um pouco de explicação em algumas manobras.',
  'Adorei a experiência, vou agendar mais aulas.',
  'Trânsito intenso, mas aula muito produtiva.',
  'Muito profissional, fiquei mais segura ao volante.',
  null,
  null,
  null,
  'Aula bem aproveitada, ganhei confiança.',
]

const DIFFICULTIES_POOL = [
  null,
  'Dificuldade em baliza.',
  'Atenção redobrada em cruzamentos.',
  'Praticar troca de marcha em subidas.',
  null,
  'Velocidade em via expressa.',
  null,
  'Trabalhar partida em rampa.',
  'Melhorar atenção nos retrovisores.',
  null,
]

// ============================================================================
// Main
// ============================================================================

async function main() {
  const demoPassword = await bcrypt.hash('123456', 10)
  const originalInstructorPassword = await bcrypt.hash('instructor123', 10)
  const originalStudentPassword = await bcrypt.hash('student123', 10)

  // -------- Contas originais --------
  const originalInstructorUser = await prisma.user.upsert({
    where: { email: 'instrutor@drivecontrol.com' },
    update: {},
    create: {
      name: 'João Instrutor',
      email: 'instrutor@drivecontrol.com',
      password: originalInstructorPassword,
      role: 'INSTRUCTOR',
    },
  })
  const originalInstructor = await prisma.instructor.upsert({
    where: { userId: originalInstructorUser.id },
    update: {},
    create: {
      userId: originalInstructorUser.id,
      licenseNumber: 'CNH12345678',
      categories: ['B'],
      licenseStatus: 'ACTIVE',
      phone: '11999990000',
      location: 'São Paulo, SP - Centro',
    },
  })

  const originalStudentCpf = generateValidCpf(1)
  const originalStudentUser = await prisma.user.upsert({
    where: { email: 'aluno@drivecontrol.com' },
    update: {},
    create: {
      name: 'Maria Aluna',
      email: 'aluno@drivecontrol.com',
      password: originalStudentPassword,
      role: 'STUDENT',
    },
  })
  const originalStudent = await prisma.student.upsert({
    where: { userId: originalStudentUser.id },
    update: { cpf: originalStudentCpf },
    create: {
      userId: originalStudentUser.id,
      cpf: originalStudentCpf,
      desiredCategory: 'B',
    },
  })

  // -------- Instrutores demo --------
  const instructorIds: string[] = [originalInstructor.id]
  const instructorEmails: string[] = []

  for (let i = 0; i < INSTRUCTOR_PROFILES.length; i++) {
    const p = INSTRUCTOR_PROFILES[i]
    const email = `${normalize(p.firstName)}.${normalize(p.surname)}@${DOMAINS[p.domainIdx]}`
    const phone = `11988${(880000 + i).toString().padStart(6, '0').slice(-6)}`
    const licenseNumber = `CNH2${(1000000 + i).toString()}`

    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        name: `${p.firstName} ${p.surname}`,
        email,
        password: demoPassword,
        role: 'INSTRUCTOR',
      },
    })
    const profile = await prisma.instructor.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        licenseNumber,
        categories: p.cats,
        licenseStatus: 'ACTIVE',
        phone,
        location: CITIES[p.cityIdx],
      },
    })
    instructorIds.push(profile.id)
    instructorEmails.push(email)
  }

  // -------- Alunos demo --------
  const studentIds: string[] = [originalStudent.id]
  const studentEmails: string[] = []
  const studentCategories: string[] = ['B'] // original é B

  for (let i = 0; i < STUDENT_PROFILES.length; i++) {
    const p = STUDENT_PROFILES[i]
    const email = `${normalize(p.firstName)}.${normalize(p.surname)}@${DOMAINS[p.domainIdx]}`
    const cpf = generateValidCpf(1000 + i)

    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        name: `${p.firstName} ${p.surname}`,
        email,
        password: demoPassword,
        role: 'STUDENT',
      },
    })
    const profile = await prisma.student.upsert({
      where: { userId: user.id },
      update: { cpf, desiredCategory: p.desiredCategory },
      create: {
        userId: user.id,
        cpf,
        desiredCategory: p.desiredCategory,
      },
    })
    studentIds.push(profile.id)
    studentEmails.push(email)
    studentCategories.push(p.desiredCategory)
  }

  // -------- Veículos dos instrutores --------
  const instructorVehicleIds: string[] = []
  const instructorVehicleCategories: string[][] = []

  for (let i = 0; i < INSTRUCTOR_PROFILES.length; i++) {
    const ownerId = instructorIds[i + 1] // pula o original
    const m = INSTRUCTOR_VEHICLE_MODELS[i % INSTRUCTOR_VEHICLE_MODELS.length]
    const cats = m.isMoto ? ['A'] : ['B']
    const plate = plateFor(i, 'INS')
    const renavam = `${(100000000 + i + 1).toString().padStart(11, '0')}`

    const vehicle = await prisma.vehicle.upsert({
      where: { plate },
      update: {},
      create: {
        plate,
        renavam,
        brand: m.brand,
        model: m.model,
        manufactureYear: 2020 + (i % 5),
        color: m.color,
        categories: cats,
        ownerType: 'INSTRUCTOR',
        ownerId,
        hasDualControl: !m.isMoto,
        isRegular: true,
        status: 'APPROVED',
      },
    })
    instructorVehicleIds.push(vehicle.id)
    instructorVehicleCategories.push(cats)
  }

  // -------- Veículos próprios dos alunos --------
  // (alguns alunos optaram por usar veículo próprio nas aulas)
  const studentOwnVehicleByStudentId: Record<string, string> = {}
  let studentVehicleCounter = 0

  for (let i = 0; i < STUDENT_PROFILES.length; i++) {
    if (!studentOwnsVehicle(i)) continue

    const studentId = studentIds[i + 1] // pula o original
    const cat = STUDENT_PROFILES[i].desiredCategory
    const model = cat === 'A'
      ? STUDENT_VEHICLE_MODELS_A[studentVehicleCounter % STUDENT_VEHICLE_MODELS_A.length]
      : STUDENT_VEHICLE_MODELS_B[studentVehicleCounter % STUDENT_VEHICLE_MODELS_B.length]

    const plate = plateFor(studentVehicleCounter, 'STD')
    const renavam = `${(200000000 + studentVehicleCounter + 1).toString().padStart(11, '0')}`

    const vehicle = await prisma.vehicle.upsert({
      where: { plate },
      update: {},
      create: {
        plate,
        renavam,
        brand: model.brand,
        model: model.model,
        manufactureYear: 2018 + (studentVehicleCounter % 7),
        color: model.color,
        categories: [cat],
        ownerType: 'STUDENT',
        ownerId: studentId,
        hasDualControl: false,
        isRegular: false,
        status: 'APPROVED',
      },
    })
    studentOwnVehicleByStudentId[studentId] = vehicle.id
    studentVehicleCounter++
  }

  // -------- Aulas: deletar demo antigas e recriar seguindo as regras --------
  const allDemoStudentIds = studentIds
  const allDemoInstructorIds = instructorIds

  const deleted = await prisma.lesson.deleteMany({
    where: {
      AND: [
        { studentId: { in: allDemoStudentIds } },
        { instructorId: { in: allDemoInstructorIds } },
      ],
    },
  })
  if (deleted.count > 0) {
    console.log(`Apagadas ${deleted.count} aulas demo antigas para regenerar.`)
  }

  // Perfis de avaliação por instrutor (1 original + 24 demo = 25)
  const ratingProfiles = [
    4.5, 4.9, 4.0, 4.6, 3.2, 4.1, 4.7, 3.8, 4.4, 3.9,
    4.8, 4.2, 3.5, 4.3, 4.6, 3.7, 4.5, 3.0, 4.9, 4.1,
    4.4, 3.6, 4.7, 4.2, 3.9,
  ]

  const today = new Date()
  const lessonBatch: any[] = []

  for (let s = 0; s < studentIds.length; s++) {
    const studentId = studentIds[s]
    const studentCat = studentCategories[s]
    const numLessons = s === 0 ? 6 : lessonsForStudent(s - 1)
    const ownVehicleId = studentOwnVehicleByStudentId[studentId]

    // Escolhe instrutores que ensinam a categoria desejada
    const eligibleInstructorIdxs: number[] = []
    for (let k = 0; k < instructorIds.length; k++) {
      const cats = k === 0 ? ['B'] : INSTRUCTOR_PROFILES[k - 1].cats
      if (cats.includes(studentCat)) eligibleInstructorIdxs.push(k)
    }

    // Pega 1-3 instrutores fixos pra esse aluno (varia conforme número de aulas)
    const numInstructorsForStudent = Math.min(3, Math.max(1, Math.ceil(numLessons / 6)))
    const studentInstructorIdxs: number[] = []
    for (let k = 0; k < numInstructorsForStudent; k++) {
      const idx = eligibleInstructorIdxs[(s * 3 + k * 7) % eligibleInstructorIdxs.length]
      if (!studentInstructorIdxs.includes(idx)) studentInstructorIdxs.push(idx)
    }
    if (studentInstructorIdxs.length === 0) {
      studentInstructorIdxs.push(eligibleInstructorIdxs[0])
    }

    // Quantas serão SCHEDULED (futuras) — máximo 2
    const scheduledCount = numLessons >= 5 ? 2 : (numLessons >= 3 ? 1 : 0)
    // Quantas CANCELLED — só se aluno tem >= 4 aulas
    const cancelledCount = numLessons >= 4 ? 1 : 0
    const completedCount = numLessons - scheduledCount - cancelledCount

    let lessonCounterForStudent = 0

    // Aulas concluídas (passado)
    for (let j = 0; j < completedCount; j++) {
      const instructorIdx = studentInstructorIdxs[j % studentInstructorIdxs.length]
      const instructorId = instructorIds[instructorIdx]
      const targetAvg = ratingProfiles[instructorIdx % ratingProfiles.length]

      // Veículo: se aluno tem próprio, usa; senão usa do instrutor
      const vehicleId = ownVehicleId ?? instructorVehicleIds[instructorIdx === 0 ? 0 : instructorIdx - 1]

      const daysAgo = (j + 1) * 4 + (s % 6)
      const date = new Date(today)
      date.setDate(date.getDate() - daysAgo)
      const dateStr = date.toISOString().slice(0, 10)
      const startHour = 8 + (j % 9)
      const startTime = `${startHour.toString().padStart(2, '0')}:00`
      const endTime = `${(startHour + 1).toString().padStart(2, '0')}:00`
      const variation = (((s + j) % 5) - 2) * 0.25
      let rating = Math.max(1, Math.min(5, targetAvg + variation))
      rating = Math.round(rating * 10) / 10

      lessonBatch.push({
        instructorId,
        studentId,
        vehicleId,
        date: dateStr,
        startTime,
        endTime,
        durationMinutes: 60,
        rating,
        studentRating: Math.round((3.8 + ((j % 4) - 1) * 0.3) * 10) / 10,
        studentRatingNote: RATING_NOTES[(s + j) % RATING_NOTES.length],
        notes: 'Aula prática realizada.',
        difficulties: DIFFICULTIES_POOL[(s + j) % DIFFICULTIES_POOL.length],
        status: 'COMPLETED' as const,
      })
      lessonCounterForStudent++
    }

    // Aulas agendadas (futuro)
    for (let k = 0; k < scheduledCount; k++) {
      const instructorIdx = studentInstructorIdxs[k % studentInstructorIdxs.length]
      const instructorId = instructorIds[instructorIdx]
      const vehicleId = ownVehicleId ?? instructorVehicleIds[instructorIdx === 0 ? 0 : instructorIdx - 1]

      const futureDate = new Date(today)
      futureDate.setDate(futureDate.getDate() + (s + 1) + k * 2)
      const dateStr = futureDate.toISOString().slice(0, 10)
      const startHour = 9 + k * 2

      lessonBatch.push({
        instructorId,
        studentId,
        vehicleId,
        date: dateStr,
        startTime: `${startHour.toString().padStart(2, '0')}:00`,
        durationMinutes: 60,
        status: 'SCHEDULED' as const,
      })
      lessonCounterForStudent++
    }

    // Aula cancelada
    for (let c = 0; c < cancelledCount; c++) {
      const instructorIdx = studentInstructorIdxs[0]
      const instructorId = instructorIds[instructorIdx]
      const vehicleId = ownVehicleId ?? instructorVehicleIds[instructorIdx === 0 ? 0 : instructorIdx - 1]

      const cancelDate = new Date(today)
      cancelDate.setDate(cancelDate.getDate() - (s * 2 + 1))
      lessonBatch.push({
        instructorId,
        studentId,
        vehicleId,
        date: cancelDate.toISOString().slice(0, 10),
        startTime: '14:00',
        durationMinutes: 60,
        status: 'CANCELLED' as const,
        notes: 'Aula cancelada pelo aluno.',
      })
      lessonCounterForStudent++
    }
  }

  // Insere em lotes pra evitar timeout
  const chunkSize = 50
  for (let i = 0; i < lessonBatch.length; i += chunkSize) {
    await prisma.lesson.createMany({ data: lessonBatch.slice(i, i + chunkSize) })
  }

  console.log('---')
  console.log('Seed concluído.')
  console.log(`Total: ${instructorIds.length} instrutores, ${studentIds.length} alunos, ${lessonBatch.length} aulas`)
  console.log(`Alunos com veículo próprio: ${studentVehicleCounter}`)
  console.log('---')
  console.log('Contas originais:')
  console.log('  Instrutor: instrutor@drivecontrol.com / instructor123')
  console.log('  Aluno:     aluno@drivecontrol.com     / student123')
  console.log('---')
  console.log('Instrutores demo (senha: 123456):')
  for (const email of instructorEmails) console.log(`  ${email}`)
  console.log('---')
  console.log(`Alunos demo (senha: 123456) — ${studentEmails.length} contas:`)
  for (const email of studentEmails) console.log(`  ${email}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
