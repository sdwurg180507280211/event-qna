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

## Scope

This repository owns only the Q&A experience:

- CWID whitelist login for QR-code visitors
- signed-ticket SSO entry from an external livestream
- anonymous public question display
- question moderation before publication
- latest / popular sorting
- one vote per participant per question
- admin moderation
- CWID whitelist maintenance
- event metadata and return-to-livestream URL

The livestream page itself is **out of scope**. It only needs to link to this service and, for passwordless hand-off, issue a short-lived signed ticket.

## Privacy model

Questions are anonymous **to the audience**, while the backend retains the CWID association for eligibility, abuse handling and audit purposes. Do not expose CWID values in public APIs or UI.

## Planned stack

- Next.js + TypeScript
- PostgreSQL
- Prisma ORM
- JWT/HMAC session and livestream hand-off
- Docker Compose for local database

## Repository status

Initial MVP scaffolding is being added. See:

- `docs/requirements.md`
- `docs/architecture.md`
- `docs/integration.md`

## Security note

Never pass a trusted identity as a bare query string such as:

```text
/event/demo?cwid=123456
```

Livestream identity must be handed off with a signed, short-lived ticket. QR-code login is a whitelist eligibility check; entering a CWID alone does not prove the person owns that CWID.
