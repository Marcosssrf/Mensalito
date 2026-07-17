# Mensalito API

API backend do **Mensalito**, um sistema SaaS multi-tenant de gestão de mensalidades escolares. A plataforma permite que escolas (tenants) gerenciem turmas, alunos, matrículas e planos de pagamento, com geração automática de cobranças recorrentes (PIX/Boleto via Mercado Pago) e envio de notificações via WhatsApp (Evolution API).

## Principais funcionalidades

- **Multi-tenant**: cada escola (`Tenant`) opera de forma isolada, com seus próprios usuários, alunos, turmas e cobranças.
- **Gestão acadêmica**: cadastro de turmas (`SchoolClass`), alunos (`Student`) e matrículas (`Enrollment`) vinculando aluno, turma e plano.
- **Planos e cobranças**: criação de planos de mensalidade (`Plan`) e geração automática mensal de cobranças (`Charge`), com suporte a cobrança manual, confirmação de pagamento, cancelamento e reenvio de notificação.
- **Pagamentos (Mercado Pago)**: integração para criação de clientes/ordens de pagamento e recebimento de status via webhook.
- **WhatsApp (Evolution API)**: provisionamento de instância, templates de mensagem, envio de lembretes de cobrança/vencimento e estatísticas de envio.
- **Convites**: convite de novos usuários (`Invite`) para uma escola, com aceite via token e expiração automática.
- **Autenticação e autorização**: login/provisionamento via Supabase, JWT próprio da API, papéis `OWNER` e `TEACHER`, bloqueio de tentativas de login (login-attempts) e proteção de webhooks por autenticação dedicada.
- **Auditoria**: registro de ações relevantes do sistema (`AuditLog`), consultável via endpoint dedicado.
- **Dashboard**: endpoint agregado com indicadores da escola (financeiro/operacional).
- **Jobs agendados**:
  - Geração mensal de cobranças (todo dia às 8h).
  - Marcação de cobranças vencidas como `OVERDUE` e envio de lembretes de atraso (todo dia às 9h).
  - Expiração automática de convites (todo dia às 2h).

## Stack técnica

- **Java + Spring Boot** (Spring Web, Spring Security, Spring Data JPA)
- **PostgreSQL** como banco de dados, com **Flyway** para versionamento de schema (`src/main/resources/db/migration`)
- **Redis** para cache/estado (ex.: controle de tentativas de login)
- **Spring Scheduling** (`@EnableScheduling`) para os jobs recorrentes
- **JWT** para autenticação da API e **Supabase** como provedor de identidade/provisionamento
- **Mercado Pago API** como gateway de pagamento (PIX/Boleto)
- **Evolution API** para integração com WhatsApp
- **JUnit 5 + Mockito** para testes

## Estrutura do projeto

```
src/main/java/com/mensalito/api
├── ApiApplication.java        # Entry point (Spring Boot)
├── client/                    # Clientes HTTP externos (Mercado Pago, WhatsApp, Evolution)
├── config/                    # Configurações (Security, CORS, Mercado Pago, Evolution)
├── controller/                # Endpoints REST
├── dto/                       # Request/Response DTOs (inclui subpasta mercadopago/)
├── exception/                 # Exceções customizadas e handler global
├── model/                     # Entidades JPA e enums
├── repository/                # Repositórios Spring Data JPA
├── scheduler/                 # Jobs agendados (cobranças, convites)
├── security/                  # Filtros JWT, filtro de webhook, utilitários de segurança
└── service/                   # Regras de negócio

src/main/resources
├── application.yaml           # Configuração principal (via variáveis de ambiente)
├── application-test.yaml      # Configuração do profile de testes
└── db/migration/              # Scripts Flyway (V1 ... V15)

src/test/java/com/mensalito/api  # Testes (contexto Spring, serviços, config de Redis mockado)
```

> Observação: este repositório contém apenas a pasta `src`. Não há `pom.xml`/`build.gradle` incluído nesta cópia — adicione o arquivo de build do projeto (Maven ou Gradle) na raiz para compilar/executar localmente.

## Modelo de dados (resumo)

Principais tabelas (ver migrações Flyway para o histórico completo):

- `tenants` — escolas
- `users` — usuários (donos/professores) de cada escola
- `plans` — planos de mensalidade
- `classes` — turmas
- `students` — alunos
- `enrollments` — matrículas (aluno + turma + plano)
- `charges` — cobranças geradas (status: `PENDING`, `PAID`, `OVERDUE`, `CANCELLED`, `REFUNDED`, `LOST`, `DISPUTED`)
- `invites` — convites de acesso
- `audit_logs` — trilha de auditoria

As migrações posteriores (`V2` a `V15`) adicionam, entre outros pontos: integração com Mercado Pago, instância/chave da Evolution API, papéis e convites, preferências de pagamento, endereço do aluno, URL de boleto, flag de cobrança manual, data de envio via WhatsApp, normalização de documentos, tabela de auditoria, trial de alunos e templates de WhatsApp.

## Principais endpoints (`/api/...`)

| Recurso | Base | Descrição |
|---|---|---|
| Auth | `/api/auth` | Provisionamento, logout, controle de tentativas de login |
| Tenants | `/api/tenants` | Dados da escola, chave de API, integração e templates de WhatsApp |
| Users | `/api/users` | Usuários da escola, troca de senha |
| Plans | `/api/plans` | Planos de mensalidade (criar, editar, ativar/desativar) |
| Classes | `/api/classes` | Turmas |
| Students | `/api/students` | Alunos, trial, envio de mensagem WhatsApp |
| Enrollments | `/api/enrollments` | Matrículas |
| Charges | `/api/charges` | Cobranças (listar, criar, cobrança manual, status, confirmar pagamento, cancelar, reenviar notificação, gerar cobranças em lote) |
| Invites | `/api/invites` | Criar convite, preview público por token, aceitar convite |
| Dashboard | `/api/dashboard` | Indicadores agregados da escola |
| Audit | `/api/audit` | Consulta de logs de auditoria |
| Webhooks | `/api/webhooks/mercadopago` | Recebimento de eventos de pagamento |

Todas as rotas exigem autenticação (JWT), exceto `/api/auth/provision`, `/api/auth/logout`, `GET /api/invites/{token}/preview` e `POST /api/webhooks/**` (protegido por um filtro de autenticação próprio para webhooks).

## Configuração (variáveis de ambiente)

A aplicação é configurada via `src/main/resources/application.yaml`, lendo as seguintes variáveis:

| Variável | Descrição |
|---|---|
| `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` | Conexão com PostgreSQL |
| `REDIS_URL` | Conexão com Redis |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | Integração com Supabase (auth/provisionamento) |
| `MERCADOPAGO_WEBHOOK_SECRET` | Segredo para validar webhooks do Mercado Pago (opcional) |
| `ENCRYPTION_SECRET` | Chave usada para criptografia de dados sensíveis |
| `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_INSTANCE` | Integração com a Evolution API (WhatsApp) |
| `FRONTEND_URL` | URL do frontend (usada em CORS/links) |
| `ADMIN_SECRET` | Segredo para operações administrativas |
| `TRUSTED_PROXIES` | Lista de proxies confiáveis (opcional) |

A aplicação sobe por padrão na porta `8080`.

## Como executar localmente

> Este README assume Maven; ajuste os comandos caso o projeto use Gradle.

1. Suba as dependências de infraestrutura (PostgreSQL e Redis), por exemplo via Docker:
   ```bash
   docker run -d --name mensalito-db -e POSTGRES_DB=mensalito -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16
   docker run -d --name mensalito-redis -p 6379:6379 redis:7
   ```
2. Defina as variáveis de ambiente necessárias (ver tabela acima), por exemplo em um arquivo `.env` ou exportando no shell.
3. Execute as migrações e suba a aplicação:
   ```bash
   ./mvnw spring-boot:run
   ```
4. A API estará disponível em `http://localhost:8080`.

## Testes

```bash
./mvnw test
```

Os testes usam o profile `test` (`application-test.yaml`) e um `StringRedisTemplate` mockado (`TestRedisConfig`), não exigindo uma instância real de Redis.

## Integrações externas

- **Mercado Pago**: criação de clientes e ordens de pagamento (PIX/Boleto), com tratamento de erros via `PaymentGatewayException` e recebimento de atualizações de status via webhook.
- **Evolution API**: provisionamento de instância de WhatsApp por tenant, envio de mensagens/lembretes de cobrança e consulta de templates/estatísticas de envio.
- **Supabase**: usado no fluxo de autenticação/provisionamento de usuários.
