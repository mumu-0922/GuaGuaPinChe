# Database Schema

> Cloud collections: `users`, `trips`, `contactViews`, `reports`. Clients should access them through cloud functions only.

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
  role: "user", // user | admin
  createdAt: 1777480000000,
  updatedAt: 1777480000000
}
```

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
  createdAt: 1777480000000,
  updatedAt: 1777480000000
}
```

---

## Indexes

See `database/indexes.json`.
