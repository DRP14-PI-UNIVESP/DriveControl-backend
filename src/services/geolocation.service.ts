import https from 'node:https'
import { URL } from 'node:url'
import { AppError } from '../middleware/error.middleware'

type GeocodeResult = {
  lat: number
  lng: number
}

type NominatimResponseItem = {
  lat?: string
  lon?: string
}

function httpGetJson<T>(url: string, headers?: Record<string, string>): Promise<T> {
  return new Promise((resolve, reject) => {
    const request = https.request(url, { method: 'GET', headers }, (res) => {
      let data = ''
      res.on('data', (chunk) => {
        data += chunk
      })
      res.on('end', () => {
        try {
          resolve(JSON.parse(data) as T)
        } catch (error) {
          reject(error)
        }
      })
    })

    request.on('error', reject)
    request.end()
  })
}

function buildRegion(region: string) {
  const normalizedCep = region.replace(/\D/g, '')
  if (normalizedCep.length === 8) {
    return `${normalizedCep}, Brasil`
  }

  return `${region}, Brasil`
}

export async function geocodeRegion(region: string): Promise<GeocodeResult> {
  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('q', buildRegion(region))
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('limit', '1')
  url.searchParams.set('countrycodes', 'br')

  const response = await httpGetJson<NominatimResponseItem[]>(url.toString(), {
    // Nominatim usage policy requires a descriptive User-Agent.
    'User-Agent': 'DriveControl-backend/1.0 (contact: admin@drivecontrol.local)',
    'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
  })

  const firstResult = response[0]
  if (!firstResult?.lat || !firstResult?.lon) {
    throw new AppError('Region not found', 400)
  }

  const lat = Number(firstResult.lat)
  const lng = Number(firstResult.lon)

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    throw new AppError('Invalid geocoding response', 502)
  }

  return { lat, lng }
}

export function calculateDistanceKm(
  origin: GeocodeResult,
  destination: GeocodeResult
): number {
  const earthRadiusKm = 6371
  const degToRad = (deg: number) => (deg * Math.PI) / 180

  const latDiff = degToRad(destination.lat - origin.lat)
  const lngDiff = degToRad(destination.lng - origin.lng)
  const a =
    Math.sin(latDiff / 2) * Math.sin(latDiff / 2) +
    Math.cos(degToRad(origin.lat)) *
      Math.cos(degToRad(destination.lat)) *
      Math.sin(lngDiff / 2) *
      Math.sin(lngDiff / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return earthRadiusKm * c
}
