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

## Acceptance revision (2026-09-29)

Participant question polling remains 4 seconds; admin question polling is 5 seconds. Both stop issuing polls while their document is hidden. Background admin polling only touches questions/counts; event-settings drafts are not overwritten.

Participant queries use six-item pages and stable date/id ordering (vote count first for popular). Admin queries use twelve-item pages with state and text/CWID filtering. Participant eligibility is checked on every request, including whitelist status. Votes use idempotent PUT/DELETE and a serializable transaction with bounded conflict retries.

Rejected or hidden questions can return to PENDING for re-review. Direct unsupported state transitions return 409. Moderation updates compare the existing status to avoid overwriting another moderator's decision.

Admin uses a desktop layout (minimum 1100px). Only participant login and Q&A adapt to mobile. QR codes are displayed on the desktop Q&A page and point to the activity login URL at the current origin.
