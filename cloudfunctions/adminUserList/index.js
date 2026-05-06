const cloud = require('wx-server-sdk');
const { buildUserFilters, toAdminUserView, matchesUserKeyword } = require('./logic');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

function isNotFoundError(error) {
  const message = String(error && (error.message || error.errMsg || ''));
  return message.includes('not found') || message.includes('not exist') || message.includes('\u4e0d\u5b58\u5728');
}

async function getDocOrNull(ref) {
  try {
    return await ref.get();
  } catch (error) {
    if (isNotFoundError(error)) return null;
    throw error;
  }
}

const MAX_USER_SCAN = 500;
const USER_PAGE_SIZE = 100;
const USER_RESULT_LIMIT = 50;

async function requireAdmin(db, openid) {
  const userResult = await getDocOrNull(db.collection('users').doc(openid));
  const user = userResult && userResult.data;
  return Boolean(user && user.role === 'admin' && !user.blocked);
}

function buildBaseQuery(filters) {
  const where = {};
  if (filters.verifyStatus) where.verifyStatus = filters.verifyStatus;
  if (filters.blocked !== null) where.blocked = filters.blocked;
  let query = db.collection('users');
  if (Object.keys(where).length > 0) query = query.where(where);
  return query.orderBy('updatedAt', 'desc');
}

async function listWithoutKeyword(filters) {
  const result = await buildBaseQuery(filters).limit(USER_RESULT_LIMIT).get();
  return (result.data || []).map(toAdminUserView);
}

async function listWithKeyword(filters) {
  const users = [];
  let scanned = 0;
  while (scanned < MAX_USER_SCAN && users.length < USER_RESULT_LIMIT) {
    const pageSize = Math.min(USER_PAGE_SIZE, MAX_USER_SCAN - scanned);
    let query = buildBaseQuery(filters).skip(scanned).limit(pageSize);
    const result = await query.get();
    const page = result.data || [];
    for (const user of page) {
      if (matchesUserKeyword(user, filters.keyword)) users.push(toAdminUserView(user));
      if (users.length >= USER_RESULT_LIMIT) break;
    }
    scanned += pageSize;
    if (page.length < pageSize) break;
  }
  return users;
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const isAdmin = await requireAdmin(db, openid);
  if (!isAdmin) return { ok: false, errors: ['无管理员权限'] };

  const filters = buildUserFilters(event || {});
  const users = filters.keyword ? await listWithKeyword(filters) : await listWithoutKeyword(filters);
  return { ok: true, users };
};

module.exports.MAX_USER_SCAN = MAX_USER_SCAN;
module.exports.USER_PAGE_SIZE = USER_PAGE_SIZE;
module.exports.USER_RESULT_LIMIT = USER_RESULT_LIMIT;
