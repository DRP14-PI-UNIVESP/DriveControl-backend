import { OwnerType } from '@prisma/client'
import { prisma } from '../../config/database'
import { AppError } from '../../middleware/error.middleware'

function formatVehicle(vehicle: {
  id: string
  plate: string
  category: string
  ownerType: string
  ownerId: string
  hasDualControl: boolean
  isRegular: boolean
  status: string
}) {
  return {
    id: vehicle.id,
    plate: vehicle.plate,
    category: vehicle.category,
    owner_type: vehicle.ownerType,
    owner_id: vehicle.ownerId,
    has_dual_control: vehicle.hasDualControl,
    is_regular: vehicle.isRegular,
    status: vehicle.status,
  }
}

export async function createVehicle(data: {
  plate: string
  category: string
  ownerType: OwnerType
  ownerId: string
  hasDualControl: boolean
}) {
  const plateInUse = await prisma.vehicle.findUnique({ where: { plate: data.plate } })
  if (plateInUse) throw new AppError('Plate already registered', 409)

  const vehicle = await prisma.vehicle.create({
    data: {
      plate: data.plate,
      category: data.category,
      ownerType: data.ownerType,
      ownerId: data.ownerId,
      hasDualControl: data.hasDualControl,
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
