# Privacy and Compliance

Scope boundaries for this campus carpool matching MVP:

- 只做信息撮合
- 不做网约车经营
- 不抽佣
- 不托管资金
- 联系方式默认隐藏
- 查看联系方式写审计
- 过期/取消/隐藏行程不展示联系方式

## Data handling

- Public list/detail responses do not include `contactType` or `contactValue`.
- `contactView` reveals contact data only after an explicit tap and writes an audit record to `contactViews`.
- Trips with `expired`, `cancelled`, or `hidden` status must not reveal contact details.
- Publishing and contact reveal require campus verification (`verifyStatus: "verified"`). Unverified users may browse public trip information.
- Manual verification stores student ID, real name, college, grade, optional note, review status, reviewer, and timestamps in `verificationRequests`.
- Admins can reject verification requests with a reason. Rejection reasons are shown to the applicant so they can resubmit corrected information.
- Admins can block abusive users. Block metadata (`blocked`, `blockedReason`, `blockedAt`, `blockedBy`) is stored on `users`; blocking also hides that user's open trips.
- Reports store resolution metadata (`resolutionNote`, `resolvedBy`, `resolvedAt`) for moderation auditability.
- Similar-trip recommendations use route and departure time only; recommendation responses remove contact fields.

## Admin access

- Admin capability is controlled by `users.role = "admin"` and should be set manually only for trusted operators.
- Admin pages and admin cloud functions must not expose raw contact values except through the existing audited contact reveal flow.
- Operators should avoid storing images or extra identity materials in this version; manual verification is text-only.
