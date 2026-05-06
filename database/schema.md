# Database Schema

> Cloud collections: `users`, `trips`, `contactViews`, `reports`, `verificationRequests`. Clients should access them through cloud functions only.

## 2. 数据模型

### `users`

```js
{
  _id: "openid",
  openid: "openid",
  nickname: "同学",
  avatarUrl: "",
  verified: false,
  verifiedLabel: "未认证",
  verifyStatus: "unverified", // unverified | pending | verified | rejected
  verifyMethod: "", // manual | email (reserved)
  rejectReason: "",
  blocked: false,
  blockedReason: "",
  blockedAt: null,
  blockedBy: "",
  role: "user", // user | admin
  createdAt: 1777480000000,
  updatedAt: 1777480000000
}
```

Notes:

- `verified` / `verifiedLabel` are retained for compatibility and display.
- `verifyStatus` is the source of truth for publish/contact permissions.
- Set `role: "admin"` manually in CloudBase console for trusted operators.
- Blocked users cannot publish, view contact details, or submit new verification requests.

### `trips`

```js
{
  _id: "cloud id",
  ownerOpenid: "openid",
  ownerNickname: "张*",
  ownerVerified: false,
  ownerVerifiedLabel: "未认证",
  from: "长安校区",
  to: "咸阳机场",
  earliestTime: 1777500000000,
  latestTime: 1777501800000,
  peopleCount: 1,
  status: "open", // open | full | cancelled | expired | hidden
  note: "一人一箱，T5航站楼",
  contactType: "qq", // qq | wechat | phone
  contactValue: "123456789",
  createdAt: 1777480000000,
  updatedAt: 1777480000000
}
```

### `contactViews`

```js
{
  tripId: "trip id",
  viewerOpenid: "openid",
  ownerOpenid: "openid",
  createdAt: 1777480000000
}
```

### `reports`

```js
{
  tripId: "trip id",
  reporterOpenid: "openid",
  reason: "black_car_risk",
  detail: "疑似黑车引流",
  status: "open", // open | reviewed | rejected
  resolutionNote: "已处理",
  resolvedBy: "admin openid",
  resolvedAt: 1777480000000,
  createdAt: 1777480000000,
  updatedAt: 1777480000000
}
```

### `verificationRequests`

```js
{
  _id: "cloud id",
  userOpenid: "openid",
  studentId: "2024000000",
  realName: "张三",
  college: "计算机学院",
  grade: "2024",
  note: "长安校区",
  status: "pending", // pending | approved | rejected
  rejectReason: "",
  reviewedBy: "",
  reviewedAt: null,
  createdAt: 1777480000000,
  updatedAt: 1777480000000
}
```

Notes:

- Only admins can list/review verification requests.
- Approval updates the matching `users` document to `verifyStatus: "verified"`.
- Rejection updates the matching `users` document to `verifyStatus: "rejected"` and stores `rejectReason`.

---

## Indexes

See `database/indexes.json`.
