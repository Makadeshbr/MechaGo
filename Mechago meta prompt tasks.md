# MechaGo — Guia de Geração de Tasks (Meta-Prompt)

> **Para quem é este documento**: Qualquer IA que precise gerar tasks ou código para o MechaGo.
>
> **Documentos obrigatórios no contexto (TODOS):**
>
> 1. `RULES.md` — Regras comportamentais e padrões de código
> 2. `MechaGo_Technical_Reference.md` — Arquitetura, schemas, endpoints, mapa de telas
> 3. `Mechago roadmap completo.md` — Fases do produto com specs técnicas
> 4. `Mechago contratos futuros.md` — Blueprints de tabelas/endpoints pós-beta

> **Baseline técnica atual (já aplicada):**
>
> - `RULES.md` e `MechaGo_Technical_Reference.md` já estão alinhados ao repo real
> - Contratos compartilhados já extraídos para `packages/shared` devem ser reutilizados, não recriados localmente
> - `apps/cliente` e `apps/pro` não podem importar `apps/api/src`
> - Limpezas estruturais já aplicadas no repo entram como baseline técnica, não como escopo funcional novo de task

---

## MODELO DE TRABALHO

### Como funciona

```
1. O desenvolvedor pede uma feature: "Implementar módulo de vehicles + tela de cadastro"
2. A IA da IDE consulta os documentos de referência para entender:
   - Qual schema Drizzle (Technical Reference seção 4)
   - Quais endpoints (Technical Reference seção 6)
   - Qual tela e qual arquivo de design Stitch (Technical Reference seção 12)
   - Quais regras seguir (RULES.md)
3. A IA da IDE ABRE o arquivo de design Stitch correspondente
4. A IA da IDE gera o código CONECTADO aos arquivos reais do projeto
5. Backend + Frontend são implementados JUNTOS na mesma entrega
```

### Por que a IA da IDE gera o código (não documentos externos)

A IA da IDE tem acesso aos arquivos reais do projeto. Ela sabe o que já existe, quais imports estão disponíveis, quais componentes já foram criados. Documentos externos fornecem contexto e regras. A IA da IDE executa com base nesse contexto.

Antes de gerar uma nova task, a IA DEVE distinguir:

- **baseline técnica já aplicada**: hardening, correções de contrato, remoção de import cruzado, limpeza de type-safety
- **escopo funcional novo**: feature, endpoint, tela ou fluxo ainda não entregue

Task nova só deve listar o que ainda é escopo funcional pendente.

---

## REGRA FUNDAMENTAL: BACKEND + FRONTEND JUNTOS

> **A partir da Task 03, TODA implementação inclui backend E frontend.**
> Nunca entregar só a API sem a tela. Nunca entregar só a tela sem a API.
> Cada feature é uma fatia vertical: schema → endpoint → hook → tela.

**Exceções (só backend):**

- Task 01: Setup infraestrutura (Docker, banco, Hono base)
- Task 02: Auth module (endpoints — a tela de login entra na Task 03)

**Ordem de implementação dentro de cada feature (Akita XP Pair):**

```
1. BACKEND:
   a. Escrever TESTE unitário primeiro (service.test.ts) — cenário feliz + erros
   b. Implementar: schema Drizzle → repository → service → routes
   c. Escrever TESTE de integração (API + Banco + Redis)
   d. Verificar: todos os testes passam ✅

2. FRONTEND:
   a. ABRIR o design Stitch correspondente
   b. Escrever TESTE de integração/E2E (tela renderiza? fluxo real funciona sem mocks? assets ok?)
   c. Implementar: hook TanStack Query → componente → tela fiel ao design
   d. Verificar: teste passa ✅, visual bate com design ✅

3. INTEGRAÇÃO E VALIDAÇÃO FINAL:
   a. Testar fluxo completo (tela → API → banco → response → tela atualiza)
   b. Rodar TODA a suíte de testes do módulo (Unit + Integration + E2E)
   c. Verificar estados: loading, erro, vazio, sucesso
   d. MANDATÓRIO: Nenhuma task é considerada pronta sem que 100% dos testes passem.

4. REFATORAÇÃO (AGORA, não depois):
   a. Componente duplicado em 2+ telas? → Extrair para src/components/ui/
   b. Hook duplicado? → Extrair para src/hooks/
   c. Arquivo com 200+ linhas? → Quebrar
```

### Comportamento da IA (Akita XP Pair)

```
ANTES de implementar, a IA DEVE perguntar:
→ "Essa feature tem teste? Devo criar os testes primeiro?"

Se o pedido parecer complexo, a IA DEVE propor:
→ "A versão mínima que resolve o problema atual é X.
    Quer X ou a versão mais completa Y?"
→ EXCEÇÃO: Se o Technical Reference já especifica a versão robusta, implementar direto.

A cada entrega, a IA DEVE verificar:
→ "Tem código duplicado com outras telas/módulos? Devo refatorar?"
→ "Arquivo passou de 200 linhas? Devo quebrar?"

A IA NUNCA deve:
→ Dizer "sim" para tudo sem questionar
→ Criar abstrações "para o futuro" que ninguém pediu (YAGNI)
→ Empilhar código sem refatorar
→ Esconder complexidade — se tem trade-off, FALAR
```

---

## REGRA ABSOLUTA: FIDELIDADE VISUAL AO DESIGN STITCH

> **Toda tela implementada em React Native DEVE ser 100% fiel ao design Stitch.**
> A IA DEVE abrir o arquivo de design ANTES de implementar qualquer tela.
> Cores, espaçamentos, tipografia, hierarquia, ícones, layout — TUDO fiel.
> Zero liberdade criativa. Zero "melhorias". O design já foi aprovado.

### Localização dos arquivos de design

```
MechaGro-FrontEnd/
├── MechaGo (App do Cliente)/DesignCliente/    ← Telas do cliente
└── MechaGo Pro (App do Profissional)/DesignPro/ ← Telas do profissional
```

### Processo obrigatório ao implementar uma tela

```
1. ABRIR o arquivo de design Stitch correspondente (ver Technical Reference seção 12.4)
2. ANALISAR: cores, fontes, espaçamentos, ícones, layout, hierarquia
3. IMPLEMENTAR em React Native respeitando 100% o design
4. CONECTAR ao endpoint backend via hook TanStack Query
5. TRATAR estados obrigatórios:
   - Loading: Skeleton component (não spinner genérico)
   - Erro: mensagem clara próxima ao contexto + botão "Tentar novamente"
   - Vazio: EmptyState com ícone + texto + CTA
   - Sucesso: feedback visual (animação sutil ou navegação)
6. APLICAR regras de acessibilidade (UI/UX Pro Max — CRITICAL):
   - Touch targets: mínimo 44×44px em TODOS os elementos clicáveis
   - Contraste: mínimo 4.5:1 para texto normal, 3:1 para texto grande
   - Ícones: Material Symbols ou Lucide — NUNCA emojis como ícones de UI
   - Feedback: todo Pressable deve ter visual feedback (opacity ou scale)
   - Teclado: KeyboardAvoidingView em telas com input
   - Safe area: SafeAreaView como container raiz
7. VALIDAR com checklist de pré-entrega (ver abaixo)
```

### Checklist de pré-entrega (OBRIGATÓRIO antes de considerar tela pronta)

```
VISUAL:
□ Layout 100% fiel ao design Stitch (abrir lado a lado e comparar)
□ Todas as cores via tokens do DS V4 (nenhum hex hardcoded)
□ Fontes corretas: Space Grotesk (headlines), Plus Jakarta Sans (body), JetBrains Mono (dados)
□ Ícones do mesmo pacote (Material Symbols ou Lucide) — zero emojis como UI
□ Espaçamentos via escala do DS V4 (xs=4, sm=8, md=12, lg=16, xl=20, xxl=24)

ACESSIBILIDADE:
□ Touch targets ≥ 44×44px em botões, cards clicáveis, tabs, inputs
□ Contraste de texto verificado (mínimo 4.5:1)
□ Cor NUNCA é o único indicador (ícone + texto junto)
□ Labels em todos os campos de formulário (accessibilityLabel)

INTERAÇÃO:
□ Loading state: Skeleton ou spinner durante fetch
□ Error state: mensagem clara + ação de retry
□ Empty state: ilustração + texto + CTA quando lista vazia
□ Pressable feedback: opacity/scale em todo elemento clicável
□ Botões desabilitados durante operações async
□ Transições suaves entre estados (150-300ms)

LAYOUT:
□ SafeAreaView como container raiz (notch + home indicator)
□ Conteúdo não esconde atrás de navbar/tab bar (padding correto)
□ KeyboardAvoidingView em telas com input
□ Testado em largura 375px (iPhone SE — menor suportada)
□ Scroll vertical apenas — zero horizontal acidental

DADOS:
□ ZERO dados hardcoded — tudo vem da API via TanStack Query
□ Estados de loading/erro/vazio tratados para cada query
□ Dados sensíveis (CPF, telefone) mascarados onde apropriado
```

---

## DADOS: ZERO MOCK EM PRODUÇÃO

```
❌ PROIBIDO: Dados hardcoded na UI ("Carlos Silva", "Honda Civic 2019")
✅ CORRETO: Todos os dados vêm da API via TanStack Query hooks
✅ CORRETO: Se não tem dado, exibir estado vazio (EmptyState component)
✅ CORRETO: Se está carregando, exibir skeleton (Skeleton component)
✅ CORRETO: Se deu erro, exibir mensagem de erro (ErrorState component)

Exceção: TESTES (*.test.ts) e SEEDS (scripts/seed.ts) podem usar
dados de packages/shared/src/test-fixtures.ts
```

---

## DECISÕES TÉCNICAS IMUTÁVEIS

| Categoria     | Decisão                 | Motivo                      |
| ------------- | ----------------------- | --------------------------- |
| HTTP          | Hono 4.x                | Performance, OpenAPI nativo |
| ORM           | Drizzle                 | Type-safe, SQL real         |
| Banco         | PostgreSQL 16 + PostGIS | Geoespacial                 |
| Cache         | Redis 7 + BullMQ        | Matching, jobs async        |
| Real-time     | Socket.IO 4.x           | Tracking, chat              |
| JWT           | jose (não jsonwebtoken) | Web Crypto nativo           |
| Hash          | Argon2 (não bcrypt)     | Resistente a GPU            |
| Validação     | Zod 3.x                 | Zero trust, OpenAPI         |
| Docs API      | Scalar                  | UI moderna                  |
| Pagamento     | Mercado Pago            | Pix, split                  |
| Storage       | Cloudflare R2           | S3-compat, sem egress fee   |
| Push          | FCM                     | Tópicos geográficos         |
| Mobile        | Expo SDK 54 + Router 6  | Dev build, file-based       |
| Server state  | TanStack Query v5       | Cache, refetch              |
| Client state  | Zustand 5               | Leve                        |
| Local storage | MMKV                    | 10x AsyncStorage            |
| Monorepo      | Turborepo               | Build incremental           |

### Regras de negócio codificadas

| Regra                      | Valor        |
| -------------------------- | ------------ |
| Veículo carro              | ×1.0         |
| Veículo moto               | ×0.85        |
| Veículo SUV                | ×1.15        |
| Veículo caminhão           | ×2.0         |
| Noturno (22h-6h)           | ×1.25        |
| Feriado                    | ×1.20        |
| Rodovia                    | ×1.15        |
| Rural                      | ×1.30        |
| Margem profissional        | ±25%         |
| SLA aceite                 | 3 minutos    |
| Comissão fundador          | 0% (6 meses) |
| Comissão padrão            | 10%          |
| Max veículos/cliente       | 5            |
| Max cancelamentos/mês pro  | 2            |
| Foto obrigatória conclusão | sim          |
| Nota mínima ativa          | 3.5          |
| GPS validação "cheguei"    | <200m        |

---

## COMO PEDIR UMA IMPLEMENTAÇÃO

### Exemplo correto

```
Implementar módulo de Vehicles completo:

BACKEND:
- Schema já existe em db/schema/vehicles.ts
- Criar módulo completo em modules/vehicles/ (schemas, repository, service, routes)
- Endpoints: GET /vehicles, POST /vehicles, PATCH /vehicles/:id, DELETE /vehicles/:id
- Testes TDD para o service
- Registrar rotas no app.ts

FRONTEND:
- Abrir design: MechaGro-FrontEnd/MechaGo (App do Cliente)/DesignCliente/adicionar_ve_culo_mechago/
- Implementar tela 100% fiel ao design
- Conectar ao POST /vehicles via useVehicles.create
- Loading state, error state, sucesso → navegar para home

Consultar: Technical Reference seção 4 (schema), seção 6 (endpoints), seção 12 (mapa de telas)
Seguir: RULES.md (padrões, segurança, TDD)
```

### O que NÃO fazer ao pedir

```
❌ "Cria a API de veículos" (só backend, cadê o frontend?)
❌ "Faz uma tela bonita de cadastro" (cadê a referência ao design Stitch?)
❌ "Implementa como achar melhor" (seguir docs, zero liberdade)
❌ "Usa dados de exemplo" (dados vêm da API, não hardcoded)
```

---

## ESTRUTURA DE TASK (.md) — SE NECESSÁRIO

```markdown
# Task XX — [Nome]

> Sprint: X | Pré-requisito: Task XX

## CONTEXTO

[O que e por quê]

## BACKEND

[Schemas, endpoints, services, testes]
[Referência: Technical Reference seção X]

## FRONTEND

[OBRIGATÓRIO: "Abrir design: MechaGro-FrontEnd/.../[pasta exata]/"]
[OBRIGATÓRIO: "Visual 100% fiel ao design"]
[Telas, hooks, componentes]
[Referência: Technical Reference seção 12]

## O QUE NÃO FAZER

## CHECKLIST

[Backend: endpoint X retorna Y]
[Frontend: tela X exibe dados reais do endpoint Y]
[Integração: fluxo completo funciona]
```

---

## REGRA DE NUMERAÇÃO DE TASKS (OBRIGATÓRIO)

> **Os números inteiros de tasks (01, 02, 03... 06, 07...) são reservados para marcos
> principais do Roadmap e mapeiam para sprints.**
> Se uma task precisa ser quebrada em partes menores, usar sub-numeração decimal.

### Padrão

```
Task XX      → Task principal (marco do Roadmap)
Task XX.1    → Sub-task 1 (mesma sprint ou sprint seguinte)
Task XX.2    → Sub-task 2
Task XX.N    → Sub-task N
```

### Exemplo real

```
Tasks/
├── 05.md      Professionals + App Pro bootstrap (Task principal)
├── 05.1.md    Matching engine + real-time
├── 05.2.md    Tracking + diagnostico + resolucao
├── 05.3.md    Payments + reviews + cancelamento
├── 05.4.md    Polimento + deploy MVP
│
├── 06.md      ← Livre para Sprint 7 (V1.0: CI/CD, login social...)
├── 07.md      ← Livre para Sprint 8 (V1.0: KYC, chat...)
```

### Regras

```
1. NUNCA avançar o número inteiro para quebrar uma task em partes.
   ❌ Task 05 grande → Task 06, 07, 08, 09
   ✅ Task 05 grande → Task 05, 05.1, 05.2, 05.3, 05.4

2. Cada sub-task DEVE referenciar o pré-requisito correto:
   Task 05.2 → Pré-requisito: Task 05.1

3. Os números inteiros seguem a ordem do Roadmap:
   Tasks 01-05.x  → MVP / Beta Fechado (Sprint 1-6)
   Tasks 06-09.x  → V1.0 / Produção Aberta (Sprint 7-10)
   Tasks 10-13.x  → V1.5 / Expansão (Sprint 11-14)
   Tasks 14+      → V2.0 / Plataforma (Sprint 15+)

4. Se uma sub-task precisar ser dividida novamente, usar segundo nível:
   Task 05.2.1, 05.2.2 (evitar — preferir reescrever a sub-task)
```

---

## QUANDO A IA TIVER DÚVIDA

```
1. Technical Reference (arquitetura, schemas, mapa de telas)
2. RULES.md (padrões, segurança, TDD, UI/UX)
3. `Mechago roadmap completo.md` (specs de sprints futuras)
4. `Mechago contratos futuros.md` (blueprints pós-beta)
5. Se não está em nenhum documento → PERGUNTAR ao desenvolvedor
6. NUNCA inventar nomes, funções ou schemas que não existem
```

---

> **RESUMO**: Documentos de referência = fonte da verdade. IA da IDE = executa.
> Backend + frontend = JUNTOS. Toda tela = 100% fiel ao Stitch.
> Zero mock em produção. Zero liberdade criativa no visual.
