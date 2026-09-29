# Event Q&A

## Current three-link workflow

For each event, the product now exposes three separate links:

```text
Participant ask page   /event/{eventCode}/ask
Moderator console      /admin
iPad display page      /event/{eventCode}/display
```

- The **ask page** only contains anonymous question submission.
- The **moderator console** reviews participant questions and can also publish a translated/edited question directly to the display.
- The **display page** is designed for iPad viewing: one-column cards, vertical scrolling, and automatic refresh every 1.5 seconds.
- Approved participant questions and moderator-published questions appear on the display feed automatically.
- The legacy `/event/{eventCode}` and `/event/{eventCode}/login` routes redirect to the ask page.

A lightweight, standalone audience Q&A system for live events.

```text
Open link / scan QR → anonymous question page → submit PENDING
                                              ↓ admin review
                                  APPROVED → newest-first pool
```

## Current access mode

Participants open `/event/{eventCode}` directly or scan its QR code. No CWID, whitelist, livestream ticket or participant login is required. Previously shared `/event/{eventCode}/login` links redirect to the same question page. Administrators still need their password.

New submissions are stored as anonymous guests and enter PENDING. Only APPROVED questions appear, ordered by submission time newest first. Voting and popular sorting are removed. Whitelist and identity endpoints are retained only for historical compatibility and do not gate public participation. Closing the event blocks both reading and submitting.

## Current MVP

### Participant

- direct link and QR-code access, without participant login
- existing login links redirect directly to the question page
- anonymous question submission
- moderation-first publishing
- newest-first question pool with pagination
- QR code for mobile participation
- responsive desktop/mobile UI
- optional return-to-livestream link

### Admin

- administrator login
- pending / approved / rejected / hidden question views
- approve, reject and hide actions
- new submissions labeled anonymous guest; historical CWID visible only in admin
- historical whitelist listing (does not restrict public entry)
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

## Participation and privacy

Use `/event/{eventCode}` for both livestream links and QR codes. Users directly view and submit without login. Previously shared `/login` links redirect automatically. New questions store the marker `匿名访客`; no CWID/name is collected. Existing historical questions keep their original records, but participant APIs never expose identity fields.

The administrator console remains password-protected. Historical whitelist and ticket endpoints are retained for compatibility but no longer restrict the public question page.

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

Participant/login screens now follow the reference's blue/white visual style. Desktop Q&A includes QR joining, a two-column approved pool, newest-first ordering, real totals and pagination. Only participant pages adapt to mobile; the moderation console is desktop-only.

The admin console separates moderation, CWID whitelist and activity settings, with search, state counts, automatic refresh and re-enable. Disabling a whitelist entry now also blocks that user's existing session. Ticket validation requires a maximum five-minute lifetime. Voting and popular sorting have been removed; legacy vote endpoints return 410 and historical Vote records are retained without affecting question ordering.

For new installations, use `npm ci` and `npm run db:migrate` instead of `db:push`. To add explicitly labeled sample questions after the demo seed, run `npm run db:demo`.

Run `npm run test:integration` against a running application on port 3036 (override with `TEST_BASE_URL`). It uses an isolated temporary event and deletes it afterward. Never run load tests against a live event.

See [deployment and acceptance](docs/deployment.md), [verification results](docs/verification.md) and [.kiro specifications](.kiro/specs/event-qna-delivery/requirements.md).
