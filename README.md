# Support Ticket & SLA Tracker

A full-stack support ticket management application built as a product engineering take-home assignment.

The application allows customers to create and track support requests while support agents can manage ticket ownership, progress tickets through their lifecycle, communicate with customers, and monitor SLA health.

The project focuses on clear business rules, strict TypeScript, GraphQL APIs, PostgreSQL persistence, meaningful authorization, automated testing, and a responsive React interface.

---

## Features

### Authentication

- Customer and support-agent authentication
- JWT-based authentication
- Password hashing using Argon2id
- Current-user session lookup through GraphQL
- Protected GraphQL operations
- Role-aware frontend experience

Public registration creates `USER` accounts only. `AGENT` accounts are promoted separately so public users cannot grant themselves elevated privileges.

---

### Ticket Management

Customers can:

- Create support tickets
- View their own tickets
- View ticket details
- Filter their tickets
- Add comments
- Track ticket status
- Track assigned support agent
- Track SLA deadline and SLA state

Support agents can:

- View the support ticket queue
- Filter tickets by status
- Filter tickets by priority
- Filter tickets by assigned agent
- Assign or take ownership of tickets
- Reassign tickets
- Progress ticket status
- Add support comments
- See SLA state and deadlines

---

### Ticket Lifecycle

Tickets follow a sequential lifecycle:

```text
OPEN
  ↓
IN_PROGRESS
  ↓
RESOLVED
  ↓
CLOSED
```

Invalid transitions such as:

```text
OPEN → CLOSED
```

are rejected by the backend.

---

### Comments and First Response

Both customers and agents can participate in a ticket conversation.

The first comment made by an `AGENT` records:

```text
firstResponseAt
```

Customer comments do not set the first-response timestamp.

Later agent comments do not overwrite the original first response.

---

### SLA Tracking

Every ticket receives an SLA deadline when it is created.

Supported SLA states:

```text
ON_TRACK
AT_RISK
BREACHED
```

The SLA state is derived dynamically from the ticket deadline rather than stored as a separate database field.

---

### Filtering and Pagination

Ticket lists support:

- status filtering
- priority filtering
- assigned-agent filtering
- combined filters
- offset pagination

Pagination defaults:

```text
page = 1
limit = 10
```

Maximum allowed page size:

```text
100
```

---

### Responsive Frontend

The React frontend includes the required product screens:

- Login
- Ticket dashboard
- Create ticket
- Ticket details

The interface includes:

- responsive layouts
- semantic ticket badges
- SLA urgency indicators
- loading states
- empty states
- error states
- keyboard focus states
- customer-specific actions
- agent-specific actions

A customer registration screen was intentionally not added because it was outside the required frontend scope. The backend `register` mutation still supports customer registration.

---

## Architecture

The project uses a simple layered architecture:

```text
┌───────────────────────────────┐
│        React Frontend         │
│     TypeScript + Vite         │
└───────────────┬───────────────┘
                │
                │ HTTP POST /graphql
                ▼
┌───────────────────────────────┐
│        GraphQL Yoga API       │
│     Schema + Resolvers        │
└───────────────┬───────────────┘
                │
                ▼
┌───────────────────────────────┐
│      Application Services     │
│                               │
│  Authentication              │
│  Tickets                     │
│  Comments                    │
│  SLA                         │
│  Ticket lifecycle rules      │
└───────────────┬───────────────┘
                │
                ▼
┌───────────────────────────────┐
│            Prisma             │
└───────────────┬───────────────┘
                │
                ▼
┌───────────────────────────────┐
│         PostgreSQL 17         │
│       Docker Compose          │
└───────────────────────────────┘
```

Authentication is created in the GraphQL request context and authorization is enforced before protected application operations execute.

Resolvers remain thin and delegate business behavior to the service layer.

---

## Why This Architecture?

The project intentionally avoids unnecessary layers.

For example, there is no additional repository layer between Prisma and the services because Prisma already provides a strong persistence abstraction for a project of this size.

Likewise, the frontend does not use Redux, Zustand, Apollo Client, or another state-management framework because the current application does not require that level of complexity.

The goal is to keep the architecture easy to understand while maintaining clear responsibility boundaries.

---

## Technology Stack

### Backend

- Bun
- TypeScript
- GraphQL
- GraphQL Yoga
- Prisma ORM
- Prisma PostgreSQL adapter
- PostgreSQL
- JOSE for JWT handling
- Bun password hashing with Argon2id

### Frontend

- React
- TypeScript
- Vite
- React Router
- Native `fetch` through a small typed GraphQL request helper

### Infrastructure

- Docker
- Docker Compose
- PostgreSQL 17

### Testing

- Bun test runner
- Unit tests
- Real PostgreSQL integration testing

---

## Project Structure

```text
support-ticket-sla-tracker/
├── README.md
│
├── backend/
│   ├── compose.yml
│   ├── prisma.config.ts
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   │
│   ├── src/
│   │   ├── auth/
│   │   │   ├── authorization.ts
│   │   │   ├── context.ts
│   │   │   └── jwt.ts
│   │   │
│   │   ├── config/
│   │   │   └── env.ts
│   │   │
│   │   ├── graphql/
│   │   │   ├── resolvers/
│   │   │   │   ├── mutation.resolver.ts
│   │   │   │   └── query.resolver.ts
│   │   │   ├── schema.graphql
│   │   │   └── schema.ts
│   │   │
│   │   ├── lib/
│   │   │   └── prisma.ts
│   │   │
│   │   ├── services/
│   │   │   ├── auth.service.ts
│   │   │   ├── comment.service.ts
│   │   │   ├── sla.service.ts
│   │   │   ├── ticket-rules.ts
│   │   │   └── ticket.service.ts
│   │   │
│   │   └── server.ts
│   │
│   └── tests/
│       ├── unit/
│       └── integration/
│
└── frontend/
    ├── src/
    │   ├── api/
    │   ├── components/
    │   ├── pages/
    │   ├── utils/
    │   ├── App.tsx
    │   ├── main.tsx
    │   ├── index.css
    │   └── types.ts
    │
    └── vite.config.ts
```

---

## Database Design

The main database contains three application models.

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

A user may:

- create many tickets
- be assigned many tickets as an agent
- author many comments

---

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
slaDeadline
createdAt
updatedAt
```

Priorities:

```text
LOW
MEDIUM
HIGH
URGENT
```

Statuses:

```text
OPEN
IN_PROGRESS
RESOLVED
CLOSED
```

Every ticket belongs to one creator.

A ticket may optionally be assigned to one support agent.

---

### Comment

Important fields:

```text
id
content
ticketId
authorId
createdAt
```

Every comment belongs to:

- one ticket
- one author

Deleting a ticket cascades to its comments.

---

## Database Relationships

```text
User
 │
 ├── creates ────────────┐
 │                       ▼
 │                    Ticket
 │                       │
 │                       └── has many ───► Comment
 │                                         ▲
 │                                         │
 └── authors comments ─────────────────────┘

AGENT User
 │
 └── optionally assigned to ─────────────► Ticket
```

---

## SLA Assumptions

For the scope of this project, SLA calculations use the following assumptions.

### Business Hours

```text
Monday – Friday
09:00 – 17:00 UTC
```

Weekends are skipped.

A holiday calendar is not included.

---

### SLA Duration by Priority

| Priority | Business Hours |
|---|---:|
| URGENT | 2 |
| HIGH | 4 |
| MEDIUM | 8 |
| LOW | 16 |

Example:

```text
HIGH ticket created Monday at 15:00 UTC

Monday:
15:00 → 17:00 = 2 business hours

Remaining:
2 hours

Tuesday:
09:00 → 11:00

SLA deadline:
Tuesday 11:00 UTC
```

---

### SLA State

A ticket is:

```text
ON_TRACK
```

while more than 25% of its allowed SLA time remains.

It becomes:

```text
AT_RISK
```

when 25% or less of the SLA duration remains.

It becomes:

```text
BREACHED
```

when the current time reaches or exceeds the SLA deadline.

SLA state is calculated dynamically and is not persisted separately.

`firstResponseAt` is tracked independently from the SLA state.

---

## Authentication and Authorization

Authentication uses JWT bearer tokens.

Protected GraphQL requests send:

```http
Authorization: Bearer <JWT>
```

Access tokens expire after one hour.

Passwords are hashed using Argon2id before storage.

### Authorization Rules

`USER`:

- can create tickets
- can view their own tickets
- can comment on their own tickets
- cannot assign tickets
- cannot update ticket status

`AGENT`:

- can view the support queue
- can view all tickets
- can filter tickets
- can assign/reassign tickets
- can update ticket status
- can comment on tickets

Public registration always creates a:

```text
USER
```

and cannot create an agent account directly.

---

## Error Handling

The GraphQL API uses meaningful error codes including:

```text
UNAUTHENTICATED
FORBIDDEN
NOT_FOUND
BAD_USER_INPUT
VALIDATION_ERROR
```

Expected business errors are returned with safe messages.

Unexpected internal errors are masked so Prisma, SQL, filesystem, or infrastructure details are not exposed to API clients.

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
git clone <https://github.com/offparthaaa89/support_ticket_sale_tracker.git>
cd support-ticket-sla-tracker
```

---

# Backend Setup

Move into the backend:

```bash
cd backend
```

Install dependencies:

```bash
bun install
```

Create the local environment file:

```bash
cp .env.example .env
```

---

## Backend Environment Variables

Example:

```env
PORT=4000

POSTGRES_USER=support_user
POSTGRES_PASSWORD=support_password
POSTGRES_DB=support_ticket_db

DATABASE_URL="postgresql://support_user:support_password@localhost:5432/support_ticket_db"

TEST_DATABASE_URL="postgresql://support_user:support_password@localhost:5432/support_ticket_test_db"

JWT_SECRET="replace-with-a-long-random-secret-at-least-32-bytes"
```

Do not commit the real `.env` file.

---

## Start PostgreSQL

From `backend/`:

```bash
docker compose up -d
```

Check the container:

```bash
docker compose ps
```

PostgreSQL should eventually show as healthy.

---

## Apply Prisma Migrations

To apply the already committed migrations:

```bash
bunx --bun prisma migrate deploy
```

The project migrations create the PostgreSQL schema for:

```text
User
Ticket
Comment
```

---

## Development Migration Command

When intentionally changing `schema.prisma` during development, create a real migration with:

```bash
bunx --bun prisma migrate dev --name <migration-name>
```

Do not manually edit the database schema instead of using Prisma migrations.

---

## Start the Backend

```bash
bun run dev
```

GraphQL will be available at:

```text
http://localhost:4000/graphql
```

---

# Frontend Setup

Open another terminal from the repository root:

```bash
cd frontend
```

Install dependencies:

```bash
bun install
```

Create the local frontend environment file:

```bash
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

The frontend will normally be available at:

```text
http://localhost:5173
```

---

# Creating Local Accounts

The frontend intentionally contains a Login screen but not a registration screen.

Customer registration is available through GraphQL.

Open:

```text
http://localhost:4000/graphql
```

and run:

```graphql
mutation Register {
  register(
    input: {
      name: "Demo Customer"
      email: "customer@example.com"
      password: "CustomerPass123"
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

The created account will have:

```text
role = USER
```

---

## Creating a Local Agent

For local/demo use, first register another account:

```graphql
mutation RegisterAgentAccount {
  register(
    input: {
      name: "Demo Agent"
      email: "agent@example.com"
      password: "AgentPass123"
    }
  ) {
    user {
      id
      email
      role
    }
  }
}
```

Then promote it in PostgreSQL:

```bash
docker compose exec postgres \
psql -U support_user \
-d support_ticket_db \
-c "UPDATE \"User\" SET role = 'AGENT' WHERE email = 'agent@example.com';"
```

After changing the role, log in again so the newly issued JWT contains the `AGENT` role.

No production/demo passwords are hard-coded in the repository.

---

# Development Commands

## Backend

From:

```text
backend/
```

start development server:

```bash
bun run dev
```

Run TypeScript validation:

```bash
bun run typecheck
```

---

## Frontend

From:

```text
frontend/
```

start the development server:

```bash
bun run dev
```

Build the production frontend bundle:

```bash
bun run build
```

---

# Testing

## Unit Tests

From `backend/`:

```bash
bun run test:unit
```

Unit tests cover important business behavior including:

- normal business-hour SLA calculation
- before-hours handling
- after-hours handling
- crossing the business-day boundary
- weekend handling
- multi-day SLA calculation
- `ON_TRACK`
- `AT_RISK`
- `BREACHED`
- valid ticket lifecycle transitions
- invalid lifecycle transitions
- authentication guards
- agent authorization

---

## PostgreSQL Integration Test

The integration test uses a real PostgreSQL database.

It does not mock PostgreSQL.

Create the dedicated test database:

```bash
docker compose exec postgres \
createdb -U support_user support_ticket_test_db
```

If the database already exists, this step can be skipped.

Apply migrations to the test database:

```bash
DATABASE_URL="postgresql://support_user:support_password@localhost:5432/support_ticket_test_db" \
bunx --bun prisma migrate deploy
```

Run:

```bash
bun run test:integration
```

The integration test verifies a real flow through:

```text
Prisma
  ↓
PostgreSQL
  ↓
User persistence
  ↓
Ticket persistence
  ↓
relational query
  ↓
database verification
```

---

## Full Backend Verification

```bash
bun run typecheck
bun run test:unit
bun run test:integration
```

---

# GraphQL API Overview

Endpoint:

```text
POST /graphql
```

Development URL:

```text
http://localhost:4000/graphql
```

---

## Queries

### `health`

Public health check.

```graphql
query {
  health
}
```

---

### `me`

Returns the currently authenticated user.

Authentication required.

---

### `ticket(id: ID!)`

Returns one ticket.

Authorization:

```text
USER
→ own ticket only

AGENT
→ any ticket
```

---

### `tickets(...)`

Returns a paginated ticket list.

Supports filtering by:

```text
status
priority
assignedAgentId
```

A `USER` is always restricted to their own tickets by the backend.

---

## Mutations

### `register`

Creates a customer account.

Public.

Always creates:

```text
USER
```

---

### `login`

Authenticates a user and returns:

```text
JWT
+
user
```

---

### `createTicket`

Creates a support ticket.

Allowed:

```text
USER
```

---

### `assignTicket`

Assigns or reassigns a ticket to an agent.

Allowed:

```text
AGENT
```

The target user must also have:

```text
role = AGENT
```

---

### `updateTicketStatus`

Progresses a ticket through the supported lifecycle.

Allowed:

```text
AGENT
```

---

### `addComment`

Adds a comment to a ticket.

Allowed:

```text
USER
→ own ticket

AGENT
→ tickets in the support system
```

The first agent comment sets `firstResponseAt`.

---

# Example Authenticated GraphQL Request

```http
POST /graphql
Content-Type: application/json
Authorization: Bearer <JWT>
```

Conceptual request body:

```json
{
  "query": "query { me { id name email role } }"
}
```

The React frontend sends these requests through a small typed wrapper around the native `fetch` API.

---

# Important Business Rules

### Customer Ticket Ownership

Users can only view and comment on tickets they created.

This restriction is enforced by the backend and is not dependent on the React UI.

---

### Agent Assignment

Only authenticated agents may assign tickets.

The target assigned user must also be an agent.

---

### Ticket Status

Only agents may change ticket status.

Status changes must follow:

```text
OPEN
→ IN_PROGRESS
→ RESOLVED
→ CLOSED
```

---

### First Response

Only an agent comment can set the first-response timestamp.

Once recorded, the value is not overwritten.

---

# Security Considerations

The project includes:

- Argon2id password hashing
- JWT expiration
- environment-based JWT secrets
- explicit JWT algorithm restriction
- backend authorization
- ticket ownership checks
- safe GraphQL errors
- masked unexpected errors
- no password hashes exposed through GraphQL
- `.env` files excluded from Git

The frontend stores the bearer token in `sessionStorage` for the scope of this take-home application.

For a larger production application, an HttpOnly, Secure, SameSite cookie-based authentication strategy would be considered to reduce JavaScript access to authentication tokens.

---

# Tradeoffs and Assumptions

## Simple Architecture

The application deliberately avoids unnecessary architectural layers.

There is no repository layer because Prisma already acts as a strong database abstraction for the current scope.

---

## GraphQL Client

The frontend uses native `fetch` through a small typed GraphQL helper rather than Apollo Client.

This keeps the frontend lightweight while still supporting the GraphQL requirements.

A more complex application requiring normalized caching or sophisticated client-side GraphQL state could justify Apollo or another GraphQL client.

---

## State Management

React's built-in state is sufficient for this application.

Redux or another global state-management library was intentionally not added.

---

## Pagination

The API uses offset pagination because the assignment does not require cursor pagination and the expected dataset is appropriate for the simpler implementation.

For very large or frequently changing ticket datasets, cursor-based pagination could be considered.

---

## Timezone

Business hours are interpreted in UTC.

A production support organization would likely configure business hours using the organization's operating timezone.

---

## Holidays

Weekends are skipped but public holidays are not currently modeled.

A production SLA calendar would normally support configured holidays and regional schedules.

---

## SLA State After Agent Response

The application tracks `firstResponseAt` independently while SLA state is calculated from the current time and persisted SLA deadline.

If the product definition required first-response SLA to stop permanently when an agent first responds, the SLA model could be extended to preserve the final outcome at first response.

---

## Agent Provisioning

Public registration creates customers only.

Agent accounts are promoted separately for this assignment.

A production system would normally provide an administrative user-management or invitation workflow.

---

# Improvements With More Time

Given more development time, I would consider:

1. Customer self-service registration screen using the existing `register` mutation.
2. Administrative agent invitation and user-management workflow.
3. Configurable business hours and timezones.
4. Holiday-aware SLA calendars.
5. Persistent SLA outcome when first response occurs.
6. Cursor pagination for very large ticket datasets.
7. Search by ticket title/content.
8. Richer agent assignment controls.
9. Audit history for assignment and status changes.
10. HttpOnly cookie-based authentication.
11. More service-level integration tests.
12. End-to-end browser tests.
13. Accessibility auditing using automated and manual tools.
14. CI pipeline for type checking, tests, and frontend builds.
15. Production deployment configuration and observability.

---

# Design Decisions

The project prioritizes:

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

The goal was to build something that is easy to run, review, understand, and extend.

---

# License

This project was created as a technical take-home assignment.