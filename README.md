# Mensalito

Sistema de gestão de cobranças para escolas e cursos, com suporte a múltiplos gateways de pagamento, notificações via WhatsApp e arquitetura multi-tenant.

---

## Sumário

- [Visão Geral](#visão-geral)
- [Arquitetura](#arquitetura)
- [Tecnologias](#tecnologias)
- [Funcionalidades](#funcionalidades)
- [Modelo de Dados](#modelo-de-dados)
- [Autenticação e Controle de Acesso](#autenticação-e-controle-de-acesso)
- [Integrações Externas](#integrações-externas)
- [Agendamento Automático](#agendamento-automático)
- [API — Endpoints Principais](#api--endpoints-principais)
- [Frontend — Páginas](#frontend--páginas)
- [Configuração e Variáveis de Ambiente](#configuração-e-variáveis-de-ambiente)
- [Execução Local](#execução-local)
- [Estrutura de Pastas](#estrutura-de-pastas)

---

## Visão Geral

O **Mensalito** é uma plataforma SaaS multi-tenant voltada para escolas, academias e cursos que precisam gerenciar alunos, turmas, matrículas e cobranças mensais de forma automatizada. O sistema integra-se com o **Mercado Pago** para geração de boletos e PIX, com a **Evolution API** para envio de mensagens via WhatsApp, e utiliza o **Supabase** como provedor de autenticação.

Cada escola (tenant) possui um ambiente completamente isolado. Os usuários podem ter o papel de **OWNER** (acesso total) ou **TEACHER** (acesso limitado), sendo possível convidar colaboradores via link.

---

## Arquitetura

```
┌──────────────────────────────┐
│        Frontend (React)       │
│   Vite · TypeScript · Tailwind│
└──────────────┬───────────────┘
               │ HTTPS / REST
┌──────────────▼───────────────┐
│       Backend (Spring Boot)   │
│   Java 21 · Spring Security   │
│   JWT (Supabase) · Flyway     │
└────┬────────┬────────┬───────┘
     │        │        │
 PostgreSQL  Redis  Integrações
             (cache  (Mercado Pago,
             /rate    Evolution API,
             limit)   Supabase Auth)
```

O backend segue o padrão **Controller → Service → Repository** com separação clara de DTOs de request/response. A autenticação é feita pelo Supabase; o backend valida os tokens JWT emitidos pelo Supabase e provisiona os dados locais do tenant/usuário na primeira autenticação.

---

## Tecnologias

### Backend
- **Java 21** com **Spring Boot 3**
- **Spring Security** com filtro JWT customizado
- **Spring Data JPA** + **Hibernate** (DDL validado pelo Flyway)
- **Flyway** para migrações de banco de dados (12 versões)
- **PostgreSQL** como banco de dados principal
- **Redis** para blacklist de tokens, rate limiting e deduplicação do scheduler
- **Lombok** para redução de boilerplate
- **Supabase** como provedor de autenticação (JWT RS256/HS256)

### Frontend
- **React 18** com **TypeScript**
- **Vite** como bundler
- **React Router v6** para roteamento
- **Axios** com interceptors para autenticação automática
- **Tailwind CSS** para estilização
- **Shadcn/UI** como biblioteca de componentes base
- **Supabase JS SDK** para signup/login diretamente no frontend

---

## Funcionalidades

### Gestão de Alunos
- Cadastro completo com nome, email, telefone, documento (CPF/CNPJ) e endereço
- Ativação e desativação de alunos
- Preferência de pagamento por aluno: **PIX** ou **Boleto**
- Página de detalhe do aluno com histórico de cobranças e matrículas

### Turmas e Planos
- Criação de turmas com nome e descrição
- Planos de pagamento com valor e dia de vencimento mensal
- Associação de múltiplos alunos a turmas e planos

### Matrículas
- Vinculação de aluno + turma + plano com data de início e fim
- Ativação e desativação de matrículas
- Somente matrículas ativas geram cobranças

### Cobranças
- **Geração automática** de cobranças mensais (via scheduler às 8h)
- **Geração manual** avulsa com valor customizável
- Integração com **Mercado Pago** para criação de ordens de pagamento (PIX e boleto)
- Status: `PENDING`, `PAID`, `OVERDUE`, `CANCELLED`, `REFUNDED`, `LOST`, `DISPUTED`
- Confirmação manual de pagamento
- Cancelamento de cobranças pendentes ou em atraso
- Proteção contra cobranças duplicadas no mesmo mês

### Notificações via WhatsApp
- Envio automático de cobrança ao criar (PIX ou boleto, com link e linha digitável)
- Lembretes automáticos para cobranças em atraso (às 9h diariamente)
- Reenvio manual de notificação por cobrança
- Mensagens personalizadas com nome do aluno, valor e data de vencimento

### Dashboard
- Receita esperada, recebida e em atraso
- Total de alunos ativos
- Contagem de cobranças pendentes, pagas e em atraso

### Relatórios
- Visão consolidada das cobranças por período

### Configurações
- Configuração da chave da API do Mercado Pago por tenant (salva criptografada)
- Configuração da instância WhatsApp (Evolution API)
- Dados da escola (nome, telefone, documento)
- Troca de senha do usuário

### Professores / Equipe
- Convite de colaboradores por email com papel `TEACHER`
- Link de convite com expiração automática
- Aceite de convite via página dedicada

### Atividade
- Log de atividades recentes no sistema

---

## Modelo de Dados

O banco é gerenciado pelo Flyway com 12 migrações. As entidades principais são:

| Tabela | Descrição |
|---|---|
| `tenants` | Escolas/organizações (multi-tenant) |
| `users` | Usuários vinculados a um tenant, com papel `OWNER` ou `TEACHER` |
| `plans` | Planos de pagamento com valor e dia de vencimento |
| `classes` | Turmas da escola |
| `students` | Alunos com endereço e preferência de pagamento |
| `enrollments` | Matrícula: vínculo entre aluno, turma e plano |
| `charges` | Cobranças geradas por matrícula |
| `invites` | Convites para novos usuários com token e expiração |

Campos adicionados ao longo das migrações:
- Integração com **Mercado Pago**: `mercado_pago_customer_id`, `mercado_pago_order_id`
- Integração com **AbacatePay** (legado): `abacate_pay_checkout_id`, `checkout_url`
- Instância **WhatsApp** por tenant: `evolution_instance_name`, `evolution_instance_key`
- Endereço completo nos alunos
- Flag `manual` nas cobranças para diferenciar cobranças manuais das automáticas
- Campo `whatsapp_sent_at` para rastrear envio das notificações
- Normalização de documentos (somente dígitos)

---

## Autenticação e Controle de Acesso

O fluxo de autenticação funciona da seguinte forma:

1. O usuário realiza login ou cadastro diretamente no **Supabase** via frontend
2. O Supabase retorna um `access_token` JWT
3. O frontend chama `POST /api/auth/provision` para criar (ou recuperar) o tenant e usuário local
4. Todas as requisições subsequentes enviam o token JWT no header `Authorization: Bearer <token>`
5. O `JwtFilter` valida o token junto ao Supabase e popula o `SecurityContext` do Spring

O token JWT pode ser invalidado via `POST /api/auth/logout`, que o insere em uma blacklist no Redis.

Há proteção contra brute force por IP com desbloqueio manual pelo OWNER ou via secret.

**Papéis disponíveis:**
- `OWNER` — acesso completo a todos os recursos
- `TEACHER` — acesso de leitura e operações básicas

---

## Integrações Externas

### Mercado Pago
- Criação de ordens de pagamento (PIX e boleto)
- Recebimento de webhooks em `POST /api/webhooks/mercadopago` para atualização automática de status de cobranças
- A chave de API é configurada por tenant e armazenada de forma criptografada (AES via `EncryptionService`)

### Evolution API (WhatsApp)
- Envio de mensagens de texto e documentos (PDF do boleto)
- Cada tenant pode ter sua própria instância configurada
- Utilizada pelo `WhatsAppClient` e `WhatsAppMessageBuilder`

### Supabase
- Provedor de autenticação (signup, login, confirmação de email)
- Validação de tokens JWT no backend via `JwtService`
- Configurado com `SUPABASE_URL` e `SUPABASE_ANON_KEY`

---

## Agendamento Automático

Dois jobs rodam diariamente:

| Horário | Ação |
|---|---|
| **08h00** | Geração automática das cobranças mensais para todas as matrículas ativas |
| **09h00** | Marcação de cobranças vencidas como `OVERDUE` + envio de lembretes via WhatsApp |

Os jobs utilizam Redis para garantir que a geração não execute mais de uma vez por dia (deduplicação por chave com TTL). O endpoint `POST /api/charges/generate-charges?force=true` permite forçar a geração manualmente.

---

## API — Endpoints Principais

Todos os endpoints (exceto os públicos) requerem o header `Authorization: Bearer <token>`.

### Autenticação
| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/api/auth/provision` | Provisiona tenant e usuário local após confirmação Supabase |
| `POST` | `/api/auth/logout` | Invalida o token no Redis |

### Alunos
| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/students` | Lista alunos paginados |
| `GET` | `/api/students/{id}` | Busca aluno por ID |
| `POST` | `/api/students` | Cria aluno |
| `PATCH` | `/api/students/{id}` | Atualiza aluno |
| `PATCH` | `/api/students/{id}/deactivate` | Desativa aluno (OWNER) |
| `PATCH` | `/api/students/{id}/reactivate` | Reativa aluno (OWNER) |

### Turmas, Planos, Matrículas
| Método | Rota | Descrição |
|---|---|---|
| `GET/POST` | `/api/classes` | Lista / cria turmas |
| `PATCH/DELETE` | `/api/classes/{id}` | Atualiza / remove turma |
| `GET/POST` | `/api/plans` | Lista / cria planos |
| `GET/POST` | `/api/enrollments` | Lista / cria matrículas |
| `PATCH` | `/api/enrollments/{id}/deactivate` | Desativa matrícula |

### Cobranças
| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/charges` | Lista cobranças com filtros (enrollmentId, status, dueDate) |
| `POST` | `/api/charges` | Cria cobrança via gateway |
| `POST` | `/api/charges/manual` | Cria cobrança manual (sem gateway) |
| `PATCH` | `/api/charges/{id}/status` | Atualiza status |
| `PATCH` | `/api/charges/{id}/confirm-payment` | Confirma pagamento manual |
| `PATCH` | `/api/charges/{id}/cancel` | Cancela cobrança |
| `POST` | `/api/charges/{id}/resend-notification` | Reenvia notificação WhatsApp |
| `POST` | `/api/charges/generate-charges` | Dispara geração manual das cobranças |

### Dashboard e Relatórios
| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/dashboard` | Retorna métricas consolidadas |

### Webhooks
| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/api/webhooks/mercadopago` | Recebe notificações de pagamento do Mercado Pago |

### Convites e Usuários
| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/api/invites` | Cria convite para novo usuário |
| `GET` | `/api/invites/{token}` | Valida token de convite |
| `POST` | `/api/invites/{token}/accept` | Aceita convite e cria usuário |
| `GET/PATCH` | `/api/users/me` | Dados do usuário autenticado |

---

## Frontend — Páginas

| Rota | Página | Descrição |
|---|---|---|
| `/` | LandingPage | Página inicial pública |
| `/login` | LoginPage | Login via Supabase |
| `/register` | RegisterPage | Cadastro de nova escola |
| `/register?invite=...` | AcceptInvitePage | Aceite de convite |
| `/auth/callback` | AuthCallbackPage | Callback do Supabase após confirmação de email |
| `/app/dashboard` | DashboardPage | Métricas e resumo financeiro |
| `/app/students` | StudentsPage | Listagem e gestão de alunos |
| `/app/students/:id` | StudentDetailPage | Detalhe do aluno com cobranças e matrículas |
| `/app/plans` | PlansPage | Gestão de planos de pagamento |
| `/app/classes` | ClassesPage | Gestão de turmas |
| `/app/enrollments` | EnrollmentsPage | Gestão de matrículas |
| `/app/charges` | ChargesPage | Listagem e gestão de cobranças |
| `/app/reports` | ReportsPage | Relatórios financeiros |
| `/app/whatsapp` | WhatsAppPage | Configuração e status do WhatsApp |
| `/app/teachers` | TeachersPage | Gestão de professores e convites |
| `/app/activity` | ActivityPage | Log de atividades |
| `/app/billing` | BillingPage | Plano e faturamento do sistema |
| `/app/settings` | SettingsPage | Configurações da escola, API keys e senha |

---

## Configuração e Variáveis de Ambiente

### Backend (`application.yaml`)

| Variável | Descrição |
|---|---|
| `DB_URL` | URL de conexão PostgreSQL (ex: `jdbc:postgresql://host:5432/mensalito`) |
| `DB_USERNAME` | Usuário do banco |
| `DB_PASSWORD` | Senha do banco |
| `REDIS_URL` | URL do Redis (ex: `redis://localhost:6379`) |
| `SUPABASE_URL` | URL do projeto Supabase |
| `SUPABASE_ANON_KEY` | Chave anon/pública do Supabase |
| `MERCADOPAGO_WEBHOOK_SECRET` | Secret para validação de webhooks do Mercado Pago |
| `ENCRYPTION_SECRET` | Chave para criptografia AES das API keys dos tenants |
| `EVOLUTION_API_URL` | URL base da Evolution API |
| `EVOLUTION_API_KEY` | Chave global da Evolution API |
| `EVOLUTION_INSTANCE` | Nome da instância padrão (opcional) |
| `FRONTEND_URL` | URL do frontend (para geração de links em convites) |
| `ADMIN_SECRET` | Secret para operações administrativas (ex: desbloqueio de IP) |
| `TRUSTED_PROXIES` | IPs de proxies confiáveis para extração do IP real (opcional) |

### Frontend (`.env`)

| Variável | Descrição |
|---|---|
| `VITE_API_URL` | URL base da API backend (ex: `https://api.mensalito.com.br/api`) |
| `VITE_SUPABASE_URL` | URL do projeto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Chave anon/pública do Supabase |

---

## Execução Local

### Pré-requisitos
- Java 21+
- Node.js 18+
- PostgreSQL 14+
- Redis 7+
- Conta no Supabase (gratuita)

### Backend

```bash
# Clone o repositório e entre na pasta do backend
cd backend

# Configure as variáveis de ambiente (crie um .env ou exporte diretamente)
export DB_URL=jdbc:postgresql://localhost:5432/mensalito
export DB_USERNAME=postgres
export DB_PASSWORD=postgres
export REDIS_URL=redis://localhost:6379
export SUPABASE_URL=https://xxxxxxxxxxx.supabase.co
export SUPABASE_ANON_KEY=eyJ...
export ENCRYPTION_SECRET=uma-chave-de-32-caracteres-aqui!!
export FRONTEND_URL=http://localhost:5173
export ADMIN_SECRET=admin-secret-local

# Execute o banco e Redis via Docker (opcional)
docker run -d -p 5432:5432 -e POSTGRES_DB=mensalito -e POSTGRES_PASSWORD=postgres postgres:16
docker run -d -p 6379:6379 redis:7

# Build e execução
./mvnw spring-boot:run
# A API ficará disponível em http://localhost:8080
```

### Frontend

```bash
# Entre na pasta do frontend
cd frontend

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env
# Edite o .env com suas credenciais

# Execute em desenvolvimento
npm run dev
# O frontend ficará disponível em http://localhost:5173
```

---

## Estrutura de Pastas

```
backend/src/main/java/com/mensalito/api/
├── client/           # Clientes HTTP (Mercado Pago, WhatsApp, Evolution)
├── config/           # Configurações Spring (CORS, Security, integrações)
├── controller/       # Controllers REST
├── dto/
│   ├── request/      # DTOs de entrada
│   └── response/     # DTOs de saída
├── exception/        # Tratamento global de erros
├── model/            # Entidades JPA
│   └── enums/        # ChargeStatus, Role, PaymentPreference
├── repository/       # Interfaces Spring Data JPA
├── scheduler/        # Jobs agendados (cobranças e lembretes)
├── security/         # JwtFilter, JwtService, SecurityUtils
├── service/          # Lógica de negócio
└── util/             # Utilitários (DocumentUtils)

backend/src/main/resources/
├── application.yaml
├── application-test.yaml
└── db/migration/     # Migrações Flyway (V1 a V12)

frontend/src/
├── assets/           # Imagens e SVGs
├── components/       # Componentes reutilizáveis (Layout, UI)
├── contexts/         # AuthContext (Supabase + estado global)
├── hooks/            # Custom hooks
├── lib/              # Utilitários (cn, etc.)
├── pages/            # Páginas da aplicação
├── services/         # Cliente axios configurado
└── types/            # Interfaces TypeScript globais
```