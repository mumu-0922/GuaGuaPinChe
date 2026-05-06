# Guagua Carpool V1.1 Trusted Campus Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add campus verification, verified-only publish/contact permissions, administrator governance, user blocking, and 90-minute similar-trip recommendations to the existing WeChat mini program MVP.

**Architecture:** Keep the current CloudBase mini-program architecture. Add focused cloud functions for verification, admin governance, and matching; keep public data access behind cloud functions; keep UI pages thin and place reusable validation/formatting logic in small helper files with Vitest coverage.

**Tech Stack:** WeChat Mini Program JavaScript/WXML/WXSS, CloudBase cloud functions with `wx-server-sdk`, CloudBase database collections, Vitest.

---

## File structure map

- Modify existing pages: `miniprogram/app.json`, `miniprogram/pages/mine/*`, `miniprogram/pages/publish/publish.js`, `miniprogram/pages/detail/*`.
- Add pages: `miniprogram/pages/verify/*`, `miniprogram/pages/admin/*`.
- Modify existing cloud functions: `userEnsure`, `tripCreate`, `contactView`.
- Add cloud functions: `verificationSubmit`, `verificationList`, `verificationReview`, `adminReportList`, `adminReportResolve`, `adminUserList`, `adminUserBlock`, `tripSimilar`.
- Update docs/data: `database/schema.md`, `database/indexes.json`, `docs/privacy.md`, `docs/ops/admin-guide.md`.
- Add tests: `tests/cloudfunctions/userAuth.logic.test.mjs`, `tests/cloudfunctions/verification.logic.test.mjs`, `tests/cloudfunctions/admin.logic.test.mjs`, `tests/cloudfunctions/tripSimilar.logic.test.mjs`, `tests/pages/verifyForm.test.mjs`, `tests/pages/adminView.test.mjs`.

---

## Task 1: User verification/block defaults and permission helpers

**Files:**
- Modify: `cloudfunctions/userEnsure/logic.js`
- Modify: `cloudfunctions/userEnsure/index.js`
- Modify: `cloudfunctions/tripCreate/logic.js`
- Modify: `cloudfunctions/contactView/logic.js`
- Test: `tests/cloudfunctions/userAuth.logic.test.mjs`

- [ ] **Step 1: Write failing tests**

Create `tests/cloudfunctions/userAuth.logic.test.mjs` covering:

```js
expect(buildUserDocument('openid-1', {}, 1777480000000)).toMatchObject({
  verified: false,
  verifiedLabel: '未认证',
  verifyStatus: 'unverified',
  verifyMethod: '',
  rejectReason: '',
  blocked: false,
  blockedReason: '',
  blockedAt: null,
  blockedBy: '',
  role: 'user'
});

expect(canCreateTrip({ verifyStatus: 'verified', blocked: false })).toEqual({ ok: true, error: '' });
expect(canCreateTrip({ verifyStatus: 'pending', blocked: false }).ok).toBe(false);
expect(canCreateTrip({ verifyStatus: 'verified', blocked: true }).ok).toBe(false);

expect(canViewerRevealContact({ verifyStatus: 'verified', blocked: false }, { status: 'open' })).toEqual({ ok: true, error: '' });
expect(canViewerRevealContact({ verifyStatus: 'unverified', blocked: false }, { status: 'open' }).ok).toBe(false);
expect(canViewerRevealContact({ verifyStatus: 'verified', blocked: true }, { status: 'open' }).ok).toBe(false);
```

- [ ] **Step 2: Run failing test**

Run:

```bash
npm test -- tests/cloudfunctions/userAuth.logic.test.mjs
```

Expected: FAIL because new helpers are not exported.

- [ ] **Step 3: Add user default helpers**

In `cloudfunctions/userEnsure/logic.js`, add:

```js
const DEFAULT_USER_FIELDS = {
  verified: false,
  verifiedLabel: '未认证',
  verifyStatus: 'unverified',
  verifyMethod: '',
  rejectReason: '',
  blocked: false,
  blockedReason: '',
  blockedAt: null,
  blockedBy: '',
  role: 'user'
};

function mergeUserDefaults(user) {
  const safeUser = user || {};
  return {
    ...DEFAULT_USER_FIELDS,
    ...safeUser,
    role: safeUser.role || 'user',
    verified: Boolean(safeUser.verified),
    blocked: Boolean(safeUser.blocked),
    verifyStatus: safeUser.verifyStatus || 'unverified',
    verifiedLabel: safeUser.verifiedLabel || '未认证',
    verifyMethod: safeUser.verifyMethod || '',
    rejectReason: safeUser.rejectReason || '',
    blockedReason: safeUser.blockedReason || '',
    blockedAt: safeUser.blockedAt || null,
    blockedBy: safeUser.blockedBy || ''
  };
}
```

Update `buildUserDocument` to return `mergeUserDefaults({...})`. Export `DEFAULT_USER_FIELDS` and `mergeUserDefaults`.

- [ ] **Step 4: Backfill existing users**

In `cloudfunctions/userEnsure/index.js`, import `mergeUserDefaults`. For existing users, compute `mergedExisting = mergeUserDefaults(existing.data)`, add missing default fields into the update object only when `existing.data[key] === undefined`, then return `{ ...mergedExisting, ...updates, _id: openid }`.

- [ ] **Step 5: Add publish permission helper**

In `cloudfunctions/tripCreate/logic.js`, add and export:

```js
function canCreateTrip(user) {
  const safeUser = user || {};
  if (safeUser.blocked) return { ok: false, error: '账号已被限制，不能发布行程' };
  if (safeUser.verifyStatus === 'pending') return { ok: false, error: '认证审核中，通过后可发布行程' };
  if (safeUser.verifyStatus !== 'verified') return { ok: false, error: '完成西工大认证后可发布行程' };
  return { ok: true, error: '' };
}
```

- [ ] **Step 6: Add contact permission helper**

In `cloudfunctions/contactView/logic.js`, add and export:

```js
function canViewerRevealContact(viewer, trip) {
  const tripDecision = canRevealContact(trip);
  if (!tripDecision.ok) return tripDecision;
  const safeViewer = viewer || {};
  if (safeViewer.blocked) return { ok: false, error: '账号已被限制，不能查看联系方式' };
  if (safeViewer.verifyStatus === 'pending') return { ok: false, error: '认证审核中，通过后可查看联系方式' };
  if (safeViewer.verifyStatus !== 'verified') return { ok: false, error: '完成西工大认证后可查看联系方式' };
  return { ok: true, error: '' };
}
```

- [ ] **Step 7: Verify and commit**

Run:

```bash
npm test -- tests/cloudfunctions/userAuth.logic.test.mjs tests/cloudfunctions/userEnsure.logic.test.mjs tests/cloudfunctions/tripCreate.logic.test.mjs tests/cloudfunctions/contactView.logic.test.mjs
```

Expected: PASS.

Commit:

```bash
git add cloudfunctions/userEnsure cloudfunctions/tripCreate cloudfunctions/contactView tests/cloudfunctions/userAuth.logic.test.mjs
git commit -m "feat: add user verification permissions"
```

---

## Task 2: Enforce permissions in backend trip creation and contact reveal

**Files:**
- Modify: `cloudfunctions/tripCreate/index.js`
- Modify: `cloudfunctions/contactView/index.js`

- [ ] **Step 1: Enforce publish permission**

In `cloudfunctions/tripCreate/index.js`, import `canCreateTrip`, then after loading `userResult.data` add:

```js
const permission = canCreateTrip(userResult.data);
if (!permission.ok) return { ok: false, errors: [permission.error] };
```

- [ ] **Step 2: Enforce contact permission**

In `cloudfunctions/contactView/index.js`, import `canViewerRevealContact`, load viewer from `users`, then replace the decision with:

```js
const viewerResult = await db.collection('users').doc(viewerOpenid).get().catch(() => null);
const viewer = viewerResult && viewerResult.data;
const decision = canViewerRevealContact(viewer, trip);
if (!decision.ok) return { ok: false, errors: [decision.error] };
```

- [ ] **Step 3: Verify and commit**

Run:

```bash
npm test -- tests/cloudfunctions/userAuth.logic.test.mjs tests/cloudfunctions/tripCreate.logic.test.mjs tests/cloudfunctions/contactView.logic.test.mjs
```

Expected: PASS.

Commit:

```bash
git add cloudfunctions/tripCreate/index.js cloudfunctions/contactView/index.js
git commit -m "feat: enforce verified user permissions"
```

---

## Task 3: Manual verification backend

**Files:**
- Create: `cloudfunctions/verificationSubmit/*`
- Create: `cloudfunctions/verificationList/*`
- Create: `cloudfunctions/verificationReview/*`
- Test: `tests/cloudfunctions/verification.logic.test.mjs`

- [ ] **Step 1: Write failing tests**

Create `tests/cloudfunctions/verification.logic.test.mjs` covering:

```js
expect(validateVerificationForm({ studentId: '2024000000', realName: '张三', college: '计算机学院', grade: '2024', note: '' })).toEqual({ ok: true, errors: [] });
expect(validateVerificationForm({ studentId: '', realName: '', college: '', grade: '', note: 'a'.repeat(121) }).ok).toBe(false);
expect(canSubmitVerification({ blocked: false }, null)).toEqual({ ok: true, error: '' });
expect(canSubmitVerification({ blocked: true }, null).ok).toBe(false);
expect(canSubmitVerification({ blocked: false }, { status: 'pending' }).ok).toBe(false);
expect(buildReviewUpdates('approve', '', 'admin-1', 1777480000000).userUpdate).toMatchObject({
  verified: true,
  verifiedLabel: '西工大认证',
  verifyStatus: 'verified',
  verifyMethod: 'manual'
});
expect(buildReviewUpdates('reject', '信息不完整', 'admin-1', 1777480000000).userUpdate).toMatchObject({
  verified: false,
  verifiedLabel: '认证失败',
  verifyStatus: 'rejected',
  rejectReason: '信息不完整'
});
```

- [ ] **Step 2: Run failing tests**

Run:

```bash
npm test -- tests/cloudfunctions/verification.logic.test.mjs
```

Expected: FAIL because verification functions do not exist.

- [ ] **Step 3: Implement `verificationSubmit`**

Create `logic.js` with `validateVerificationForm`, `canSubmitVerification`, `buildVerificationRequest`. Required document shape:

```js
{
  userOpenid,
  studentId,
  realName,
  college,
  grade,
  note,
  status: 'pending',
  rejectReason: '',
  reviewedBy: '',
  reviewedAt: null,
  createdAt: now,
  updatedAt: now
}
```

Create `index.js` to validate input, ensure user exists and is not blocked, reject duplicate pending request, add to `verificationRequests`, update user to `verifyStatus: 'pending'`, `verifiedLabel: '审核中'`, `verifyMethod: 'manual'`.

- [ ] **Step 4: Implement `verificationList`**

Create `logic.js` with:

```js
function normalizeVerificationStatus(status) {
  const value = String(status || 'pending').trim();
  return ['pending', 'approved', 'rejected'].includes(value) ? value : 'pending';
}
```

Create `index.js` that requires admin role, queries `verificationRequests.where({ status })`, sorts by `createdAt desc`, limits 50, returns `{ ok: true, requests }`.

- [ ] **Step 5: Implement `verificationReview`**

Create `logic.js` with `buildReviewUpdates(action, reason, adminOpenid, now)`. `approve` updates request to `approved` and user to verified. `reject` updates request to `rejected` and user to `verifyStatus: 'rejected'` with reject reason.

Create `index.js` that requires admin role, loads pending request, applies review updates, updates both `verificationRequests` and `users`.

- [ ] **Step 6: Add package files**

Each new function gets:

```json
{
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {
    "wx-server-sdk": "latest"
  }
}
```

Set `name` to the folder name.

- [ ] **Step 7: Verify and commit**

Run:

```bash
npm test -- tests/cloudfunctions/verification.logic.test.mjs
```

Expected: PASS.

Commit:

```bash
git add cloudfunctions/verificationSubmit cloudfunctions/verificationList cloudfunctions/verificationReview tests/cloudfunctions/verification.logic.test.mjs
git commit -m "feat: add manual verification backend"
```

---

## Task 4: Admin report and user governance backend

**Files:**
- Create: `cloudfunctions/adminReportList/*`
- Create: `cloudfunctions/adminReportResolve/*`
- Create: `cloudfunctions/adminUserList/*`
- Create: `cloudfunctions/adminUserBlock/*`
- Test: `tests/cloudfunctions/admin.logic.test.mjs`

- [ ] **Step 1: Write failing admin tests**

Create `tests/cloudfunctions/admin.logic.test.mjs` covering:

```js
expect(buildReportResolution('reviewed', '已处理', true, 'admin-1', 1777480000000)).toEqual({
  reportUpdate: { status: 'reviewed', resolutionNote: '已处理', resolvedBy: 'admin-1', resolvedAt: 1777480000000, updatedAt: 1777480000000 },
  tripUpdate: { status: 'hidden', updatedAt: 1777480000000 }
});
expect(buildUserBlockUpdate('block', '广告', 'admin-1', 1777480000000)).toMatchObject({ blocked: true, blockedReason: '广告' });
expect(buildUserBlockUpdate('unblock', '', 'admin-1', 1777480000000)).toMatchObject({ blocked: false, blockedReason: '' });
expect(buildUserFilters({ verifyStatus: 'verified', blocked: 'true', keyword: ' abc ' })).toEqual({ verifyStatus: 'verified', blocked: true, keyword: 'abc' });
```

- [ ] **Step 2: Run failing tests**

Run:

```bash
npm test -- tests/cloudfunctions/admin.logic.test.mjs
```

Expected: FAIL because admin functions do not exist.

- [ ] **Step 3: Implement report admin functions**

`adminReportList`: require admin, query reports by normalized status (`open`, `reviewed`, `rejected`), order `createdAt desc`, limit 50.

`adminReportResolve`: require admin, load report, build update, update report, and when `hideTrip` is true update related trip to `status: 'hidden'`.

Core logic:

```js
function buildReportResolution(status, note, hideTrip, adminOpenid, now) {
  const finalStatus = ['reviewed', 'rejected'].includes(status) ? status : '';
  if (!finalStatus) return null;
  return {
    reportUpdate: { status: finalStatus, resolutionNote: String(note || '').trim(), resolvedBy: adminOpenid, resolvedAt: now, updatedAt: now },
    tripUpdate: hideTrip ? { status: 'hidden', updatedAt: now } : null
  };
}
```

- [ ] **Step 4: Implement user admin functions**

`adminUserList`: require admin, support `verifyStatus`, `blocked`, `keyword`; return user view with nickname, openid tail, verification, role, blocked status.

`adminUserBlock`: require admin, reject blocking self, update target user. For `block`, update all open trips by that user:

```js
await db.collection('trips').where({ ownerOpenid: userOpenid, status: 'open' }).update({
  data: { status: 'hidden', updatedAt: now }
});
```

Core logic:

```js
function buildUserBlockUpdate(action, reason, adminOpenid, now) {
  if (action === 'block') return { blocked: true, blockedReason: String(reason || '').trim() || '违反社区规则', blockedAt: now, blockedBy: adminOpenid, updatedAt: now };
  if (action === 'unblock') return { blocked: false, blockedReason: '', blockedAt: null, blockedBy: '', updatedAt: now };
  return null;
}
```

- [ ] **Step 5: Add package files and verify**

Add package files using the standard `wx-server-sdk` shape from Task 3.

Run:

```bash
npm test -- tests/cloudfunctions/admin.logic.test.mjs
```

Expected: PASS.

Commit:

```bash
git add cloudfunctions/adminReportList cloudfunctions/adminReportResolve cloudfunctions/adminUserList cloudfunctions/adminUserBlock tests/cloudfunctions/admin.logic.test.mjs
git commit -m "feat: add admin governance backend"
```

---

## Task 5: Verification page and Mine page integration

**Files:**
- Modify: `miniprogram/app.json`
- Modify: `miniprogram/pages/mine/*`
- Create: `miniprogram/pages/verify/*`
- Test: `tests/pages/verifyForm.test.mjs`

- [ ] **Step 1: Write failing verify form tests**

Create `tests/pages/verifyForm.test.mjs` covering trimmed payload, blank required fields, and status view labels:

```js
expect(buildVerifyPayload({ studentId: ' 2024000000 ', realName: ' 张三 ', college: ' 计算机学院 ', grade: ' 2024 ', note: ' 长安校区 ' })).toEqual({
  form: { studentId: '2024000000', realName: '张三', college: '计算机学院', grade: '2024', note: '长安校区' }
});
expect(validateVerifyForm({ studentId: '', realName: '', college: '', grade: '', note: '' }).ok).toBe(false);
expect(getVerifyStatusView({ verifyStatus: 'pending' })).toEqual({ label: '认证审核中', tone: 'warning', actionText: '等待管理员审核' });
```

- [ ] **Step 2: Implement verify helpers and page**

Create `miniprogram/pages/verify/form.js` with `validateVerifyForm`, `buildVerifyPayload`, `getVerifyStatusView`.

Create `verify.js` to call `userEnsure` on show, render status, accept manual form input, validate, call `verificationSubmit`, then reload user status.

Create `verify.wxml` with:

- status card
- disabled email card saying `校园邮箱认证即将支持`
- manual form fields for student ID, real name, college, grade, note
- submit button

Create `verify.json`:

```json
{ "navigationBarTitleText": "校园认证" }
```

- [ ] **Step 3: Integrate Mine page**

Register `pages/verify/verify` and `pages/admin/admin` in `app.json`.

In `mine.js`, call `userEnsure`, store `user`, show verification card, add:

```js
goVerify() {
  wx.navigateTo({ url: '/pages/verify/verify' });
},
goAdmin() {
  wx.navigateTo({ url: '/pages/admin/admin' });
}
```

In `mine.wxml`, show admin entry only when `user.role === 'admin'`.

- [ ] **Step 4: Verify and commit**

Run:

```bash
npm test -- tests/pages/verifyForm.test.mjs
npm run check:json
```

Expected: PASS and `json ok`.

Commit:

```bash
git add miniprogram/app.json miniprogram/pages/mine miniprogram/pages/verify tests/pages/verifyForm.test.mjs
git commit -m "feat: add campus verification page"
```

---

## Task 6: Admin mini-program page

**Files:**
- Create: `miniprogram/pages/admin/*`
- Test: `tests/pages/adminView.test.mjs`

- [ ] **Step 1: Write failing admin view tests**

Create `tests/pages/adminView.test.mjs`:

```js
expect(getVerifyRequestTitle({ realName: '张三', studentId: '2024000000', college: '计算机学院' })).toBe('张三 · 2024000000 · 计算机学院');
expect(getReportStatusLabel('open')).toBe('待处理');
expect(formatAdminUser({ nickname: '同学', openidTail: 'abc123', verifiedLabel: '西工大认证', blocked: true, blockedReason: '广告' })).toEqual({
  title: '同学 · abc123',
  verifyText: '西工大认证',
  blockText: '已拉黑：广告'
});
```

- [ ] **Step 2: Implement admin view helpers**

Create `miniprogram/pages/admin/view.js` with `getVerifyRequestTitle`, `getReportStatusLabel`, `formatAdminUser`.

- [ ] **Step 3: Implement admin page**

Create `admin.json`:

```json
{ "navigationBarTitleText": "管理员" }
```

Create `admin.js` with three tabs:

- `verify`: load `verificationList`, call `verificationReview`
- `reports`: load `adminReportList`, call `adminReportResolve`
- `users`: load `adminUserList`, call `adminUserBlock`

Use `wx.showModal` before reject, hide trip, block, and unblock.

Create `admin.wxml` with tab buttons:

```xml
<button data-tab="verify" bindtap="switchTab">认证审核</button>
<button data-tab="reports" bindtap="switchTab">举报处理</button>
<button data-tab="users" bindtap="switchTab">用户管理</button>
```

- [ ] **Step 4: Verify and commit**

Run:

```bash
npm test -- tests/pages/adminView.test.mjs
npm run check:json
```

Expected: PASS and `json ok`.

Commit:

```bash
git add miniprogram/pages/admin tests/pages/adminView.test.mjs
git commit -m "feat: add admin governance page"
```

---

## Task 7: Similar trip recommendations

**Files:**
- Create: `cloudfunctions/tripSimilar/*`
- Modify: `miniprogram/pages/detail/*`
- Modify: `miniprogram/pages/publish/publish.js`
- Test: `tests/cloudfunctions/tripSimilar.logic.test.mjs`

- [ ] **Step 1: Write failing similar trip tests**

Create `tests/cloudfunctions/tripSimilar.logic.test.mjs` covering:

```js
expect(buildSimilarWindow({ from: '长安校区', to: '咸阳机场', earliestTime: 1777500000000 })).toEqual({
  from: '长安校区',
  to: '咸阳机场',
  start: 1777500000000 - 90 * 60 * 1000,
  end: 1777500000000 + 90 * 60 * 1000
});
expect(filterSimilarTrips(baseTrip, trips).map((trip) => trip._id)).toEqual(['near']);
expect(toSimilarTripView({ _id: 't1', from: '长安校区', contactType: 'qq', contactValue: '123' })).toEqual({ _id: 't1', from: '长安校区' });
```

- [ ] **Step 2: Implement `tripSimilar` backend**

Create `logic.js` with:

```js
const SIMILAR_WINDOW_MS = 90 * 60 * 1000;
```

Implement `buildSimilarWindow`, `filterSimilarTrips`, `toSimilarTripView`. Filter only `status: 'open'`, same `from`, same `to`, within 90 minutes, exclude current trip, sort by time difference, limit 3.

Create `index.js` that accepts either `{ tripId }` or `{ trip }`, queries `trips` by `status/from/to/earliestTime`, returns `{ ok: true, trips }` without contact fields.

- [ ] **Step 3: Integrate detail page**

Add `similarTrips` and `similarLoading` to `detail.js`. After loading detail, call `tripSimilar`. Render a bottom section in `detail.wxml` with up to 3 cards and a tap handler to navigate to detail page.

- [ ] **Step 4: Integrate publish success**

After successful `tripCreate`, call `tripSimilar` with the local trip draft. If returned count is greater than zero, show modal:

```js
wx.showModal({
  title: '发布成功',
  content: `发现 ${count} 个相似行程，可以去看看`,
  showCancel: false
});
```

- [ ] **Step 5: Verify and commit**

Run:

```bash
npm test -- tests/cloudfunctions/tripSimilar.logic.test.mjs
npm run check:json
```

Expected: PASS and `json ok`.

Commit:

```bash
git add cloudfunctions/tripSimilar miniprogram/pages/detail miniprogram/pages/publish tests/cloudfunctions/tripSimilar.logic.test.mjs
git commit -m "feat: add similar trip recommendations"
```

---

## Task 8: Frontend permission prompts

**Files:**
- Modify: `miniprogram/pages/publish/publish.js`
- Modify: `miniprogram/pages/detail/detail.js`

- [ ] **Step 1: Add publish prompt**

In `publish.js`, load user via `userEnsure`. Before submit, check:

```js
if (!user || user.blocked || user.verifyStatus !== 'verified') {
  wx.showModal({
    title: '需要校园认证',
    content: user && user.verifyStatus === 'pending' ? '认证审核中，通过后可发布行程' : '完成西工大认证后可发布行程',
    confirmText: '去认证',
    success: (res) => {
      if (res.confirm) wx.navigateTo({ url: '/pages/verify/verify' });
    }
  });
  return;
}
```

- [ ] **Step 2: Add contact prompt**

In `detail.js`, when `contactView` returns a certification-related error, show a modal with confirm button to `/pages/verify/verify`. Use toast for non-certification errors.

- [ ] **Step 3: Verify and commit**

Run:

```bash
npm test -- tests/pages/publishForm.test.mjs tests/pages/detailView.test.mjs
npm run check:json
```

Expected: PASS and `json ok`.

Commit:

```bash
git add miniprogram/pages/publish miniprogram/pages/detail
git commit -m "feat: add verification prompts to user flows"
```

---

## Task 9: Database indexes, docs, and final verification

**Files:**
- Modify: `database/indexes.json`
- Modify: `database/schema.md`
- Modify: `docs/privacy.md`
- Modify: `docs/ops/admin-guide.md`

- [ ] **Step 1: Add indexes**

Add indexes for:

- `verificationRequests.status + createdAt`
- `verificationRequests.userOpenid + status`
- `users.verifyStatus + updatedAt`
- `users.blocked + updatedAt`

Keep existing `trips.from_to_earliestTime` for similar trips.

- [ ] **Step 2: Update docs**

Update schema, privacy, and admin guide with:

- New user verification/block fields
- New `verificationRequests` collection
- Expanded report resolution fields
- Manual admin setup: set `users.role = "admin"`
- New cloud function deployment list
- Manual acceptance checklist

- [ ] **Step 3: Full verification**

Run:

```bash
npm test
npm run check:json
git status --short
```

Expected: all tests pass, `json ok`, and only intended doc/index files remain before commit.

- [ ] **Step 4: Commit docs**

```bash
git add database/indexes.json database/schema.md docs/privacy.md docs/ops/admin-guide.md
git commit -m "docs: update v1.1 data and admin operations"
```

---

## Manual deployment checklist

After implementation, deploy these cloud functions in WeChat DevTools:

```text
userEnsure
tripCreate
contactView
verificationSubmit
verificationList
verificationReview
adminReportList
adminReportResolve
adminUserList
adminUserBlock
tripSimilar
```

Create collection:

```text
verificationRequests
```

Create indexes from:

```text
database/indexes.json
```

Manual acceptance:

1. Unverified user can browse list and detail.
2. Unverified user cannot publish or view contact.
3. User submits manual verification.
4. Admin approves verification.
5. Verified user can publish and view contact.
6. Admin can process report and hide trip.
7. Admin can block user and the user's open trips disappear.
8. Detail page shows same-route trips within 90 minutes.

---

## Self-review checklist

- Spec coverage: authentication, publish/contact restrictions, admin certification review, report handling, user blocking, automatic hiding of open trips, and similar trip recommendations are each mapped to tasks.
- Placeholder scan: concrete files, commands, and expected outcomes are present.
- Type consistency: `verifyStatus`, `verifyMethod`, `verifiedLabel`, `blocked`, `blockedReason`, `blockedAt`, `blockedBy`, `verificationRequests`, and `tripSimilar` match the design document.
- Scope control: email sending, image uploads, payment, chat, route subscription, and driver workflows are excluded from implementation.
