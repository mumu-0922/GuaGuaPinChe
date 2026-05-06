# Admin Guide

## Admin setup

1. Open CloudBase console.
2. Find the trusted operator's document in `users`.
3. Set:

```js
{
  role: "admin"
}
```

4. Keep `blocked: false` for active admins.

## Daily queue

- 每天检查 `verificationRequests.status=pending`
- 每天检查 reports.status=open
- 确认黑车/骚扰/虚假行程后将 trips.status 改为 hidden
- 处理后将 reports.status 改为 reviewed 或 rejected
- 对违规用户执行拉黑；拉黑会隐藏该用户的 open 行程

## Cloud functions to deploy

Deploy each cloud function directory separately in WeChat DevTools:

```text
userEnsure
tripCreate
tripList
tripDetail
contactView
tripUpdateStatus
reportCreate
verificationSubmit
verificationList
verificationReview
adminReportList
adminReportResolve
adminUserList
adminUserBlock
tripSimilar
```

## Collections

Create these collections:

```text
users
trips
contactViews
reports
verificationRequests
```

## Indexes

Create indexes from `database/indexes.json`, including:

- `trips.status + earliestTime`
- `trips.ownerOpenid + updatedAt`
- `trips.from + to + earliestTime`
- `trips.ownerOpenid + status`
- `reports.status + createdAt`
- `contactViews.tripId + createdAt`
- `verificationRequests.status + createdAt`
- `verificationRequests.userOpenid + status`
- `users.verifyStatus + updatedAt`
- `users.blocked + updatedAt`
- `users.verifyStatus + blocked + updatedAt`

## Admin workflows

### Manual verification

1. Open 小程序 `我的` → `管理员` → `认证审核`.
2. Review student ID, real name, college, grade, and note.
3. Approve trusted NPU users.
4. Reject unclear or invalid requests with a short reason.

### Report handling

1. Open `举报处理`.
2. Review open reports.
3. Use `隐藏行程` when the reported trip should disappear from public lists.
4. Use `驳回` for invalid reports.

### User blocking

1. Open `用户管理`.
2. Locate the user by recent list or keyword.
3. Use `拉黑` for spam/abuse. This hides all current open trips by that user.
4. Use `解除拉黑` only after manual review. Hidden trips are not automatically restored.

## CloudBase manual acceptance

- 上传全部云函数，见上方部署列表
- 创建集合 users/trips/contactViews/reports/verificationRequests
- 创建 `database/indexes.json` 中列出的索引
- 广场可加载
- 未认证用户可浏览列表和详情
- 未认证用户发布时出现“需要校园认证”
- 未认证用户查看联系方式时出现“需要校园认证”
- 用户可提交人工认证
- 管理员可审核通过认证
- 已认证用户发布可成功
- 发布成功后可提示 90 分钟内相似行程
- 详情默认隐藏联系方式
- 点击显示联系方式后 contactViews 有记录
- 举报后 reports 有记录
- 管理员可处理举报并隐藏行程
- 管理员可拉黑用户，用户 open 行程从广场消失
- 我的页面可把本人行程设为已满
- 已满行程从广场 open 列表消失

