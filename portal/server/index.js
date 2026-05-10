import http from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, 'data.json');
const PORT = Number(process.env.PORT || 8787);

const jsonHeaders = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const readBody = (req) =>
  new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        req.destroy();
        reject(new Error('Request body too large'));
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

const send = (res, status, payload) => {
  res.writeHead(status, jsonHeaders);
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
  baseLatitude: input.baseLatitude === '' || input.baseLatitude == null ? null : Number(input.baseLatitude),
  baseLongitude: input.baseLongitude === '' || input.baseLongitude == null ? null : Number(input.baseLongitude),
  profilePicture: String(input.profilePicture || '').trim(),
  status: input.status || 'ACTIVE',
});

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

const routes = {
  'GET /api/health': async () => ({ ok: true, service: 'med-rep-api' }),
  'GET /api/state': async (data) => data,
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
  'POST /api/reps': async (data, body) => {
    const rep = { id: nextId(data.reps), ...cleanRep(body), createdAt: new Date().toISOString() };
    data.reps.push(rep);
    await saveData(data);
    return rep;
  },
  'POST /api/auth/login': async (data, body) => {
    const email = String(body.email || '').trim().toLowerCase();
    const rep = data.reps.find((item) => item.email === email && item.password === body.password && item.status !== 'INACTIVE');
    if (!rep) return { status: 401, payload: { error: 'Invalid email or password' } };
    const { password, ...user } = rep;
    return { user, token: `local-${rep.id}-${Date.now()}` };
  },
};

const handleDynamicRoute = async (req, res, data, pathname, body) => {
  const doctorMatch = pathname.match(/^\/api\/doctors\/([^/]+)$/);
  if (doctorMatch) {
    const index = data.doctors.findIndex((item) => item.id === doctorMatch[1]);
    if (index < 0) return send(res, 404, { error: 'Doctor not found' });
    if (req.method === 'PUT') {
      data.doctors[index] = { ...data.doctors[index], ...cleanDoctor(body), updated_at: new Date().toISOString() };
      await saveData(data);
      return send(res, 200, data.doctors[index]);
    }
    if (req.method === 'DELETE') {
      data.doctors[index] = { ...data.doctors[index], is_active: 0, updated_at: new Date().toISOString() };
      await saveData(data);
      return send(res, 200, data.doctors[index]);
    }
  }

  const repMatch = pathname.match(/^\/api\/reps\/([^/]+)$/);
  if (repMatch) {
    const index = data.reps.findIndex((item) => item.id === repMatch[1]);
    if (index < 0) return send(res, 404, { error: 'Sales profile not found' });
    if (req.method === 'PUT') {
      data.reps[index] = { ...data.reps[index], ...cleanRep(body), updatedAt: new Date().toISOString() };
      await saveData(data);
      return send(res, 200, data.reps[index]);
    }
    if (req.method === 'DELETE') {
      data.reps[index] = { ...data.reps[index], status: 'INACTIVE', updatedAt: new Date().toISOString() };
      await saveData(data);
      return send(res, 200, data.reps[index]);
    }
  }

  return false;
};

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, jsonHeaders);
    return res.end();
  }

  try {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    const pathname = url.pathname;
    const routeKey = `${req.method} ${pathname}`;
    const data = await loadData();
    const body = ['POST', 'PUT', 'PATCH'].includes(req.method || '') ? await readBody(req) : {};

    if (pathname === '/api/sync/bootstrap') {
      const repId = url.searchParams.get('repId');
      const rep = data.reps.find((item) => item.id === repId) || null;
      return send(res, 200, {
        branding: data.branding,
        settings: data.settings,
        doctors: data.doctors.filter((doctor) => doctor.is_active !== 0),
        reps: data.reps.map(({ password, ...safeRep }) => safeRep),
        currentRep: rep ? (({ password, ...safeRep }) => safeRep)(rep) : null,
      });
    }

    if (pathname === '/api/sync/push' && req.method === 'POST') {
      upsertRows(data.attendance, body.attendance, (row) => `${row.rep_id || row.repId}:${row.date}:${row.id}`);
      upsertRows(data.visits, body.visits, (row) => `${row.rep_id || row.repId}:${row.id}`);
      await saveData(data);
      return send(res, 200, { success: true, attendance: data.attendance.length, visits: data.visits.length });
    }

    const dynamicResult = await handleDynamicRoute(req, res, data, pathname, body);
    if (dynamicResult !== false) return;

    const handler = routes[routeKey];
    if (!handler) return send(res, 404, { error: 'Route not found' });

    const result = await handler(data, body, url);
    if (result?.status) return send(res, result.status, result.payload);
    return send(res, 200, result);
  } catch (error) {
    return send(res, 500, { error: error.message || 'Unexpected server error' });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Med Rep API running on http://0.0.0.0:${PORT}`);
});
