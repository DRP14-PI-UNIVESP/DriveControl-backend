# DriveControl – API

Backend da plataforma de gestão de aulas de direção entre instrutores e alunos.

## Tecnologias

- Node.js + TypeScript
- Express
- PostgreSQL + Prisma ORM
- JWT para autenticação

## Requisitos

- Node.js 20+
- PostgreSQL 16+ (ou Docker para subir só o banco)

### PostgreSQL com Docker

Se você já usa Docker, pode iniciar um PostgreSQL alinhado ao `.env.example` (porta **5433** no computador host):

```bash
docker compose up -d
```

- Parar os containers: `docker compose stop`
- Remover containers (mantém os dados): `docker compose down`
- Apagar também o volume com os dados: `docker compose down -v`

Depois copie `.env.example` para `.env` e rode `npm run db:migrate`.

## Instalação

```bash
npm install
```

Copie o arquivo de variáveis de ambiente e preencha com suas configurações:

```bash
cp .env.example .env
```

## Variáveis de ambiente

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | URL de conexão com o PostgreSQL |
| `JWT_SECRET` | Chave secreta para geração dos tokens JWT |
| `JWT_EXPIRES_IN` | Tempo de expiração do token (ex: `7d`) |
| `PORT` | Porta do servidor (padrão: `3000`) |

## Banco de dados

Criar as tabelas:

```bash
npm run db:migrate
```

Popular com dados iniciais:

```bash
npm run db:seed
```

Usuários criados pelo seed:

| Papel | Email | Senha |
|---|---|---|
| Admin | admin@drivecontrol.com | admin123 |
| Instrutor | instrutor@drivecontrol.com | instructor123 |
| Aluno | aluno@drivecontrol.com | student123 |

## Rodando em desenvolvimento

```bash
npm run dev
```

A API ficará disponível em `http://localhost:3000`.

## Build para produção

```bash
npm run build
npm start
```

## Testes

```bash
npm test
```

## Endpoints

Mapeamento completo para o frontend (rotas + payloads + exemplos):
- `docs/frontend-api-map.md`
- Swagger UI: `http://localhost:3000/api-docs`

### Auth
| Método | Rota | Descrição | Autenticação |
|---|---|---|---|
| POST | `/auth/signin` | Login | Não |
| GET | `/auth/me` | Usuário autenticado | Sim |

### Alunos
| Método | Rota | Descrição | Autenticação |
|---|---|---|---|
| POST | `/students` | Cadastro de aluno | Não |
| GET | `/students/me` | Perfil do aluno logado | STUDENT |
| GET | `/students/:id` | Buscar aluno por ID | Sim |
| PUT | `/students/:id` | Atualizar perfil | STUDENT |
| GET | `/students/:id/stats` | Estatísticas do aluno | Sim |

### Instrutores
| Método | Rota | Descrição | Autenticação |
|---|---|---|---|
| POST | `/instructors` | Cadastro de instrutor | Não |
| GET | `/instructors` | Listar instrutores | Sim |
| GET | `/instructors/:id` | Buscar instrutor por ID | Sim |
| PUT | `/instructors/:id` | Atualizar perfil | INSTRUCTOR |
| GET | `/instructors/:id/stats` | Estatísticas do instrutor | Sim |

### Veículos
| Método | Rota | Descrição | Autenticação |
|---|---|---|---|
| POST | `/vehicles` | Cadastrar veículo | Sim |
| GET | `/vehicles` | Listar veículos por proprietário | Sim |
| GET | `/vehicles/:id` | Buscar veículo por ID | Sim |
| PATCH | `/vehicles/:id/status` | Aprovar ou rejeitar veículo | ADMIN |

### Aulas
| Método | Rota | Descrição | Autenticação |
|---|---|---|---|
| POST | `/lessons` | Agendar aula | STUDENT |
| GET | `/lessons` | Listar aulas | Sim |
| PATCH | `/lessons/:id/complete` | Concluir aula com avaliação | INSTRUCTOR |
| PATCH | `/lessons/:id/cancel` | Cancelar aula | Sim |

### Health Check
| Método | Rota | Descrição |
|---|---|---|
| GET | `/health` | Status da API |
