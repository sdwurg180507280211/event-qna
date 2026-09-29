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

## Delivery refinement (2026-09-29)

- Admin interface is desktop-only by request; participant login and Q&A support mobile.
- Desktop QR joins the current public activity login page on a phone.
- Public pool includes server pagination and total, expandable long questions and explicit vote/unvote operations.
- Admin adds search, per-state counts, automatic refresh, whitelist re-enable and editable activity/brand settings.
- Disabling a whitelist participant invalidates existing sessions on their next request.
- Livestream tickets must contain iat/exp, be at most five minutes old and have a lifetime no longer than five minutes.
- The HTTP server address is for acceptance; actual livestream integration and production domain/HTTPS are separate integration steps.

## 当前调整：移除点赞与热门
参与页不展示点赞或排序切换，后台不展示点赞数。问题固定按创建时间倒序，相同时间以 ID 作为稳定次序；旧热门参数不改变顺序。旧点赞接口返回 410，历史投票数据保留但不参与展示与排序。

## 当前调整：公开匿名入口
链接和二维码均直接进入提问页；旧 /login 地址自动跳转。用户无需 CWID、白名单或直播 Ticket；后台密码登录保持不变。新问题统一记录为匿名访客，仍须审核。活动关闭后不可访问或提交。历史白名单不限制公开入口。
