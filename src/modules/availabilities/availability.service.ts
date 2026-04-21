import { prisma } from '../../config/database'
import { AppError } from '../../middleware/error.middleware'

function formatAvailability(slot: {
  id: string
  instructorId: string
  date: string
  startTime: string
  durationMinutes: number
  isBooked: boolean
  notes: string | null
}) {
  return {
    id: slot.id,
    instructor_id: slot.instructorId,
    date: slot.date,
    start_time: slot.startTime,
    duration_minutes: slot.durationMinutes,
    is_booked: slot.isBooked,
    notes: slot.notes ?? undefined,
  }
}

export async function createAvailability(data: {
  instructorId: string
  date: string
  startTime: string
  durationMinutes: number
  notes?: string
}) {
  const conflict = await prisma.availability.findFirst({
    where: { instructorId: data.instructorId, date: data.date, startTime: data.startTime },
  })
  if (conflict) throw new AppError('Já existe um horário aberto para este dia e horário', 409)

  const slot = await prisma.availability.create({ data })
  return formatAvailability(slot)
}

export async function listAvailabilities(params: { instructorId: string }) {
  const slots = await prisma.availability.findMany({
    where: { instructorId: params.instructorId },
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
  })
  return slots.map(formatAvailability)
}

export async function deleteAvailability(id: string, instructorId: string) {
  const slot = await prisma.availability.findUnique({ where: { id } })
  if (!slot) throw new AppError('Horário não encontrado', 404)
  if (slot.instructorId !== instructorId) throw new AppError('Proibido', 403)
  if (slot.isBooked) throw new AppError('Não é possível remover um horário já reservado', 400)
  await prisma.availability.delete({ where: { id } })
}
