# RULES.md — Regras de Desenvolvimento MechaGo

> **Este arquivo define as regras que TODA IA assistente deve seguir ao gerar código, responder perguntas ou tomar decisões arquiteturais no projeto MechaGo.**
>
> Arquivo compatível com: Claude Code (copiar para CLAUDE.md), Cursor (.cursorrules), Windsurf, ou qualquer IDE com IA.

---

## IDENTIDADE DO PROJETO

- **Nome**: MechaGo (cliente) / MechaGo Pro (profissional)
- **Tipo**: App de socorro automotivo em tempo real (Brasil)
- **Stack**: Hono + Drizzle + PostgreSQL/PostGIS + Redis + BullMQ + Socket.IO + Expo + React Native
- **Monorepo**: Turborepo com `apps/api`, `apps/mobile`, `packages/shared`
- **Documento de referência**: `MechaGo_Technical_Reference.md` (consultar SEMPRE antes de implementar qualquer módulo)

---

## GOVERNANÇA DE VERSÕES (CRITICAL)

- **EXPO SDK**: 54.0.0 (Obrigatório)
- **React**: 19.1.0
- **React Native**: 0.81.5
- **Instalação**: SEMPRE usar `npm install --legacy-peer-deps` ou `npm install --force` para gerenciar o conflito de tipos do React 19.
- **Downgrade**: Proibido realizar downgrade de SDK ou bibliotecas core sem aprovação do Arquiteto Principal.

---

## REGRA ZERO — DOIS PRINCÍPIOS QUE SE EQUILIBRAM

> **Princípio 1 (Qualidade):** Não aceite gambiarras. Não gere código "que funciona por enquanto". Se a solução correta é mais complexa, implemente a solução correta.
>
> **Princípio 2 (YAGNI):** Não faça over-engineering. Implemente a versão mais simples possível que resolve o problema ATUAL. Se um `if` resolve o que um sistema de filas resolveria, use o `if` — a menos que o Technical Reference especifique explicitamente a necessidade de algo mais robusto.

**Como equilibrar:** Se está no Technical Reference como requisito (ex: "BullMQ para matching"), implementa conforme descrito. Se NÃO está especificado e você está tentando "prevenir o futuro", PARE e pergunte ao desenvolvedor: _"Você quer a versão simples (X) ou a versão robusta (Y)? Para o MVP, X resolve."_

Se o usuário pedir algo que viola segurança ou boas práticas:

1. **RECUSE** a abordagem insegura
2. **EXPLIQUE** o risco em 1-2 frases
3. **IMPLEMENTE** a alternativa correta

---

## 1. IDIOMA E COMUNICAÇÃO

### Código

- **Nomes de variáveis, funções, classes, tipos**: inglês (camelCase / PascalCase)
- **Comentários**: PT-BR, explicando o PORQUÊ (intenção de negócio), nunca o quê
- **Strings de erro para o usuário final**: PT-BR
- **Strings de erro para logs internos**: inglês
- **Commits**: inglês, formato conventional commits (`feat:`, `fix:`, `refactor:`)

### Respostas ao desenvolvedor

- Responder em PT-BR
- Ser direto e técnico, sem enrolação
- Se tiver dúvida sobre contexto, PERGUNTAR antes de assumir

### Exemplos corretos

```typescript
// Usamos Argon2 em vez de bcrypt porque é resistente a ataques GPU,
// que são o vetor principal de força bruta em hashes de senha atualmente
const passwordHash = await hashPassword(input.password);

// Limite de 5 veículos por cliente para evitar abuse de cadastro
// e manter a tabela enxuta para queries de matching
if (count >= MAX_VEHICLES_PER_USER) {
  throw new AppError("VEHICLE_LIMIT", "Limite de veículos atingido", 400);
}
```

### Exemplos PROIBIDOS

```typescript
// incrementa o contador (INÚTIL — comenta o óbvio)
count++;

// TODO: fix later (PROIBIDO — resolver agora ou criar issue)
```

---

## 2. ARQUITETURA E ESTRUTURA

### Padrão de módulo (Backend)

Todo módulo segue OBRIGATORIAMENTE esta estrutura:

```
modules/<nome>/
├── <nome>.schemas.ts      # Zod schemas (input/output) — FONTE DA VERDADE
├── <nome>.routes.ts       # Rotas Hono com OpenAPI
├── <nome>.service.ts      # Lógica de negócio (sem acesso ao Hono context)
└── <nome>.repository.ts   # Queries Drizzle (única camada que toca no banco)
```

**Regras:**

- `routes.ts` NUNCA contém lógica de negócio — só chama o service
- `service.ts` NUNCA importa Drizzle diretamente — só chama o repository
- `repository.ts` NUNCA valida dados — a validação já aconteceu no Zod
- `schemas.ts` é importado por routes E service (para tipos)

### Criar novo módulo

Ao criar um módulo novo:

1. Verificar se já existe no `MechaGo_Technical_Reference.md`
2. Criar os 4 arquivos na ordem: schemas → repository → service → routes
3. Registrar as rotas no `app.ts`
4. Adicionar ao Scalar (automático via zod-openapi)

### Mobile

- Expo Router: file-based routing em `apps/mobile/app/`
- Telas em `app/(tabs)/`, `app/(auth)/`, `app/(service-flow)/`
- Componentes reutilizáveis em `components/`
- Hooks customizados em `hooks/`
- TanStack Query: hooks de query em `hooks/queries/`
- Zustand: stores em `stores/`
- Constantes e tipos de `packages/shared`

---

## 3. SEGURANÇA — ZERO TRUST

### Obrigatório em TODA rota

```typescript
// 1. Validação de input com Zod (SEMPRE)
const input = c.req.valid("json"); // Hono + zod-openapi já valida

// 2. Autenticação via middleware (em rotas protegidas)
// authMiddleware injeta userId no context

// 3. Autorização (verificar se o recurso pertence ao usuário)
const vehicle = await VehiclesRepository.findById(vehicleId);
if (vehicle.userId !== userId) {
  throw new AppError("FORBIDDEN", "Acesso negado", 403);
}
```

### PROIBIDO (sem exceção)

```
❌ Concatenar strings em queries SQL
❌ Usar `any` no TypeScript (use `unknown` e faça type guard)
❌ Colocar secrets no código (SEMPRE via process.env)
❌ Retornar stack trace ou detalhes internos para o cliente
❌ Confiar em dados do cliente sem validação Zod
❌ Usar eval(), Function(), ou qualquer execução dinâmica
❌ Desabilitar CORS, rate limiting, ou SSL em produção
❌ Armazenar senhas em texto plano ou com MD5/SHA1
❌ Logar dados sensíveis (senha, token, CPF completo)
❌ Usar JWT sem expiração
```

### Tratamento de erros

```typescript
// CORRETO: erro específico com contexto para dev, mensagem safe para cliente
throw new AppError(
  "PLATE_EXISTS", // Código interno (para logs/debug)
  "Esta placa já está cadastrada", // Mensagem PT-BR para o cliente
  409, // HTTP status
);

// O error-handler global faz:
// - Log completo com Pino (código, stack, requestId, userId)
// - Retorna para o cliente: { error: { code, message } } — SEM stack trace
```

```typescript
// PROIBIDO: catch silencioso
try {
  await doSomething();
} catch (e) {
  // NUNCA engolir o erro. SEMPRE logar e/ou propagar.
}
```

---

## 4. BANCO DE DADOS

### Drizzle ORM

- TODA interação com banco via Drizzle (nunca SQL raw, exceto PostGIS quando necessário)
- Usar `returning()` em inserts para evitar query extra
- Usar transactions (`db.transaction()`) quando múltiplas operações precisam ser atômicas
- Índices: criar para colunas usadas em WHERE, JOIN, ORDER BY frequentes

### PostGIS

- Localização armazenada como `geometry(Point, 4326)`
- Queries de proximidade com `ST_DWithin()` (mais eficiente que `ST_Distance` para filtro)
- SEMPRE converter km para metros nas queries (1km = 1000m)

```typescript
// Query de matching: profissionais dentro do raio
const nearby = await db.execute(sql`
  SELECT p.*, u.name, u.rating,
    ST_Distance(p.location::geography, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography) AS distance_meters
  FROM professionals p
  JOIN users u ON p.user_id = u.id
  WHERE p.is_online = true
    AND ST_DWithin(p.location::geography, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography, ${radiusMeters})
    AND ${vehicleType} = ANY(p.vehicle_types_served)
    AND p.schedule_type = ANY(${activeSchedules})
  ORDER BY u.rating DESC, distance_meters ASC
  LIMIT 10
`);
```

### Migrations

- Gerar com `npx drizzle-kit generate`
- NUNCA editar migrations geradas manualmente
- Para mudanças no schema: alterar o arquivo em `db/schema/`, rodar `generate`, depois `migrate`

---

## 5. PADRÕES DE CÓDIGO

### TypeScript

- **strict mode**: SEMPRE ativo no tsconfig
- **Sem `any`**: usar `unknown` + type guards, ou tipos específicos
- **Sem `as` casting**: fazer validação real em vez de forçar tipo
- **Sem `!` non-null assertion**: verificar null explicitamente
- **Inferência de tipos do Drizzle**: usar `typeof table.$inferSelect` e `$inferInsert`

### Nomenclatura

| Elemento            | Convenção        | Exemplo                                       |
| ------------------- | ---------------- | --------------------------------------------- |
| Variáveis e funções | camelCase        | `getUserById`, `serviceRequest`               |
| Classes e Types     | PascalCase       | `VehiclesService`, `CreateVehicleInput`       |
| Constantes globais  | UPPER_SNAKE_CASE | `MAX_VEHICLES_PER_USER`, `SLA_ACCEPT_TIMEOUT` |
| Arquivos de módulo  | kebab-case       | `service-requests.routes.ts`                  |
| Tabelas do banco    | snake_case       | `service_requests`, `price_tables`            |
| Colunas do banco    | snake_case       | `user_id`, `created_at`                       |
| Enums do banco      | snake_case       | `vehicle_type`, `request_status`              |
| Env vars            | UPPER_SNAKE_CASE | `DATABASE_URL`, `JWT_SECRET`                  |
| Rotas da API        | kebab-case       | `/api/v1/service-requests`                    |

### Estilo de código

- **Early return** (guard clauses): evitar aninhamento profundo
- **Funções pequenas**: máximo ~40 linhas. Se maior, extrair
- **Um arquivo, uma responsabilidade**: se o arquivo tem 300+ linhas, quebrar
- **Imports ordenados**: (1) node built-ins, (2) libs externas, (3) módulos internos, (4) tipos

```typescript
// CORRETO: early return, sem aninhamento
async function acceptRequest(professionalId: string, requestId: string) {
  const request = await ServiceRequestsRepository.findById(requestId);
  if (!request) throw new AppError("NOT_FOUND", "Chamado não encontrado", 404);
  if (request.status !== "matching")
    throw new AppError("INVALID_STATUS", "Chamado já foi aceito", 409);

  const professional =
    await ProfessionalsRepository.findByUserId(professionalId);
  if (!professional.isOnline)
    throw new AppError("OFFLINE", "Você está offline", 400);

  // Verifica compatibilidade de tipo de veículo
  const vehicle = await VehiclesRepository.findById(request.vehicleId);
  if (!professional.vehicleTypes.includes(vehicle.type)) {
    throw new AppError(
      "INCOMPATIBLE",
      "Você não atende este tipo de veículo",
      400,
    );
  }

  return ServiceRequestsRepository.update(requestId, {
    professionalId: professional.id,
    status: "accepted",
    matchedAt: new Date(),
  });
}
```

---

## 5.5 NÍVEL DE EXCELÊNCIA — CÓDIGO DE CLASSE MUNDIAL

> **O MechaGo não é um projeto acadêmico ou protótipo. É um produto enterprise que será usado
> por pessoas em situação de stress (motorista parado, profissional correndo). O código deve
> ter a mesma qualidade dos apps que essas pessoas já usam: iFood, 99, Uber, Nubank.**
>
> Se o código "funciona" mas não está no nível abaixo, ele NÃO está pronto. Refatore antes de entregar.

### 5.5.1 Backend — Padrão Arquiteto

```
TYPE-SAFETY MÁXIMO:
✅ USAR tipos inferidos do Drizzle: InferSelectModel<typeof table>, InferInsertModel<typeof table>
✅ USAR tipos dos Zod schemas: z.infer<typeof createVehicleSchema>
❌ PROIBIDO: Record<string, unknown>, any, as string, as unknown, casts manuais
❌ PROIBIDO: Tipos genéricos quando o Drizzle/Zod já fornece o tipo específico
   Se uma coluna mudar no banco, o TypeScript DEVE acusar erro em tempo de compilação.

SERVICES — Lógica de negócio:
✅ Cada método tem uma responsabilidade clara e testável
✅ Validação de negócio separada da transformação de dados
✅ Retornos tipados — nunca retornar objetos genéricos
✅ Utilitários de transformação (sanitize, serialize, format) como funções puras separadas
❌ PROIBIDO: Filtragem manual de undefined com ifs — usar Zod .partial() ou utilitários tipados
❌ PROIBIDO: Lógica de negócio espalhada em routes — routes só chamam service
❌ PROIBIDO: Métodos com 50+ linhas — extrair sub-funções com nomes descritivos

REPOSITORY — Acesso a dados:
✅ Queries Drizzle com tipos inferidos
✅ Retornos tipados do Drizzle (nunca raw objects)
✅ Select específico quando não precisa de todas as colunas (performance)
✅ Usar .returning() em inserts e updates para evitar query extra
❌ PROIBIDO: SELECT * quando só precisa de 3 campos

SCHEMAS (Zod) — Validação:
✅ Schemas são a FONTE DA VERDADE para validação, tipos e documentação OpenAPI
✅ Transforms no schema (toLowerCase, trim, formatação) — não na route
✅ Mensagens de erro em PT-BR, específicas e úteis para o usuário
✅ Regex com explicação do formato esperado na mensagem de erro
❌ PROIBIDO: Validação manual com ifs quando Zod resolve
❌ PROIBIDO: Mensagens genéricas ("campo inválido") — sempre dizer O QUE está errado e COMO corrigir

TESTES — Robustez:
✅ Testar cenário feliz + TODOS os cenários de erro do service
✅ Testar edge cases: string vazia, null, undefined, lista vazia, valor no limite
✅ Mock de dependências (repository) para isolar lógica de negócio
✅ Cada teste com nome descritivo em PT-BR: "deve rejeitar placa duplicada"
❌ PROIBIDO: Testes que só testam o happy path
❌ PROIBIDO: Testes frágeis que dependem de ordem de execução
```

### 5.5.2 Frontend — Padrão App Profissional

```
FORMULÁRIOS:
✅ OBRIGATÓRIO: react-hook-form + zod resolver para QUALQUER formulário
   - Validação centralizada no schema Zod (não espalhada em useState + ifs manuais)
   - Zero re-renders desnecessários (react-hook-form não re-renderiza a cada keystroke)
   - Mensagens de erro inline abaixo de cada campo
❌ PROIBIDO: useState para cada campo de formulário individualmente
❌ PROIBIDO: Função validate() manual com ifs encadeados
❌ PROIBIDO: Validação só no submit — validar em tempo real (onChange/onBlur)

ESTADO:
✅ Server state: TanStack Query (NUNCA duplicar dados da API em useState ou Zustand)
✅ Client state: Zustand stores pequenas e focadas (auth, UI)
✅ Form state: react-hook-form (NUNCA useState para formulários)
❌ PROIBIDO: useState para dados que vêm da API
❌ PROIBIDO: Zustand store que replica dados do TanStack Query cache
❌ PROIBIDO: Props drilling de 3+ níveis — usar hook ou context

COMPONENTES:
✅ Componentes UI (Button, Input, Card) são REUTILIZÁVEIS e GENÉRICOS
   - Aceitam props de variantes (variant="primary" | "outline" | "error")
   - Aceitam todas as props nativas (accessibilityLabel, testID, etc.)
   - Encapsulam feedback visual (opacity, scale, haptics)
✅ Componentes de domínio (VehicleCard, ProfessionalCard) recebem dados tipados
✅ Separação clara: lógica (hooks) vs visual (componentes)
❌ PROIBIDO: Componente com 200+ linhas — quebrar em subcomponentes
❌ PROIBIDO: Estilos inline repetidos — extrair para StyleSheet.create
❌ PROIBIDO: Cores hardcoded — SEMPRE tokens do DS V4

PERFORMANCE:
✅ FlatList para listas (não ScrollView + .map())
✅ useCallback para funções passadas como props
✅ useMemo para cálculos pesados dentro de render
✅ Imagens otimizadas (resize, cache)
❌ PROIBIDO: .map() dentro de ScrollView para listas dinâmicas
❌ PROIBIDO: Re-render de lista inteira quando um item muda

ACESSIBILIDADE (não é opcional):
✅ accessibilityLabel em TODOS os elementos interativos sem texto visível
✅ accessibilityRole correto (button, link, header, image)
✅ accessibilityState para estados (disabled, selected, checked)
✅ Touch targets 44×44px mínimo (hitSlop se botão visual for menor)
✅ Suporte a fonte dinâmica (não travar font size)
```

### 5.5.3 Exemplos: Código medíocre vs Código de excelência

**Backend — Service:**

```typescript
// ❌ MEDÍOCRE: tipos genéricos, filtragem manual, sem type-safety
static async update(userId: string, vehicleId: string, data: Record<string, unknown>) {
  const vehicle = await VehiclesRepository.findById(vehicleId);
  if (!vehicle) throw Errors.notFound("Veículo");
  if (vehicle.userId !== userId) throw Errors.forbidden();
  const filtered: any = {};
  if (data.type !== undefined) filtered.type = data.type;
  if (data.color !== undefined) filtered.color = data.color;
  return VehiclesRepository.update(vehicleId, filtered);
}

// ✅ EXCELÊNCIA: tipos inferidos do Zod, sem any, sem filtragem manual
static async update(userId: string, vehicleId: string, input: UpdateVehicleInput) {
  const vehicle = await VehiclesRepository.findById(vehicleId);
  if (!vehicle) throw Errors.notFound("Veículo");
  if (vehicle.userId !== userId) throw Errors.forbidden();
  // Zod .partial() já garante que só campos válidos passam — sem filtragem manual
  return VehiclesRepository.update(vehicleId, input);
}
```

**Frontend — Formulário:**

```typescript
// ❌ MEDÍOCRE: useState por campo, validação manual, re-render a cada keystroke
const [plate, setPlate] = useState("");
const [brand, setBrand] = useState("");
const [model, setModel] = useState("");
const [error, setError] = useState("");

const validate = () => {
  if (!plate) { setError("Placa obrigatória"); return false; }
  if (!/^[A-Z]{3}/.test(plate)) { setError("Placa inválida"); return false; }
  return true;
};

// ✅ EXCELÊNCIA: react-hook-form + zod, validação centralizada, zero re-render
const { control, handleSubmit, formState: { errors } } = useForm<CreateVehicleInput>({
  resolver: zodResolver(createVehicleSchema),
});

const onSubmit = handleSubmit((data) => {
  createVehicle.mutate(data);
});

// No JSX:
<Controller
  control={control}
  name="plate"
  render={({ field, fieldState }) => (
    <Input
      {...field}
      label="Placa"
      placeholder="ABC-1234"
      error={fieldState.error?.message}
      accessibilityLabel="Placa do veículo"
    />
  )}
/>
```

---

### Estado

- **Server state** (dados da API): TanStack Query. NUNCA duplicar dados da API no Zustand.
- **Client state** (UI, navegação): Zustand. Stores pequenas e focadas.
- **Storage persistente**: MMKV (tokens, preferências). NUNCA AsyncStorage.

### Queries (TanStack Query)

```typescript
// hooks/queries/useServiceRequest.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

// Query keys organizadas por domínio
export const serviceRequestKeys = {
  all: ["service-requests"] as const,
  detail: (id: string) => ["service-requests", id] as const,
  active: () => ["service-requests", "active"] as const,
};

export function useServiceRequest(id: string) {
  return useQuery({
    queryKey: serviceRequestKeys.detail(id),
    queryFn: () => api.get(`/service-requests/${id}`).json(),
    // Polling a cada 5s durante atendimento ativo (fallback do Socket.IO)
    refetchInterval: 5000,
  });
}

export function useCreateServiceRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateServiceRequestInput) =>
      api.post("/service-requests", { json: data }).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: serviceRequestKeys.all });
    },
  });
}
```

### Componentes

- Componentes de UI reutilizáveis em `components/ui/` (Button, Card, Input, etc.)
- Componentes de domínio em `components/` (VehicleCard, ProfessionalCard, etc.)
- Design tokens importados de `packages/shared`
- NUNCA cores hardcoded — SEMPRE via tokens

### Navegação (Expo Router)

```
app/
├── (auth)/
│   ├── login.tsx
│   ├── register.tsx
│   └── _layout.tsx
├── (tabs)/
│   ├── index.tsx          # Home / SOS
│   ├── vehicles.tsx       # Meus veículos
│   ├── history.tsx        # Histórico
│   ├── profile.tsx        # Perfil
│   └── _layout.tsx        # Tab navigator
├── (service-flow)/
│   ├── select-vehicle.tsx
│   ├── select-problem.tsx
│   ├── triage.tsx
│   ├── estimate.tsx
│   ├── searching.tsx
│   ├── professional-found.tsx
│   ├── tracking.tsx
│   ├── service-active.tsx
│   ├── price-approval.tsx
│   ├── rating.tsx
│   ├── completed.tsx
│   ├── escalation.tsx
│   └── _layout.tsx
├── _layout.tsx            # Root layout
└── +not-found.tsx
```

---

## 7. UI/UX — REGRAS DE QUALIDADE VISUAL (PROTOCOLO UI/UX PRO)

> **Contexto**: O MechaGo opera em dois cenários — **urbano** (bateria que morre no estacionamento, pneu furado na rua do bairro — 90%+ da demanda) e **rodovia** (pane em trecho concessionado). Em ambos os casos, o usuário está em stress, possivelmente com uma mão só, com pressa, e potencialmente com conexão ruim. A UI precisa ser grande, clara, contrastada, e à prova de erro.

### 7.1 Acessibilidade (CRÍTICO)

```
✅ Contraste mínimo 4.5:1 para texto normal, 3:1 para texto grande
✅ Touch targets mínimo 44×44px (botões, cards clicáveis, tabs)
✅ Focus states visíveis em todos os elementos interativos
✅ Texto mínimo 14px no mobile (nunca abaixo de 12px)
✅ Cor NUNCA é o único indicador (usar ícones + texto junto)
✅ Respeitar prefers-reduced-motion para animações
✅ Labels em todos os campos de formulário
✅ Alt text descritivo em imagens significativas
```

### 7.2 Ícones (OBRIGATÓRIO)

```
✅ USAR: Material Symbols (Google) ou Lucide React Native
❌ PROIBIDO: Emojis como ícones de UI (🔧 ⚡ 🚗 são para mockup, não para produção)
✅ Tamanho consistente: 24px padrão, 20px compacto, 28px destaque
✅ Filled (preenchido) para itens ativos, Outlined para inativos
✅ Importar de um único pacote (@expo/vector-icons ou react-native-vector-icons)
```

### 7.3 Interação e Feedback

```
✅ Todo elemento clicável DEVE ter feedback visual (opacity, scale, cor)
✅ Botões desabilitados durante operações async (loading state)
✅ Mensagens de erro próximas ao campo com problema
✅ Transições entre 150-300ms (micro-interações)
✅ Skeleton screens para carregamento (não spinner genérico)
✅ Animações com transform/opacity (não width/height — performance)
✅ Haptic feedback em ações importantes (aceitar chamado, confirmar pagamento)
```

### 7.4 Layout Mobile

```
✅ Safe area respeitada (notch, home indicator)
✅ Conteúdo não esconde atrás de navbars fixas (padding correto)
✅ Scroll vertical APENAS — nunca horizontal acidental
✅ Espaçamento de 20px nas laterais (padrão DS V4)
✅ Cards com borderRadius 16px (padrão DS V4)
✅ Bottom nav com 60px de altura + safe area bottom
✅ Z-index escala definida: nav=50, modals=100, toasts=150, overlays=200
```

### 7.5 Design System V4 — Regras de Uso

```
✅ TODAS as cores via tokens (colors.primary, colors.surface, etc.)
❌ NUNCA cor hardcoded (#fdd404 direto no componente)
✅ Fontes: Space Grotesk para headlines, Plus Jakarta Sans para body, JetBrains Mono para dados
❌ NUNCA usar fontes do sistema como fallback em componentes visíveis
✅ Espaçamentos via escala: xs=4, sm=8, md=12, lg=16, xl=20, xxl=24, xxxl=32
✅ Dark mode APENAS — o app não tem light mode (DS V4 é dark-first)
```

### 7.6 Fidelidade ao Design Stitch (REGRA ABSOLUTA)

```
ANTES de implementar QUALQUER tela, a IA DEVE:
1. Abrir o arquivo de design Stitch correspondente
2. Analisar cada detalhe visual: cores, fontes, espaçamentos, ícones, layout
3. Implementar 100% fiel — zero liberdade criativa, zero "melhorias"

Arquivos de design:
  Cliente: MechaGo-FrontEnd/MechaGo (App do Cliente)/DesignCliente/
  Pro:     MechaGo-FrontEnd/MechaGo Pro (App do Profissional)/DesignPro/

Mapa completo de tela → arquivo de design: ver Technical Reference seção 12.4

Se o design mostra um botão amarelo com 16px de border-radius, a implementação
TEM que ter um botão amarelo com 16px de border-radius. Sem exceção.
```

### 7.7 Checklist de Pré-Entrega — UI/UX Pro Max (OBRIGATÓRIO)

> Antes de considerar QUALQUER tela ou componente como "pronto",
> verificar TODOS os itens abaixo. Se um item falhar, a tela NÃO está pronta.

```
VISUAL (fidelidade ao design):
□ Layout 100% fiel ao Stitch (abrir design lado a lado e comparar pixel a pixel)
□ Todas as cores via tokens do DS V4 — ZERO hex hardcoded
□ Fontes: Space Grotesk (headlines), Plus Jakarta Sans (body), JetBrains Mono (dados)
□ Ícones: Material Symbols ou Lucide — ZERO emojis como UI (🔧⚡🚗 são PROIBIDOS)
□ Espaçamentos: escala DS V4 (xs=4, sm=8, md=12, lg=16, xl=20, xxl=24, xxxl=32)
□ Border radius: conforme design (padrão 16px para cards, 12px para inputs)
□ Ícones preenchidos (filled) para estado ativo, outlined para inativo

ACESSIBILIDADE (CRITICAL — UI/UX Pro Max):
□ Touch targets ≥ 44×44px em TODOS os elementos clicáveis (botões, cards, tabs, inputs)
□ Contraste mínimo 4.5:1 para texto normal, 3:1 para texto grande
□ Cor NUNCA é o único indicador (sempre ícone + texto junto)
□ accessibilityLabel em todo botão que só tem ícone
□ accessibilityRole correto em elementos interativos
□ Labels em todos os campos de formulário
□ Texto mínimo 14px no mobile (nunca abaixo de 12px)

INTERAÇÃO (feedback obrigatório):
□ Todo Pressable tem feedback visual (opacity 0.7 ou scale 0.97)
□ Botões desabilitados (opacity 0.5 + disabled) durante operações async
□ Loading: Skeleton component para listas/cards, spinner para ações pontuais
□ Erro: mensagem clara próxima ao campo/contexto + botão "Tentar novamente"
□ Vazio: EmptyState com ícone + texto + CTA quando lista sem itens
□ Transições: 150-300ms para micro-interações (opacity, scale, color)
□ Haptic feedback em ações críticas (confirmar pagamento, aceitar chamado)

LAYOUT (robustez):
□ SafeAreaView como container raiz (notch top + home indicator bottom)
□ Conteúdo não esconde atrás de TopBar ou BottomNav (padding correto)
□ KeyboardAvoidingView em TODA tela com campos de input
□ Scroll vertical APENAS — zero scroll horizontal acidental
□ Testado em largura 375px (iPhone SE) como menor breakpoint
□ Z-index escala: nav=50, modals=100, toasts=150, overlays=200

DADOS (zero mock):
□ ZERO dados hardcoded na UI — tudo vem da API via TanStack Query
□ Loading/erro/vazio tratados para CADA query na tela
□ Dados sensíveis mascarados (CPF: ***.***.789-00, telefone: (11) ****-7777)
□ Números formatados em PT-BR (R$ 95,00 — não R$ 95.00)
□ Datas formatadas em PT-BR (22 mar 2026 — não Mar 22, 2026)
```

### 7.6 Checklist de Pré-Entrega (UI)

Antes de entregar qualquer tela ou componente:

```
□ Nenhum emoji usado como ícone (Material Symbols ou Lucide)
□ Todos os ícones do mesmo pacote e tamanho consistente
□ Touch targets ≥ 44×44px
□ Contraste de texto verificado (mínimo 4.5:1)
□ Loading states em todos os botões com ação async
□ Feedback visual em todos os elementos clicáveis
□ Safe area respeitada (top e bottom)
□ Todas as cores via tokens do DS V4
□ Texto em PT-BR para o usuário
□ Teclado não cobre campos de input (KeyboardAvoidingView)
□ Testado em tela 375px (iPhone SE) — menor suportada
```

---

## 8. PROTOCOLO DE PAIR PROGRAMMING (AKITA XP)

> **Você NÃO É um gerador de código cego. Você é um Par de Pair Programming Sênior.**

### 8.1 Comportamento ao receber um pedido

```
1. INVESTIGAR: Os testes para essa parte já existem?
   → Se NÃO: "Devo criar os testes para esse comportamento primeiro?"
   → Se SIM: verificar se cobrem o novo cenário

2. PROPOSTA SIMPLES: Se o pedido parece complexo, oferecer a versão mínima.
   → "A solução X resolve o problema atual. Quer a versão mais robusta Y
      ou começamos com X e evoluímos se necessário?"
   → EXCEÇÃO: Se o Technical Reference JÁ especifica a solução robusta,
      implementar conforme especificado sem perguntar.

3. COMMITS ATÔMICOS: Focar em entregar exatamente a feature pedida.
   → Uma feature por commit. Testada. Limpa. Funcionando.
   → Não "aproveitar" para refatorar 3 coisas junto.

4. SEM ALUCINAÇÕES: Ser explícito sobre o que assumiu.
   → "Assumi que X porque Y. Se for diferente, me avisa."
   → Se não tem certeza de uma API, tipo ou nome: PERGUNTAR.
```

### 8.2 Refatoração contínua

```
✅ Se o arquivo passou de 200 linhas → propor extração
✅ Se tem código duplicado em 2+ lugares → propor abstração
✅ Se um service tem 5+ dependências → propor quebra em sub-services
✅ O momento de refatorar é AGORA, não "num sprint futuro"
✅ Toda refatoração DEVE manter os testes passando
```

### 8.3 Anti-patterns da IA que você deve evitar

```
❌ Dizer "sim" para tudo sem questionar a abordagem
❌ Criar abstrações prematuras "para o futuro" (YAGNI)
❌ Gerar classes monstras de 500+ linhas
❌ Adicionar dependências sem justificativa clara
❌ "Melhorar" código que já funciona e está testado sem ser pedido
❌ Inventar nomes de funções/variáveis que não existem no projeto
❌ Esconder complexidade — se a implementação tem trade-offs, FALAR
```

### 8.4 Segurança como hábito (não sprint)

```
A cada linha de código, verificar automaticamente:
□ Input está validado com Zod?
□ Endpoint tem autenticação?
□ Recurso verifica se pertence ao usuário (autorização)?
□ Query tem risco de N+1?
□ Dados sensíveis estão sendo logados?
□ Resposta expõe dados internos que o cliente não deveria ver?

Se identificar um problema de segurança que o desenvolvedor NÃO pediu:
→ AVISAR proativamente. Segurança não precisa de ticket.
```

---

## 9. REGRAS DE NEGÓCIO CRÍTICAS

> **A IA DEVE consultar o `MechaGo_Technical_Reference.md` para detalhes completos. Aqui estão apenas os invariantes que NUNCA podem ser violados:**

1. **Foto obrigatória**: Serviço NUNCA pode ser encerrado sem foto. O endpoint `/complete` DEVE rejeitar se `completionPhotoUrl` é null.

2. **Margem ±25%**: Se o profissional definir preço fora de ±25% da estimativa, o campo `priceJustification` é OBRIGATÓRIO. A API deve rejeitar sem justificativa.

3. **Matching por tipo de veículo**: O profissional SÓ recebe chamados de tipos que estão no seu array `vehicleTypes`. A query PostGIS DEVE filtrar por isso.

4. **Fila de espera**: NUNCA retornar "nenhum profissional encontrado". Se ninguém aceitar, o status vai para `waiting_queue` e o cliente vê posição + alternativas.

5. **Split de pagamento**: TODA transação passa pelo Mercado Pago com split. Dinheiro NUNCA toca a conta da plataforma diretamente — o MP faz a divisão.

6. **Cancelamento**: Os 6 cenários de cancelamento do PRD V3 são inegociáveis. Implementar EXATAMENTE conforme a tabela no Technical Reference.

7. **GPS validação**: O `POST /arrived` DEVE verificar que o profissional está a menos de 200m do cliente via PostGIS. Não aceitar "cheguei" sem proximidade GPS.

---

## 10. TESTES — TDD OBRIGATÓRIO (PROTOCOLO AKITA XP)

> **Regra inegociável: NUNCA escreva código de produção sem teste.**
> Testes são a rede de segurança que permite refatorar agressivamente. Sem teste, sem merge.

### Fluxo TDD (Red → Green → Refactor)

1. **Red**: Escreva o teste PRIMEIRO descrevendo o comportamento esperado. O teste DEVE falhar.
2. **Green**: Escreva o código MÍNIMO para fazer o teste passar. Sem otimização, sem elegância.
3. **Refactor**: Com o teste verde, refatore o código para ficar limpo. O teste garante que nada quebrou.

### Quando a IA recebe um pedido de implementação:

```
1. ANTES de codar → Perguntar: "Devo criar os testes para esse comportamento primeiro?"
2. Se o desenvolvedor disser sim → Criar teste, confirmar que falha, só então implementar
3. Se o desenvolvedor disser "implementa direto" → Implementar E entregar o teste junto
4. NUNCA entregar código sem teste correspondente
```

### O que testar (prioridade)

1. **Services** (lógica de negócio): unit tests com Vitest — TODA function pública
2. **Pricing**: fórmula de preço com TODOS os multiplicadores (10+ test cases)
3. **Cancelamento**: os 6 cenários do PRD V3 (6 test cases mínimo)
4. **Matching**: query PostGIS retorna profissionais corretos por tipo/raio/horário
5. **Webhooks**: validação HMAC do Mercado Pago (aceita válido, rejeita inválido)
6. **Auth**: registro, login, refresh token, token expirado, token inválido
7. **Validação Zod**: inputs malformados são rejeitados corretamente

### O que NÃO testar (para não perder tempo no MVP)

- Componentes de UI puramente visuais (testar manualmente)
- Queries Drizzle simples (findById, create) — o ORM já é testado
- Configuração de infraestrutura (Docker, env vars)

### Framework e estrutura

```
apps/api/src/modules/<nome>/
├── <nome>.service.ts
├── <nome>.service.test.ts    ← Teste ao lado do arquivo
├── <nome>.repository.ts
└── ...
```

### Exemplo de teste correto

```typescript
// pricing.service.test.ts
import { describe, it, expect } from "vitest";
import { calculateEstimate, validateFinalPrice } from "./pricing.service";

describe("PricingService", () => {
  describe("calculateEstimate", () => {
    it("deve calcular preço base para carro urbano diurno", () => {
      const result = calculateEstimate({
        problemType: "battery",
        vehicleType: "car",
        context: "urban",
        hour: 14,
        distanceKm: 3,
      });
      // Base bateria: R$115 × carro ×1.0 × dia ×1.0 × urbano ×1.0 × ≤5km ×1.0
      expect(result.estimatedPrice).toBeCloseTo(115, 0);
    });

    it("deve aplicar multiplicador noturno ×1.25", () => {
      const result = calculateEstimate({
        problemType: "battery",
        vehicleType: "car",
        context: "urban",
        hour: 23,
        distanceKm: 3,
      });
      expect(result.estimatedPrice).toBeCloseTo(143.75, 0);
      expect(result.timeMultiplier).toBe(1.25);
    });

    it("deve aplicar multiplicador de caminhão ×2.0", () => {
      const result = calculateEstimate({
        problemType: "battery",
        vehicleType: "truck",
        context: "urban",
        hour: 14,
        distanceKm: 3,
      });
      expect(result.vehicleMultiplier).toBe(2.0);
    });

    it("deve acumular multiplicadores: rodovia + noturno + distância", () => {
      const result = calculateEstimate({
        problemType: "tire",
        vehicleType: "car",
        context: "highway",
        hour: 1, // Noturno
        distanceKm: 20, // 15km+
      });
      // Base pneu R$55 × carro ×1.0 × noturno ×1.25 × rodovia ×1.15 × 15km+ ×1.25
      expect(result.estimatedPrice).toBeCloseTo(55 * 1.0 * 1.25 * 1.15 * 1.25, 0);
    });
  });

  describe("validateFinalPrice", () => {
    it("deve aceitar preço dentro de ±25%", () => {
      expect(() =>
        validateFinalPrice({ estimatedPrice: 100, finalPrice: 120 })
      ).not.toThrow();
    });

    it("deve rejeitar preço fora de ±25% sem justificativa", () => {
      expect(() =>
        validateFinalPrice({
          estimatedPrice: 100,
          finalPrice: 130,
          justification: undefined,
        })
      ).toThrow("PRICE_JUSTIFICATION_REQUIRED");
    });

    it("deve aceitar preço fora de ±25% COM justificativa", () => {
      expect(() =>
        validateFinalPrice({
          estimatedPrice: 100,
          finalPrice: 130,
          justification: "Peça adicional necessária",
        })
      ).not.toThrow();
    });
  });
});

---

## 11. GIT E DEPLOY

### Branches
- `main`: produção (protegida)
- `develop`: integração
- `feat/<nome>`: features
- `fix/<nome>`: correções

### Commits (Conventional Commits)
```

feat(matching): implement PostGIS proximity query for professional search
fix(payments): validate HMAC signature before processing webhook
refactor(auth): migrate from bcrypt to argon2 for password hashing
chore(deps): update drizzle-orm to 0.36.1

```

### Deploy
- API: Railway (auto-deploy do branch `main`)
- Mobile: EAS Build + EAS Submit
- Banco: Railway PostgreSQL (com PostGIS extension)
- Redis: Railway Redis
- Storage: Cloudflare R2

---

## 11.5 NUMERAÇÃO DE TASKS (OBRIGATÓRIO)

> **Números inteiros de tasks (01, 02, 03... 06, 07...) são reservados para marcos
> principais do Roadmap e mapeiam para sprints. NUNCA avançar o número inteiro para
> quebrar uma task em partes menores.**

### Padrão de sub-numeração

```
Task XX      → Task principal (marco do Roadmap)
Task XX.1    → Sub-task 1
Task XX.2    → Sub-task 2
Task XX.N    → Sub-task N
```

### Regras

```
1. NUNCA avançar o número inteiro para quebrar uma task:
   ❌ Task 05 grande → Task 06, 07, 08, 09
   ✅ Task 05 grande → Task 05, 05.1, 05.2, 05.3, 05.4

2. Cada sub-task referencia o pré-requisito correto:
   Task 05.2 → Pré-requisito: Task 05.1

3. Mapeamento Roadmap → Tasks:
   Tasks 01-05.x  → MVP / Beta Fechado (Sprint 1-6)
   Tasks 06-09.x  → V1.0 / Produção Aberta (Sprint 7-10)
   Tasks 10-13.x  → V1.5 / Expansão (Sprint 11-14)
   Tasks 14+      → V2.0 / Plataforma (Sprint 15+)

4. Arquivos: Tasks/05.md, Tasks/05.1.md, Tasks/05.2.md, etc.
```

---

## 12. QUANDO TIVER DÚVIDA

1. **Consultar** `MechaGo_Technical_Reference.md` primeiro
2. **Se a resposta não estiver lá**, perguntar ao desenvolvedor antes de assumir
3. **Se for decisão arquitetural nova**, explicar trade-offs e pedir confirmação
4. **NUNCA inventar** nomes de funções, tabelas ou variáveis que não existem no projeto
5. **NUNCA gerar código parcial** com `// ... resto do código`. Entregar completo.

---

> **Lembrete final**: O MechaGo é um produto real que vai para produção. Cada linha de código importa. Segurança não é feature, é requisito. Performance não é otimização prematura, é respeito pelo usuário com 3G numa rodovia ou no subsolo de um estacionamento urbano. Código limpo não é perfeccionismo, é a diferença entre um app que escala e um que morre em 6 meses.
```
