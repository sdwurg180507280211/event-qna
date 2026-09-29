# Event Q&A

A lightweight, standalone audience Q&A system for live events.

It is designed for the workflow:

```text
Livestream user (already verified)
        │ signed short-lived ticket
        ▼
   Event Q&A session
        │
        ├── submit question ──> PENDING ──> admin review
        │                                  ├── APPROVED ──> public question pool
        │                                  └── REJECTED
        │
        └── view / vote on approved questions

QR-code user
        │
        ▼
  CWID whitelist check
        │
        ▼
   Event Q&A session
```

## Current MVP

### Participant

- CWID whitelist login for QR-code visitors
- signed-ticket login from an external livestream
- anonymous question submission
- moderation-first publishing
- latest / popular question pool
- one vote per participant per question
- QR code for mobile participation
- responsive desktop/mobile UI
- optional return-to-livestream link

### Admin

- administrator login
- pending / approved / rejected / hidden question views
- approve, reject and hide actions
- submitting CWID visible only in the admin console
- whitelist listing
- bulk whitelist add/update
- whitelist disable

### Platform

- Next.js + TypeScript
- PostgreSQL + Prisma
- signed HTTP-only participant/admin sessions
- Docker Compose for local PostgreSQL
- GitHub Actions typecheck + build

## Scope

This repository owns only the Q&A experience. The livestream page itself is **out of scope**.

The livestream only needs to:

1. display the Q&A entry link;
2. optionally issue a short-lived signed identity ticket when the livestream has already verified name/CWID.

## Quick start

### 1. Requirements

- Node.js 22
- Docker / Docker Compose

### 2. Configure

```bash
cp .env.example .env
```

Replace at least:

```env
SESSION_SECRET=...
STREAM_SSO_SECRET=...
ADMIN_PASSWORD=...
```

Use long random values and keep the two signing secrets different.

### 3. Start PostgreSQL

```bash
docker compose up -d postgres
```

### 4. Install and initialize

```bash
npm install
npm run db:generate
npm run db:push
npm run db:seed
```

### 5. Start

```bash
npm run dev
```

Then open:

- participant login: `http://localhost:3000/event/demo/login`
- admin: `http://localhost:3000/admin`

Seeded demo CWIDs:

```text
C10001
C10002
C10003
```

## Production flow

### Livestream entry

```text
Livestream verifies user
        ↓
livestream signs short-lived JWT ticket
        ↓
/event/{eventCode}/login?ticket=...
        ↓
Event Q&A verifies ticket
        ↓
participant session cookie
        ↓
question page
```

### QR-code entry

```text
scan QR
   ↓
CWID login
   ↓
event whitelist lookup
   ↓
participant session cookie
   ↓
question page
```

## Privacy model

Questions are anonymous **to the audience**, while the backend retains the CWID association for eligibility, abuse handling and audit purposes.

Participant-facing question APIs do not return CWID.

> CWID-only login is a whitelist eligibility check. It does not by itself prove that the person entering the value owns that CWID.

## Security

Never pass trusted identity with a bare parameter such as:

```text
/event/demo?cwid=C123456
```

For livestream passwordless entry, use a signed and short-lived ticket.

Production deployments should also:

- use HTTPS only;
- rotate signing secrets if exposed;
- restrict admin access at the network/reverse-proxy layer where possible;
- define retention/deletion rules for CWID and questions;
- back up PostgreSQL;
- add rate limiting at the reverse proxy or application layer.

## Documentation

- [Product requirements](docs/requirements.md)
- [Architecture](docs/architecture.md)
- [Livestream integration](docs/integration.md)

## Question lifecycle

```text
PENDING -> APPROVED
        -> REJECTED

APPROVED -> HIDDEN
```

Only `APPROVED` questions are returned to participants.

## 2026-09-29 delivery revision

Participant/login screens now follow the reference's blue/white visual style. Desktop Q&A includes QR joining, a two-column approved pool, latest/popular sorting, real totals and pagination. Only participant pages adapt to mobile; the moderation console is desktop-only.

The admin console separates moderation, CWID whitelist and activity settings, with search, state counts, automatic refresh and re-enable. Disabling a whitelist entry now also blocks that user's existing session. Voting uses idempotent PUT (like) / DELETE (unlike), and ticket validation requires a maximum five-minute lifetime.

For new installations, use `npm ci` and `npm run db:migrate` instead of `db:push`. To add explicitly labeled sample questions after the demo seed, run `npm run db:demo`.

Run `npm run test:integration` against a running application on port 3036 (override with `TEST_BASE_URL`). It uses an isolated temporary event and deletes it afterward. Never run load tests against a live event.

See [deployment and acceptance](docs/deployment.md), [verification results](docs/verification.md) and [.kiro specifications](.kiro/specs/event-qna-delivery/requirements.md).
