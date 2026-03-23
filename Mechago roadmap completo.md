# MechaGo — Roadmap Completo: Do Beta ao Produto Final

> **Propósito**: Este documento define o MechaGo 100% pronto para produção aberta.
> Serve como referência para saber exatamente o que o MVP entrega, o que ficou de fora,
> e o caminho completo até o produto final.
>
> **Versão**: 1.0 — Março 2026

---

## VISÃO GERAL DAS FASES

| Fase                       | Período      | Objetivo                                   | Sprints       |
| -------------------------- | ------------ | ------------------------------------------ | ------------- |
| **MVP / Beta Fechado**     | Semana 1-12  | Validar produto com 20 profissionais reais | Sprint 1-6    |
| **V1.0 — Produção Aberta** | Semana 13-20 | App completo para lançamento público       | Sprint 7-10   |
| **V1.5 — Expansão**        | Semana 21-28 | Escalar features e regiões                 | Sprint 11-14  |
| **V2.0 — Plataforma**      | Semana 29-40 | IA, agendamento, marketplace               | Sprint 15-18+ |

---

## REGRAS TRANSVERSAIS (APLICAM-SE A TODAS AS FASES)

> **1. Backend + Frontend JUNTOS**: Toda sprint entrega API + tela funcionando.
> Nunca entregar só backend. Nunca entregar só frontend. Fatia vertical sempre.
>
> **2. Fidelidade visual**: Toda tela segue 100% o design Stitch. Arquivos em:
> `MechaGo-FrontEnd/MechaGo (App do Cliente)/DesignCliente/` e
> `MechaGo-FrontEnd/MechaGo Pro (App do Profissional)/DesignPro/`
> Ver mapa completo de tela → design no Technical Reference seção 12.4.
>
> **3. TDD (Akita XP)**: Teste primeiro, código depois. Backend: service.test.ts antes do service.ts.
> Frontend: testar que tela renderiza e hook chama endpoint antes de implementar.
>
> **4. Qualidade visual (UI/UX Pro Max)**: Checklist de pré-entrega obrigatório em toda tela.
> Touch targets 44px, contraste 4.5:1, zero emojis como ícones, skeleton loading,
> error states, empty states, formatação PT-BR. Ver RULES.md seção 7.7.
>
> **5. Zero dados mock em produção**: Tudo vem da API. Se não tem dado, exibe estado vazio.
> Dados de teste APENAS em \*.test.ts e scripts/seed.ts.

---

## FASE 1: MVP / BETA FECHADO (Sprint 1-6, Semana 1-12)

### O que o MVP ENTREGA (funcional e testado)

```
✅ Registro e login (email + senha)
✅ Cadastro de veículo (carro, moto, SUV, caminhão)
✅ Fluxo completo de socorro:
   → Selecionar veículo → Selecionar problema → Triagem rápida
   → Estimativa de preço (fórmula V3 com 5 multiplicadores)
   → Pré-pagamento taxa diagnóstico (Pix via Mercado Pago)
   → Matching com profissionais (BullMQ + PostGIS)
   → Tracking GPS em tempo real (Socket.IO)
   → Diagnóstico + foto obrigatória
   → Preço final (±25%) + aprovação do cliente
   → Pagamento com split automático
   → Avaliação bilateral com tags
✅ Fila de espera inteligente (nunca "sem profissional")
✅ Política de cancelamento (6 cenários)
✅ App do profissional (dashboard, receber chamado, navegar, diagnosticar, resolver/escalar)
✅ Detecção automática urbano/rodovia por GPS
✅ Documentação API (Scalar)
✅ Deploy (Railway + EAS Build)
```

### O que o MVP NÃO entrega (cortado deliberadamente)

| Feature cortada                                     | Por quê cortou                                             | Quando entra     |
| --------------------------------------------------- | ---------------------------------------------------------- | ---------------- |
| Login social (Google/Apple)                         | Email+senha valida o produto igual                         | V1.0 (Sprint 7)  |
| Verificação de identidade (selfie + documento)      | Precisa de parceiro KYC, complexo para MVP                 | V1.0 (Sprint 8)  |
| Chat em tempo real (cliente ↔ profissional)         | Ligação telefônica resolve no MVP                          | V1.0 (Sprint 8)  |
| Notificações push segmentadas por região            | Push básico (FCM direto) funciona para 20 profissionais    | V1.0 (Sprint 7)  |
| Modo acompanhante (compartilhar localização)        | Feature de segurança importante mas não bloqueia validação | V1.0 (Sprint 9)  |
| Guincho integrado                                   | Precisa de parceria com empresas de guincho                | V1.5 (Sprint 11) |
| Agendamento de serviço                              | Foge do escopo "socorro" — validar demanda primeiro        | V2.0 (Sprint 15) |
| Triagem por IA (foto do problema)                   | Precisa de dataset + modelo treinado                       | V2.0 (Sprint 16) |
| Dashboard admin (painel de controle da plataforma)  | Drizzle Studio + queries manuais resolvem no beta          | V1.0 (Sprint 9)  |
| Cartão de crédito/débito                            | Pix tem adoção universal no Brasil e é instantâneo         | V1.0 (Sprint 7)  |
| Multi-idioma (i18n)                                 | Brasil-only no MVP, PT-BR hardcoded                        | V2.0 (Sprint 17) |
| Landing page + SEO                                  | Não precisa para beta fechado (convite direto)             | V1.0 (Sprint 10) |
| Termos de uso + LGPD completos                      | Versão básica no beta, jurídico completo no lançamento     | V1.0 (Sprint 10) |
| Sistema de indicação (referral)                     | Não precisa no beta, entra para crescimento orgânico       | V1.5 (Sprint 12) |
| Plano PRO para profissionais                        | Comissão 0% no beta, sistema de planos depois              | V1.5 (Sprint 13) |
| Histórico detalhado com filtros                     | Histórico básico no MVP, filtros avançados depois          | V1.0 (Sprint 8)  |
| Recibo/NF automática                                | Precisa de integração fiscal, complexo                     | V1.5 (Sprint 14) |
| Offline mode (funcionar sem internet)               | Complexo, edge case raro no escopo urbano                  | V2.0             |
| Rate limiting avançado (por rota, por IP, por user) | Rate limiting básico no MVP, avançado na V1                | V1.0 (Sprint 7)  |
| Monitoramento (Sentry, métricas, alertas)           | Logs Pino no MVP, observabilidade completa na V1           | V1.0 (Sprint 7)  |
| Testes E2E automatizados                            | Testes manuais + unit tests no MVP                         | V1.0 (Sprint 10) |
| CI/CD (GitHub Actions)                              | Deploy manual via Railway no MVP                           | V1.0 (Sprint 7)  |
| Cache Redis para queries frequentes                 | Queries diretas no MVP (20 profissionais = baixa carga)    | V1.0 (Sprint 8)  |
| WebSocket reconnection strategy                     | Reconexão básica no MVP, strategy robusta na V1            | V1.0 (Sprint 9)  |
| Background location tracking (profissional)         | Foreground-only no MVP (profissional com app aberto)       | V1.0 (Sprint 9)  |
| Deep linking (abrir app de notificação)             | Push básico no MVP, deep link na V1                        | V1.0 (Sprint 8)  |

---

## FASE 2: V1.0 — PRODUÇÃO ABERTA (Sprint 7-10, Semana 13-20)

> **Objetivo**: App 100% pronto para lançamento público nas stores.
> Tudo que um usuário real espera de um app profissional.

### Sprint 7 (Semana 13-14): Infraestrutura de Produção

```
BACKEND:
□ CI/CD com GitHub Actions (lint → test → build → deploy automático)
□ Monitoramento: Sentry para erros, Uptime Robot para health
□ Rate limiting avançado por rota com Redis
□ Login social (Google OAuth + Apple Sign-In) — endpoint POST /auth/social
□ Cartão de crédito/débito via Mercado Pago SDK (tokenização PCI compliant)
□ Push notifications segmentadas (tópicos FCM por região + tipo)
□ Métricas básicas exportáveis (latência, erro, matching, atendimento)

FRONTEND:
□ Tela de login: adicionar botões Google/Apple (fiel ao design Stitch login_mechago/)
□ Tela de checkout: seletor Pix ou Cartão (fiel ao design estimativa_e_checkout_mechago/)
□ Indicador de reconexão push (badge de status no dashboard Pro)
□ Sentry React Native integrado (crash reporting automático)
□ Aplicar checklist UI/UX Pro Max em todas as telas novas/modificadas
□ Testes TDD para cada hook e tela nova
```

### Sprint 8 (Semana 15-16): Features de Produto

```
BACKEND:
□ KYC para profissionais (tabela verifications, upload presigned URL R2)
□ Chat em tempo real (tabela messages, Socket.IO events chat:send/chat:message)
□ Histórico detalhado com filtros (query paginada com filtros)
□ Deep linking (expo-router scheme mechago://)
□ Cache Redis para queries frequentes (profissionais online, preços, perfil)

FRONTEND:
□ Tela KYC Pro: upload selfie + documento (nova tela, design a ser criado baseado no DS V4)
□ Tela de chat: interface de mensagens dentro do atendimento ativo
   - Fiel ao DS V4: fundo colors.bg, balões em colors.surface/colors.surfaceHigh
   - Input na base, mensagens scrolláveis, indicador "digitando..."
   - Enviar foto (presigned URL R2, mesmo fluxo de diagnóstico)
□ Tela de histórico atualizada: filtros por data/status/tipo/valor
   - Fiel ao design Stitch (DesignCliente/ para cliente, DesignPro/ para pro)
□ Deep linking: push notification abre direto na tela do atendimento
□ Todos os estados: loading (skeleton), erro (retry), vazio (EmptyState)
□ Checklist UI/UX Pro Max em cada tela nova
□ Refatorar componentes duplicados (Akita XP): extrair ChatBubble, FilterBar, etc.
```

### Sprint 9 (Semana 17-18): Segurança e Robustez

```
BACKEND:
□ Modo acompanhante (tabela tracking_shares, endpoint público GET /tracking/share/:token)
□ Background location tracking profissional (expo-location background task)
□ WebSocket reconnection strategy (backoff exponencial, fallback HTTP polling)
□ Dashboard admin (Next.js + Tailwind, deploy Vercel, login admin-only)

FRONTEND (Mobile):
□ Tela modo acompanhante: botão "Compartilhar localização" no tracking
   - Modal com link gerado, opção de compartilhar via WhatsApp/SMS
   - Fiel ao DS V4: glassmorphism card, cores primary
□ Página web do acompanhante: mapa público com posição + ETA + status
   - Responsiva, funciona sem app, botão emergência sempre visível
□ Indicador "Reconectando..." quando WebSocket cair
   - Overlay sutil com StatusPill animado, some quando reconectar
□ Background location Pro: toggle online/offline com aviso de GPS ativo
□ Checklist UI/UX Pro Max em cada tela nova/modificada

FRONTEND (Admin — Next.js):
□ Dashboard: KPIs (atendimentos hoje, receita, profissionais online)
□ Lista de atendimentos ativos e recentes com filtros
□ Lista de profissionais (aprovar KYC, bloquear)
□ Tela de disputas/contestações pendentes
□ Não precisa seguir Stitch (admin é funcional, não é consumer app)
```

### Sprint 10 (Semana 19-20): Lançamento

```
BACKEND:
□ Endpoints LGPD (GET /users/me/data-export, DELETE /users/me, POST /legal/consent)
□ Testes E2E automatizados (fluxo completo no CI)

FRONTEND (Mobile):
□ Tela de consentimento LGPD no registro (checkbox termos + privacidade)
□ Tela "Meus dados" no perfil (exportar dados, solicitar exclusão)
□ Screenshots para stores (App Store + Google Play)
   - Capturar de telas reais do app com dados de seed
   - Seguir guidelines de cada store
□ Production build via EAS Build (não development build)
□ Revisão final do checklist UI/UX Pro Max em TODAS as telas

FRONTEND (Web):
□ Landing page mechago.com.br (Next.js estático)
   - Hero com CTA para download (App Store + Google Play badges)
   - "Como funciona" em 3 passos com ilustrações
   - Seção para profissionais (CTA MechaGo Pro)
   - FAQ, depoimentos reais do beta
   - Footer com links legais (termos, privacidade)
   - SEO: meta tags, Open Graph, structured data
   - Design próprio (não Stitch — landing é web, não app)

PROCESSOS:
□ Termos de uso + Política de privacidade com revisão jurídica
□ Submissão App Store + Google Play
□ Onboarding de profissionais em escala (meta: 100 ativos)
□ Material de treinamento para profissionais
```

---

## FASE 3: V1.5 — EXPANSÃO (Sprint 11-14, Semana 21-28)

```
Sprint 11: Guincho integrado
   □ Parceria com empresas de guincho (API ou webhook)
   □ Cálculo de preço por km (tabela por tipo de veículo)
   □ Tracking do guincho em tempo real
   □ Escala automática: se profissional não resolve → oferece guincho
   □ Pagamento do guincho via split (mesma lógica)

Sprint 12: Sistema de indicação + Growth
   □ Código de referral (cliente e profissional)
   □ Cliente indica amigo → ambos ganham desconto
   □ Profissional indica outro → bônus no primeiro atendimento
   □ Dashboard de referrals no perfil
   □ Compartilhar link em redes sociais

Sprint 13: Plano PRO para profissionais
   □ Plano gratuito: comissão 10%, features básicas
   □ Plano PRO (R$49-99/mês): comissão 15%, mas com:
      - Prioridade no matching (aparece primeiro)
      - Badge "PRO" visível para clientes
      - Relatórios detalhados de ganhos
      - Suporte prioritário
   □ Pagamento recorrente via Mercado Pago
   □ Downgrade automático se inadimplente

Sprint 14: NF/Recibo + Expansão regional
   □ Integração com API de nota fiscal (Enotas, NFe.io)
   □ Geração automática de recibo após atendimento
   □ Envio por email + disponível no histórico
   □ Seed de roadway_info para rodovias de SP, RJ, MG
   □ Testes em novas regiões (Grande SP → Interior SP → RJ)
```

---

## FASE 4: V2.0 — PLATAFORMA (Sprint 15-18+, Semana 29-40+)

```
Sprint 15: Agendamento urbano
   □ Cliente agenda serviço para data/hora futura
   □ Profissional confirma disponibilidade
   □ Lembrete 1h antes (push + SMS)
   □ Cancelamento com política diferente (24h de antecedência)
   □ Não disponível em modo rodovia (só urbano)

Sprint 16: Triagem por IA
   □ Cliente tira foto do problema
   □ Modelo de visão computacional classifica:
      - Tipo de problema (pneu, bateria, motor, etc.)
      - Complexidade estimada
      - Urgência
   □ Substitui a triagem manual de perguntas
   □ Melhora a precisão da estimativa de preço
   □ Dataset: fotos do beta + dados de atendimentos

Sprint 17: Multi-idioma (i18n)
   □ Suporte a espanhol (expansão LATAM)
   □ Suporte a inglês (turistas)
   □ expo-localization + i18next
   □ Todas as strings em arquivos de tradução
   □ Backend: erro messages com locale

Sprint 18+: Features avançadas
   □ Assinatura mensal para clientes (cobertura tipo seguro)
   □ Manutenção preventiva (lembretes baseados em km/tempo)
   □ Marketplace de peças (profissional compra peças pelo app)
   □ API pública para parceiros (seguradoras, frotas, concessionárias)
   □ Programa de certificação para profissionais
   □ Expansão internacional (começando por Argentina, Colômbia)
```

---

## ARQUITETURA: O QUE MUDA DO MVP PARA PRODUÇÃO

### Banco de dados

| MVP                               | Produção (V1.0+)                                 |
| --------------------------------- | ------------------------------------------------ |
| Railway PostgreSQL (plano básico) | Railway PostgreSQL (plano pro) com read replicas |
| Sem backup automatizado           | Backups diários + point-in-time recovery         |
| Drizzle Studio para admin         | Dashboard admin dedicado                         |
| Sem connection pooling            | PgBouncer para connection pooling                |

### Infraestrutura

| MVP                 | Produção (V1.0+)                     |
| ------------------- | ------------------------------------ |
| 1 instância Railway | 2+ instâncias com load balancer      |
| Deploy manual       | CI/CD GitHub Actions                 |
| Logs Pino no stdout | Sentry + logs estruturados + alertas |
| Sem CDN             | Cloudflare CDN para assets estáticos |
| Redis single        | Redis com persistence (AOF)          |

### Segurança

| MVP                  | Produção (V1.0+)                           |
| -------------------- | ------------------------------------------ |
| Rate limiting básico | Rate limiting por rota + por IP + por user |
| Sem WAF              | Cloudflare WAF                             |
| Sem auditoria        | Log de auditoria para ações sensíveis      |
| KYC manual           | KYC automatizado (parceiro)                |
| LGPD básico          | LGPD completo com DPO                      |

### Mobile

| MVP                 | Produção (V1.0+)                 |
| ------------------- | -------------------------------- |
| Development build   | Production build otimizado       |
| Foreground GPS only | Background GPS (profissional)    |
| Push básico         | Push segmentado + deep linking   |
| Sem analytics       | Analytics (Amplitude ou similar) |
| Sem crash reporting | Sentry React Native              |
| Sem OTA updates     | EAS Update para hotfixes         |

---

## MÉTRICAS DE SUCESSO POR FASE

### Beta (Fase 1)

```
- 20 profissionais cadastrados e verificados
- 50+ atendimentos realizados com sucesso
- Tempo médio de matching < 5 minutos
- Nota média dos profissionais > 4.0
- Taxa de cancelamento < 20%
- Zero incidentes de segurança
- Feedback qualitativo de clientes e profissionais
```

### V1.0 (Fase 2)

```
- 100 profissionais ativos
- 500+ atendimentos/mês
- Tempo médio de matching < 3 minutos
- NPS > 50
- Receita mensal > R$5.000 (comissão 10%)
- Uptime > 99.5%
- Crash rate < 1%
```

### V1.5 (Fase 3)

```
- 500 profissionais ativos
- 3.000+ atendimentos/mês
- Cobertura: Grande SP + Interior SP + RJ
- Receita mensal > R$30.000
- Guincho integrado com 2+ parceiros
- 20% dos profissionais no Plano PRO
```

### V2.0 (Fase 4)

```
- 2.000+ profissionais ativos
- 15.000+ atendimentos/mês
- Cobertura: 5+ estados
- Receita mensal > R$150.000
- Triagem IA com >80% de acurácia
- Agendamento representando 20% dos atendimentos
- Primeiro mercado internacional
```

---

## MARCOS DE CONCLUSÃO (A IA CONSULTA AQUI APÓS CADA TASK)

> **Como usar**: Após concluir cada task, a IA verifica se TODOS os itens da fase atual
> estão completos. Se todos estiverem ✅, a fase está PRONTA e pode avançar para a próxima.
> Se faltar algum, gerar a próxima task para cobrir o que falta.
>
> **A IA NÃO precisa saber o número da task.** Ela precisa saber o que falta para a fase
> ficar completa. A task é o veículo, o marco é o destino.

### MARCO: MVP / Beta Fechado — PRONTO QUANDO:

```
BACKEND (todos obrigatórios):
□ Módulo auth: register, login, refresh, logout funcionando
□ Módulo users: GET/PATCH /me funcionando
□ Módulo vehicles: CRUD completo com validação de placa e limite de 5
□ Módulo service-requests: criar pedido, estimativa de preço (fórmula V3)
□ Módulo pricing: 5 multiplicadores (veículo, horário, local, distância, contexto)
□ Módulo matching: BullMQ + PostGIS query + FCM push + fila de espera
□ Módulo tracking: Socket.IO rooms, GPS real-time, status machine (15 estados)
□ Módulo payments: Mercado Pago Pix, pré-auth, captura, split, webhook HMAC
□ Módulo reviews: avaliação bilateral com tags
□ Módulo uploads: presigned URL R2, foto obrigatória na conclusão
□ Política cancelamento: 6 cenários implementados
□ Detecção urbano/rodovia: query PostGIS roadway_info
□ API documentada no Scalar com todos os endpoints
□ Testes passando para TODOS os services
□ Deploy no Railway funcionando

APP CLIENTE — apps/cliente/ (todos obrigatórios):
□ Splash, Login, Cadastro funcionando e fiéis ao design Stitch (DesignCliente/)
□ Cadastro de veículo funcionando
□ Home SOS com botão de socorro e lista de veículos
□ Seleção de veículo + problema + triagem
□ Estimativa de preço exibida corretamente
□ Tela de busca com animação e fila de espera
□ Tela profissional encontrado com dados reais
□ Tracking GPS em tempo real no mapa
□ Tela de atendimento em andamento
□ Aprovação de preço com detalhamento
□ Avaliação com estrelas e tags
□ Tela de serviço concluído
□ Tela de escalada (não resolveu)
□ Zero dados mockados — tudo vem da API
□ Checklist UI/UX Pro Max (RULES.md 7.7) aplicado em todas as telas

APP PROFISSIONAL — apps/pro/ (todos obrigatórios):
□ Splash, Login, Cadastro 4 etapas funcionando e fiéis ao design Stitch (DesignPro/)
□ Dashboard com stats e toggle online/offline
□ Receber novo chamado com countdown
□ Navegação até o cliente (mapa)
□ Tela de diagnóstico com foto
□ Serviço resolvido (preço final + foto obrigatória)
□ Não resolvido / escalada
□ Tela de ganhos
□ Histórico de atendimentos
□ Perfil com especialidades
□ Zero dados mockados — tudo vem da API
□ Checklist UI/UX Pro Max aplicado em todas as telas

INTEGRAÇÃO (todos obrigatórios):
□ Fluxo completo cliente: cadastro → login → socorro → tracking → pagamento → avaliação
□ Fluxo completo pro: login → online → receber → aceitar → navegar → diagnosticar → resolver → pagamento
□ Cancelamento funciona nos 6 cenários
□ Fila de espera funciona quando ninguém aceita
□ Foto obrigatória impede encerramento sem foto
□ Split de pagamento chega para profissional
□ Push notification chega para profissional
□ Deploy: API no Railway, APKs via EAS Build
```

### MARCO: V1.0 / Produção Aberta — PRONTO QUANDO:

```
TUDO do MVP acima MAIS:

BACKEND:
□ Login social (Google + Apple) funcionando
□ Cartão crédito/débito via Mercado Pago
□ KYC: upload documentos + aprovação no admin
□ Chat em tempo real (Socket.IO + tabela messages)
□ Rate limiting avançado por rota
□ Cache Redis para queries frequentes
□ Deep linking configurado
□ Endpoints LGPD (export dados, exclusão, consentimento)
□ CI/CD GitHub Actions (test → build → deploy)
□ Sentry integrado (backend + mobile)
□ forgot-password + reset-password implementados

APP CLIENTE:
□ Botões login social na tela de login
□ Seletor pagamento (Pix ou Cartão)
□ Chat dentro do atendimento ativo
□ Modo acompanhante (compartilhar link tracking)
□ Indicador reconexão WebSocket
□ Tela consentimento LGPD
□ Tela "Meus dados" (exportar/excluir)

APP PROFISSIONAL:
□ KYC: tela upload documentos
□ Banner status verificação no dashboard
□ Chat dentro do atendimento ativo
□ Background location funcionando

WEB:
□ Dashboard admin funcionando (Next.js)
□ Landing page mechago.com.br publicada
□ Termos + privacidade revisados juridicamente

PROCESSOS:
□ App publicado na App Store + Google Play
□ 100 profissionais ativos
□ Testes E2E automatizados no CI
```

### MARCO: V1.5 / Expansão — PRONTO QUANDO:

```
TUDO da V1.0 acima MAIS:
□ Guincho integrado com pelo menos 2 parceiros
□ Sistema de referral (código + recompensa)
□ Plano PRO com pagamento recorrente
□ NF automática após atendimento concluído
□ Cobertura em pelo menos 2 estados (SP + RJ)
```

### MARCO: V2.0 / Plataforma — PRONTO QUANDO:

```
TUDO da V1.5 acima MAIS:
□ Agendamento urbano funcionando
□ Triagem por IA (foto → classificação)
□ Multi-idioma (PT-BR + ES)
□ Cobertura em 5+ estados
```

---

## COMO USAR ESTE DOCUMENTO

1. **Durante o MVP (Sprint 1-6)**: Quando a task disser "não fazer X", consulte este documento para saber QUANDO X será feito e COMO.

2. **Pós-beta**: Use este documento como backlog priorizado. Cada sprint pós-beta (7+) já tem escopo definido. Gerar tasks .md para cada sprint conforme avança.

3. **Decisões de negócio**: Se um investidor ou parceiro perguntar "vocês vão ter X?", este documento responde com timeline.

4. **Priorização**: Se precisar mudar a ordem, mova features entre sprints. Mas nunca pule a V1.0 para ir direto para V2.0 — cada fase constrói em cima da anterior.

---

## ESPECIFICAÇÕES TÉCNICAS PÓS-BETA

> **Para a IA**: Esta seção contém detalhes técnicos suficientes para implementar cada sprint pós-beta
> sem precisar de uma nova sessão de planejamento. Siga o padrão de módulos do `RULES.md`
> (schemas.ts → routes.ts → service.ts → repository.ts) e consulte o `MechaGo_Technical_Reference.md`
> para a arquitetura base.

---

### Sprint 7 — Especificações Técnicas

#### 7.1 Login Social (Google + Apple)

**Dependências mobile:**

```bash
npx expo install expo-auth-session expo-crypto expo-web-browser
```

**Fluxo:**

1. Mobile: `expo-auth-session` abre OAuth flow (Google/Apple)
2. Provider retorna `id_token`
3. Mobile envia `id_token` para `POST /api/v1/auth/social`
4. Backend verifica token com provider (Google: `googleapis.com/oauth2/v3/tokeninfo`, Apple: JWKS de `appleid.apple.com`)
5. Se email existe no banco → login (retorna tokens)
6. Se email NÃO existe → cria conta automaticamente (type inferido do context) → retorna tokens
7. Se email existe MAS foi cadastrado com senha → linkar conta social (pedir confirmação)

**Novo endpoint:**

```
POST /api/v1/auth/social
Body: { provider: "google" | "apple", idToken: string, userType?: "client" | "professional" }
Response: AuthResponse (mesmo formato do login normal)
```

**Schema novo (Drizzle):**

```typescript
// db/schema/social-accounts.ts
export const socialAccounts = pgTable(
  "social_accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: varchar("provider", { length: 20 }).notNull(), // "google" | "apple"
    providerAccountId: varchar("provider_account_id", {
      length: 255,
    }).notNull(),
    email: varchar("email", { length: 255 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    unique: unique().on(t.provider, t.providerAccountId),
  }),
);
```

#### 7.2 Cartão de Crédito/Débito

**Fluxo:**

1. Mobile usa Mercado Pago SDK (WebView tokenizer) para capturar dados do cartão
2. SDK retorna `card_token` (dados do cartão NUNCA tocam nosso servidor — PCI compliance)
3. Backend recebe `card_token` + `amount` e cria pagamento via Mercado Pago API
4. Mesmo split automático do Pix (profissional recebe % líquido)

**Novo campo no payments schema:**

```typescript
// Adicionar ao enum existente
export const paymentMethodEnum = pgEnum("payment_method", [
  "pix", "credit_card", "debit_card"  // já existe, mas confirmar que credit_card e debit_card estão
]);

// Novo campo para armazenar últimos 4 dígitos (para exibição no histórico)
cardLastFour: varchar("card_last_four", { length: 4 }),
cardBrand: varchar("card_brand", { length: 20 }), // "visa", "mastercard", etc.
```

#### 7.3 CI/CD

**GitHub Actions workflow:**

```yaml
# .github/workflows/deploy.yml
name: Deploy API
on:
  push:
    branches: [main]
    paths: [apps/api/**]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgis/postgis:16-3.4
        env: { POSTGRES_DB: test, POSTGRES_USER: test, POSTGRES_PASSWORD: test }
        ports: [5432:5432]
      redis:
        image: redis:7-alpine
        ports: [6379:6379]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run test:run --workspace=apps/api
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/test
          REDIS_URL: redis://localhost:6379

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: bervProject/railway-deploy@main
        with:
          railway_token: ${{ secrets.RAILWAY_TOKEN }}
          service: mechago-api
```

#### 7.4 Rate Limiting Avançado

**Configuração por rota:**

```typescript
// middleware/rate-limit.middleware.ts
import { rateLimiter } from "hono-rate-limiter";

export const authLimiter = rateLimiter({
  windowMs: 60 * 1000, // 1 minuto
  limit: 5, // 5 tentativas
  keyGenerator: (c) => c.req.header("x-forwarded-for") || "unknown",
  store: redisStore, // Redis backend para funcionar com múltiplas instâncias
});

export const createLimiter = rateLimiter({
  windowMs: 60 * 1000,
  limit: 3, // 3 pedidos por minuto (anti-abuse)
  keyGenerator: (c) => c.get("userId") || c.req.header("x-forwarded-for"),
  store: redisStore,
});

export const readLimiter = rateLimiter({
  windowMs: 60 * 1000,
  limit: 60,
  keyGenerator: (c) => c.get("userId") || c.req.header("x-forwarded-for"),
  store: redisStore,
});
```

#### 7.5 Monitoramento (Sentry)

**Backend:**

```bash
npm i @sentry/node
```

**Mobile:**

```bash
npx expo install @sentry/react-native
```

**Integração no Hono:**

```typescript
// Adicionar ao app.ts
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: env.SENTRY_DSN,
  environment: env.NODE_ENV,
  tracesSampleRate: env.NODE_ENV === "production" ? 0.1 : 1.0,
});

// No error-handler, antes de retornar a response:
if (!(err instanceof AppError)) {
  Sentry.captureException(err);
}
```

---

### Sprint 8 — Especificações Técnicas

#### 8.1 Chat em Tempo Real

**Schema novo:**

```typescript
// db/schema/messages.ts
export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  serviceRequestId: uuid("service_request_id")
    .notNull()
    .references(() => serviceRequests.id),
  fromUserId: uuid("from_user_id")
    .notNull()
    .references(() => users.id),
  type: varchar("type", { length: 20 }).notNull(), // "text" | "image"
  content: text("content").notNull(), // texto ou URL da imagem
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

**Socket.IO events (adicionar aos existentes):**

```typescript
// Client → Server
socket.emit("send_message", { requestId, content, type });

// Server → Client
socket.emit("new_message", { id, fromUserId, content, type, createdAt });
socket.emit("message_read", { messageId });
```

**Regras:**

- Chat só funciona durante atendimento ativo (status: accepted → completed)
- Mensagens deletadas automaticamente 7 dias após encerramento (LGPD)
- Job BullMQ agendado: `cleanOldMessages` roda diariamente

#### 8.2 KYC para Profissionais

**Schema novo:**

```typescript
// db/schema/verifications.ts
export const verificationStatusEnum = pgEnum("verification_status", [
  "pending",
  "approved",
  "rejected",
]);

export const verifications = pgTable("verifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  professionalId: uuid("professional_id")
    .notNull()
    .references(() => professionals.id),
  selfieUrl: text("selfie_url").notNull(),
  documentFrontUrl: text("document_front_url").notNull(),
  documentBackUrl: text("document_back_url"),
  documentType: varchar("document_type", { length: 20 }).notNull(), // "rg" | "cnh" | "crea"
  status: verificationStatusEnum("status").notNull().default("pending"),
  rejectionReason: text("rejection_reason"),
  reviewedBy: uuid("reviewed_by").references(() => users.id), // admin que revisou
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

**Novo campo em professionals:**

```typescript
isVerified: boolean("is_verified").default(false).notNull(),
```

**Regra:** Profissional com `isVerified: false` NÃO aparece no matching.

#### 8.3 Deep Linking

**Mobile (expo-router):**

```typescript
// app.json
{
  "expo": {
    "scheme": "mechago",
    "android": { "intentFilters": [...] },
    "ios": { "associatedDomains": ["applinks:mechago.com.br"] }
  }
}
```

**Rotas deep link:**

```
mechago://service/{requestId}      → Abre tela do atendimento ativo
mechago://tracking/{shareToken}    → Abre modo acompanhante (público)
mechago://rating/{requestId}       → Abre tela de avaliação
```

---

### Sprint 9 — Especificações Técnicas

#### 9.1 Modo Acompanhante

**Schema novo:**

```typescript
// db/schema/tracking-shares.ts
export const trackingShares = pgTable("tracking_shares", {
  id: uuid("id").defaultRandom().primaryKey(),
  serviceRequestId: uuid("service_request_id")
    .notNull()
    .references(() => serviceRequests.id),
  shareToken: varchar("share_token", { length: 64 }).notNull().unique(),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  expiresAt: timestamp("expires_at").notNull(), // Expira quando atendimento encerra
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

**Endpoints:**

```
POST /api/v1/tracking/share        → Gera link (retorna shareToken)
GET  /api/v1/tracking/share/:token → Dados públicos (posição, ETA, status) — SEM auth
```

**Regras:**

- Link público (não precisa de conta)
- Mostra APENAS: mapa com posição do profissional, ETA, status do atendimento
- NÃO mostra: dados pessoais, preço, telefone
- Expira automaticamente quando atendimento muda para `completed` ou `cancelled_*`

#### 9.2 Background Location (Profissional)

**Mobile:**

```typescript
// services/background-location.ts
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";

const TASK_NAME = "MECHAGO_PRO_LOCATION";

TaskManager.defineTask(TASK_NAME, async ({ data, error }) => {
  if (error) return;
  const { locations } = data as { locations: Location.LocationObject[] };
  const latest = locations[locations.length - 1];

  // Enviar para API (não Socket.IO — background task não tem acesso ao socket)
  await fetch(`${API_URL}/api/v1/professionals/me/location`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${getToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      latitude: latest.coords.latitude,
      longitude: latest.coords.longitude,
    }),
  });
});

// Iniciar quando profissional fica online
export async function startBackgroundLocation() {
  await Location.startLocationUpdatesAsync(TASK_NAME, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 30000, // A cada 30 segundos
    distanceInterval: 50, // Ou a cada 50 metros
    foregroundService: {
      notificationTitle: "MechaGo Pro",
      notificationBody: "Atualizando localização",
    },
  });
}
```

#### 9.3 Dashboard Admin

**Stack:** Next.js 15 + Tailwind CSS + shadcn/ui
**Deploy:** Vercel (separado do backend)
**Auth:** Login com endpoint existente (`POST /auth/login`), mas verifica `type === "admin"`

**Telas:**

```
/admin/dashboard       → KPIs (atendimentos hoje, receita, profissionais online)
/admin/requests        → Lista de atendimentos ativos e recentes
/admin/requests/:id    → Detalhe de um atendimento (mapa, timeline, chat)
/admin/professionals   → Lista de profissionais (filtrar por status, verificação)
/admin/professionals/:id → Detalhe (aprovar KYC, bloquear, ver histórico)
/admin/disputes        → Contestações de preço pendentes
/admin/metrics         → Gráficos de evolução (atendimentos, receita, tempo matching)
```

---

### Sprint 10 — Especificações Técnicas

#### 10.1 Landing Page

**Stack:** Next.js 15 + Tailwind CSS (mesmo repo admin ou separado)
**Domínio:** mechago.com.br
**Seções:** Hero com download CTA, Como funciona (3 passos animados), Para profissionais (CTA MechaGo Pro), Depoimentos (dados reais do beta), FAQ, Footer com links legais

#### 10.2 LGPD

**Endpoints:**

```
GET    /api/v1/users/me/data        → Exportar todos os dados do usuário (JSON)
DELETE /api/v1/users/me              → Solicitar exclusão de conta
GET    /api/v1/legal/terms           → Termos de uso (versão atual)
GET    /api/v1/legal/privacy         → Política de privacidade
POST   /api/v1/legal/consent         → Registrar consentimento
```

**Schema novo:**

```typescript
// db/schema/consents.ts
export const consents = pgTable("consents", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  type: varchar("type", { length: 50 }).notNull(), // "terms_v1", "privacy_v1", "marketing"
  accepted: boolean("accepted").notNull(),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

**Regras:**

- Exclusão de conta: soft delete (marcar `isActive: false`), dados reais deletados em 30 dias
- Dados de pagamento retidos por 5 anos (obrigação fiscal)
- Exportação de dados em formato JSON legível

---

### Sprint 11-14 — Notas Técnicas

#### Guincho (Sprint 11)

- Nova tabela `tow_companies` com dados dos parceiros
- Novo tipo em `professionalTypeEnum`: já existe (`tow_truck`)
- Preço por km conforme tabela no PRD V3 (Carro: R$5-8/km, Caminhão: R$8-15/km)
- Tracking do guincho usa o mesmo sistema de Socket.IO rooms

#### Referral (Sprint 12)

- Nova tabela `referrals` com `code`, `referrerId`, `referredId`, `reward`, `status`
- Código gerado automaticamente no registro (6 caracteres alfanuméricos)
- Reward creditado após primeiro atendimento concluído do indicado

#### Plano PRO (Sprint 13)

- Nova tabela `subscriptions` com `professionalId`, `planType`, `status`, `currentPeriodEnd`
- Pagamento recorrente via Mercado Pago (assinatura)
- Profissional PRO: `commissionRate` muda para 0.15, mas ganha prioridade no matching (ORDER BY com boost)

#### NF (Sprint 14)

- Integração com API Enotas ou NFe.io
- Nova tabela `invoices` com `serviceRequestId`, `number`, `pdfUrl`, `status`
- Job BullMQ: gerar NF automaticamente após `status: completed`

---

> **NOTA PARA A IA**: Este documento, combinado com o `MechaGo_Technical_Reference.md` e o `RULES.md`,
> contém informação suficiente para implementar QUALQUER sprint do projeto. Para sprints 1-6, use as
> tasks .md detalhadas. Para sprints 7+, use as especificações técnicas desta seção como base para
> gerar as tasks .md correspondentes quando o momento chegar. Siga SEMPRE os padrões do RULES.md.
