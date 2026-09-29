# Architecture

## Components

```text
                 External livestream
                  |             |
             fixed link      signed ticket
                  |             |
                  +------v------+
                         |
                    Event Q&A
             +-----------+-----------+
             |                       |
       Participant UI             Admin UI
             |                       |
             +-----------+-----------+
                         |
                    Next.js API
                         |
                      Prisma
                         |
                    PostgreSQL
```

## Core data model

- **Event**: event code, title, active state, optional return URL.
- **WhitelistEntry**: event-scoped CWID eligibility.
- **Question**: submitting CWID, content, moderation status.
- **Vote**: one event participant identity per question.

CWID is never serialized in participant-facing question responses.

## Question states

- `PENDING`: submitted but not public;
- `APPROVED`: visible in the public question pool;
- `REJECTED`: rejected by a moderator;
- `HIDDEN`: previously public but removed from the pool.

## Session model

Participant sessions and admin sessions are signed JWTs stored in HTTP-only cookies.

The participant session contains:

- event code;
- CWID;
- optional display name;
- entry source (`whitelist` or `stream`).

The participant cookie is intentionally separate from any livestream cookie because the two systems have different origins and trust boundaries.

## Real-time strategy

The MVP uses short polling on the question pool. This keeps deployment simple and works behind ordinary reverse proxies.

A future version can replace polling with SSE/WebSocket without changing the moderation/data model.
