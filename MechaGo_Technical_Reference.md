# MechaGo — Documento Técnico de Referência para IA

> **Propósito**: Este arquivo serve como contexto principal para assistentes de IA (Claude Code, Cursor, Copilot) durante o desenvolvimento do MechaGo. Contém TODA a informação necessária para implementar o projeto corretamente.
>
> **Versão**: 1.0 — Março 2026
> **Baseado em**: PRD V3 Definitivo + Design System V4 Stitch Fusion

---

## 1. VISÃO GERAL DO PRODUTO

### O que é

MechaGo é um app de socorro automotivo que conecta motoristas com problema mecânico/elétrico/pneu a profissionais (mecânicos, borracheiros, guinchos) em tempo real. Funciona como um "iFood de mecânica" com duas apps separadas: **MechaGo** (cliente) e **MechaGo Pro** (profissional).

### O que NÃO é

- Não é marketplace geral de serviços
- Não é seguradora
- Não é app de manutenção preventiva
- Não é app de agendamento (MVP)

### Escopo dual

O app detecta automaticamente via GPS se o usuário está em zona urbana ou rodovia e ajusta comportamento:

| Parâmetro           | Urbano      | Rodovia       |
| ------------------- | ----------- | ------------- |
| Raio de busca       | 5-10 km     | 15-30 km      |
| Multiplicador preço | ×1.0        | ×1.15 a ×1.30 |
| Info concessionária | Não aparece | Aparece auto  |
| Tempo médio chegada | 15-20 min   | 30-60 min     |

---

## 2. STACK TÉCNICA COMPLETA

### 2.1 Monorepo (Turborepo)

```
mechago/
├── apps/
│   ├── api/              # Backend Hono (TypeScript) — compartilhado pelos dois apps
│   ├── cliente/          # App MechaGo (Expo) — APK/IPA do cliente
│   └── pro/              # App MechaGo Pro (Expo) — APK/IPA do profissional
├── packages/
│   └── shared/           # Types, constantes, design tokens, utils compartilhados
├── MechaGro-FrontEnd/    # Arquivos de design Stitch (referência visual, NÃO código)
│   ├── MechaGo (App do Cliente)/DesignCliente/
│   └── MechaGo Pro (App do Profissional)/DesignPro/
├── turbo.json
├── package.json
└── docker-compose.yml
```

> **IMPORTANTE**: São dois projetos Expo INDEPENDENTES que geram dois APKs/IPAs separados.
> O cliente baixa "MechaGo" na store. O profissional baixa "MechaGo Pro".
> Ambos compartilham o backend (apps/api) e os types/tokens (packages/shared).
> Cada app tem seu próprio app.json, suas próprias telas, e seus próprios componentes.
> O path de design canônico no repositório atual é `MechaGro-FrontEnd/`.
> `apps/cliente` e `apps/pro` NUNCA importam código-fonte de `apps/api/src`; contratos compartilhados ficam em `packages/shared` ou cliente gerado.
> Contratos já extraídos para `packages/shared` fazem parte da baseline atual do projeto e devem ser evoluídos lá.

### 2.2 Backend

| Camada           | Tecnologia                 | Versão     | Justificativa                             |
| ---------------- | -------------------------- | ---------- | ----------------------------------------- |
| Framework HTTP   | Hono                       | 4.x        | Performance, middleware nativo, OpenAPI   |
| ORM              | Drizzle                    | 0.36+      | Type-safe, SQL real, migrations           |
| Banco            | PostgreSQL + PostGIS       | 16 + 3.4   | Queries geoespaciais para matching        |
| Cache / Filas    | Redis + BullMQ             | 7.x + 5.x  | Matching real-time, jobs async            |
| Real-time        | Socket.IO                  | 4.x        | Tracking GPS, status updates              |
| Auth             | jose + Argon2              | 5.x + 0.40 | JWT Web Crypto nativo, hash GPU-resistant |
| Validação        | Zod                        | 3.x        | Schema validation, zero trust             |
| Documentação API | @hono/zod-openapi + Scalar | —          | Docs auto-geradas dos schemas Zod         |
| Pagamento        | Mercado Pago SDK           | 2.x        | Pix nativo, split marketplace             |
| Storage          | Cloudflare R2              | —          | S3-compatible, presigned URLs             |
| Push             | Firebase Admin SDK (FCM)   | 12.x       | Push por tópicos geográficos              |
| Logging          | Pino                       | 9.x        | Structured logging, trace IDs             |
| Rate Limiting    | hono-rate-limiter          | —          | Redis backend, por rota                   |
| Deploy           | Railway                    | —          | Infra já utilizada (Aether)               |

### 2.3 Mobile

| Camada        | Tecnologia        | Versão | Justificativa                    |
| ------------- | ----------------- | ------ | -------------------------------- |
| Runtime       | React Native      | 0.81+  | Cross-platform (SDK 54)          |
| Plataforma    | Expo SDK          | 54     | Dev build, OTA updates, LTS      |
| Navegação     | Expo Router       | 6.x    | File-based routing (SDK 54)      |
| Server State  | TanStack Query    | 5.x    | Cache, background refetch        |
| Client State  | Zustand           | 5.x    | Leve, sem boilerplate            |
| Storage local | MMKV              | 3.x    | 10x AsyncStorage, criptografado  |
| Mapas         | react-native-maps | 1.2+   | Google Maps SDK                  |
| Animações     | Reanimated        | 4.x    | Animações 60fps nativas (SDK 54) |
| Câmera        | expo-camera       | 16.x   | Foto obrigatória do serviço      |
| GPS           | expo-location     | 18.x   | Foreground + background tracking |
| HTTP Client   | ky                | 1.x    | Fetch wrapper leve com retry     |

### 2.4 Ferramentas de Dev

| Ferramenta     | Uso                                                    |
| -------------- | ------------------------------------------------------ |
| Turborepo      | Monorepo build system                                  |
| Biome          | Lint + format (substitui ESLint+Prettier, mais rápido) |
| Docker Compose | Postgres + Redis local                                 |
| Drizzle Kit    | Migrations e Drizzle Studio                            |
| Scalar         | UI de documentação da API                              |

---

## 3. ARQUITETURA DO BACKEND

### 3.1 Estrutura de pastas (Modular por Domínio)

```
apps/api/
├── src/
│   ├── index.ts                    # Entry point, cria app Hono
│   ├── app.ts                      # Configura middleware global
│   ├── env.ts                      # Validação de env vars com Zod
│   │
│   ├── modules/                    # Cada módulo é um domínio isolado
│   │   ├── auth/
│   │   │   ├── auth.routes.ts      # Rotas OpenAPI com Zod schemas
│   │   │   ├── auth.service.ts     # Lógica de negócio
│   │   │   ├── auth.repository.ts  # Queries Drizzle
│   │   │   └── auth.schemas.ts     # Zod schemas (input/output)
│   │   │
│   │   ├── users/
│   │   │   ├── users.routes.ts
│   │   │   ├── users.service.ts
│   │   │   ├── users.repository.ts
│   │   │   └── users.schemas.ts
│   │   │
│   │   ├── vehicles/
│   │   │   ├── vehicles.routes.ts
│   │   │   ├── vehicles.service.ts
│   │   │   ├── vehicles.repository.ts
│   │   │   └── vehicles.schemas.ts
│   │   │
│   │   ├── professionals/
│   │   │   ├── professionals.routes.ts
│   │   │   ├── professionals.service.ts
│   │   │   ├── professionals.repository.ts
│   │   │   └── professionals.schemas.ts
│   │   │
│   │   ├── service-requests/       # Core: pedidos de socorro
│   │   │   ├── service-requests.routes.ts
│   │   │   ├── service-requests.service.ts
│   │   │   ├── service-requests.repository.ts
│   │   │   ├── service-requests.schemas.ts
│   │   │   └── pricing.service.ts  # Fórmula de preço V3
│   │   │
│   │   ├── matching/               # Core: algoritmo de matching
│   │   │   ├── matching.service.ts
│   │   │   ├── matching.queue.ts   # BullMQ job definition
│   │   │   └── matching.worker.ts  # BullMQ worker
│   │   │
│   │   ├── tracking/               # Core: GPS real-time
│   │   │   ├── tracking.gateway.ts # Socket.IO handlers
│   │   │   └── tracking.service.ts
│   │   │
│   │   ├── payments/
│   │   │   ├── payments.routes.ts
│   │   │   ├── payments.service.ts
│   │   │   ├── payments.webhook.ts # Mercado Pago webhook + HMAC
│   │   │   └── payments.schemas.ts
│   │   │
│   │   ├── reviews/
│   │   │   ├── reviews.routes.ts
│   │   │   ├── reviews.service.ts
│   │   │   └── reviews.schemas.ts
│   │   │
│   │   ├── uploads/
│   │   │   ├── uploads.routes.ts   # Presigned URL generation
│   │   │   └── uploads.service.ts  # Cloudflare R2
│   │   │
│   │   └── notifications/
│   │       ├── notifications.service.ts  # FCM push
│   │       └── notifications.topics.ts   # Tópicos geográficos
│   │
│   ├── db/
│   │   ├── index.ts                # Drizzle client instance
│   │   ├── schema/                 # Drizzle schemas (tabelas)
│   │   │   ├── users.ts
│   │   │   ├── vehicles.ts
│   │   │   ├── professionals.ts
│   │   │   ├── workshops.ts
│   │   │   ├── service-requests.ts
│   │   │   ├── service-events.ts
│   │   │   ├── payments.ts
│   │   │   ├── reviews.ts
│   │   │   ├── price-tables.ts
│   │   │   ├── queue-entries.ts
│   │   │   └── roadway-info.ts
│   │   └── migrations/             # Drizzle migrations auto-geradas
│   │
│   ├── middleware/
│   │   ├── auth.middleware.ts       # JWT validation
│   │   ├── logger.middleware.ts     # Pino request logging
│   │   └── error-handler.ts        # Error handler global
│   │
│   ├── lib/
│   │   └── redis.ts                # Redis client singleton
│   │
│   └── utils/
│       ├── errors.ts               # Custom error classes
│       └── crypto.ts               # Argon2 + JWT helpers
│
├── drizzle.config.ts               # Drizzle Kit config
├── tsconfig.json
├── package.json
└── Dockerfile
```

### 3.2 Padrão de cada módulo

Cada módulo segue EXATAMENTE esta estrutura:

**`*.schemas.ts`** — Schemas Zod que definem input e output de cada rota. São a FONTE DA VERDADE para validação e documentação OpenAPI.

```typescript
// Exemplo: vehicles.schemas.ts
import { z } from "zod";

export const vehicleTypeEnum = z.enum(["car", "moto", "suv", "truck"]);

export const createVehicleSchema = z.object({
  type: vehicleTypeEnum,
  plate: z
    .string()
    .regex(/^[A-Z]{3}-?\d{4}$/i, "Placa inválida. Formato: ABC-1234"),
  model: z.string().min(2).max(100),
  year: z
    .number()
    .int()
    .min(1980)
    .max(new Date().getFullYear() + 1),
  brand: z.string().min(2).max(50),
});

export const vehicleResponseSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  type: vehicleTypeEnum,
  plate: z.string(),
  model: z.string(),
  year: z.number(),
  brand: z.string(),
  createdAt: z.string().datetime(),
});

export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;
export type VehicleResponse = z.infer<typeof vehicleResponseSchema>;
```

**`*.routes.ts`** — Rotas Hono com OpenAPI integrado.

```typescript
// Exemplo: vehicles.routes.ts
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { createVehicleSchema, vehicleResponseSchema } from "./vehicles.schemas";
import { VehiclesService } from "./vehicles.service";
import { authMiddleware } from "../../middleware/auth.middleware";

const app = new OpenAPIHono();

const createVehicleRoute = createRoute({
  method: "post",
  path: "/vehicles",
  tags: ["Vehicles"],
  summary: "Cadastrar veículo do cliente",
  middleware: [authMiddleware],
  request: {
    body: { content: { "application/json": { schema: createVehicleSchema } } },
  },
  responses: {
    201: {
      content: { "application/json": { schema: vehicleResponseSchema } },
      description: "Veículo cadastrado",
    },
  },
});

app.openapi(createVehicleRoute, async (c) => {
  const userId = c.get("userId"); // Injetado pelo authMiddleware
  const input = c.req.valid("json");
  const vehicle = await VehiclesService.create(userId, input);
  return c.json(vehicle, 201);
});

export default app;
```

**`*.service.ts`** — Lógica de negócio pura. Sem acesso direto ao Hono context.

```typescript
// Exemplo: vehicles.service.ts
import { VehiclesRepository } from "./vehicles.repository";
import { CreateVehicleInput } from "./vehicles.schemas";
import { AppError } from "../../utils/errors";

export class VehiclesService {
  static async create(userId: string, input: CreateVehicleInput) {
    // Regra: máximo 5 veículos por cliente
    const count = await VehiclesRepository.countByUser(userId);
    if (count >= 5) {
      throw new AppError("VEHICLE_LIMIT", "Limite de 5 veículos atingido", 400);
    }

    // Regra: placa não pode estar duplicada no sistema
    const existing = await VehiclesRepository.findByPlate(input.plate);
    if (existing) {
      throw new AppError("PLATE_EXISTS", "Placa já cadastrada", 409);
    }

    return VehiclesRepository.create({ ...input, userId });
  }
}
```

**`*.repository.ts`** — Queries Drizzle. Única camada que toca no banco.

```typescript
// Exemplo: vehicles.repository.ts
import { db } from "../../db";
import { vehicles } from "../../db/schema/vehicles";
import { eq, and } from "drizzle-orm";

export class VehiclesRepository {
  static async create(data: typeof vehicles.$inferInsert) {
    const [vehicle] = await db.insert(vehicles).values(data).returning();
    return vehicle;
  }

  static async findByPlate(plate: string) {
    return db.query.vehicles.findFirst({ where: eq(vehicles.plate, plate) });
  }

  static async countByUser(userId: string) {
    const result = await db
      .select()
      .from(vehicles)
      .where(eq(vehicles.userId, userId));
    return result.length;
  }
}
```

### 3.3 Convenções de código obrigatórias

```
LINGUAGEM: TypeScript strict mode
NOMENCLATURA: camelCase para variáveis/funções, PascalCase para classes/types/schemas
IMPORTS: Usar path aliases (@/ para src/)
ERROS: Sempre throw AppError com código, mensagem PT-BR, e HTTP status
LOGS: Pino com contexto (requestId, userId, module)
COMENTÁRIOS: Em PT-BR, explicar o PORQUÊ, não o quê
VALIDAÇÃO: Todo input externo validado com Zod. Sem exceção.
SQL: Drizzle queries tipadas. JAMAIS string concatenada.
SEGREDOS: Sempre via process.env, validados com Zod no env.ts
RETORNO DE ERRO: Mensagem safe para o cliente, detalhes no log interno
```

---

## 4. SCHEMA DO BANCO DE DADOS

### 4.1 Diagrama de entidades (Drizzle Schema)

```typescript
// db/schema/users.ts
import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  pgEnum,
  decimal,
} from "drizzle-orm/pg-core";

export const userTypeEnum = pgEnum("user_type", [
  "client",
  "professional",
  "admin",
]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  type: userTypeEnum("type").notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  phone: varchar("phone", { length: 20 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  passwordHash: text("password_hash").notNull(),
  avatarUrl: text("avatar_url"),
  cpfCnpj: varchar("cpf_cnpj", { length: 18 }).notNull().unique(),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0.00"),
  totalReviews: integer("total_reviews").default(0),
  isActive: boolean("is_active").default(true),
  isVerified: boolean("is_verified").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

```typescript
// db/schema/vehicles.ts
export const vehicleTypeEnum = pgEnum("vehicle_type", [
  "car",
  "moto",
  "suv",
  "truck",
]);

export const vehicles = pgTable("vehicles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: vehicleTypeEnum("type").notNull(),
  plate: varchar("plate", { length: 10 }).notNull().unique(),
  brand: varchar("brand", { length: 50 }).notNull(),
  model: varchar("model", { length: 100 }).notNull(),
  year: integer("year").notNull(),
  color: varchar("color", { length: 30 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

```typescript
// db/schema/professionals.ts
export const professionalTypeEnum = pgEnum("professional_type", [
  "mechanic_mobile", // Mecânico móvel (sem oficina)
  "mechanic_workshop", // Mecânico com oficina
  "tire_repair", // Borracheiro
  "tow_truck", // Guincho
]);

export const specialtyEnum = pgEnum("specialty", [
  "car_general", // Carro geral
  "moto", // Moto
  "diesel_truck", // Diesel/Caminhão
  "electronic_injection", // Injeção eletrônica
  "suspension", // Suspensão
  "brakes", // Freios
  "air_conditioning", // Ar condicionado
  "transmission", // Câmbio
]);

export const scheduleTypeEnum = pgEnum("schedule_type", [
  "24h", // 24 horas
  "daytime", // Diurno (6h-22h)
  "nighttime", // Noturno (22h-6h)
  "custom", // Personalizado
]);

export const professionals = pgTable("professionals", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id)
    .unique(),
  type: professionalTypeEnum("type").notNull(),
  // Arrays de pgEnum — validação no nível do banco
  specialties: specialtyEnum("specialties").array().notNull().default([]),
  vehicleTypesServed: vehicleTypeEnum("vehicle_types_served")
    .array()
    .notNull()
    .default([]),
  hasWorkshop: boolean("has_workshop").default(false).notNull(),
  scheduleType: scheduleTypeEnum("schedule_type").notNull().default("24h"),
  customSchedule: jsonb("custom_schedule"), // { mon: { open: "08:00", close: "18:00" } }
  radiusKm: integer("radius_km").notNull().default(10),
  // Localização: lat/lng como decimal (queries PostGIS via raw SQL com ST_MakePoint)
  // PostGIS está instalado no banco (postgis/postgis:16-3.4) e pode ser usado via raw SQL:
  // Ex: ST_DWithin(ST_MakePoint(lng, lat)::geography, ST_MakePoint($1, $2)::geography, $3)
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  isOnline: boolean("is_online").default(false).notNull(),
  isFounder: boolean("is_founder").default(false).notNull(), // Selo Fundador
  commissionRate: decimal("commission_rate", {
    precision: 4,
    scale: 2,
  }).default("0.00").notNull(),
  totalEarnings: decimal("total_earnings", { precision: 12, scale: 2 }).default(
    "0.00",
  ).notNull(),
  acceptanceRate: decimal("acceptance_rate", {
    precision: 5,
    scale: 2,
  }).default("100.00").notNull(),
  cancellationsThisMonth: integer("cancellations_this_month").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

```typescript
// db/schema/workshops.ts
export const workshops = pgTable("workshops", {
  id: uuid("id").defaultRandom().primaryKey(),
  professionalId: uuid("professional_id")
    .notNull()
    .references(() => professionals.id),
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
  longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  openingHours: jsonb("opening_hours"), // { mon: { open: "08:00", close: "18:00" }, ... }
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

```typescript
// db/schema/service-requests.ts
export const problemTypeEnum = pgEnum("problem_type", [
  "tire", // Pneu furado
  "battery", // Bateria / Não liga
  "electric", // Pane elétrica
  "overheat", // Superaquecimento
  "fuel", // Pane seca
  "other", // Outro problema
]);

export const complexityEnum = pgEnum("complexity", [
  "simple",
  "medium",
  "complex",
]);

export const contextEnum = pgEnum("context", ["urban", "highway"]);

export const requestStatusEnum = pgEnum("request_status", [
  "pending", // Aguardando matching
  "matching", // No matching (BullMQ job ativo)
  "waiting_queue", // Na fila de espera (ninguém aceitou)
  "accepted", // Profissional aceitou
  "professional_enroute", // Profissional a caminho
  "professional_arrived", // Profissional chegou
  "diagnosing", // Diagnosticando
  "resolved", // Resolveu no local
  "escalated", // Não resolveu, escalada
  "tow_requested", // Guincho solicitado
  "tow_enroute", // Guincho a caminho
  "delivered", // Veículo entregue na oficina
  "completed", // Fluxo completo encerrado
  "cancelled_client", // Cancelado pelo cliente
  "cancelled_professional", // Cancelado pelo profissional
]);

export const serviceRequests = pgTable("service_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => users.id),
  vehicleId: uuid("vehicle_id")
    .notNull()
    .references(() => vehicles.id),
  professionalId: uuid("professional_id").references(() => professionals.id),
  problemType: problemTypeEnum("problem_type").notNull(),
  complexity: complexityEnum("complexity").notNull(),
  context: contextEnum("context").notNull(), // Detectado por GPS
  status: requestStatusEnum("status").notNull().default("pending"),
  // Localização do cliente no momento do pedido (lat/lng decimais)
  clientLatitude: decimal("client_latitude", { precision: 10, scale: 7 }).notNull(),
  clientLongitude: decimal("client_longitude", { precision: 10, scale: 7 }).notNull(),
  address: text("address"), // Endereço reverso-geocodificado
  // Triagem
  triageAnswers: jsonb("triage_answers"), // { "question1": "answer", ... }
  // Preço
  estimatedPrice: decimal("estimated_price", { precision: 10, scale: 2 }),
  finalPrice: decimal("final_price", { precision: 10, scale: 2 }),
  priceJustification: text("price_justification"), // Obrigatório se fora de ±25%
  diagnosticFee: decimal("diagnostic_fee", {
    precision: 10,
    scale: 2,
  }).notNull(),
  // Diagnóstico (preenchido pelo profissional)
  diagnosis: text("diagnosis"),
  diagnosisPhotoUrl: text("diagnosis_photo_url"),
  // Conclusão
  completionPhotoUrl: text("completion_photo_url"), // OBRIGATÓRIA para encerrar
  resolvedOnSite: boolean("resolved_on_site"),
  // Escalada
  escalationDestination: text("escalation_destination"), // workshop_id ou endereço
  // Cancelamento
  cancellationReason: text("cancellation_reason"),
  cancelledBy: varchar("cancelled_by", { length: 20 }), // "client" | "professional" | "system"
  cancelledAt: timestamp("cancelled_at"),
  // Timestamps
  matchedAt: timestamp("matched_at"),
  arrivedAt: timestamp("arrived_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

```typescript
// db/schema/payments.ts
export const paymentStatusEnum = pgEnum("payment_status", [
  "pending", // Aguardando pagamento
  "authorized", // Pré-autorizado (taxa diagnóstico)
  "captured", // Capturado (pagamento confirmado)
  "refunded", // Reembolsado
  "failed", // Falhou
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "pix",
  "credit_card",
  "debit_card",
]);

export const payments = pgTable("payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  serviceRequestId: uuid("service_request_id")
    .notNull()
    .references(() => serviceRequests.id),
  type: varchar("type", { length: 20 }).notNull(), // "diagnostic_fee" | "service" | "tow"
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  method: paymentMethodEnum("method").notNull(),
  status: paymentStatusEnum("status").notNull().default("pending"),
  gatewayId: varchar("gateway_id", { length: 255 }), // ID Mercado Pago
  gatewayStatus: varchar("gateway_status", { length: 50 }),
  // Split automático
  professionalAmount: decimal("professional_amount", {
    precision: 10,
    scale: 2,
  }),
  platformAmount: decimal("platform_amount", { precision: 10, scale: 2 }),
  // Webhook data
  webhookPayload: jsonb("webhook_payload"),
  paidAt: timestamp("paid_at"),
  refundedAt: timestamp("refunded_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

```typescript
// db/schema/reviews.ts
export const reviews = pgTable("reviews", {
  id: uuid("id").defaultRandom().primaryKey(),
  serviceRequestId: uuid("service_request_id")
    .notNull()
    .references(() => serviceRequests.id),
  fromUserId: uuid("from_user_id")
    .notNull()
    .references(() => users.id),
  toUserId: uuid("to_user_id")
    .notNull()
    .references(() => users.id),
  rating: integer("rating").notNull(), // 1-5
  tags: text("tags").array().default([]), // ["Rápido", "Honesto", "Equipado"]
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

```typescript
// db/schema/price-tables.ts
export const priceTables = pgTable("price_tables", {
  id: uuid("id").defaultRandom().primaryKey(),
  serviceType: problemTypeEnum("service_type").notNull(),
  vehicleType: vehicleTypeEnum("vehicle_type").notNull(),
  minPrice: decimal("min_price", { precision: 10, scale: 2 }).notNull(),
  maxPrice: decimal("max_price", { precision: 10, scale: 2 }).notNull(),
  region: varchar("region", { length: 100 }).default("national"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

```typescript
// db/schema/roadway-info.ts
// Bounds simplificados como decimais (detecção via bounding box)
// Para polígonos complexos, usar raw SQL com ST_Contains do PostGIS
export const roadwayInfo = pgTable("roadway_info", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(), // "SPVIAS", "Arteris", etc.
  phone: varchar("phone", { length: 20 }).notNull(),
  emergencyPhone: varchar("emergency_phone", { length: 20 }),
  boundsMinLat: decimal("bounds_min_lat", { precision: 10, scale: 7 }),
  boundsMaxLat: decimal("bounds_max_lat", { precision: 10, scale: 7 }),
  boundsMinLng: decimal("bounds_min_lng", { precision: 10, scale: 7 }),
  boundsMaxLng: decimal("bounds_max_lng", { precision: 10, scale: 7 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

---

## 5. REGRAS DE NEGÓCIO CODIFICÁVEIS

### 5.1 Fórmula de preço V3

```typescript
// modules/service-requests/pricing.service.ts

interface PriceCalculation {
  basePrice: number; // Média da tabela por serviço
  vehicleMultiplier: number; // car:1.0 | moto:0.85 | suv:1.15 | truck:2.0
  timeMultiplier: number; // dia:1.0 | noite(22h-6h):1.25 | feriado:1.20
  locationMultiplier: number; // urbano:1.0 | rodovia:1.15 | rural:1.30
  distanceMultiplier: number; // ≤5km:1.0 | 5-15km:1.10 | 15km+:1.25
}

// Preço = Base × Veículo × Horário × Local × Distância
// Margem profissional: ±25%. Se exceder → justificativa obrigatória

const VEHICLE_MULTIPLIERS = {
  car: 1.0,
  moto: 0.85,
  suv: 1.15,
  truck: 2.0,
};

const DIAGNOSTIC_FEES = {
  simple: { min: 30, max: 50 }, // Pneu, bateria, pane seca
  medium: { min: 50, max: 80 }, // Pane elétrica, superaquecimento
  complex: { min: 80, max: 120 }, // Motor, câmbio, outro
};

const PROBLEM_COMPLEXITY = {
  tire: "simple",
  battery: "simple",
  fuel: "simple",
  electric: "medium",
  overheat: "medium",
  other: "complex",
};

const PROFESSIONAL_MARGIN = 0.25; // ±25%
```

### 5.2 Política de cancelamento V3

```typescript
// Regras codificáveis:
const CANCELLATION_RULES = {
  // Cliente cancela em até 2 min → grátis, 100% devolvido
  client_under_2min: { refundPercent: 100, penalty: false },

  // Cliente cancela após 2 min (prof. já aceitou) → 30% retida
  client_over_2min: { refundPercent: 70, penalty: false },

  // Cliente cancela com prof. já a caminho → taxa integral retida
  client_enroute: { refundPercent: 0, penalty: false },

  // Profissional cancela após aceitar → busca outro + penalidade
  professional_cancel: {
    action: "auto_rematch",
    maxPerMonth: 2, // Máximo 2/mês
    thirdPenalty: "48h", // 3º = suspensão 48h
    repeatedPenalty: "7d", // Reincidência = 7 dias
  },

  // Profissional não chega no SLA → cliente cancela grátis
  professional_sla_miss: { refundPercent: 100, penalizeProfessional: true },

  // Ninguém aceita em 5 min → fila de espera, sem cobrança
  no_match: { chargeOnlyOnAccept: true },
};
```

### 5.3 SLA

```typescript
const SLA = {
  // Tempo para profissional aceitar (MVP: 3 min, escala: 2 min)
  acceptTimeout: 3 * 60 * 1000, // 3 minutos em ms

  // Tempo máximo de chegada
  arrivalTimeout: {
    urban: 30 * 60 * 1000, // 30 min
    highway: 60 * 60 * 1000, // 60 min
  },

  // Nota mínima para manter conta ativa
  minRating: 3.5,
  ratingWindow: 30, // Últimos 30 atendimentos

  // Foto obrigatória na conclusão
  requirePhotoOnCompletion: true, // Sem foto = não encerra
};
```

### 5.4 Comissão

```typescript
const COMMISSION = {
  // Primeiros 6 meses: 0% (atrair massa crítica)
  founderPeriodMonths: 6,
  founderRate: 0.0,

  // Após 6 meses: 10% fixo
  standardRate: 0.1,

  // Plano PRO (voluntário): 15%, mas com benefícios
  proRate: 0.15,
  proPriceMonthly: { min: 49, max: 99 },
};
```

---

## 6. CONTRATOS DE API (Rotas Principais)

### 6.1 Auth

```
POST   /api/v1/auth/register          # Registro (cliente ou profissional)
POST   /api/v1/auth/login              # Login (retorna access + refresh token)
POST   /api/v1/auth/refresh            # Refresh token
POST   /api/v1/auth/logout             # Invalida refresh token
POST   /api/v1/auth/forgot-password    # Envia link de reset
POST   /api/v1/auth/reset-password     # Reset com token
```

### 6.2 Users & Vehicles

```
GET    /api/v1/users/me                # Perfil do usuário logado
PATCH  /api/v1/users/me                # Atualizar perfil
POST   /api/v1/users/me/avatar         # Upload avatar (presigned URL)
GET    /api/v1/vehicles                # Listar veículos do cliente
POST   /api/v1/vehicles                # Cadastrar veículo
PATCH  /api/v1/vehicles/:id            # Atualizar veículo
DELETE /api/v1/vehicles/:id            # Remover veículo
```

### 6.3 Professionals

```
GET    /api/v1/professionals/me         # Perfil do profissional logado
PATCH  /api/v1/professionals/me         # Atualizar perfil/especialidades
POST   /api/v1/professionals/me/online  # Ficar online
POST   /api/v1/professionals/me/offline # Ficar offline
PATCH  /api/v1/professionals/me/location# Atualizar GPS (chamado a cada 10s)
GET    /api/v1/professionals/me/stats   # Estatísticas (ganhos, nota, aceite)
GET    /api/v1/professionals/me/earnings# Ganhos detalhados por período
```

### 6.4 Service Requests (Core)

```
POST   /api/v1/service-requests                  # Cliente solicita socorro
GET    /api/v1/service-requests/:id               # Detalhes do pedido
PATCH  /api/v1/service-requests/:id/cancel        # Cancelar (aplica regras V3)
POST   /api/v1/service-requests/:id/accept        # Profissional aceita
POST   /api/v1/service-requests/:id/arrived       # Profissional chegou (GPS valida)
POST   /api/v1/service-requests/:id/diagnosis     # Resultado do diagnóstico
POST   /api/v1/service-requests/:id/resolve       # Marcou como resolvido + preço final
POST   /api/v1/service-requests/:id/escalate      # Não resolveu → escalada
POST   /api/v1/service-requests/:id/approve-price # Cliente aprova preço
POST   /api/v1/service-requests/:id/contest-price # Cliente contesta preço
POST   /api/v1/service-requests/:id/complete       # Encerra (requer foto)
GET    /api/v1/service-requests/:id/tracking       # Dados de tracking para polling fallback
```

### 6.5 Payments

```
POST   /api/v1/payments/create-diagnostic     # Pré-pagamento taxa diagnóstico
POST   /api/v1/payments/create-service        # Pagamento do serviço
POST   /api/v1/payments/webhook/mercadopago   # Webhook Mercado Pago (HMAC)
GET    /api/v1/payments/:id                   # Status do pagamento
```

### 6.6 Reviews

```
POST   /api/v1/reviews                 # Criar avaliação (bilateral)
GET    /api/v1/reviews/professional/:id # Avaliações de um profissional
```

### 6.7 Uploads

```
POST   /api/v1/uploads/presigned-url   # Gerar presigned URL para R2
```

### 6.8 Socket.IO Events

```
// Client → Server
socket.emit("join_request", { requestId })       // Entrar na room do atendimento
socket.emit("update_location", { lat, lng })      // Profissional envia GPS

// Server → Client
socket.emit("professional_location", { lat, lng, eta }) // Posição do profissional
socket.emit("status_update", { status, data })           // Mudança de status
socket.emit("new_request", {                             // Push para profissional (novo chamado)
  requestId: string,      // ID do pedido de serviço
  problemType: string,   // tipo do problema (battery, tire, etc)
  estimatedPrice: number,// preço estimado
  distanceMeters: number,// distância em metros
  clientLatitude: string,// latitude do cliente
  clientLongitude: string // longitude do cliente
})
socket.emit("request_cancelled", { reason })             // Cancelamento
socket.emit("queue_update", { position, estimatedWait }) // Atualização da fila

// Rooms do Socket.IO
// Profissional: entra no room "professional:{userId}" ao conectar (JWT)
// Cliente: entra no room "request:{requestId}" ao criar pedido
```

---

## 7. ROADMAP TÉCNICO POR SPRINT

### Sprint 1 (Semana 1-2): Foundation

**Objetivo**: Projeto rodando com auth funcional.

```
□ Setup Turborepo monorepo (apps/api, apps/cliente, apps/pro, packages/shared)
□ Docker Compose (PostgreSQL 16 + PostGIS 3.4 + Redis 7)
□ Configurar Drizzle ORM + drizzle-kit
□ Schema do banco (todas as tabelas acima) + migration inicial
□ Hono app base com middleware (logger, error-handler, CORS, rate-limit)
□ Módulo auth completo:
  □ POST /register (validação Zod, hash Argon2, gera JWT)
  □ POST /login (verifica credenciais, gera access+refresh)
  □ POST /refresh (valida refresh, gera novo par)
  □ Middleware authMiddleware (valida JWT em rotas protegidas)
□ env.ts com validação Zod de todas as env vars
□ Scalar UI em /docs funcionando
□ Expo projeto base com Expo Router 4
□ Tela de login conectada à API
□ TanStack Query configurado
□ MMKV para tokens
```

### Sprint 2 (Semana 3-4): Core CRUD

**Objetivo**: Cliente cadastra veículo, seleciona problema, vê estimativa.

```
□ Módulo users (GET/PATCH /me, upload avatar)
□ Módulo vehicles (CRUD completo com validação de placa)
□ Módulo professionals (perfil, especialidades, horário, raio)
□ Módulo service-requests parcial:
  □ POST /service-requests (cria pedido, calcula estimativa)
  □ pricing.service.ts (fórmula V3 implementada)
  □ Detecção urban/highway por GPS (query PostGIS roadway_info)
□ Seed da tabela price_tables com dados do PRD V3
□ Seed da tabela roadway_info (SPVIAS, Arteris etc.)
□ Mobile: telas de cadastro, seleção veículo, seleção problema, estimativa
```

### Sprint 3 (Semana 5-6): Matching + Real-time

**Objetivo**: Profissional recebe chamado, aceita, cliente vê tracking.

```
□ Módulo matching:
  □ BullMQ queue + worker
  □ Query PostGIS: profissionais dentro do raio, tipo veículo, online, horário
  □ FCM push para profissionais compatíveis
  □ Timeout 3 min → fila de espera
□ Módulo tracking:
  □ Socket.IO server com Redis adapter
  □ Rooms por serviceRequest.id
  □ Professional emite GPS → client recebe em real-time
□ Endpoints de fluxo:
  □ POST /accept (profissional aceita)
  □ POST /arrived (GPS valida proximidade)
  □ POST /diagnosis (resultado do diagnóstico)
  □ POST /resolve (preço final + foto)
  □ POST /escalate (não resolveu)
  □ POST /approve-price (cliente aprova)
  □ POST /complete (encerra com foto obrigatória)
□ Política de cancelamento implementada (6 cenários)
□ Mobile: telas de busca, encontrado, tracking, atendimento
```

### Sprint 4 (Semana 7-8): Pagamentos + Reviews

**Objetivo**: Fluxo completo de pagamento e avaliação.

```
□ Módulo payments:
  □ Integração Mercado Pago sandbox
  □ Pré-autorização (taxa diagnóstico)
  □ Captura (serviço concluído)
  □ Split automático (profissional + plataforma)
  □ Webhook com validação HMAC
  □ Reembolso automático (SLA miss)
□ Módulo reviews:
  □ Avaliação bilateral (cliente ↔ profissional)
  □ Tags enriquecidas
  □ Cálculo de média ponderada
  □ Suspensão automática se nota < 3.5
□ Módulo uploads:
  □ Presigned URL generation (Cloudflare R2)
  □ Validação de tipo (só imagem) e tamanho (max 10MB)
□ Mobile: telas de pagamento, avaliação, concluído
```

### Sprint 5 (Semana 9-10): Polish + Pro App

**Objetivo**: App do profissional completo, testes, deploy.

```
□ App MechaGo Pro completo:
  □ Dashboard com stats
  □ Receber chamado com countdown
  □ Navegação (mapa para o cliente)
  □ Tela de diagnóstico
  □ Serviço resolvido (preço + foto)
  □ Não resolvido (escalada + destino)
  □ Ganhos, Histórico, Perfil
□ Fila de espera inteligente (UI + backend)
□ Modo acompanhante (compartilhar localização)
□ Notificação de proximidade para profissionais
□ Testes de integração dos fluxos críticos
□ Deploy Railway (API) + build Expo (EAS)
□ Seed de dados para demo
```

### Sprint 6 (Semana 11-12): Beta

```
□ Testes end-to-end do fluxo completo
□ Onboarding do primeiro profissional (pai do Allan)
□ Ajustes de UX baseados em feedback
□ Monitoramento (health checks, logs, alertas)
□ Landing page em mechago.com.br
□ Termos de uso + política de privacidade (LGPD)
□ Submissão para App Store + Google Play (EAS Submit)
□ Beta fechado com 20 profissionais
```

---

## 8. VARIÁVEIS DE AMBIENTE

```bash
# .env (validado por env.ts com Zod)

# Servidor
NODE_ENV=development
PORT=3000
API_URL=http://localhost:3000

# Banco
DATABASE_URL=postgresql://mechago:mechago_dev_2026@localhost:5433/mechago

# Redis
REDIS_URL=redis://localhost:6379

# Auth
JWT_SECRET=<random-64-chars>
JWT_REFRESH_SECRET=<random-64-chars>
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Mercado Pago
MERCADOPAGO_ACCESS_TOKEN=<sandbox-token>
MERCADOPAGO_WEBHOOK_SECRET=<hmac-secret>

# Cloudflare R2
R2_ACCOUNT_ID=<account-id>
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=<key-id>
R2_SECRET_ACCESS_KEY=<secret>
R2_BUCKET_NAME=mechago-uploads
R2_PUBLIC_URL=https://uploads.mechago.com.br

# Firebase (FCM)
FIREBASE_PROJECT_ID=<project-id>
FIREBASE_PRIVATE_KEY=<private-key>
FIREBASE_CLIENT_EMAIL=<client-email>

# App
FOUNDER_PERIOD_MONTHS=6
STANDARD_COMMISSION_RATE=0.10
MAX_ACCEPT_TIMEOUT_MS=180000
MAX_VEHICLES_PER_USER=5
```

---

## 9. DOCKER COMPOSE (DEV LOCAL)

```yaml
# docker-compose.yml
# NOTA: version removido (obsoleto em Docker Compose v2+)
services:
  postgres:
    image: postgis/postgis:16-3.4
    container_name: mechago-db
    environment:
      POSTGRES_DB: mechago
      POSTGRES_USER: mechago
      POSTGRES_PASSWORD: mechago_dev_2026
    ports:
      - "5433:5432"  # Porta 5433 para evitar conflito com Postgres local
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U mechago"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: mechago-redis
    ports:
      - "6379:6379"
    volumes:
      - redisdata:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
  redisdata:
```

---

## 10. DESIGN SYSTEM V4 — TOKENS PARA MOBILE

```typescript
// packages/shared/src/design-tokens.ts

export const colors = {
  bg: "#0e0e0e",
  surfaceLow: "#131313",
  surface: "#1a1919",
  surfaceHigh: "#201f1f",
  surfaceHighest: "#262626",
  primary: "#ffe484",
  primaryContainer: "#fdd404",
  onPrimary: "#635200",
  onPrimaryContainer: "#594a00",
  tertiary: "#f6ffc2",
  tertiaryDim: "#d6ee67",
  tertiaryContainer: "#dff66e",
  onTertiaryContainer: "#4f5d00",
  secondary: "#f3e651",
  error: "#ff7351",
  errorDim: "#d53d18",
  errorContainer: "#b92902",
  onError: "#450900",
  onErrorContainer: "#ffd2c8",
  outline: "#494847",
  outlineLight: "#777575",
  onSurface: "#ffffff",
  onSurfaceVariant: "#adaaaa",
} as const;

export const fonts = {
  headline: "SpaceGrotesk", // Peso: 700-900, italic nos destaques
  body: "PlusJakartaSans", // Peso: 400-700
  mono: "JetBrainsMono", // Peso: 500 (preços, timers, placas)
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
} as const;
```

---

## 11. DADOS DE SEED (SOMENTE PARA DESENVOLVIMENTO E TESTES)

> **ATENÇÃO**: Estes dados existem APENAS em dois contextos:
>
> 1. **Testes automatizados** (Vitest) — dados previsíveis para assertions
> 2. **Seeds de dev local** (`npm run db:seed`) — para ter dados no banco local
>
> Em **produção**: ZERO dados fake. Todo dado vem do usuário real.
> A aplicação NUNCA deve exibir dados mockados. Se um campo não tem dado real, exibe estado vazio.

```typescript
// packages/shared/src/test-fixtures.ts
// APENAS para importar em *.test.ts e scripts/seed.ts
export const TEST_FIXTURES = {
  professional: {
    name: "Carlos Silva",
    email: "carlos@test.dev",
    phone: "(11) 99999-8888",
    cpfCnpj: "123.456.789-00",
    password: "TestSenha123",
    rating: "4.80",
    totalJobs: 127,
    type: "mechanic_workshop",
    workshop: "Auto Mecânica Silva",
    specialties: ["car_general", "electronic_injection"],
    vehicleTypes: ["car", "suv"],
  },
  client: {
    name: "Allan",
    email: "allan@test.dev",
    phone: "(11) 98888-7777",
    cpfCnpj: "987.654.321-00",
    password: "TestSenha456",
  },
  vehicle: {
    model: "Honda Civic 2019",
    plate: "ABC-1234",
    type: "car",
    brand: "Honda",
    year: 2019,
    color: "Prata",
  },
  service: {
    problem: "battery",
    complexity: "simple",
    diagnosticFee: 35,
    finalPrice: 95,
    context: "urban",
  },
};
```

---

## 12. MOBILE / FRONTEND — MAPA COMPLETO DE TELAS

> **Esta seção conecta cada tela do app ao endpoint da API, ao componente visual,
> e ao hook de dados. É a referência para a IA da IDE gerar o frontend.**

### 12.1 Estrutura de pastas — App MechaGo (Cliente)

```
apps/cliente/                          # Projeto Expo independente — APK "MechaGo"
├── app/
│   ├── _layout.tsx                    # Root layout (providers: QueryClient, Zustand)
│   ├── index.tsx                      # Bootstrap / redirect inicial
│   ├── +not-found.tsx
│   │
│   ├── (auth)/                        # Grupo: telas sem autenticação
│   │   ├── _layout.tsx                # Stack navigator
│   │   ├── login.tsx                  # C02
│   │   ├── register.tsx               # C03
│   │   └── register-vehicle.tsx       # C04
│   │
│   ├── (tabs)/                        # Grupo: tabs principais
│   │   ├── _layout.tsx                # Tab navigator (SOS | Veículos | Histórico | Perfil)
│   │   ├── index.tsx                  # C05 — Home / SOS
│   │   ├── vehicles.tsx               # Lista de veículos
│   │   ├── history.tsx                # Histórico de atendimentos
│   │   └── profile.tsx                # Perfil do cliente
│   │
│   └── (service-flow)/                # Grupo: fluxo de socorro (stack)
│       ├── _layout.tsx                # Stack navigator (sem tabs)
│       ├── select-vehicle.tsx         # C06 parte 1
│       ├── select-problem.tsx         # C06 parte 2
│       ├── triage.tsx                 # C07
│       ├── estimate.tsx               # C08
│       ├── searching.tsx              # C09
│       ├── professional-found.tsx     # C10
│       ├── tracking.tsx               # C11
│       ├── service-active.tsx         # C12
│       ├── price-approval.tsx         # C13
│       ├── rating.tsx                 # C14
│       ├── escalation.tsx             # C15
│       └── completed.tsx              # C16
│
├── src/
│   ├── components/
│   │   └── ui/                        # Componentes base DS V4 (cliente)
│   ├── hooks/
│   │   ├── queries/
│   │   └── useAuth.ts
│   ├── stores/
│   │   └── auth.store.ts
│   └── lib/
│       ├── api.ts
│       ├── storage.ts
│       └── query-client.ts
├── hooks/                             # Legado transitório; novo código não nasce aqui
│   └── queries/
├── assets/
├── e2e/
├── android/
├── app.json                           # name: "MechaGo", scheme: "mechago"
├── package.json                       # name: "@mechago/cliente"
└── tsconfig.json
```

### 12.1.2 Estrutura de pastas — App MechaGo Pro (Profissional)

```
apps/pro/                              # Projeto Expo independente — APK "MechaGo Pro"
├── app/
│   ├── _layout.tsx                    # Root layout (providers: QueryClient, Zustand)
│   ├── index.tsx                      # Bootstrap / redirect inicial
│   │
│   ├── (auth)/                        # Grupo: telas sem autenticação
│   │   ├── _layout.tsx
│   │   ├── login.tsx                  # P02
│   │   └── register.tsx               # Bootstrap atual de cadastro
│   │
│   ├── (onboarding)/                  # Fluxo atual de onboarding do profissional
│   │   ├── _layout.tsx
│   │   ├── professional-type.tsx      # P04 (tipo)
│   │   ├── specialty.tsx              # P05 (especialidades)
│   │   ├── service-area.tsx           # P06 (área/disponibilidade)
│   │   └── review.tsx                 # Revisão final
│   │
│   ├── (tabs)/                        # Grupo: tabs principais
│   │   ├── _layout.tsx                # Tab navigator (Início | Chamados | Histórico | Perfil)
│   │   ├── index.tsx                  # P07 — Dashboard
│   │   ├── orders.tsx                 # Chamados / fila atual
│   │   ├── history.tsx                # P14 — Histórico
│   │   └── profile.tsx                # P15 — Perfil
│
├── src/
│   ├── components/
│   │   └── ui/                        # Componentes base DS V4 (pro)
│   ├── hooks/
│   │   ├── queries/
│   │   └── useAuth.ts
│   ├── stores/
│   │   ├── auth.store.ts
│   │   └── onboarding.store.ts
│   └── lib/
│       ├── api.ts
│       ├── storage.ts
│       └── query-client.ts
├── assets/
├── e2e/
├── app.json                           # name: "MechaGo Pro", scheme: "mechagopro"
├── package.json                       # name: "@mechago/pro"
└── tsconfig.json
```

### 12.1.3 Pacote compartilhado

```
packages/shared/                       # Compartilhado entre cliente, pro, e API
├── src/
│   ├── types/                         # Types TypeScript (ex: ServiceRequest, Vehicle)
│   ├── constants/                     # Constantes de negócio (multiplicadores, SLA, etc.)
│   ├── design-tokens.ts               # Cores, fontes, espaçamentos do DS V4
│   └── test-fixtures.ts               # Dados de seed (APENAS para testes e dev)
├── package.json                       # name: "@mechago/shared"
└── tsconfig.json
```

> **Componentes compartilhados**: Se Button, Card, Input são idênticos nos dois apps,
> extrair para `packages/ui/` no futuro. No MVP, duplicar é aceitável (YAGNI — Akita XP).
> Quando a duplicação se tornar custo de manutenção, refatorar.

### 12.2 Mapa de Telas → Endpoints → Componentes

> **Nota operacional**: o mapa abaixo combina estado atual do repositório com estrutura alvo do produto.
> Antes de editar qualquer tela, a IA DEVE confirmar se o arquivo já existe no repo.
> Se não existir, criar incrementalmente na estrutura real vigente do app, sem assumir arquivos inexistentes como se já estivessem implementados.
> Hooks e contratos já existentes em `packages/shared` e `src/hooks/queries/` devem ser tratados como baseline; não recriar versões paralelas sem necessidade arquitetural explícita.

#### App Cliente (apps/cliente/)

| Tela                        | Arquivo (apps/cliente/app/)             | Endpoints usados                           | Componentes visuais                                | Hook de dados                           |
| --------------------------- | --------------------------------------- | ------------------------------------------ | -------------------------------------------------- | --------------------------------------- |
| C01 Splash                  | `_layout.tsx` (auto)                    | —                                          | LogoPin, LoadingSpinner                            | —                                       |
| C02 Login                   | `(auth)/login.tsx`                      | `POST /auth/login`                         | Input, Button, LogoPin                             | `useAuth.login`                         |
| C03 Cadastro                | `(auth)/register.tsx`                   | `POST /auth/register`                      | Input, Button                                      | `useAuth.register`                      |
| C04 Cadastro Veículo        | `(auth)/register-vehicle.tsx`           | `POST /vehicles`                           | Input, Button, Card                                | `useVehicles.create`                    |
| C05 Home                    | `(tabs)/index.tsx`                      | `GET /users/me`, `GET /vehicles`           | TopBar, BottomNavCliente, VehicleCard, Button(SOS) | `useUser`, `useVehicles`                |
| C06 Seleção Veículo         | `(service-flow)/select-vehicle.tsx`     | `GET /vehicles`                            | VehicleCard, Card                                  | `useVehicles.list`                      |
| C06 Seleção Problema        | `(service-flow)/select-problem.tsx`     | — (dados locais)                           | Card, SectionLabel                                 | —                                       |
| C07 Triagem                 | `(service-flow)/triage.tsx`             | — (dados locais)                           | Card, Button                                       | —                                       |
| C08 Estimativa              | `(service-flow)/estimate.tsx`           | `POST /service-requests`                   | PriceBreakdown, Button                             | `useServiceRequest.create`              |
| C09 Buscando                | `(service-flow)/searching.tsx`          | `GET /service-requests/:id`                | LogoPin(animado), StatusPill                       | `useServiceRequest.detail` (polling 3s) |
| C10 Profissional Encontrado | `(service-flow)/professional-found.tsx` | `GET /service-requests/:id`                | ProfessionalCard, Button                           | `useServiceRequest.detail`              |
| C11 Tracking                | `(service-flow)/tracking.tsx`           | Socket.IO `professional_location`          | MapView, ProfessionalCard                          | `useSocket`, `useServiceRequest.detail` |
| C12 Atendimento             | `(service-flow)/service-active.tsx`     | `GET /service-requests/:id`                | StatusPill, ProfessionalCard                       | `useServiceRequest.detail` (polling)    |
| C13 Aprovação Preço         | `(service-flow)/price-approval.tsx`     | `POST /service-requests/:id/approve-price` | PriceBreakdown, Button                             | `useServiceRequest.approvePrice`        |
| C14 Avaliação               | `(service-flow)/rating.tsx`             | `POST /reviews`                            | StarRating, Button                                 | `useReviews.create`                     |
| C15 Escalada                | `(service-flow)/escalation.tsx`         | `GET /service-requests/:id`                | Card, MapView                                      | `useServiceRequest.detail`              |
| C16 Concluído               | `(service-flow)/completed.tsx`          | `GET /service-requests/:id`                | StatusPill, Card, Button                           | `useServiceRequest.detail`              |

#### App Profissional (apps/pro/)

| Tela                   | Arquivo (apps/pro/app/)                | Endpoints usados                                             | Componentes visuais                | Hook de dados                           |
| ---------------------- | -------------------------------------- | ------------------------------------------------------------ | ---------------------------------- | --------------------------------------- |
| P07 Dashboard          | `(tabs)/index.tsx`                     | `GET /professionals/me/stats`                                | TopBarPro, BottomNavPro, StatsCard | `useProfessional.stats`                 |
| P08 Novo Chamado       | `(service-flow)/new-request.tsx`       | Socket.IO `new_request`, `POST /service-requests/:id/accept` | RequestCard, MapView, Button       | `useSocket`, `useServiceRequest.accept` |
| P09 Navegação          | `(service-flow)/navigation.tsx`        | Socket.IO `update_location`                                  | MapView(fullscreen)                | `useSocket`, `useLocation`              |
| P10 Diagnóstico        | `(service-flow)/diagnosis.tsx`         | `POST /service-requests/:id/diagnosis`                       | DiagnosisForm, Camera, Button      | `useServiceRequest.diagnosis`           |
| P11 Resolvido          | `(service-flow)/service-resolved.tsx`  | `POST /service-requests/:id/resolve`                         | Input(preço), Camera, Button       | `useServiceRequest.resolve`             |
| P12 Escalada           | `(service-flow)/escalation.tsx`        | `POST /service-requests/:id/escalate`                        | Card, MapView, Button              | `useServiceRequest.escalate`            |
| P13 Ganhos             | `(tabs)/earnings.tsx`                  | `GET /professionals/me/earnings`                             | EarningsChart, RequestCard         | `useProfessional.earnings`              |
| P14 Histórico          | `(tabs)/history.tsx`                   | `GET /service-requests?role=professional`                    | RequestCard(lista)                 | `useServiceRequest.listPro`             |
| P15 Perfil             | `(tabs)/profile.tsx`                   | `GET /professionals/me`, `PATCH /professionals/me`           | Card, Input, Button                | `useProfessional.me`                    |
| P16 Concluído          | `(service-flow)/service-completed.tsx` | `GET /service-requests/:id`                                  | StatusPill, Card                   | `useServiceRequest.detail`              |
| P18 Avaliação Recebida | `(service-flow)/review-received.tsx`   | `GET /reviews/professional/:id`                              | StarRating, Card                   | `useReviews.listForPro`                 |

### 12.3 Design System V4 — Regras de Implementação Mobile

```typescript
// Toda tela DEVE importar tokens de:
import { colors, fonts, spacing, radii } from "@mechago/shared/design-tokens";

// Toda tela DEVE ter:
// 1. SafeAreaView como container raiz
// 2. TopBar no topo (exceto telas fullscreen como tracking)
// 3. BottomNav no bottom (exceto telas do service-flow)
// 4. Background = colors.bg (#0e0e0e)
// 5. Padding horizontal = spacing.xl (20px)

// Toda tela DEVE respeitar:
// - Touch targets mínimo 44×44px
// - Texto mínimo 14px
// - Contraste 4.5:1
// - Loading states em botões async
// - Empty states quando lista vazia
// - Error states quando API falha
```

### 12.3.1 Regras de componente — UI/UX Pro Max

```
ÍCONES (CRITICAL):
✅ USAR: Material Symbols (Google) ou Lucide React Native
❌ PROIBIDO: Emojis como ícones de UI (🔧 ⚡ 🚗 são para design mockup, NÃO para produção)
✅ Tamanho: 24px padrão, 20px compacto, 28px destaque
✅ Filled para ativo, Outlined para inativo
✅ Um único pacote em todo o app (@expo/vector-icons)

BOTÕES:
✅ Mínimo 44×44px de touch target (mesmo que o botão visual seja menor)
✅ hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} se botão for pequeno
✅ disabled={true} + opacity 0.5 durante loading
✅ ActivityIndicator dentro do botão durante async (não substituir texto)
✅ Pressable com feedback: opacity 0.7 ou scale 0.97

INPUTS:
✅ Sempre dentro de KeyboardAvoidingView
✅ Label acima do campo (accessibilityLabel obrigatório)
✅ Mensagem de erro abaixo do campo em colors.error
✅ autoCapitalize, keyboardType, textContentType corretos para cada campo
✅ returnKeyType="next" para navegar entre campos, "done" no último
✅ secureTextEntry para senhas (com toggle de visibilidade)

LISTAS:
✅ FlatList (não ScrollView + map) para listas dinâmicas
✅ keyExtractor obrigatório
✅ ListEmptyComponent para estado vazio
✅ Skeleton loading enquanto carrega (não spinner genérico)
✅ Pull-to-refresh (onRefresh + refreshing)

FORMATAÇÃO PT-BR:
✅ Moeda: "R$ 95,00" (vírgula como decimal, ponto como milhar)
✅ Data: "22 mar 2026" ou "22/03/2026"
✅ Telefone: "(11) 99999-8888"
✅ CPF: mascarado "***.***.789-00" em exibição
✅ Placa: "ABC-1234"
```

### 12.3.2 Regras de refatoração — Akita XP Pair

```
Ao implementar telas, a IA DEVE refatorar PROATIVAMENTE:

1. Componente aparece em 2+ telas? → Extrair para src/components/ui/ ou src/components/
   Exemplos comuns: ProfessionalCard, VehicleCard, PriceBreakdown, StarRating

2. Estilo repetido em 3+ lugares? → Extrair para um StyleSheet compartilhado
   ou criar componente wrapper (ex: SurfaceCard, GlassCard)

3. Hook com lógica duplicada? → Extrair para hooks/ com nome descritivo

4. Arquivo com 200+ linhas? → Quebrar em subcomponentes

5. O momento de refatorar é AGORA — não "na próxima sprint"
```

### 12.4 Referência Visual — Arquivos de Design Stitch (FONTE DA VERDADE VISUAL)

> **REGRA ABSOLUTA**: Toda tela implementada em React Native DEVE ser 100% fiel ao design
> dos arquivos Stitch listados abaixo. A IA DEVE abrir o arquivo de design correspondente
> ANTES de implementar qualquer tela. Cores, espaçamentos, hierarquia, tipografia, ícones,
> layout — tudo deve seguir o design fielmente. Zero liberdade criativa na implementação.

#### Localização dos arquivos de design

```
MechaGro-FrontEnd/
├── MechaGo (App do Cliente)/
│   └── DesignCliente/              ← Design de TODAS as telas do cliente
│       ├── splash_onboarding_mechago/
│       ├── login_mechago/
│       ├── cadastro_cliente_mechago/
│       ├── adicionar_ve_culo_mechago/
│       ├── home_sos_mechago/
│       ├── sele_o_de_ve_culo_e_problema/
│       ├── triagem_r_pida_mechago/
│       ├── estimativa_e_checkout_mechago/
│       ├── buscando_profissionais_mechago/
│       ├── profissional_encontrado_mechago/
│       ├── tracking_profissional_mechago/
│       ├── atendimento_em_andamento_mechago/
│       ├── aprova_o_de_pre_o_mechago/
│       ├── avalia_o_mechago/
│       ├── escalada_e_guincho_mechago/
│       └── mechago_noir/                    ← Design System reference
│
└── MechaGo Pro (App do Profissional)/
    └── DesignPro/                  ← Design de TODAS as telas do profissional
        ├── splash_mechago_pro/
        ├── login_mechago_pro/
        ├── cadastro_pro_dados_1_4/
        ├── cadastro_pro_tipo_2_4/
        ├── cadastro_pro_especialidades_3_4/
        ├── cadastro_pro_disponibilidade_4_4/
        ├── dashboard_mechago_pro/
        ├── novo_chamado_pro/
        ├── navega_o_pro_mechago/
        ├── atendimento_e_diagn_stico_pro/
        ├── servi_o_resolvido_pro/
        ├── n_o_resolvido_escalada_pro/
        ├── servi_o_conclu_do_mechago/
        └── mechago_noir/                    ← Design System reference PRO
```

#### Mapa: Tela → Arquivo de Design

**App Cliente**

| Tela            | Código                                  | Arquivo de design (abrir ANTES de implementar)    |
| --------------- | --------------------------------------- | ------------------------------------------------- |
| C01 Splash      | `(auth)/` auto                          | `DesignCliente/splash_onboarding_mechago/`        |
| C02 Login       | `(auth)/login.tsx`                      | `DesignCliente/login_mechago/`                    |
| C03 Cadastro    | `(auth)/register.tsx`                   | `DesignCliente/cadastro_cliente_mechago/`         |
| C04 Add Veículo | `(auth)/register-vehicle.tsx`           | `DesignCliente/adicionar_ve_culo_mechago/`        |
| C05 Home SOS    | `(tabs)/index.tsx`                      | `DesignCliente/home_sos_mechago/`                 |
| C06 Seleção     | `(service-flow)/select-*.tsx`           | `DesignCliente/sele_o_de_ve_culo_e_problema/`     |
| C07 Triagem     | `(service-flow)/triage.tsx`             | `DesignCliente/triagem_r_pida_mechago/`           |
| C08 Estimativa  | `(service-flow)/estimate.tsx`           | `DesignCliente/estimativa_e_checkout_mechago/`    |
| C09 Buscando    | `(service-flow)/searching.tsx`          | `DesignCliente/buscando_profissionais_mechago/`   |
| C10 Encontrado  | `(service-flow)/professional-found.tsx` | `DesignCliente/profissional_encontrado_mechago/`  |
| C11 Tracking    | `(service-flow)/tracking.tsx`           | `DesignCliente/tracking_profissional_mechago/`    |
| C12 Atendimento | `(service-flow)/service-active.tsx`     | `DesignCliente/atendimento_em_andamento_mechago/` |
| C13 Aprovação   | `(service-flow)/price-approval.tsx`     | `DesignCliente/aprova_o_de_pre_o_mechago/`        |
| C14 Avaliação   | `(service-flow)/rating.tsx`             | `DesignCliente/avalia_o_mechago/`                 |
| C15 Escalada    | `(service-flow)/escalation.tsx`         | `DesignCliente/escalada_e_guincho_mechago/`       |
| C16 Concluído   | `(service-flow)/completed.tsx`          | `DesignCliente/servi_o_conclu_do_mechago/`        |
| DS Reference    | —                                       | `DesignCliente/mechago_noir/`                     |

**App Profissional**

| Tela             | Código                            | Arquivo de design (abrir ANTES de implementar) |
| ---------------- | --------------------------------- | ---------------------------------------------- |
| P01 Splash       | `index.tsx`                       | `DesignPro/splash_mechago_pro/`                |
| P02 Login        | `(auth)/login.tsx`                | `DesignPro/login_mechago_pro/`                 |
| P03 Cadastro 1/4 | `(auth)/register.tsx`             | `DesignPro/cadastro_pro_dados_1_4/`            |
| P04 Cadastro 2/4 | `(onboarding)/professional-type.tsx` | `DesignPro/cadastro_pro_tipo_2_4/`          |
| P05 Cadastro 3/4 | `(onboarding)/specialty.tsx`      | `DesignPro/cadastro_pro_especialidades_3_4/`   |
| P06 Cadastro 4/4 | `(onboarding)/service-area.tsx`   | `DesignPro/cadastro_pro_disponibilidade_4_4/`  |
| P07 Dashboard    | `(tabs)/index.tsx`                | `DesignPro/dashboard_mechago_pro/`             |
| P08 Novo Chamado | `(service-flow)/new-request.tsx`  | `DesignPro/novo_chamado_pro/`                  |
| P09 Navegação    | `(service-flow)/navigation.tsx`   | `DesignPro/navega_o_pro_mechago/`              |
| P10 Diagnóstico  | `(service-flow)/diagnosis.tsx`    | `DesignPro/atendimento_e_diagn_stico_pro/`     |
| P11 Resolvido    | `(service-flow)/service-resolved.tsx` | `DesignPro/servi_o_resolvido_pro/`         |
| P12 Escalada     | `(service-flow)/escalation.tsx`   | `DesignPro/n_o_resolvido_escalada_pro/`        |
| P16 Concluído    | `(service-flow)/service-completed.tsx` | `DesignPro/servi_o_conclu_do_mechago/`     |
| DS Reference     | —                                 | `DesignPro/mechago_noir/`                      |

---

> **NOTA PARA A IA**: Este documento é a fonte da verdade do projeto MechaGo. Quando gerar código, siga EXATAMENTE a estrutura de pastas, padrões de módulo (schemas → routes → service → repository), nomenclatura, e regras de negócio aqui definidas. Todo input deve ser validado com Zod. Todo erro deve usar AppError. Todo SQL deve ser via Drizzle. Comentários em PT-BR. Para frontend, cada tela tem seu endpoint, componente e hook mapeados na seção 12 — seguir exatamente.
