import { OwnerType } from '@prisma/client'
import { prisma } from '../../config/database'
import { AppError } from '../../middleware/error.middleware'

function formatVehicle(vehicle: {
  id: string
  plate: string
  renavam: string
  brand: string
  model: string
  manufactureYear: number
  color: string
  categories: unknown
  ownerType: string
  ownerId: string
  hasDualControl: boolean
  isRegular: boolean
  status: string
}) {
  return {
    id: vehicle.id,
    plate: vehicle.plate,
    renavam: vehicle.renavam,
    brand: vehicle.brand,
    model: vehicle.model,
    manufacture_year: vehicle.manufactureYear,
    color: vehicle.color,
    categories: vehicle.categories as string[],
    owner_type: vehicle.ownerType,
    owner_id: vehicle.ownerId,
    has_dual_control: vehicle.hasDualControl,
    is_regular: vehicle.isRegular,
    status: vehicle.status,
  }
}

export async function createVehicle(data: {
  plate: string
  renavam: string
  brand: string
  model: string
  manufactureYear: number
  color: string
  categories: string[]
  ownerType: OwnerType
  ownerId: string
  hasDualControl: boolean
}) {
  const plateInUse = await prisma.vehicle.findUnique({ where: { plate: data.plate } })
  if (plateInUse) throw new AppError('Plate already registered', 409)

  const renavamInUse = await prisma.vehicle.findUnique({ where: { renavam: data.renavam } })
  if (renavamInUse) throw new AppError('RENAVAM already registered', 409)

  const vehicle = await prisma.vehicle.create({
    data: {
      plate: data.plate,
      renavam: data.renavam,
      brand: data.brand,
      model: data.model,
      manufactureYear: data.manufactureYear,
      color: data.color,
      categories: data.categories,
      ownerType: data.ownerType,
      ownerId: data.ownerId,
      hasDualControl: data.hasDualControl,
      status: data.ownerType === 'STUDENT' ? 'APPROVED' : 'PENDING',
    },
  })

  return formatVehicle(vehicle)
}

export async function listVehiclesByOwner(ownerId: string, ownerType: OwnerType) {
  const vehicles = await prisma.vehicle.findMany({
    where: { ownerId, ownerType },
  })

  return vehicles.map(formatVehicle)
}

export async function getVehicleById(id: string) {
  const vehicle = await prisma.vehicle.findUnique({ where: { id } })
  if (!vehicle) throw new AppError('Vehicle not found', 404)
  return formatVehicle(vehicle)
}

export async function updateVehicleStatus(id: string, status: 'APPROVED' | 'REJECTED') {
  const vehicle = await prisma.vehicle.findUnique({ where: { id } })
  if (!vehicle) throw new AppError('Vehicle not found', 404)

  const updated = await prisma.vehicle.update({
    where: { id },
    data: {
      status,
      isRegular: status === 'APPROVED',
    },
  })

  return formatVehicle(updated)
}
