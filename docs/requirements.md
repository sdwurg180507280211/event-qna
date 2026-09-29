# Product requirements

## 1. Product boundary

Event Q&A is an independent web application. The livestream system is not part of this repository.

The livestream only needs to:

1. show an external Q&A link;
2. optionally issue a signed short-lived identity ticket for users who already passed livestream identity verification.

## 2. Participant entry paths

### A. From the livestream

1. The livestream has already verified name and CWID.
2. The user clicks the Q&A link.
3. The livestream attaches a short-lived signed ticket.
4. Event Q&A validates the ticket and creates its own session.
5. The user enters the Q&A page directly.

### B. From the QR code

1. The user scans the event QR code.
2. The user enters CWID.
3. Event Q&A verifies that CWID against the event whitelist.
4. On success, Event Q&A creates a participant session.
5. The user enters the Q&A page.

> A CWID-only form checks eligibility; it does not by itself prove that the person owns that CWID.

## 3. Q&A flow

```text
submit question
      |
      v
   PENDING
      |
      v
 admin review
   /      \
APPROVED  REJECTED
   |
   v
public question pool
```

Approved questions are shown anonymously to participants.

## 4. Participant capabilities

- submit a question;
- see a "submitted for review" confirmation;
- browse approved questions;
- sort by latest or popular;
- vote/unvote;
- return to the livestream;
- responsive mobile and desktop layouts.

## 5. Admin capabilities

- administrator login;
- filter questions by moderation state;
- approve, reject and hide questions;
- inspect the submitting CWID for abuse/audit handling;
- add/update/disable whitelist entries;
- bulk-paste whitelist entries;
- manage event title and return URL in the database.

## 6. Acceptance criteria for MVP

- an unapproved question never appears in the participant question pool;
- a participant cannot vote twice on the same question;
- public participant APIs never return CWID;
- only whitelisted CWIDs can use the QR-code login path;
- a valid livestream ticket can create a participant session without another CWID prompt;
- an invalid/expired livestream ticket is rejected;
- admin endpoints require an admin session;
- participant and admin session cookies are HTTP-only.
