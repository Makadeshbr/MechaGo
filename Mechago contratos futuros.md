# MechaGo — Contratos Futuros (Blueprint de Implementação Pós-Beta)

> **Propósito**: Especificações técnicas COMPLETAS de tudo que será implementado após o beta.
> Quando a sprint chegar, a IA copia daqui e implementa. Nenhuma decisão técnica fica "para depois".
>
> **ATENÇÃO**: Este documento é um BLUEPRINT, não código em produção. As tabelas e endpoints aqui
> NÃO devem ser criados no banco até a sprint correspondente. O motivo: feedback do beta pode
> alterar requisitos. Quando a sprint chegar, validar este blueprint contra os dados reais antes
> de implementar.
>
> **Versão**: 1.1 — Março 2026

---

## REGRAS DE IMPLEMENTAÇÃO DE CONTRATOS

> Ao implementar qualquer contrato deste documento, a IA DEVE seguir estas regras:
>
> **1. Backend + Frontend JUNTOS**: Cada contrato tem seções BACKEND e FRONTEND.
> Implementar ambos na mesma entrega. Nunca só backend, nunca só frontend.
>
> **2. Design Stitch**: Se o contrato afeta uma tela existente (ex: adicionar botão de login social
> na tela de login), ABRIR o design Stitch correspondente em
> `MechaGro-FrontEnd/MechaGo (App do Cliente)/DesignCliente/` ou
> `MechaGro-FrontEnd/MechaGo Pro (App do Profissional)/DesignPro/`
> e manter fidelidade visual. Se for tela NOVA sem design Stitch, seguir DS V4 Stitch Fusion.
>
> **3. TDD (Akita XP)**: Teste primeiro, código depois. Service.test.ts antes do service.ts.
>
> **4. Qualidade visual (UI/UX Pro Max)**: Checklist de pré-entrega em toda tela. Ver RULES.md 7.7.
>
> **5. Zero dados mock**: Tudo vem da API. Dados de teste APENAS em \*.test.ts e scripts/seed.ts.

---

## ÍNDICE DE CONTRATOS

| ID  | Contrato                        | Sprint | Status           |
| --- | ------------------------------- | ------ | ---------------- |
| F01 | Social Authentication           | 7      | Blueprint pronto |
| F02 | Rate Limiting Avançado          | 7      | Blueprint pronto |
| F03 | CI/CD Pipeline                  | 7      | Blueprint pronto |
| F04 | Monitoramento (Sentry)          | 7      | Blueprint pronto |
| F05 | Cartão Crédito/Débito           | 7      | Blueprint pronto |
| F06 | Push Segmentado                 | 7      | Blueprint pronto |
| F07 | KYC / Verificação de Identidade | 8      | Blueprint pronto |
| F08 | Chat em Tempo Real              | 8      | Blueprint pronto |
| F09 | Deep Linking                    | 8      | Blueprint pronto |
| F10 | Histórico Avançado              | 8      | Blueprint pronto |
| F11 | Cache Avançado                  | 8      | Blueprint pronto |
| F12 | Modo Acompanhante               | 9      | Blueprint pronto |
| F13 | Background Location             | 9      | Blueprint pronto |
| F14 | WebSocket Resilience            | 9      | Blueprint pronto |
| F15 | Dashboard Admin                 | 9      | Blueprint pronto |
| F16 | Landing Page                    | 10     | Blueprint pronto |
| F17 | LGPD Compliance                 | 10     | Blueprint pronto |
| F18 | Testes E2E                      | 10     | Blueprint pronto |
| F19 | Guincho Integrado               | 11     | Blueprint pronto |
| F20 | Sistema de Referral             | 12     | Blueprint pronto |
| F21 | Plano PRO                       | 13     | Blueprint pronto |
| F22 | NF Automática                   | 14     | Blueprint pronto |
| F23 | Agendamento                     | 15     | Blueprint pronto |
| F24 | Triagem IA                      | 16     | Blueprint pronto |
| F25 | Multi-idioma (i18n)             | 17     | Blueprint pronto |

---

## F01 — SOCIAL AUTHENTICATION

### Tabela Drizzle

```typescript
// db/schema/social-accounts.ts
import { pgTable, uuid, varchar, timestamp, unique } from "drizzle-orm/pg-core";
import { users } from "./users";

export const socialAccounts = pgTable(
  "social_accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: varchar("provider", { length: 20 }).notNull(),
    providerAccountId: varchar("provider_account_id", {
      length: 255,
    }).notNull(),
    providerEmail: varchar("provider_email", { length: 255 }),
    providerName: varchar("provider_name", { length: 255 }),
    accessToken: varchar("access_token", { length: 500 }), // Token do provider (para refresh)
    refreshToken: varchar("refresh_token", { length: 500 }),
    tokenExpiresAt: timestamp("token_expires_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    providerUnique: unique("provider_account_unique").on(
      t.provider,
      t.providerAccountId,
    ),
  }),
);
```

### Zod Schema

```typescript
// modules/auth/auth.schemas.ts (adicionar)
export const socialLoginSchema = z.object({
  provider: z.enum(["google", "apple"]),
  idToken: z.string().min(1, "Token do provider é obrigatório"),
  userType: z.enum(["client", "professional"]).optional().default("client"),
});
```

### Endpoint

```
POST /api/v1/auth/social
  Request:  { provider: "google" | "apple", idToken: string, userType?: string }
  Response: AuthResponse (mesmo formato do login)
  Lógica:
    1. Verificar idToken com o provider
       - Google: POST googleapis.com/oauth2/v3/tokeninfo?id_token=<token>
       - Apple: Verificar JWT com JWKS de appleid.apple.com/auth/keys
    2. Extrair email + providerAccountId do token verificado
    3. Buscar em social_accounts por (provider, providerAccountId)
       - Encontrou → login (gerar tokens JWT)
       - Não encontrou → buscar por email em users
         - Email existe → linkar social_account ao user existente → login
         - Email não existe → criar user + social_account → login
```

### Regras de negócio

- Se conta existe com senha e tenta login social com mesmo email → linkar automaticamente
- Se conta existe via Google e tenta login via Apple com mesmo email → linkar ambos
- providerAccountId é o identificador único do provider (sub do JWT)
- accessToken/refreshToken do provider armazenados para possível uso futuro

### Frontend

```
TELA AFETADA: (auth)/login.tsx
DESIGN DE REFERÊNCIA: MechaGro-FrontEnd/MechaGo (App do Cliente)/DesignCliente/login_mechago/

MUDANÇAS:
- Adicionar botões "Continuar com Google" e "Continuar com Apple" abaixo do login por email
- Botões devem seguir guidelines visuais oficiais de cada provider
- Posicionar conforme o design Stitch: divisor "ou continue com" + grid 2 colunas
- Usar expo-auth-session para OAuth flow
- Hook: useAuth.socialLogin({ provider, idToken })
- Loading state: botão social desabilitado durante OAuth flow
- Erro: "Não foi possível conectar com [Google/Apple]. Tente novamente."

TAMBÉM AFETA:
- (auth)/login.tsx — mesmos botões sociais para profissionais
- (auth)/register.tsx — opção "Já tenho conta Google/Apple" no final
```

---

## F05 — CARTÃO CRÉDITO/DÉBITO

### Alteração no schema existente (payments)

```typescript
// Adicionar campos ao payments existente via migration
cardLastFour: varchar("card_last_four", { length: 4 }),
cardBrand: varchar("card_brand", { length: 20 }),
installments: integer("installments").default(1),
```

### Zod Schema

```typescript
export const createCardPaymentSchema = z.object({
  serviceRequestId: z.string().uuid(),
  cardToken: z.string().min(1, "Token do cartão é obrigatório"),
  installments: z.number().int().min(1).max(12).default(1),
  amount: z.number().positive("Valor deve ser positivo"),
});
```

### Fluxo de pagamento cartão

```
1. Mobile: Mercado Pago SDK tokeniza cartão → retorna card_token
2. Mobile → POST /api/v1/payments/create-card { cardToken, amount, serviceRequestId }
3. Backend → Mercado Pago API: criar pagamento com card_token + split
4. Mercado Pago processa → webhook confirma → backend atualiza status
5. NÃO armazenar dados do cartão (PCI compliance) — só últimos 4 dígitos e brand
```

### Frontend

```
TELA AFETADA: (service-flow)/estimate.tsx (checkout)
DESIGN DE REFERÊNCIA: MechaGro-FrontEnd/MechaGo (App do Cliente)/DesignCliente/estimativa_e_checkout_mechago/

MUDANÇAS:
- Seletor de método de pagamento: Pix (padrão) ou Cartão
- Se Pix: fluxo atual (QR code / copia-e-cola)
- Se Cartão: abrir WebView do Mercado Pago SDK para tokenização
  (dados do cartão NUNCA tocam nosso app — PCI compliance)
- Após tokenização: exibir "•••• 1234 Visa" como confirmação
- Parcelamento: dropdown 1x a 12x (se habilitado)
- Hook: usePayments.createCard({ cardToken, amount, installments })
- Loading: "Processando pagamento..." com spinner
- Erro: "Pagamento não aprovado. Tente outro cartão."
- Sucesso: navegar para tela de busca de profissional
```

---

## F07 — KYC / VERIFICAÇÃO DE IDENTIDADE

### Tabela Drizzle

```typescript
// db/schema/verifications.ts
import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { professionals } from "./professionals";
import { users } from "./users";

export const verificationStatusEnum = pgEnum("verification_status", [
  "pending",
  "under_review",
  "approved",
  "rejected",
  "expired", // Expirou (requer re-verificação após 12 meses)
]);

export const documentTypeEnum = pgEnum("document_type", [
  "rg",
  "cnh",
  "crea", // Engenheiro mecânico
  "alvara", // Alvará municipal
  "other", // Outros (validação manual)
]);

export const verifications = pgTable("verifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  professionalId: uuid("professional_id")
    .notNull()
    .references(() => professionals.id),
  // Documentos (URLs presigned do R2)
  selfieUrl: text("selfie_url").notNull(),
  documentFrontUrl: text("document_front_url").notNull(),
  documentBackUrl: text("document_back_url"),
  documentType: documentTypeEnum("document_type").notNull(),
  documentNumber: varchar("document_number", { length: 30 }),
  // Status
  status: verificationStatusEnum("status").notNull().default("pending"),
  rejectionReason: text("rejection_reason"),
  // Auditoria
  reviewedBy: uuid("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  expiresAt: timestamp("expires_at"), // 12 meses após aprovação
  // Metadata
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

### Alteração em professionals

```typescript
// Adicionar field via migration
isVerified: boolean("is_verified").default(false).notNull(),
verifiedAt: timestamp("verified_at"),
```

### Endpoints

```
POST   /api/v1/professionals/me/verification    # Submeter documentos
GET    /api/v1/professionals/me/verification    # Status da verificação
POST   /api/v1/admin/verifications/:id/approve  # Admin aprova
POST   /api/v1/admin/verifications/:id/reject   # Admin rejeita { reason }
```

### Regras

- Profissional com `isVerified: false` → NÃO entra no matching
- Após aprovação, `expiresAt` = agora + 12 meses
- 30 dias antes de expirar → push notification para re-verificar
- Fotos armazenadas no R2 com acesso restrito (não público)

### Frontend

```
TELA NOVA: (pro)/verification.tsx
DESIGN DE REFERÊNCIA: Sem design Stitch específico — seguir DS V4 Stitch Fusion
  Usar como base visual: DesignPro/cadastro_pro_dados_1_4/ (mesma estrutura de formulário)

COMPONENTES:
- Step 1: Upload selfie (expo-camera com guia facial)
- Step 2: Upload documento frente (expo-image-picker)
- Step 3: Upload documento verso (opcional)
- Step 4: Selecionar tipo de documento (RG, CNH, CREA, Alvará)
- Step 5: Confirmação + envio
- Progress bar: 1/5, 2/5...
- Hook: useProfessional.submitVerification({ selfieUrl, docFrontUrl, docBackUrl, docType })
- Upload via presigned URL (mesmo fluxo de foto de diagnóstico)
- Loading: "Enviando documentos..." com progress
- Sucesso: "Documentos enviados! Análise em até 24h."

DASHBOARD PRO (afeta tela existente):
- Se isVerified=false: banner amarelo "Verificação pendente — envie seus documentos"
- Se verification.status=under_review: banner "Documentos em análise"
- Se verification.status=rejected: banner vermelho "Verificação recusada: [motivo]"
```

---

## F08 — CHAT EM TEMPO REAL

### Tabela Drizzle

```typescript
// db/schema/messages.ts
import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
} from "drizzle-orm/pg-core";
import { serviceRequests } from "./service-requests";
import { users } from "./users";

export const messageTypeEnum = pgEnum("message_type", [
  "text",
  "image",
  "audio", // Adicionado baseado em feedback potencial do beta
  "system", // Mensagens automáticas do sistema
]);

export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  serviceRequestId: uuid("service_request_id")
    .notNull()
    .references(() => serviceRequests.id),
  fromUserId: uuid("from_user_id")
    .notNull()
    .references(() => users.id),
  type: messageTypeEnum("type").notNull(),
  content: text("content").notNull(), // Texto ou URL do media
  mediaDurationSec: integer("media_duration_sec"), // Para áudio
  readAt: timestamp("read_at"),
  deletedAt: timestamp("deleted_at"), // Soft delete (LGPD)
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Index para buscar mensagens de um atendimento
// CREATE INDEX idx_messages_service_request ON messages(service_request_id, created_at);
```

### Socket.IO Events (adicionar ao tracking existente)

```typescript
// ---- CLIENT → SERVER ----

// Enviar mensagem
socket.emit("chat:send", {
  requestId: string,
  type: "text" | "image" | "audio",
  content: string,            // texto ou URL
  mediaDurationSec?: number,  // só para áudio
});

// Marcar como lida
socket.emit("chat:read", {
  requestId: string,
  messageId: string,
});

// ---- SERVER → CLIENT ----

// Nova mensagem recebida
socket.emit("chat:message", {
  id: string,
  fromUserId: string,
  fromUserName: string,
  type: "text" | "image" | "audio" | "system",
  content: string,
  mediaDurationSec?: number,
  createdAt: string,
});

// Mensagem lida pelo outro
socket.emit("chat:read_receipt", {
  messageId: string,
  readAt: string,
});
```

### Endpoints REST (fallback + histórico)

```
GET  /api/v1/service-requests/:id/messages   # Histórico de mensagens (paginado)
POST /api/v1/service-requests/:id/messages   # Enviar mensagem (fallback se socket cair)
```

### Regras

- Chat APENAS ativo durante atendimento (status: accepted → completed)
- Job BullMQ `cleanExpiredMessages`: deleta mensagens 7 dias após `completedAt` (LGPD)
- Mensagens de sistema: "Carlos Silva está a caminho", "Atendimento encerrado"
- Rate limit: máximo 30 mensagens/minuto por usuário
- Imagens via presigned URL (mesmo sistema de upload de fotos)
- Áudio: máximo 60 segundos, formato .m4a

### Frontend

```
TELA NOVA: componente ChatPanel dentro de (service-flow)/service-active.tsx e (pro)/diagnosis.tsx
DESIGN DE REFERÊNCIA: Sem design Stitch específico — seguir DS V4 Stitch Fusion

COMPONENTES:
- ChatPanel: painel deslizável (bottom sheet) dentro da tela de atendimento ativo
  - Fundo: colors.surfaceLow, cantos arredondados top
  - Badge no ícone de chat mostrando quantidade de mensagens não lidas
- ChatBubble: balão de mensagem
  - Mensagem enviada: colors.primaryContainer, alinhado à direita
  - Mensagem recebida: colors.surfaceHigh, alinhado à esquerda
  - Mensagem sistema: centralizado, colors.onSurfaceVariant, itálico
- ChatInput: input na base
  - Botão enviar (ícone send), botão foto (ícone camera), botão áudio (ícone mic)
  - KeyboardAvoidingView obrigatório
- Indicador "digitando..." quando o outro está escrevendo

HOOKS:
- useChat(requestId): gerencia mensagens via Socket.IO
  - Escuta chat:message → adiciona à lista
  - Emite chat:send → envia mensagem
  - Escuta chat:read_receipt → marca como lido
- useChatMessages(requestId): TanStack Query para histórico (fallback REST)

ESTADOS:
- Loading: skeleton de 3 balões
- Vazio: "Envie uma mensagem para o profissional"
- Erro de envio: balão com ícone de retry
- Offline: "Sem conexão — mensagens serão enviadas quando reconectar"
```

---

## F12 — MODO ACOMPANHANTE

### Tabela Drizzle

```typescript
// db/schema/tracking-shares.ts
import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";
import { serviceRequests } from "./service-requests";
import { users } from "./users";

export const trackingShares = pgTable("tracking_shares", {
  id: uuid("id").defaultRandom().primaryKey(),
  serviceRequestId: uuid("service_request_id")
    .notNull()
    .references(() => serviceRequests.id),
  shareToken: varchar("share_token", { length: 64 }).notNull().unique(),
  label: varchar("label", { length: 100 }), // "Minha mãe", "Meu marido"
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  isActive: boolean("is_active").default(true).notNull(),
  accessCount: integer("access_count").default(0).notNull(),
  lastAccessedAt: timestamp("last_accessed_at"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

### Endpoints

```
POST /api/v1/tracking/share
  Auth: sim (cliente)
  Body: { serviceRequestId, label? }
  Response: { shareToken, shareUrl: "https://mechago.com.br/acompanhar/{token}" }
  Lógica: Gerar token crypto.randomUUID(), expiresAt = serviceRequest.completedAt ou 24h

GET /api/v1/tracking/share/:token
  Auth: NÃO (público)
  Response: {
    status: string,
    professional: { name: string, rating: number },
    location: { lat, lng },
    eta: number,       // minutos
    vehicleInfo: string,  // "Honda Civic 2019"
    emergencyNumbers: { samu: "192", bombeiros: "193", policia: "190" }
  }
  NÃO retorna: preço, telefone, dados pessoais, histórico

DELETE /api/v1/tracking/share/:id
  Auth: sim (criador)
  Lógica: isActive = false
```

### Regras

- Máximo 3 links ativos por atendimento
- Link expira automaticamente quando atendimento encerra
- Página web responsiva (Next.js ou HTML estático) — não precisa de app
- Atualiza posição a cada 5 segundos (polling, não WebSocket para página pública)
- Botão "Ligar para emergência" sempre visível

### Frontend

```
TELA AFETADA (Mobile): (service-flow)/tracking.tsx
DESIGN DE REFERÊNCIA: MechaGro-FrontEnd/MechaGo (App do Cliente)/DesignCliente/tracking_profissional_mechago/

MUDANÇAS NO TRACKING:
- Adicionar botão "Compartilhar localização" (ícone share_location)
- Ao tocar: gerar link via POST /tracking/share
- Modal com link + botões: "Copiar link", "WhatsApp", "SMS"
- Campo label opcional: "Para quem está enviando? (ex: Minha mãe)"

PÁGINA WEB PÚBLICA (Next.js):
- URL: mechago.com.br/acompanhar/{token}
- Mapa fullscreen com posição do profissional atualizada a cada 5s
- Card inferior: status do atendimento, ETA, nome do profissional (sem telefone)
- Botão fixo: "Ligar para emergência" → SAMU 192, Bombeiros 193, Polícia 190
- Responsiva (funciona em qualquer navegador, sem instalar app)
- Design: fundo colors.bg, mapa claro, card em glassmorphism
- NÃO mostra: preço, telefone, dados pessoais, histórico
```

---

## F17 — LGPD COMPLIANCE

### Tabela Drizzle

```typescript
// db/schema/consents.ts
import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const consents = pgTable("consents", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  type: varchar("type", { length: 50 }).notNull(),
  version: varchar("version", { length: 20 }).notNull(), // "terms_v1.0", "privacy_v1.2"
  accepted: boolean("accepted").notNull(),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  revokedAt: timestamp("revoked_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

```typescript
// db/schema/data-deletion-requests.ts
import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const deletionStatusEnum = pgEnum("deletion_status", [
  "requested",
  "processing",
  "completed",
  "cancelled",
]);

export const dataDeletionRequests = pgTable("data_deletion_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  status: deletionStatusEnum("status").notNull().default("requested"),
  reason: text("reason"),
  requestedAt: timestamp("requested_at").defaultNow().notNull(),
  scheduledFor: timestamp("scheduled_for").notNull(), // 30 dias após request
  processedAt: timestamp("processed_at"),
  // Dados retidos por obrigação fiscal
  retainedPaymentData: boolean("retained_payment_data").default(true).notNull(),
  retainedUntil: timestamp("retained_until"), // 5 anos para dados fiscais
});
```

### Endpoints

```
GET    /api/v1/users/me/data-export
  Auth: sim
  Response: JSON com todos os dados do usuário (perfil, veículos, atendimentos, avaliações)
  Headers: Content-Disposition: attachment; filename="mechago-data-export.json"

DELETE /api/v1/users/me
  Auth: sim
  Body: { password, reason? }
  Lógica:
    1. Verificar senha (confirmar identidade)
    2. Criar data_deletion_request com scheduledFor = now + 30 dias
    3. Marcar user.isActive = false imediatamente
    4. Enviar email confirmando solicitação
    5. Job agendado para 30 dias: deletar dados pessoais
    6. RETER: dados de pagamento por 5 anos (obrigação fiscal)

POST   /api/v1/users/me/cancel-deletion
  Auth: sim
  Lógica: Se ainda não processou, cancelar e reativar conta

GET    /api/v1/legal/terms
  Auth: não
  Response: { version, content, updatedAt }

GET    /api/v1/legal/privacy
  Auth: não
  Response: { version, content, updatedAt }

POST   /api/v1/legal/consent
  Auth: sim
  Body: { type: "terms" | "privacy" | "marketing", version, accepted }
```

### Regras de retenção

```
Dados pessoais (nome, email, telefone): deletar após 30 dias da solicitação
Dados de pagamento (transações, valores): reter por 5 anos (obrigação fiscal)
Mensagens de chat: deletar 7 dias após encerramento do atendimento
Fotos de diagnóstico: deletar 90 dias após encerramento
Logs de acesso: reter por 6 meses
Avaliações: anonimizar (remover nome, manter nota e tags)
```

---

## F19 — GUINCHO INTEGRADO

### Tabela Drizzle

```typescript
// db/schema/tow-companies.ts
import {
  pgTable,
  uuid,
  varchar,
  text,
  decimal,
  boolean,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

export const towCompanies = pgTable("tow_companies", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  email: varchar("email", { length: 255 }),
  // Pricing
  baseFeeKm: jsonb("base_fee_km").notNull(),
  // { "car": { min: 5, max: 8 }, "moto": { min: 4, max: 6 },
  //   "suv": { min: 7, max: 10 }, "truck": { min: 8, max: 15 } }
  // Valores em R$ por km
  minimumFee: decimal("minimum_fee", { precision: 10, scale: 2 }).notNull(),
  // Cobertura
  latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
  longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
  coverageRadiusKm: integer("coverage_radius_km").notNull(),
  // Status
  isActive: boolean("is_active").default(true).notNull(),
  isAvailable: boolean("is_available").default(true).notNull(),
  // API (se o parceiro tiver integração)
  apiEndpoint: text("api_endpoint"),
  apiKey: text("api_key"), // Criptografado em produção
  webhookUrl: text("webhook_url"),
  // Metadata
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

```typescript
// db/schema/tow-requests.ts
export const towRequestStatusEnum = pgEnum("tow_request_status", [
  "requested",
  "accepted",
  "enroute",
  "arrived",
  "loading",
  "transporting",
  "delivered",
  "cancelled",
]);

export const towRequests = pgTable("tow_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  serviceRequestId: uuid("service_request_id")
    .notNull()
    .references(() => serviceRequests.id),
  towCompanyId: uuid("tow_company_id")
    .notNull()
    .references(() => towCompanies.id),
  status: towRequestStatusEnum("status").notNull().default("requested"),
  // Rota
  pickupLatitude: decimal("pickup_latitude", {
    precision: 10,
    scale: 7,
  }).notNull(),
  pickupLongitude: decimal("pickup_longitude", {
    precision: 10,
    scale: 7,
  }).notNull(),
  destinationLatitude: decimal("destination_latitude", {
    precision: 10,
    scale: 7,
  }).notNull(),
  destinationLongitude: decimal("destination_longitude", {
    precision: 10,
    scale: 7,
  }).notNull(),
  destinationName: varchar("destination_name", { length: 255 }), // Nome da oficina
  distanceKm: decimal("distance_km", { precision: 6, scale: 2 }),
  // Preço
  estimatedPrice: decimal("estimated_price", { precision: 10, scale: 2 }),
  finalPrice: decimal("final_price", { precision: 10, scale: 2 }),
  // Timestamps
  acceptedAt: timestamp("accepted_at"),
  arrivedAt: timestamp("arrived_at"),
  deliveredAt: timestamp("delivered_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

---

## F20 — SISTEMA DE REFERRAL

### Tabela Drizzle

```typescript
// db/schema/referrals.ts
export const referralStatusEnum = pgEnum("referral_status", [
  "pending", // Indicado se cadastrou mas ainda não completou atendimento
  "qualified", // Indicado completou primeiro atendimento
  "rewarded", // Recompensa creditada para ambos
  "expired", // Expirou (90 dias sem qualificar)
]);

export const referrals = pgTable("referrals", {
  id: uuid("id").defaultRandom().primaryKey(),
  referrerUserId: uuid("referrer_user_id")
    .notNull()
    .references(() => users.id),
  referredUserId: uuid("referred_user_id").references(() => users.id),
  code: varchar("code", { length: 8 }).notNull().unique(),
  status: referralStatusEnum("status").notNull().default("pending"),
  referrerReward: decimal("referrer_reward", { precision: 10, scale: 2 }), // Crédito
  referredReward: decimal("referred_reward", { precision: 10, scale: 2 }), // Desconto
  qualifiedAt: timestamp("qualified_at"),
  rewardedAt: timestamp("rewarded_at"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

### Alteração em users (migration)

```typescript
referralCode: varchar("referral_code", { length: 8 }).unique(), // Gerado no registro
referredBy: uuid("referred_by").references(() => users.id),
referralCredits: decimal("referral_credits", { precision: 10, scale: 2 }).default("0.00"),
```

---

## F21 — PLANO PRO

### Tabela Drizzle

```typescript
// db/schema/subscriptions.ts
export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "cancelled",
  "past_due",
  "expired",
  "trial",
]);

export const planTypeEnum = pgEnum("plan_type", [
  "free", // Comissão 10%, sem benefícios
  "pro", // Comissão 15%, com prioridade
]);

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  professionalId: uuid("professional_id")
    .notNull()
    .references(() => professionals.id)
    .unique(),
  planType: planTypeEnum("plan_type").notNull().default("free"),
  status: subscriptionStatusEnum("status").notNull().default("active"),
  priceMonthly: decimal("price_monthly", { precision: 10, scale: 2 }),
  gatewaySubscriptionId: varchar("gateway_subscription_id", { length: 255 }),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  cancelledAt: timestamp("cancelled_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

### Impacto no matching

```typescript
// No matching.service.ts, alterar ORDER BY:
// Profissionais PRO aparecem primeiro (mas só se estiverem dentro do raio)
ORDER BY
  CASE WHEN s.plan_type = 'pro' THEN 0 ELSE 1 END,
  u.rating DESC,
  distance_meters ASC
```

---

## F22 — NF AUTOMÁTICA

### Tabela Drizzle

```typescript
// db/schema/invoices.ts
export const invoiceStatusEnum = pgEnum("invoice_status", [
  "pending",
  "generated",
  "sent",
  "error",
]);

export const invoices = pgTable("invoices", {
  id: uuid("id").defaultRandom().primaryKey(),
  serviceRequestId: uuid("service_request_id")
    .notNull()
    .references(() => serviceRequests.id),
  paymentId: uuid("payment_id")
    .notNull()
    .references(() => payments.id),
  number: varchar("number", { length: 50 }), // Número da NF
  pdfUrl: text("pdf_url"), // PDF gerado pelo Enotas/NFe.io
  status: invoiceStatusEnum("status").notNull().default("pending"),
  providerInvoiceId: varchar("provider_invoice_id", { length: 255 }),
  errorMessage: text("error_message"),
  generatedAt: timestamp("generated_at"),
  sentAt: timestamp("sent_at"), // Quando foi enviado por email
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

### Job BullMQ

```typescript
// Fila: invoiceGeneration
// Trigger: quando payment.status muda para "captured"
// Retry: 3 tentativas com backoff exponencial
// Dead letter: após 3 falhas, status = "error", alerta para admin
```

---

## TABELAS COMPLETAS DO SISTEMA FINAL (V2.0)

### Resumo de todas as tabelas

```
MVP (Sprint 1-6) — 11 tabelas:
  users, vehicles, professionals, workshops, service_requests,
  service_events, payments, reviews, price_tables, queue_entries,
  roadway_info

V1.0 (Sprint 7-10) — +5 tabelas:
  social_accounts, verifications, messages,
  tracking_shares, consents, data_deletion_requests

V1.5 (Sprint 11-14) — +4 tabelas:
  tow_companies, tow_requests, referrals, subscriptions, invoices

V2.0 (Sprint 15+) — +2 tabelas:
  scheduled_services, triage_ai_results

TOTAL SISTEMA COMPLETO: ~22 tabelas
```

---

> **NOTA PARA A IA**: Quando chegar em uma sprint pós-beta, consulte este documento para pegar o
> blueprint da tabela/endpoint/tela. Antes de implementar, VALIDE com o desenvolvedor se o beta
> trouxe mudanças nos requisitos. Se sim, ajuste o blueprint. Se não, implemente conforme especificado.
>
> SEMPRE: backend + frontend juntos. SEMPRE: abrir design Stitch antes de tocar em tela.
> SEMPRE: TDD (Akita XP). SEMPRE: checklist UI/UX Pro Max antes de considerar tela pronta.
> SEMPRE: zero dados mock — tudo vem da API via TanStack Query.
> SEMPRE: seguir padrão de módulo do RULES.md (schemas → routes → service → repository).
