# Livestream integration

## Link

The livestream should direct an already-verified user to:

```text
https://qna.example.com/event/{eventCode}/login?ticket={SIGNED_JWT}
```

The login page exchanges the ticket for an Event Q&A participant session and then removes the ticket from subsequent navigation.

## Ticket contract

Use a short-lived JWT signed with HS256.

Required claims:

| Claim | Meaning |
| --- | --- |
| `sub` | verified CWID |
| `eventCode` | Event Q&A event code |
| `iss` | configured livestream issuer |
| `aud` | configured Event Q&A audience |
| `exp` | expiry, recommended <= 5 minutes |

Optional claim:

| Claim | Meaning |
| --- | --- |
| `name` | verified participant display name |

Example payload:

```json
{
  "sub": "C123456",
  "name": "Example User",
  "eventCode": "annual-dialogue",
  "iss": "livestream",
  "aud": "event-qna",
  "exp": 1790647500
}
```

## Example Node.js signing code

```ts
import { SignJWT } from "jose";

const secret = new TextEncoder().encode(process.env.STREAM_SSO_SECRET);

const ticket = await new SignJWT({
  eventCode: "annual-dialogue",
  name: "Example User"
})
  .setProtectedHeader({ alg: "HS256" })
  .setSubject("C123456")
  .setIssuer("livestream")
  .setAudience("event-qna")
  .setIssuedAt()
  .setExpirationTime("5m")
  .sign(secret);
```

## Security requirements

- never trust `?cwid=...` as authentication;
- use HTTPS;
- keep `STREAM_SSO_SECRET` out of source control;
- use a different value for `SESSION_SECRET`;
- keep ticket lifetime short;
- rotate secrets if exposed;
- optionally enable `STREAM_REQUIRE_WHITELIST=true` if livestream users must also be on the local whitelist.
