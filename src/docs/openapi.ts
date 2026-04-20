/** Documento OpenAPI 3 — mantido aqui para não duplicar JSDoc em cada rota. */

function serverUrl(): string {
  const explicit = process.env.API_PUBLIC_URL
  if (explicit) return explicit.replace(/\/$/, '')
  const port = process.env.PORT ?? '3000'
  return `http://localhost:${port}`
}

export function getOpenApiDocument() {
  const url = serverUrl()

  return {
    openapi: '3.0.3',
    info: {
      title: 'DriveControl API',
      description:
        'API de gestão de aulas de direção. Autenticação: envie `Authorization: Bearer <token>` nos endpoints protegidos.',
      version: '1.0.0',
    },
    servers: [{ url, description: 'Instância atual' }],
    tags: [
      { name: 'Health', description: 'Saúde do serviço' },
      { name: 'Auth', description: 'Login e sessão' },
      { name: 'Students', description: 'Alunos' },
      { name: 'Instructors', description: 'Instrutores' },
      { name: 'Vehicles', description: 'Veículos' },
      { name: 'Lessons', description: 'Aulas' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        AppError: {
          type: 'object',
          properties: { message: { type: 'string' } },
          required: ['message'],
        },
        ValidationError: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Validation error' },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  message: { type: 'string' },
                },
              },
            },
          },
        },
        Role: {
          type: 'string',
          enum: ['ADMIN', 'INSTRUCTOR', 'STUDENT'],
        },
        SignInRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string' },
          },
        },
        AuthUserResponse: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            role: { $ref: '#/components/schemas/Role' },
            token: { type: 'string', description: 'JWT' },
          },
        },
        StudentRegister: {
          type: 'object',
          required: ['name', 'email', 'password', 'cpf', 'desiredCategory'],
          properties: {
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 6 },
            cpf: { type: 'string', minLength: 11, maxLength: 11 },
            desiredCategory: { type: 'string' },
          },
        },
        StudentUpdate: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            desiredCategory: { type: 'string' },
          },
        },
        InstructorRegister: {
          type: 'object',
          required: ['name', 'email', 'password', 'licenseNumber', 'category'],
          properties: {
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 6 },
            licenseNumber: { type: 'string' },
            category: { type: 'string' },
          },
        },
        InstructorUpdate: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            licenseNumber: { type: 'string' },
            category: { type: 'string' },
          },
        },
        OwnerType: { type: 'string', enum: ['INSTRUCTOR', 'STUDENT'] },
        VehicleCreate: {
          type: 'object',
          required: ['plate', 'category', 'ownerType', 'ownerId', 'hasDualControl'],
          properties: {
            plate: { type: 'string' },
            category: { type: 'string' },
            ownerType: { $ref: '#/components/schemas/OwnerType' },
            ownerId: { type: 'string', format: 'uuid' },
            hasDualControl: { type: 'boolean' },
          },
        },
        VehicleStatusUpdate: {
          type: 'object',
          required: ['status'],
          properties: {
            status: { type: 'string', enum: ['APPROVED', 'REJECTED'] },
          },
        },
        LessonCreate: {
          type: 'object',
          required: ['instructorId', 'vehicleId', 'date', 'startTime', 'durationMinutes'],
          properties: {
            instructorId: { type: 'string', format: 'uuid' },
            vehicleId: { type: 'string', format: 'uuid' },
            date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$', example: '2026-04-19' },
            startTime: { type: 'string', pattern: '^\\d{2}:\\d{2}$', example: '09:00' },
            durationMinutes: { type: 'integer', minimum: 30 },
            notes: { type: 'string' },
          },
        },
        LessonComplete: {
          type: 'object',
          required: ['rating'],
          properties: {
            rating: { type: 'number', minimum: 0, maximum: 10 },
            notes: { type: 'string' },
            difficulties: { type: 'string' },
          },
        },
      },
    },
    paths: {
      '/health': {
        get: {
          tags: ['Health'],
          summary: 'Health check',
          responses: {
            '200': {
              description: 'API em execução',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: { status: { type: 'string', example: 'ok' } },
                  },
                },
              },
            },
          },
        },
      },
      '/auth/signin': {
        post: {
          tags: ['Auth'],
          summary: 'Login',
          requestBody: {
            required: true,
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/SignInRequest' } },
            },
          },
          responses: {
            '200': {
              description: 'Token e dados do usuário',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/AuthUserResponse' } },
              },
            },
            '401': {
              description: 'Credenciais inválidas',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/AppError' } },
              },
            },
          },
        },
      },
      '/auth/me': {
        get: {
          tags: ['Auth'],
          summary: 'Dados do usuário autenticado',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'OK',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/AuthUserResponse' } },
              },
            },
            '401': {
              content: { 'application/json': { schema: { $ref: '#/components/schemas/AppError' } } },
            },
            '404': {
              content: { 'application/json': { schema: { $ref: '#/components/schemas/AppError' } } },
            },
          },
        },
      },
      '/students': {
        post: {
          tags: ['Students'],
          summary: 'Cadastro de aluno',
          requestBody: {
            required: true,
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/StudentRegister' } },
            },
          },
          responses: {
            '201': { description: 'Criado' },
            '400': {
              description: 'Validação',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ValidationError' } },
              },
            },
          },
        },
      },
      '/students/me': {
        get: {
          tags: ['Students'],
          summary: 'Perfil do aluno logado',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': { description: 'OK' },
            '403': {
              description: 'Papel incorreto',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/AppError' } },
              },
            },
          },
        },
      },
      '/students/{id}': {
        get: {
          tags: ['Students'],
          summary: 'Buscar aluno por id',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            '200': { description: 'OK' },
            '401': {
              content: { 'application/json': { schema: { $ref: '#/components/schemas/AppError' } } },
            },
          },
        },
        put: {
          tags: ['Students'],
          summary: 'Atualizar aluno',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          requestBody: {
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/StudentUpdate' } },
            },
          },
          responses: {
            '200': { description: 'OK' },
            '403': {
              content: { 'application/json': { schema: { $ref: '#/components/schemas/AppError' } } },
            },
          },
        },
      },
      '/students/{id}/stats': {
        get: {
          tags: ['Students'],
          summary: 'Estatísticas do aluno',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: { '200': { description: 'OK' } },
        },
      },
      '/instructors': {
        post: {
          tags: ['Instructors'],
          summary: 'Cadastro de instrutor',
          requestBody: {
            required: true,
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/InstructorRegister' } },
            },
          },
          responses: {
            '201': { description: 'Criado' },
            '400': {
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ValidationError' } },
              },
            },
          },
        },
        get: {
          tags: ['Instructors'],
          summary: 'Listar instrutores',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'search', in: 'query', schema: { type: 'string' } },
            { name: 'category', in: 'query', schema: { type: 'string' } },
            { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100 } },
          ],
          responses: { '200': { description: 'OK' } },
        },
      },
      '/instructors/{id}': {
        get: {
          tags: ['Instructors'],
          summary: 'Buscar instrutor',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: { '200': { description: 'OK' } },
        },
        put: {
          tags: ['Instructors'],
          summary: 'Atualizar instrutor',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          requestBody: {
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/InstructorUpdate' } },
            },
          },
          responses: {
            '200': { description: 'OK' },
            '403': {
              content: { 'application/json': { schema: { $ref: '#/components/schemas/AppError' } } },
            },
          },
        },
      },
      '/instructors/{id}/stats': {
        get: {
          tags: ['Instructors'],
          summary: 'Estatísticas do instrutor',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: { '200': { description: 'OK' } },
        },
      },
      '/vehicles': {
        post: {
          tags: ['Vehicles'],
          summary: 'Cadastrar veículo',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/VehicleCreate' } },
            },
          },
          responses: { '201': { description: 'Criado' } },
        },
        get: {
          tags: ['Vehicles'],
          summary: 'Listar veículos por proprietário',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'ownerId', in: 'query', required: true, schema: { type: 'string', format: 'uuid' } },
            {
              name: 'ownerType',
              in: 'query',
              required: true,
              schema: { $ref: '#/components/schemas/OwnerType' },
            },
          ],
          responses: { '200': { description: 'OK' } },
        },
      },
      '/vehicles/{id}': {
        get: {
          tags: ['Vehicles'],
          summary: 'Buscar veículo',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: { '200': { description: 'OK' } },
        },
      },
      '/vehicles/{id}/status': {
        patch: {
          tags: ['Vehicles'],
          summary: 'Aprovar ou rejeitar veículo (ADMIN)',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/VehicleStatusUpdate' } },
            },
          },
          responses: {
            '200': { description: 'OK' },
            '403': {
              content: { 'application/json': { schema: { $ref: '#/components/schemas/AppError' } } },
            },
          },
        },
      },
      '/lessons': {
        post: {
          tags: ['Lessons'],
          summary: 'Agendar aula (aluno)',
          description: 'Exige token de usuário com papel STUDENT.',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/LessonCreate' } },
            },
          },
          responses: {
            '201': { description: 'Criado' },
            '403': {
              description: 'Usuário sem perfil de aluno',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: { message: { type: 'string' } },
                  },
                },
              },
            },
          },
        },
        get: {
          tags: ['Lessons'],
          summary: 'Listar aulas',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'studentId', in: 'query', schema: { type: 'string', format: 'uuid' } },
            { name: 'instructorId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          ],
          responses: { '200': { description: 'OK' } },
        },
      },
      '/lessons/{id}/complete': {
        patch: {
          tags: ['Lessons'],
          summary: 'Concluir aula (instrutor)',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/LessonComplete' } },
            },
          },
          responses: {
            '200': { description: 'OK' },
            '403': {
              content: { 'application/json': { schema: { $ref: '#/components/schemas/AppError' } } },
            },
          },
        },
      },
      '/lessons/{id}/cancel': {
        patch: {
          tags: ['Lessons'],
          summary: 'Cancelar aula',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: { '200': { description: 'OK' } },
        },
      },
    },
  }
}
