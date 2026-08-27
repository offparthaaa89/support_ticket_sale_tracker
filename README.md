# Support Ticket & SLA Tracker

A full-stack support ticket management application built as a product-engineering take-home assignment.

Customers can create and track support requests, while support agents can manage ownership, progress tickets through a controlled lifecycle, communicate with customers, and monitor first-response and resolution SLA health.

The project emphasizes strict TypeScript, schema-first GraphQL, PostgreSQL persistence, backend-enforced authorization, business-hour-aware SLA logic, automated testing, and a responsive React interface.

---

## Features

### Authentication and Authorization

- JWT bearer-token authentication
- Argon2id password hashing
- Public registration creates `USER` accounts only
- `USER` acts as the reporter/customer role
- `AGENT` accounts have elevated support permissions
- Backend authorization is the source of truth
- Frontend hides unavailable actions only for usability

A `USER` can:

- create tickets
- view their own tickets
- filter their own tickets
- add comments to their own tickets

An `AGENT` can:

- view the support queue
- filter tickets
- assign or reassign tickets
- change ticket status
- resolve tickets
- add support comments

---

### Ticket Management

Each ticket includes:

- title
- description
- priority
- status
- reporter
- optional assigned agent
- comments
- first-response timestamp
- resolution timestamp
- first-response SLA information
- resolution SLA information

Supported priorities:

```text
LOW
MEDIUM
HIGH
URGENT
```

Supported statuses:

```text
OPEN
IN_PROGRESS
RESOLVED
CLOSED
```

---

### Ticket Lifecycle

Tickets follow a sequential workflow:

```text
OPEN
  ↓
IN_PROGRESS
  ↓
RESOLVED
  ↓
CLOSED
```

Examples of rejected transitions:

```text
OPEN → RESOLVED
OPEN → CLOSED
IN_PROGRESS → CLOSED
RESOLVED → IN_PROGRESS
```

The backend validates every transition, so a client cannot bypass lifecycle rules by calling GraphQL directly.

`resolveTicket` uses the same lifecycle rules and therefore resolves only an `IN_PROGRESS` ticket.

---

### Comments and First Response

Both reporters and agents can participate in a ticket conversation.

The first qualifying `AGENT` comment records:

```text
firstResponseAt
```

Important rules:

- reporter comments do not set `firstResponseAt`
- the first agent comment sets it
- later agent comments cannot overwrite it
- the update is performed transactionally with comment creation

For this take-home, comments are still allowed after a ticket is closed. A larger production system could lock or reopen closed conversations depending on product policy.

---

## SLA Tracking

SLA logic is isolated in:

```text
backend/src/services/sla.service.ts
```

The frontend does **not** calculate SLA state or breach status itself. The GraphQL API is the source of truth.

### Business Calendar

Default business timezone:

```text
Asia/Kolkata
```

Configured through:

```env
BUSINESS_TIMEZONE=Asia/Kolkata
```

Business hours:

```text
Monday – Friday
09:00 – 18:00
```

The SLA engine excludes:

- time before 09:00
- time after 18:00
- Saturdays
- Sundays
- configured holidays

PostgreSQL timestamps are stored in UTC, GraphQL returns ISO-8601 timestamps, and the frontend displays dates in the user's local timezone.

---

### SLA Policies

| Priority | First Response | Resolution |
|---|---:|---:|
| `URGENT` | 1 business hour | 4 business hours |
| `HIGH` | 4 business hours | 24 business hours |
| `MEDIUM` | 8 business hours | 48 business hours |
| `LOW` | 24 business hours | 72 business hours |

The API exposes both clocks:

```text
firstResponseDueAt
resolutionDueAt

firstResponseState
resolutionState
overallState

firstResponseRemainingMinutes
resolutionRemainingMinutes
```

---

### SLA State Rules

Supported states:

```text
ON_TRACK
AT_RISK
BREACHED
```

Boundary behavior is intentional:

- `ON_TRACK`: 0% through exactly 75% consumed
- `AT_RISK`: more than 75% consumed
- `BREACHED`: evaluation time is after the deadline

Therefore:

```text
exactly 75% consumed → ON_TRACK
75% + 1 minute       → AT_RISK
exact deadline       → not yet BREACHED
after deadline       → BREACHED
```

`overallState` is the most severe of the first-response and resolution states.

---

### SLA Clock Freezing

First-response SLA:

```text
active until firstResponseAt
```

Once the first agent response is recorded, the first-response SLA is evaluated at that timestamp forever. A response that was on time cannot later become breached simply because more wall-clock time passes.

Resolution SLA:

```text
active until resolvedAt
```

Once the ticket is resolved, the resolution SLA is evaluated at `resolvedAt` and remains frozen.

Completed clocks return:

```text
remainingMinutes = 0
```

If the completion happened late, the frozen final state remains `BREACHED`.

---

### Holiday Calendar

Holidays are stored in PostgreSQL using the `Holiday` model:

```text
id
date
name
createdAt
```

The SLA engine receives configured holiday dates and excludes those dates from business-time calculations.

The API also exposes a `holidays` query.

---

## Filtering, Pagination, Sorting, and Dashboard

### Ticket Filters

Ticket lists support backend filtering by:

- status
- priority
- assigned agent
- SLA state

A `USER` is always restricted to tickets they created.

### Cursor Pagination

The canonical ticket list uses cursor pagination:

```graphql
tickets(
  filter: TicketFilterInput
  take: Int = 10
  cursor: String
): TicketConnection!
```

Response shape:

```text
nodes
pageInfo.hasNextPage
pageInfo.endCursor
```

A temporary deprecated/compatibility offset-style `ticketPage` query remains in the schema while the application transitions fully to the cursor API.

### Frontend Sorting

The frontend supports:

- newest
- oldest
- priority
- SLA severity

Sorting is currently performed within the fetched cursor page. Global cross-page sorting would be a reasonable follow-up improvement.

### Dashboard

The backend exposes dashboard statistics including:

- open tickets
- in-progress tickets
- at-risk tickets
- breached tickets

The frontend displays these values as dashboard summary cards.

---

## Architecture

```text
┌───────────────────────────────┐
│        React Frontend         │
│     TypeScript + Vite         │
└───────────────┬───────────────┘
                │ HTTP / GraphQL
                ▼
┌───────────────────────────────┐
│        GraphQL Yoga API       │
│   Schema-first + Resolvers    │
└───────────────┬───────────────┘
                │
                ▼
┌───────────────────────────────┐
│      Application Services     │
│                               │
│  auth.service.ts              │
│  ticket.service.ts            │
│  comment.service.ts           │
│  holiday.service.ts           │
│  sla.service.ts               │
│  ticket-rules.ts              │
└───────────────┬───────────────┘
                │
                ▼
┌───────────────────────────────┐
│          Prisma ORM           │
│     PostgreSQL Adapter        │
└───────────────┬───────────────┘
                │
                ▼
┌───────────────────────────────┐
│         PostgreSQL 17         │
│        Docker Compose         │
└───────────────────────────────┘
```

Resolvers are intentionally thin. Business logic lives in services rather than GraphQL resolver functions.

The project does not add a repository layer because Prisma already provides the typed persistence abstraction needed for this scope.

The frontend uses native `fetch` through a small typed GraphQL helper rather than Apollo Client because normalized client-side caching is not required for this application.

Redux/Zustand are also intentionally omitted because local React state is sufficient.

---

## Technology Stack

### Backend

- Bun
- TypeScript in strict mode
- GraphQL
- GraphQL Yoga
- Prisma ORM
- Prisma PostgreSQL adapter
- PostgreSQL 17
- JOSE for JWT handling
- Luxon for IANA-timezone-aware business-time calculations
- Bun Argon2id password hashing
- Oxlint

### Frontend

- React
- TypeScript
- Vite
- React Router
- Native `fetch` GraphQL client
- Oxlint

### Infrastructure and Testing

- Docker
- Docker Compose
- Bun test runner
- unit tests
- real PostgreSQL integration tests

---

## Project Structure

```text
support-ticket-sla-tracker/
├── README.md
├── WALKTHROUGH.md
│
├── backend/
│   ├── compose.yml
│   ├── package.json
│   ├── prisma.config.ts
│   ├── .env.example
│   ├── .oxlintrc.json
│   │
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   └── seed.ts
│   │
│   ├── src/
│   │   ├── auth/
│   │   ├── config/
│   │   ├── graphql/
│   │   ├── lib/
│   │   ├── services/
│   │   └── server.ts
│   │
│   └── tests/
│       ├── unit/
│       └── integration/
│
└── frontend/
    ├── package.json
    ├── .env.example
    ├── .oxlintrc.json
    └── src/
        ├── api/
        ├── components/
        ├── pages/
        ├── utils/
        ├── App.tsx
        ├── main.tsx
        ├── index.css
        └── types.ts
```

---

## Database Design

### User

Important fields:

```text
id
name
email
passwordHash
role
createdAt
updatedAt
```

Roles:

```text
USER
AGENT
```

`USER` is the reporter/customer role used by this implementation.

### Ticket

Important fields:

```text
id
title
description
priority
status
creatorId
assignedAgentId
firstResponseAt
resolvedAt
slaDeadline
createdAt
updatedAt
```

`resolvedAt` freezes the resolution SLA clock.

`slaDeadline` is retained as a compatibility field and stores the resolution due time calculated at ticket creation. The canonical API exposes dual SLA information through `ticket.sla`.

### Comment

Important fields:

```text
id
content
ticketId
authorId
createdAt
```

### Holiday

Important fields:

```text
id
date
name
createdAt
```

Holiday dates affect SLA business-time calculations.

---

## Database Relationships

```text
Reporter USER
     │
     └──────── creates ───────────► Ticket
                                      │
                                      ├── assigned to ───► AGENT User
                                      │
                                      └── has many ──────► Comment
                                                             ▲
                                                             │
User / Agent ───────── authors comments ──────────────────────┘

Holiday ─────────────── used by SLA business calendar
```

---

# GraphQL API

Development endpoint:

```text
http://localhost:4000/graphql
```

## Queries

```text
health
me
ticket(id)
tickets(filter, take, cursor)
ticketPage(filter, page, limit)   [compatibility]
dashboard
users(role)
holidays
```

### Canonical Ticket List Example

```graphql
query Tickets(
  $filter: TicketFilterInput
  $take: Int
  $cursor: String
) {
  tickets(
    filter: $filter
    take: $take
    cursor: $cursor
  ) {
    nodes {
      id
      title
      priority
      status

      assignedAgent {
        id
        name
      }

      sla {
        firstResponseDueAt
        resolutionDueAt
        firstResponseState
        resolutionState
        overallState
        firstResponseRemainingMinutes
        resolutionRemainingMinutes
      }
    }

    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
```

### Dashboard Example

```graphql
query Dashboard {
  dashboard {
    openTickets
    inProgressTickets
    atRiskTickets
    breachedTickets
  }
}
```

---

## Mutations

```text
register
login
createTicket
assignTicket
changeTicketStatus
updateTicketStatus        [deprecated compatibility alias]
resolveTicket
addComment
```

### Login Example

```graphql
mutation Login {
  login(
    input: {
      email: "reporter@example.com"
      password: "Password123!"
    }
  ) {
    token

    user {
      id
      name
      email
      role
    }
  }
}
```

### Create Ticket Example

```graphql
mutation CreateTicket {
  createTicket(
    input: {
      title: "Checkout failure"
      description: "Customers receive an error while completing checkout."
      priority: HIGH
    }
  ) {
    id
    status

    sla {
      firstResponseDueAt
      resolutionDueAt
      overallState
    }
  }
}
```

### Add Comment Example

```graphql
mutation AddComment($ticketId: ID!) {
  addComment(
    input: {
      ticketId: $ticketId
      content: "I am investigating this issue now."
    }
  ) {
    id
    content
    createdAt
  }
}
```

### Resolve Ticket Example

```graphql
mutation ResolveTicket($ticketId: ID!) {
  resolveTicket(ticketId: $ticketId) {
    id
    status
    resolvedAt

    sla {
      resolutionState
      resolutionRemainingMinutes
    }
  }
}
```

---

# Local Setup

## Prerequisites

Install:

- Bun
- Docker
- Docker Compose

Verify:

```bash
bun --version
docker --version
docker compose version
```

---

## 1. Clone the Repository

```bash
git clone https://github.com/offparthaaa89/support_ticket_sale_tracker.git
cd support-ticket-sla-tracker
```

---

# Backend Setup

```bash
cd backend
bun install
cp .env.example .env
```

Example backend environment:

```env
PORT=4000

POSTGRES_USER=support_user
POSTGRES_PASSWORD=support_password
POSTGRES_DB=support_ticket_db

DATABASE_URL="postgresql://support_user:support_password@localhost:5432/support_ticket_db"

JWT_SECRET="replace-with-a-long-random-secret-at-least-32-bytes"

BUSINESS_TIMEZONE=Asia/Kolkata
```

Do not commit the real `.env` file.

---

## Start PostgreSQL

From `backend/`:

```bash
docker compose up -d
docker compose ps
```

PostgreSQL should become healthy.

---

## Apply Migrations

```bash
bunx --bun prisma migrate deploy
bunx --bun prisma generate
```

When intentionally changing `schema.prisma` during development:

```bash
bunx --bun prisma migrate dev --name <migration-name>
```

Do not use `prisma db push` as a substitute for committed migrations.

---

## Seed Demo Data

From `backend/`:

```bash
bun prisma/seed.ts
```

Seeded accounts:

```text
Reporter
Email:    reporter@example.com
Password: Password123!

Agent
Email:    agent@example.com
Password: Password123!
```

The seed also creates:

- one `URGENT` ticket
- one `HIGH` ticket
- one `MEDIUM` ticket
- one `LOW` ticket
- sample comments
- representative lifecycle states
- one sample holiday (`Gandhi Jayanti`, 2026-10-02)

The seed is designed to be rerunnable without wiping unrelated application data.

---

## Start Backend

```bash
bun run dev
```

GraphQL:

```text
http://localhost:4000/graphql
```

---

# Frontend Setup

In another terminal:

```bash
cd frontend
bun install
cp .env.example .env
```

Example:

```env
VITE_GRAPHQL_URL=http://localhost:4000/graphql
```

Start Vite:

```bash
bun run dev
```

Typical development URL:

```text
http://localhost:5173
```

---

# Development and Quality Commands

## Backend

From `backend/`:

```bash
bun run dev
bun run typecheck
bun run lint
bun run test:unit
```

## Frontend

From `frontend/`:

```bash
bun run dev
bun run lint
bun run build
```

Both projects use Oxlint, and explicit `any` is treated as an error.

---

# Testing

## Unit Tests

From `backend/`:

```bash
bun run test:unit
```

Current unit coverage includes:

- normal weekday SLA calculation
- before-business-hours behavior
- after-business-hours behavior
- weekend handling
- Friday near business close
- configured public holiday
- weekend + holiday combination
- multi-day SLA calculation
- first-response deadline
- resolution deadline
- exact 75% `ON_TRACK` boundary
- `AT_RISK`
- `BREACHED`
- first-response SLA freezing
- resolution SLA freezing
- completed SLA remaining completed
- overall SLA severity
- valid status transitions
- invalid status transitions
- authentication helper behavior
- agent authorization helper behavior

At the current verified state:

```text
30 unit tests pass
0 unit test failures
```

---

## Real PostgreSQL Integration Tests

The integration suite uses a real PostgreSQL database through Prisma.

PostgreSQL is **not mocked**.

### Create the test database once

From `backend/`:

```bash
docker compose exec postgres \
createdb -U support_user support_ticket_test_db
```

If it already exists, skip this step.

### Apply migrations to the test database

```bash
DATABASE_URL="postgresql://support_user:support_password@localhost:5432/support_ticket_test_db" \
bunx --bun prisma migrate deploy
```

### Run integration tests safely against the test database

```bash
DATABASE_URL="postgresql://support_user:support_password@localhost:5432/support_ticket_test_db" \
bun run test:integration
```

The integration suite exercises real persistence for:

- user creation
- ticket creation
- persisted SLA deadline
- invalid ticket validation
- reporter ownership authorization
- reporter comments
- agent first response
- protection against overwriting `firstResponseAt`
- invalid assignment
- valid agent assignment
- invalid status transition
- `OPEN → IN_PROGRESS → RESOLVED`
- persisted `resolvedAt`
- Prisma relations

At the current verified state:

```text
11 integration tests pass
0 integration test failures
```

---

## Full Verification Checklist

Backend:

```bash
cd backend

bun run lint
bun run typecheck
bun run test:unit

DATABASE_URL="postgresql://support_user:support_password@localhost:5432/support_ticket_test_db" \
bun run test:integration
```

Frontend:

```bash
cd frontend

bun run lint
bun run build
```

---

# Error Handling

Expected application errors use meaningful GraphQL error codes such as:

```text
UNAUTHENTICATED
FORBIDDEN
NOT_FOUND
BAD_USER_INPUT
VALIDATION_ERROR
```

Expected business failures are returned with safe messages.

Unexpected infrastructure errors are masked rather than exposing Prisma, PostgreSQL, filesystem, or internal server details.

---

# Security Considerations

The project includes:

- Argon2id password hashing
- expiring JWT access tokens
- environment-based JWT secret
- explicit backend authorization
- reporter ownership checks
- agent-role validation for assignment
- no password hashes returned by GraphQL
- `.env` files excluded from Git
- strict TypeScript
- no explicit `any` through lint rules

The frontend uses `sessionStorage` for the bearer token for the scope of this take-home.

For a larger production application, HttpOnly + Secure + SameSite cookies would be considered to reduce JavaScript access to authentication credentials.

---

# Important Design Decisions and Tradeoffs

## `USER` Represents the Reporter

The specification describes reporters and agents. This implementation keeps the original `USER` enum value and treats it as the reporter/customer role rather than performing a late risky database enum rename.

---

## SLA Values Are Backend-Driven

The frontend receives SLA deadlines, states, and remaining business minutes from GraphQL.

It formats these values for display but does not reproduce business-calendar calculations.

---

## Dynamic Holiday-Aware SLA Calculation

The dual SLA API is calculated from ticket timestamps plus the current configured holiday calendar.

The legacy `slaDeadline` column stores the resolution due time calculated when the ticket is created for compatibility.

This means changing the holiday calendar later can change dynamically returned dual-SLA due times for an existing ticket, while the legacy persisted deadline remains the originally calculated resolution deadline.

A production system that requires immutable historical SLA policy snapshots would persist the applied calendar/policy version or both canonical due timestamps at ticket creation.

---

## Cursor Pagination

The canonical `tickets` API uses cursor pagination because the full assignment explicitly requires it.

A compatibility `ticketPage` query is retained temporarily to reduce migration risk.

---

## Frontend Sorting

Frontend sorting currently applies to the fetched cursor page rather than globally across all tickets.

For a larger dataset, sorting would move to the backend so pagination and ordering share one canonical query strategy.

---

## Simple Architecture

No repository layer is added between services and Prisma because it would duplicate Prisma's responsibility without adding meaningful value at this scale.

No Redux/Zustand/Apollo Client is added because the current application does not require complex global state or normalized client caching.

---

# How I'd Extend This

With more time, I would add:

1. Persisted immutable SLA policy/calendar snapshots per ticket.
2. Backend global sorting integrated with cursor pagination.
3. SLA pause states such as `WAITING_ON_CUSTOMER`.
4. Per-team business calendars and recurring holidays.
5. Escalation and notification rules.
6. Assignment/status audit history.
7. Administrative agent invitation and user management.
8. Search by ticket title/content.
9. HttpOnly-cookie authentication.
10. End-to-end browser tests.
11. CI for lint, typecheck, unit tests, integration tests, and frontend build.
12. Production observability and structured logging.
13. Rate limiting and abuse controls.
14. Agent performance and SLA reporting.

---

# Design Goal

The implementation prioritizes:

```text
clarity
correctness
small understandable abstractions
backend-enforced business rules
strict TypeScript
testable business logic
meaningful UX
```

over unnecessary framework or architecture complexity.

The goal is to make the application straightforward to run, review, understand, and extend.

---

# License

Created as a technical take-home assignment.
