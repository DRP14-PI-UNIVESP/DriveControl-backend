import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import * as vehicleService from './vehicle.service'
import { OwnerType } from '@prisma/client'

const createSchema = z.object({
  plate: z.string().min(1),
  category: z.string().min(1),
  ownerType: z.nativeEnum(OwnerType),
  ownerId: z.string().uuid(),
  hasDualControl: z.boolean(),
})

const listSchema = z.object({
  ownerId: z.string().uuid(),
  ownerType: z.nativeEnum(OwnerType),
})

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = createSchema.parse(req.body)
    const vehicle = await vehicleService.createVehicle(data)
    res.status(201).json(vehicle)
  } catch (err) {
    next(err)
  }
}

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { ownerId, ownerType } = listSchema.parse(req.query)
    const vehicles = await vehicleService.listVehiclesByOwner(ownerId, ownerType)
    res.json(vehicles)
  } catch (err) {
    next(err)
  }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const vehicle = await vehicleService.getVehicleById(req.params.id)
    res.json(vehicle)
  } catch (err) {
    next(err)
  }
}

const updateStatusSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
})

export async function updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status } = updateStatusSchema.parse(req.body)
    const vehicle = await vehicleService.updateVehicleStatus(req.params.id, status)
    res.json(vehicle)
  } catch (err) {
    next(err)
  }
}
