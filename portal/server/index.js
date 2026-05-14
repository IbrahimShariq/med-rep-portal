import crypto from 'node:crypto';
import http from 'node:http';
import { readFile, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, 'data.json');
const DIST_DIR = path.join(__dirname, '..', 'dist');
const PORT = Number(process.env.PORT || 8787);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.webp': 'image/webp',
};

const serveStatic = async (req, res, pathname) => {
  // Resolve the file path
  const safePath = path.normalize(pathname).replace(/^(\/|\\)+/, '');
  let filePath = path.join(DIST_DIR, safePath || 'index.html');

  try {
    const info = await stat(filePath);
    if (info.isDirectory()) filePath = path.join(filePath, 'index.html');
  } catch {
    // File not found — serve index.html for SPA client-side routing
    filePath = path.join(DIST_DIR, 'index.html');
  }

  try {
    const content = await readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const mime = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000' });
    res.end(content);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
};
const TOKEN_SECRET = process.env.API_TOKEN_SECRET || 'local-dev-med-rep-secret';
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const rateLimit = new Map();

const securityHeaders = {
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
  'Cross-Origin-Resource-Policy': 'same-site',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
};

const getJsonHeaders = (req) => {
  const origin = req.headers.origin || '';
  const allowedOrigin =
    ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(origin)
      ? origin || '*'
      : ALLOWED_ORIGINS[0];

  return {
    ...securityHeaders,
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
};

const optionsHeaders = (req) => ({
  ...getJsonHeaders(req),
  'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
});

const readBody = (req) =>
  new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        req.destroy();
        reject(Object.assign(new Error('Request body too large'), { statusCode: 413 }));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });

const loadData = async () => JSON.parse(await readFile(DATA_FILE, 'utf8'));
const saveData = async (data) => writeFile(DATA_FILE, `${JSON.stringify(data, null, 2)}\n`);

const send = (req, res, status, payload) => {
  res.writeHead(status, getJsonHeaders(req));
  res.end(JSON.stringify(payload));
};

const nextId = (items) => {
  const max = items.reduce((highest, item) => Math.max(highest, Number(item.id) || 0), 0);
  return String(max + 1);
};

const cleanDoctor = (input) => ({
  name: String(input.name || '').trim(),
  degree: String(input.degree || '').trim(),
  specialization: String(input.specialization || '').trim(),
  priority: Number(input.priority || 2),
  territory: String(input.territory || '').trim(),
  address: String(input.address || '').trim(),
  latitude: input.latitude === '' || input.latitude == null ? null : Number(input.latitude),
  longitude: input.longitude === '' || input.longitude == null ? null : Number(input.longitude),
  phone: String(input.phone || '').trim(),
  notes: String(input.notes || '').trim(),
  is_active: input.is_active ?? 1,
});

const cleanRep = (input) => ({
  name: String(input.name || '').trim(),
  email: String(input.email || '').trim().toLowerCase(),
  password: String(input.password || '').trim(),
  role: input.role || 'REP',
  territory: String(input.territory || '').trim(),
  managerId: input.managerId ? String(input.managerId) : '',
  baseLatitude: input.baseLatitude === '' || input.baseLatitude == null ? null : Number(input.baseLatitude),
  baseLongitude: input.baseLongitude === '' || input.baseLongitude == null ? null : Number(input.baseLongitude),
  profilePicture: String(input.profilePicture || '').trim(),
  status: input.status || 'ACTIVE',
});

const cleanSchedule = (input, data) => {
  const repId = String(input.rep_id || input.repId || '').trim();
  const approvalChain = buildApprovalChain(data.reps, repId);
  return {
    id: input.id == null ? nextId(data.schedules || []) : String(input.id),
    rep_id: repId,
    doctor_id: input.doctor_id == null ? '' : String(input.doctor_id),
    date: String(input.date || '').slice(0, 10),
    shift: String(input.shift || 'Morning').trim(),
    notes: String(input.notes || '').trim(),
    status: approvalChain.length ? 'PENDING' : 'APPROVED',
    approval_chain: approvalChain,
    approvals: input.approvals || [],
    syncedAt: new Date().toISOString(),
  };
};

const stripSensitiveRep = ({ password, ...rep }) => rep;

const createToken = (repId) => {
  const issuedAt = Date.now();
  const payload = `${repId}.${issuedAt}`;
  const signature = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('hex');
  return `${payload}.${signature}`;
};

const verifyToken = (req) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const [repId, issuedAt, signature] = token.split('.');
  if (!repId || !issuedAt || !signature) return null;
  const payload = `${repId}.${issuedAt}`;
  const expected = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('hex');
  if (signature.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  return repId;
};

const buildApprovalChain = (reps, repId) => {
  const chain = [];
  const seen = new Set([String(repId)]);
  let current = reps.find((rep) => String(rep.id) === String(repId));
  while (current?.managerId) {
    const managerId = String(current.managerId);
    if (seen.has(managerId)) break;
    const manager = reps.find((rep) => String(rep.id) === managerId && rep.status !== 'INACTIVE');
    if (!manager) break;
    chain.push(managerId);
    seen.add(managerId);
    current = manager;
  }
  return chain;
};

const upsertRows = (target, incoming, keyFn) => {
  for (const row of incoming || []) {
    const key = keyFn(row);
    const index = target.findIndex((existing) => keyFn(existing) === key);
    const normalized = { ...row, syncedAt: new Date().toISOString() };
    if (index >= 0) {
      target[index] = { ...target[index], ...normalized };
    } else {
      target.push(normalized);
    }
  }
};

const assertRateLimit = (req) => {
  const ip = req.socket.remoteAddress || 'local';
  const now = Date.now();
  const windowMs = 60_000;
  const limit = 240;
  const entry = rateLimit.get(ip) || { count: 0, startedAt: now };
  if (now - entry.startedAt > windowMs) {
    rateLimit.set(ip, { count: 1, startedAt: now });
    return;
  }
  entry.count += 1;
  rateLimit.set(ip, entry);
  if (entry.count > limit) {
    throw Object.assign(new Error('Too many requests'), { statusCode: 429 });
  }
};

const routes = {
  'GET /api/health': async () => ({ ok: true, service: 'med-rep-api' }),
  'GET /api/state': async (data) => ({
    ...data,
    reps: data.reps.map(stripSensitiveRep),
    schedules: data.schedules || [],
  }),
  'PUT /api/branding': async (data, body) => {
    data.branding = { ...data.branding, ...body };
    await saveData(data);
    return data.branding;
  },
  'PUT /api/settings': async (data, body) => {
    data.settings = { ...data.settings, ...body };
    await saveData(data);
    return data.settings;
  },
  'POST /api/doctors': async (data, body) => {
    const doctor = { id: nextId(data.doctors), ...cleanDoctor(body), created_at: new Date().toISOString() };
    data.doctors.push(doctor);
    await saveData(data);
    return doctor;
  },
  'POST /api/doctors/import': async (data, body) => {
    const rows = Array.isArray(body.doctors) ? body.doctors : [];
    const imported = [];
    for (const row of rows) {
      const doctor = { id: nextId(data.doctors), ...cleanDoctor(row), created_at: new Date().toISOString() };
      if (!doctor.name) continue;
      data.doctors.push(doctor);
      imported.push(doctor);
    }
    await saveData(data);
    return { imported: imported.length, doctors: imported };
  },
  'POST /api/reps': async (data, body) => {
    if (data.reps.some((item) => item.email === String(body.email || '').trim().toLowerCase())) {
      return { status: 409, payload: { error: 'Email already exists' } };
    }
    const rep = { id: nextId(data.reps), ...cleanRep(body), createdAt: new Date().toISOString() };
    data.reps.push(rep);
    await saveData(data);
    return stripSensitiveRep(rep);
  },
  'POST /api/auth/login': async (data, body) => {
    const email = String(body.email || '').trim().toLowerCase();
    const rep = data.reps.find((item) => item.email === email && item.password === body.password && item.status !== 'INACTIVE');
    if (!rep) return { status: 401, payload: { error: 'Invalid email or password' } };
    return { user: stripSensitiveRep(rep), token: createToken(rep.id) };
  },
};

const handleDynamicRoute = async (req, res, data, pathname, body) => {
  const doctorMatch = pathname.match(/^\/api\/doctors\/([^/]+)$/);
  if (doctorMatch) {
    const index = data.doctors.findIndex((item) => item.id === doctorMatch[1]);
    if (index < 0) return send(req, res, 404, { error: 'Doctor not found' });
    if (req.method === 'PUT') {
      data.doctors[index] = { ...data.doctors[index], ...cleanDoctor(body), updated_at: new Date().toISOString() };
      await saveData(data);
      return send(req, res, 200, data.doctors[index]);
    }
    if (req.method === 'DELETE') {
      data.doctors[index] = { ...data.doctors[index], is_active: 0, updated_at: new Date().toISOString() };
      await saveData(data);
      return send(req, res, 200, data.doctors[index]);
    }
  }

  const repMatch = pathname.match(/^\/api\/reps\/([^/]+)$/);
  if (repMatch) {
    const index = data.reps.findIndex((item) => item.id === repMatch[1]);
    if (index < 0) return send(req, res, 404, { error: 'Sales profile not found' });
    if (req.method === 'PUT') {
      const cleaned = cleanRep(body);
      if (!cleaned.password) cleaned.password = data.reps[index].password;
      data.reps[index] = { ...data.reps[index], ...cleaned, updatedAt: new Date().toISOString() };
      await saveData(data);
      return send(req, res, 200, stripSensitiveRep(data.reps[index]));
    }
    if (req.method === 'DELETE') {
      data.reps[index] = { ...data.reps[index], status: 'INACTIVE', updatedAt: new Date().toISOString() };
      await saveData(data);
      return send(req, res, 200, stripSensitiveRep(data.reps[index]));
    }
  }

  const scheduleApproveMatch = pathname.match(/^\/api\/schedules\/([^/]+)\/approve$/);
  if (scheduleApproveMatch && req.method === 'POST') {
    const schedules = data.schedules || [];
    const index = schedules.findIndex((item) => String(item.id) === scheduleApproveMatch[1]);
    if (index < 0) return send(req, res, 404, { error: 'Schedule not found' });
    const managerId = String(body.managerId || '');
    if (!schedules[index].approval_chain?.includes(managerId)) {
      return send(req, res, 403, { error: 'Manager is not in this approval chain' });
    }
    const approvals = schedules[index].approvals || [];
    if (!approvals.some((approval) => approval.managerId === managerId)) {
      approvals.push({ managerId, approvedAt: new Date().toISOString() });
    }
    schedules[index] = {
      ...schedules[index],
      approvals,
      status: approvals.length >= schedules[index].approval_chain.length ? 'APPROVED' : 'PENDING',
    };
    data.schedules = schedules;
    await saveData(data);
    return send(req, res, 200, schedules[index]);
  }

  return false;
};

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, optionsHeaders(req));
    return res.end();
  }

  try {
    assertRateLimit(req);
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    const pathname = url.pathname;

    // Serve static frontend files for any non-API path
    if (!pathname.startsWith('/api')) {
      return await serveStatic(req, res, pathname);
    }

    const routeKey = `${req.method} ${pathname}`;
    const data = await loadData();
    const body = ['POST', 'PUT', 'PATCH'].includes(req.method || '') ? await readBody(req) : {};

    if (pathname === '/api/sync/bootstrap') {
      const repId = url.searchParams.get('repId');
      const rep = data.reps.find((item) => item.id === repId) || null;
      return send(req, res, 200, {
        branding: data.branding,
        settings: data.settings,
        doctors: data.doctors.filter((doctor) => doctor.is_active !== 0),
        reps: data.reps.filter((item) => item.status !== 'INACTIVE').map(stripSensitiveRep),
        schedules: (data.schedules || []).filter((schedule) => String(schedule.rep_id) === String(repId)),
        currentRep: rep ? stripSensitiveRep(rep) : null,
      });
    }

    if (pathname === '/api/sync/push' && req.method === 'POST') {
      const tokenRepId = verifyToken(req);
      if (req.headers.authorization && !tokenRepId) {
        return send(req, res, 401, { error: 'Invalid sync token' });
      }
      upsertRows(data.attendance, body.attendance, (row) => `${row.rep_id || row.repId}:${row.date}:${row.id}`);
      upsertRows(data.visits, body.visits, (row) => `${row.rep_id || row.repId}:${row.id}`);
      data.schedules = data.schedules || [];
      for (const row of body.schedules || []) {
        const schedule = cleanSchedule(row, data);
        const index = data.schedules.findIndex(
          (item) => String(item.id) === String(schedule.id) && String(item.rep_id) === String(schedule.rep_id),
        );
        if (index >= 0) data.schedules[index] = { ...data.schedules[index], ...schedule };
        else data.schedules.push(schedule);
      }
      await saveData(data);
      return send(req, res, 200, {
        success: true,
        attendance: data.attendance.length,
        visits: data.visits.length,
        schedules: data.schedules.length,
      });
    }

    const dynamicResult = await handleDynamicRoute(req, res, data, pathname, body);
    if (dynamicResult !== false) return;

    const handler = routes[routeKey];
    if (!handler) return send(req, res, 404, { error: 'Route not found' });

    const result = await handler(data, body, url);
    if (result?.status) return send(req, res, result.status, result.payload);
    return send(req, res, 200, result);
  } catch (error) {
    return send(req, res, error.statusCode || 500, { error: error.message || 'Unexpected server error' });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Med Rep API running on http://0.0.0.0:${PORT}`);
});
