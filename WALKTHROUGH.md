# Support Ticket & SLA Tracker — 5–10 Minute Walkthrough

## 1. Problem Statement

This project is a full-stack Support Ticket and SLA Tracker.

Reporters can create support tickets, follow their status, and communicate with support. Agents can view the support queue, assign or reassign tickets, progress tickets through a controlled lifecycle, respond to reporters, resolve tickets, and monitor SLA health.

The main engineering focus is not only CRUD. The important part is enforcing business rules correctly: authorization, first-response behavior, business-hour-aware SLA calculations, holidays, timezone handling, SLA freezing, pagination, and persistence.

---

## 2. Architecture

The application follows a deliberately small layered architecture:

```text
React + TypeScript
        ↓
GraphQL Yoga
        ↓
Schema-first GraphQL resolvers
        ↓
Application services
        ↓
Prisma
        ↓
PostgreSQL
```

Resolvers are kept thin.

Business logic lives in services such as:

```text
auth.service.ts
ticket.service.ts
comment.service.ts
holiday.service.ts
sla.service.ts
ticket-rules.ts
```

I did not add a repository layer because Prisma already provides the typed persistence abstraction needed for this project.

On the frontend I used native `fetch` instead of Apollo Client and React state instead of Redux because the application does not require normalized client caching or complex global state.

---

## 3. Database Design

The main models are:

### User

Stores identity, credentials, and role.

```text
USER
AGENT
```

`USER` is the reporter/customer role in this implementation.

### Ticket

Stores:

```text
title
description
priority
status
creator
assignedAgent
firstResponseAt
resolvedAt
slaDeadline
createdAt
updatedAt
```

`firstResponseAt` freezes the first-response clock.

`resolvedAt` freezes the resolution clock.

The legacy `slaDeadline` field is retained for compatibility and stores the resolution deadline calculated at creation.

### Comment

Stores the ticket, author, content, and creation time.

### Holiday

Stores:

```text
id
date
name
```

Holiday dates are excluded from SLA business-time calculations.

---

## 4. GraphQL API

The backend uses GraphQL Yoga with a schema-first design.

Important queries are:

```text
health
me
ticket
tickets
dashboard
users
holidays
```

The canonical `tickets` query uses cursor pagination and supports filters for:

```text
status
priority
assignedAgentId
slaState
```

Important mutations are:

```text
register
login
createTicket
assignTicket
changeTicketStatus
resolveTicket
addComment
```

There is also a deprecated compatibility `updateTicketStatus` field and a compatibility `ticketPage` query to reduce migration risk while the frontend/API evolved.

---

## 5. Authentication and Authorization

Passwords are hashed with Argon2id.

Login returns a JWT. Protected GraphQL requests send it through:

```http
Authorization: Bearer <JWT>
```

The token is verified while creating the GraphQL request context.

The important distinction is:

- authentication answers **who is this user?**
- authorization answers **is this user allowed to perform this operation?**

A `USER` can:

- create tickets
- read only their own tickets
- comment only on their own tickets

An `AGENT` can:

- view the support queue
- assign tickets
- update status
- resolve tickets
- comment on tickets

The backend is the real security boundary. Hiding UI buttons is only a usability feature.

---

## 6. Ticket Lifecycle

Tickets follow:

```text
OPEN
  ↓
IN_PROGRESS
  ↓
RESOLVED
  ↓
CLOSED
```

The transition rules are isolated in `ticket-rules.ts`.

For example:

```text
OPEN → RESOLVED
OPEN → CLOSED
IN_PROGRESS → CLOSED
RESOLVED → IN_PROGRESS
```

are rejected.

The dedicated `resolveTicket` operation still uses the same transition validation, so resolving an `OPEN` ticket directly is not allowed.

When a ticket becomes `RESOLVED`, the backend stores `resolvedAt`.

---

## 7. SLA Calculation

The SLA engine is isolated in `sla.service.ts`.

### Business Hours

Configured timezone:

```text
BUSINESS_TIMEZONE=Asia/Kolkata
```

Business window:

```text
Monday–Friday
09:00–18:00
```

The engine skips:

- nights
- weekends
- configured holidays

Database timestamps are UTC. SLA calculations interpret business hours using the configured IANA timezone.

### Policies

| Priority | First Response | Resolution |
|---|---:|---:|
| URGENT | 1 business hour | 4 business hours |
| HIGH | 4 business hours | 24 business hours |
| MEDIUM | 8 business hours | 48 business hours |
| LOW | 24 business hours | 72 business hours |

For every ticket, the API returns:

```text
firstResponseDueAt
resolutionDueAt

firstResponseState
resolutionState
overallState

firstResponseRemainingMinutes
resolutionRemainingMinutes
```

The frontend displays these values but does not recalculate the SLA.

---

## 8. SLA State and Boundary Rules

The states are:

```text
ON_TRACK
AT_RISK
BREACHED
```

My exact boundary choice is:

```text
0%–75% consumed       → ON_TRACK
more than 75%         → AT_RISK
after the deadline    → BREACHED
```

Exactly 75% consumed remains `ON_TRACK`.

The exact deadline itself is still treated as on time; the clock becomes `BREACHED` only after the deadline.

This boundary is documented and unit-tested.

---

## 9. First Response and SLA Freezing

The first qualifying response is the first comment from an `AGENT`.

A reporter comment does not count.

The agent comment and first-response update happen in a database transaction.

The ticket update uses a condition equivalent to:

```text
firstResponseAt IS NULL
```

so later agent comments cannot overwrite the original timestamp.

First-response SLA is evaluated at:

```text
firstResponseAt ?? now
```

Resolution SLA is evaluated at:

```text
resolvedAt ?? now
```

That means completed clocks stay frozen.

If the response or resolution happened late, the final frozen state remains `BREACHED`.

---

## 10. Holiday Handling

Holidays are stored in PostgreSQL and exposed by the API.

The SLA service converts configured holiday dates into calendar keys and skips them in business-time calculations.

The unit tests include:

- a holiday
- weekend followed by holiday
- multi-day calculations crossing non-business periods

---

## 11. Cursor Pagination, Filters, and Dashboard

The canonical ticket list uses cursor pagination.

The response returns:

```text
nodes
pageInfo.hasNextPage
pageInfo.endCursor
```

Backend filters include:

```text
status
priority
assigned agent
SLA state
```

The frontend also supports sorting by newest, oldest, priority, and SLA severity.

One limitation is that sorting is currently page-local rather than global across the entire paginated dataset.

The backend also exposes dashboard statistics for:

```text
open
in progress
at risk
breached
```

---

## 12. Frontend

The React + TypeScript frontend includes:

- Login
- Ticket dashboard
- Create Ticket
- Ticket Details

It displays:

- priority
- status
- assignee
- overall SLA
- first-response SLA
- resolution SLA
- remaining business minutes
- due timestamps
- comments
- reporter information
- resolved timestamp

Agents can:

- select an assignee
- assign a ticket to themselves
- move tickets through the lifecycle
- resolve tickets
- comment

The UI includes loading, empty, success, validation, and authorization-error states and is responsive.

---

## 13. Testing Strategy

The project uses Bun's test runner.

### Unit tests

There are 30 passing unit tests covering:

- normal weekday SLA calculations
- before-hours creation
- after-hours creation
- weekend handling
- Friday near close
- public holidays
- weekend + holiday
- multi-day SLA
- first-response SLA
- resolution SLA
- exactly 75% consumed
- AT_RISK
- BREACHED
- first-response freezing
- resolution freezing
- completed SLA behavior
- overall SLA severity
- ticket lifecycle transitions
- authentication helpers
- authorization helpers

### Real PostgreSQL integration tests

There are 11 passing integration tests across two files.

PostgreSQL is not mocked.

The main integration flow verifies:

```text
create reporter + agent
        ↓
create ticket
        ↓
verify persisted SLA deadline
        ↓
reporter comment
        ↓
firstResponseAt remains null
        ↓
agent comment
        ↓
firstResponseAt is persisted
        ↓
later agent comment
        ↓
firstResponseAt remains unchanged
        ↓
assignment
        ↓
OPEN → IN_PROGRESS
        ↓
resolve
        ↓
resolvedAt is persisted
```

It also tests invalid ticket validation, ownership authorization, invalid assignment, and invalid transitions.

---

## 14. Code Quality

Both backend and frontend use linting with Oxlint.

The project also uses strict TypeScript and disallows explicit `any`.

Final quality checks are:

```text
backend lint       ✅
backend typecheck  ✅
unit tests         ✅ 30/30
integration tests  ✅ 11/11
frontend lint      ✅
frontend build     ✅
```

---

## 15. Tradeoffs and Known Limitations

### USER vs REPORTER

I kept the existing `USER` enum and use it as the reporter/customer role rather than making a late database enum rename.

### Dynamic Holiday Calendar

The canonical dual-SLA API is recalculated using the current holiday calendar.

The legacy persisted `slaDeadline` stores the resolution deadline calculated when the ticket was created.

Therefore, changing the holiday calendar later could change the dynamically returned SLA due times for an old ticket.

A production system requiring immutable historical SLA policy would persist the applied policy/calendar snapshot or canonical due timestamps.

### Page-Local Sorting

Sorting currently happens within the fetched cursor page.

For a large production dataset, sorting should move to the backend.

### Comments on Closed Tickets

Comments remain allowed on closed tickets in this implementation.

That choice would normally be driven by product policy.

---

## 16. What I Would Improve With More Time

I would add:

- immutable SLA policy/calendar snapshots
- backend sorting integrated with cursor pagination
- SLA pause states such as waiting on customer
- escalation and notification rules
- per-team calendars
- recurring holidays
- audit history
- agent-management workflow
- HttpOnly-cookie authentication
- search
- end-to-end browser tests
- CI
- rate limiting
- structured production observability

---

## 17. Closing Summary

The core goal of this implementation was to keep the architecture understandable while making the important rules correct.

The areas I would emphasize in a review are:

1. backend authorization
2. sequential ticket lifecycle
3. first-agent-response protection
4. business-hour + holiday-aware SLA calculations
5. dual SLA clocks and freezing
6. cursor pagination and backend filtering
7. real PostgreSQL integration testing
8. strict TypeScript and linting

Those are the parts of the project where most of the engineering judgment lives.
