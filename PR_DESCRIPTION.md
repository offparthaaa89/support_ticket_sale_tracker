## Support Ticket & SLA Tracker

### Implementation Summary

This PR implements a full-stack Support Ticket & SLA Tracker using React + TypeScript, GraphQL Yoga, Prisma, PostgreSQL, and Bun.

The application supports:

- JWT authentication with Argon2id password hashing
- reporter (`USER`) and support-agent (`AGENT`) authorization
- ticket creation and ownership rules
- agent assignment/reassignment
- sequential ticket lifecycle management
- comments and first-agent-response recording
- dual first-response and resolution SLA tracking
- business-hour-aware SLA calculations
- configured timezone handling
- holiday-aware SLA calculations
- SLA clock freezing
- backend SLA-state filtering
- cursor pagination
- dashboard statistics
- responsive React UI
- seed/demo data
- strict TypeScript and linting
- unit and real PostgreSQL integration tests

### Architecture Decisions

The project uses a small layered architecture:

```text
React
→ GraphQL Yoga
→ thin resolvers
→ application services
→ Prisma
→ PostgreSQL
```

Business logic is kept outside GraphQL resolvers.

I intentionally did not add a repository layer because Prisma already provides the persistence abstraction needed for this scope.

The frontend uses native `fetch` instead of Apollo Client and React state instead of Redux because the application does not require normalized caching or complex global client state.

### SLA Calculation Approach

Business hours are:

```text
Monday–Friday
09:00–18:00
```

and interpreted in the configured IANA timezone:

```env
BUSINESS_TIMEZONE=Asia/Kolkata
```

Weekends and configured holidays are excluded.

SLA policy:

| Priority | First Response | Resolution |
|---|---:|---:|
| URGENT | 1 business hour | 4 business hours |
| HIGH | 4 business hours | 24 business hours |
| MEDIUM | 8 business hours | 48 business hours |
| LOW | 24 business hours | 72 business hours |

The API returns first-response and resolution due timestamps, states, and remaining business minutes.

Boundary behavior:

- exactly 75% consumed remains `ON_TRACK`
- more than 75% becomes `AT_RISK`
- the clock becomes `BREACHED` after the deadline

First-response SLA freezes at `firstResponseAt`.

Resolution SLA freezes at `resolvedAt`.

The frontend displays backend-provided SLA data and does not reimplement business-calendar logic.

### First Response Rule

Reporter comments do not count as the first support response.

The first `AGENT` comment sets `firstResponseAt`.

The comment creation and timestamp update happen transactionally, and the ticket update only applies while `firstResponseAt` is null, so later agent comments cannot overwrite the original timestamp.

### Pagination and Filtering

The canonical `tickets` query uses cursor pagination.

Backend filters support:

- status
- priority
- assigned agent
- SLA state

The frontend supports cursor navigation and page-local sorting.

### Testing

Verified:

```text
30 unit tests pass
11 PostgreSQL integration tests pass
0 test failures
backend typecheck passes
backend lint passes
frontend lint passes
frontend production build passes
```

The integration suite uses a real PostgreSQL database through Prisma; PostgreSQL is not mocked.

The primary integration flow covers ticket creation, reporter comments, agent first response, timestamp freezing, assignment, lifecycle transitions, and persisted resolution state.

### Tradeoffs

- `USER` is retained as the reporter/customer role instead of performing a late enum rename to `REPORTER`.
- The canonical dual-SLA API is calculated using the current holiday calendar, while the legacy persisted `slaDeadline` stores the resolution due time calculated at ticket creation.
- A compatibility `ticketPage` query and deprecated status mutation alias remain temporarily to reduce migration risk.
- Frontend sorting currently applies within the fetched cursor page rather than globally.
- Comments are allowed on closed tickets; this is an explicit product-policy choice for the take-home.

### Known Limitations

- SLA policy/calendar version is not snapshotted per ticket.
- Global backend sorting is not yet integrated with cursor pagination.
- Authentication uses a bearer token stored in `sessionStorage` rather than an HttpOnly cookie.
- No audit log for assignment/status changes.
- No browser-level end-to-end test suite or CI pipeline yet.

### What I Would Improve With More Time

- immutable SLA policy/calendar snapshots
- backend global sorting
- SLA pause / waiting-on-customer state
- escalation and notification rules
- per-team and recurring holiday calendars
- audit history
- agent administration/invitations
- HttpOnly-cookie authentication
- search
- end-to-end tests
- CI
- rate limiting
- production observability

### Demo / Setup

See `README.md` for complete local setup, migration, seed, test, and GraphQL instructions.

See `WALKTHROUGH.md` for the 5–10 minute technical walkthrough.
