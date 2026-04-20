import type { Express } from 'express'
import swaggerUi from 'swagger-ui-express'
import { getOpenApiDocument } from '../docs/openapi'

export function setupSwagger(app: Express): void {
  const document = getOpenApiDocument()

  app.get('/openapi.json', (_req, res) => {
    res.json(document)
  })

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(document, { customSiteTitle: 'DriveControl API' }))
}
