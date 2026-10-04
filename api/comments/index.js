'use strict';

/**
 * 匿名留言 API。
 *
 * 注意：这里必须用 Azure Functions 的 Node v3 编程模型（module.exports + function.json）。
 * SWA 托管函数目前不支持 v4 的 app.http() 写法 —— 用了会静默 404，没有任何报错。
 * 参见 https://github.com/Azure/static-web-apps/issues/1139
 *
 * 路由：/api/comments
 *   GET    ?slug=xxx            列出某篇文章的留言
 *   POST   {slug,name,body,...} 发表留言（匿名）
 *   DELETE ?slug=xxx&id=xxx     删除留言（需要 x-admin-token 头）
 *
 * 数据存在 Azure 表存储的 comments 表：
 *   PartitionKey = 文章 slug（同一篇的留言存在一起，查询是分区内扫描）
 *   RowKey       = `${毫秒时间戳}-${随机}`（字典序即时间序）
 */

const crypto = require('node:crypto');
const { TableClient } = require('@azure/data-tables');

const TABLE_NAME = 'comments';

const MAX_NAME_LEN = 40;
const MAX_BODY_LEN = 2000;
const MAX_LIST = 500;

const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 小时
const RATE_MAX = 5; // 同一篇文章、同一个 IP、每小时最多几条

// 表单渲染到提交的最短间隔。机器人通常瞬间提交，正常人手打不出来。
const MIN_ELAPSED_MS = 1500;

const SLUG_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;

// ---------------------------------------------------------------- 工具

function send(context, status, payload) {
  context.res = {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
    body: JSON.stringify(payload),
  };
}

function str(value, maxLen) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLen);
}

/** OData 字符串里的单引号要写两遍，否则可以被注入 */
function escapeOdata(s) {
  return s.replace(/'/g, "''");
}

function clientIp(req) {
  const headers = req.headers || {};
  const fwd = headers['x-forwarded-for'] || headers['X-Forwarded-For'] || '';
  return String(fwd).split(',')[0].trim() || '0.0.0.0';
}

/** 只存哈希，不存原始 IP —— 既能限流又不留隐私数据 */
function hashIp(ip) {
  const salt = process.env.COMMENTS_ADMIN_TOKEN || 'fallback-salt';
  return crypto.createHash('sha256').update(`${salt}|${ip}`).digest('hex').slice(0, 24);
}

let cachedClient = null;
function getClient() {
  if (cachedClient) return cachedClient;
  const connectionString = process.env.STORAGE_CONNECTION_STRING;
  if (!connectionString) throw new Error('STORAGE_CONNECTION_STRING 未配置');
  cachedClient = TableClient.fromConnectionString(connectionString, TABLE_NAME);
  return cachedClient;
}

function publicComment(entity) {
  return {
    id: entity.rowKey,
    name: entity.name || '匿名',
    body: entity.body || '',
    createdAt: entity.createdAt || '',
  };
}

// ---------------------------------------------------------------- 各动作

async function handleList(context, req) {
  const slug = str(req.query && req.query.slug, 100);
  if (!SLUG_RE.test(slug)) return send(context, 400, { error: '缺少或非法的 slug' });

  const client = getClient();
  const comments = [];

  const iterator = client.listEntities({
    queryOptions: {
      filter: `PartitionKey eq '${escapeOdata(slug)}'`,
    },
  });

  for await (const entity of iterator) {
    comments.push(publicComment(entity));
    if (comments.length >= MAX_LIST) break;
  }

  return send(context, 200, { count: comments.length, comments });
}

async function handleCreate(context, req) {
  const input = req.body || {};

  const slug = str(input.slug, 100);
  if (!SLUG_RE.test(slug)) return send(context, 400, { error: '非法的话题标识' });

  // 蜜罐：这个字段在页面上是隐藏的，正常用户永远不会填
  if (str(input.website, 200)) return send(context, 400, { error: '提交被拒绝' });

  const elapsed = Number(input.elapsed);
  if (!Number.isFinite(elapsed) || elapsed < MIN_ELAPSED_MS) {
    return send(context, 400, { error: '提交得太快了，请稍后再试一次' });
  }

  const body = str(input.body, MAX_BODY_LEN + 1);
  if (!body) return send(context, 400, { error: '留言内容不能为空' });
  if (body.length > MAX_BODY_LEN) {
    return send(context, 400, { error: `留言最多 ${MAX_BODY_LEN} 个字` });
  }

  const name = str(input.name, MAX_NAME_LEN + 1) || '匿名';
  if (name.length > MAX_NAME_LEN) {
    return send(context, 400, { error: `昵称最多 ${MAX_NAME_LEN} 个字` });
  }

  const client = getClient();
  const ipHash = hashIp(clientIp(req));

  // 频率限制：数一数这个 IP 在这篇文章下最近一小时的留言数
  const cutoff = Date.now() - RATE_WINDOW_MS;
  let recent = 0;
  const iterator = client.listEntities({
    queryOptions: {
      filter: `PartitionKey eq '${escapeOdata(slug)}' and RowKey gt '${cutoff}'`,
    },
  });
  for await (const entity of iterator) {
    if (entity.ipHash === ipHash) recent += 1;
    if (recent >= RATE_MAX) break;
  }
  if (recent >= RATE_MAX) {
    return send(context, 429, { error: '留言太频繁了，过一会儿再来吧' });
  }

  const now = Date.now();
  const entity = {
    partitionKey: slug,
    rowKey: `${now}-${crypto.randomBytes(4).toString('hex')}`,
    name,
    body,
    createdAt: new Date(now).toISOString(),
    ipHash,
  };

  await client.createEntity(entity);

  return send(context, 201, { comment: publicComment(entity) });
}

async function handleDelete(context, req) {
  const expected = process.env.COMMENTS_ADMIN_TOKEN || '';
  const provided = (req.headers && req.headers['x-admin-token']) || '';

  const a = Buffer.from(String(provided));
  const b = Buffer.from(expected);
  const authorized =
    expected.length > 0 && a.length === b.length && crypto.timingSafeEqual(a, b);
  if (!authorized) return send(context, 401, { error: '没有权限' });

  const query = req.query || {};
  const slug = str(query.slug, 100);
  const id = str(query.id, 100);
  if (!SLUG_RE.test(slug) || !id) return send(context, 400, { error: '缺少 slug 或 id' });

  const client = getClient();
  try {
    await client.deleteEntity(slug, id);
  } catch (err) {
    // 已经被删掉了就当成功，避免重复点击报错
    if (err && err.statusCode === 404) return send(context, 200, { ok: true });
    throw err;
  }

  return send(context, 200, { ok: true });
}

// ---------------------------------------------------------------- 入口

module.exports = async function (context, req) {
  const method = String(req.method || 'GET').toUpperCase();

  try {
    if (method === 'GET') return await handleList(context, req);
    if (method === 'POST') return await handleCreate(context, req);
    if (method === 'DELETE') return await handleDelete(context, req);
    return send(context, 405, { error: '不支持的请求方法' });
  } catch (err) {
    // 只记日志，不把内部错误回给前端（避免泄漏连接串等信息）
    context.log.error('comments api 出错:', err && err.stack ? err.stack : err);
    return send(context, 500, { error: '服务器出错了，请稍后再试' });
  }
};
