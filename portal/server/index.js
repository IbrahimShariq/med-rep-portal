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

const normalizeProductIds = (value) => {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch {
      return value.split(',').map((item) => item.trim()).filter(Boolean);
    }
  }
  return [];
};

const normalizeProductNames = (value) => {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch {
      return value.split(',').map((item) => item.trim()).filter(Boolean);
    }
  }
  return [];
};

const normalizeUpload = (value) => {
  const uri = String(value || '').trim();
  if (!uri) return '';
  const isSupported =
    uri.startsWith('data:image/jpeg;base64,') ||
    uri.startsWith('data:image/png;base64,') ||
    uri.startsWith('data:image/webp;base64,') ||
    /^https?:\/\//.test(uri);
  if (!isSupported) return '';
  const approxBytes = uri.startsWith('data:') ? Math.ceil((uri.length - uri.indexOf(',') - 1) * 0.75) : 0;
  if (approxBytes > 5 * 1024 * 1024) return '';
  return uri;
};

const inferCheckInType = (record) => {
  const hour = new Date(record.check_in_time || record.created_at || Date.now()).getHours();
  return hour >= 15 ? 'EVENING' : 'MORNING';
};

const readBody = (req) =>
  new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 8_000_000) {
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

const normalizeArray = (value, fallback = []) => (Array.isArray(value) ? value : fallback);

const defaultProducts = [
  { id: '1', name: 'Panadol', description: 'Paracetamol for pain relief', status: 'ACTIVE' },
  { id: '2', name: 'Amoxicillin', description: 'Antibiotic for bacterial infections', status: 'ACTIVE' },
  { id: '3', name: 'Loratadine', description: 'Antihistamine for allergies', status: 'ACTIVE' },
  { id: '4', name: 'Metformin', description: 'For blood sugar management', status: 'ACTIVE' },
];

const normalizeData = (raw) => {
  const data = {
    branding: raw.branding || { appName: 'Med Rep', logoText: 'MR', primaryColor: '#2563eb', logoUrl: '' },
    settings: {
      ...(raw.settings || {}),
    },
    reps: normalizeArray(raw.reps),
    doctors: normalizeArray(raw.doctors),
    attendance: normalizeArray(raw.attendance),
    visits: normalizeArray(raw.visits),
    schedules: normalizeArray(raw.schedules),
    leaves: normalizeArray(raw.leaves),
    products: normalizeArray(raw.products, defaultProducts),
    expenses: normalizeArray(raw.expenses),
    doctorLocationRequests: normalizeArray(raw.doctorLocationRequests),
    specializations: normalizeArray(raw.specializations, ['Cardiologist', 'Dermatologist', 'General Physician', 'Pediatrician']),
    degrees: normalizeArray(raw.degrees, ['MBBS', 'FCPS', 'DDerm', 'MD']),
  };
  const firstRepId = data.reps.find((rep) => rep.status !== 'INACTIVE')?.id || '';
  data.reps = data.reps.map((rep) => ({
    ...rep,
    requireAttendancePhoto: rep.requireAttendancePhoto === true || rep.requireAttendancePhoto === 'true',
  }));
  data.doctors = data.doctors.map((doctor) => {
    const approvedLatitude = doctor.approvedLatitude ?? doctor.approved_latitude ?? doctor.latitude ?? null;
    const approvedLongitude = doctor.approvedLongitude ?? doctor.approved_longitude ?? doctor.longitude ?? null;
    return {
      ...doctor,
      assignedRepId: doctor.assignedRepId || doctor.assigned_rep_id || firstRepId,
      additionalDegree: doctor.additionalDegree || doctor.additional_degree || '',
      productIds: normalizeProductIds(doctor.productIds || doctor.product_ids),
      approvedLatitude,
      approvedLongitude,
      latitude: approvedLatitude,
      longitude: approvedLongitude,
      pendingLatitude: doctor.pendingLatitude ?? doctor.pending_latitude ?? null,
      pendingLongitude: doctor.pendingLongitude ?? doctor.pending_longitude ?? null,
      locationApprovalStatus: doctor.locationApprovalStatus || doctor.location_approval_status || (approvedLatitude != null && approvedLongitude != null ? 'APPROVED' : 'PENDING'),
      photoUri: doctor.photoUri || doctor.photo_uri || '',
    };
  });
  data.attendance = data.attendance.map((record) => ({
    ...record,
    check_in_type: record.check_in_type || record.checkInType || inferCheckInType(record),
    photo_uri: record.photo_uri || record.photoUri || '',
  }));
  data.visits = data.visits.map((visit) => ({
    ...visit,
    product_ids: normalizeProductIds(visit.product_ids || visit.productIds),
    product_names: normalizeProductNames(visit.product_names || visit.productNames),
    photo_uri: visit.photo_uri || visit.photoUri || '',
  }));
  data.expenses = data.expenses.map((expense) => ({
    ...expense,
    status: expense.status || 'SUBMITTED',
    attachment_uri: expense.attachment_uri || expense.attachmentUri || '',
  }));
  delete data.settings.max_upload_size_mb;
  delete data.settings.supported_upload_formats;
  delete data.settings.require_attendance_photo;
  delete data.settings.attendance_radius_meters;
  return data;
};

const loadData = async () => normalizeData(JSON.parse(await readFile(DATA_FILE, 'utf8')));
const saveData = async (data) => writeFile(DATA_FILE, `${JSON.stringify(data, null, 2)}\n`);

const send = (req, res, status, payload) => {
  res.writeHead(status, getJsonHeaders(req));
  res.end(JSON.stringify(payload));
};

const nextId = (items) => {
  const max = items.reduce((highest, item) => Math.max(highest, Number(item.id) || 0), 0);
  return String(max + 1);
};

const addLocationRequestIfPending = (data, doctor, requestedBy = '') => {
  if (doctor.pendingLatitude == null || doctor.pendingLongitude == null || doctor.locationApprovalStatus !== 'PENDING') return;
  const exists = (data.doctorLocationRequests || []).some(
    (request) =>
      String(request.doctorId) === String(doctor.id) &&
      request.status === 'PENDING' &&
      Number(request.latitude) === Number(doctor.pendingLatitude) &&
      Number(request.longitude) === Number(doctor.pendingLongitude),
  );
  if (exists) return;
  data.doctorLocationRequests = data.doctorLocationRequests || [];
  data.doctorLocationRequests.push({
    id: nextId(data.doctorLocationRequests),
    doctorId: String(doctor.id),
    doctorName: doctor.name,
    repId: String(requestedBy || doctor.assignedRepId || ''),
    latitude: Number(doctor.pendingLatitude),
    longitude: Number(doctor.pendingLongitude),
    status: 'PENDING',
    requestedAt: new Date().toISOString(),
  });
};

const numberOrNull = (value) => (value === '' || value == null ? null : Number(value));

const cleanDoctor = (input, existing = {}) => {
  const latitude = numberOrNull(input.latitude ?? input.approvedLatitude ?? input.pendingLatitude ?? input.pending_latitude);
  const longitude = numberOrNull(input.longitude ?? input.approvedLongitude ?? input.pendingLongitude ?? input.pending_longitude);
  const hasNewLocation = latitude != null && longitude != null
    && (latitude !== existing.approvedLatitude || longitude !== existing.approvedLongitude);
  return {
    name: String(input.name || '').trim(),
    degree: String(input.degree || '').trim(),
    additionalDegree: String(input.additionalDegree || input.additional_degree || '').trim(),
    specialization: String(input.specialization || '').trim(),
    priority: Number(input.priority || 2),
    territory: String(input.territory || '').trim(),
    address: String(input.address || '').trim(),
    assignedRepId: String(input.assignedRepId || input.assigned_rep_id || existing.assignedRepId || '').trim(),
    approvedLatitude: hasNewLocation ? existing.approvedLatitude ?? null : latitude,
    approvedLongitude: hasNewLocation ? existing.approvedLongitude ?? null : longitude,
    latitude: hasNewLocation ? existing.approvedLatitude ?? null : latitude,
    longitude: hasNewLocation ? existing.approvedLongitude ?? null : longitude,
    pendingLatitude: hasNewLocation ? latitude : numberOrNull(input.pendingLatitude ?? existing.pendingLatitude),
    pendingLongitude: hasNewLocation ? longitude : numberOrNull(input.pendingLongitude ?? existing.pendingLongitude),
    locationApprovalStatus: hasNewLocation ? 'PENDING' : (input.locationApprovalStatus || existing.locationApprovalStatus || (latitude != null && longitude != null ? 'APPROVED' : 'PENDING')),
    phone: String(input.phone || '').trim(),
    notes: String(input.notes || '').trim(),
    productIds: normalizeProductIds(input.productIds || input.product_ids),
    photoUri: normalizeUpload(input.photoUri || input.photo_uri),
    is_active: input.is_active ?? 1,
  };
};

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
  requireAttendancePhoto: input.requireAttendancePhoto === true || input.requireAttendancePhoto === 'true',
  status: input.status || 'ACTIVE',
});

const cleanProduct = (input) => ({
  name: String(input.name || '').trim(),
  description: String(input.description || '').trim(),
  status: input.status || 'ACTIVE',
});

const cleanExpense = (input, data) => {
  const repId = String(input.rep_id || input.repId || '').trim();
  return {
    id: input.id == null ? nextId(data.expenses || []) : String(input.id),
    rep_id: repId,
    date: String(input.date || new Date().toISOString()).slice(0, 10),
    expense_type: String(input.expense_type || input.expenseType || '').trim(),
    amount: Number(input.amount || 0),
    description: String(input.description || '').trim(),
    attachment_uri: normalizeUpload(input.attachment_uri || input.attachmentUri),
    status: String(input.status || 'SUBMITTED').trim().toUpperCase(),
    created_at: input.created_at || input.createdAt || new Date().toISOString(),
    syncedAt: new Date().toISOString(),
  };
};

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

const cleanLeave = (input, data) => {
  const repId = String(input.rep_id || input.repId || '').trim();
  const rep = data.reps.find((item) => String(item.id) === repId);
  return {
    id: input.id == null ? nextId(data.leaves || []) : String(input.id),
    rep_id: repId,
    date: String(input.date || new Date().toISOString()).slice(0, 10),
    leave_type: String(input.leave_type || input.leaveType || 'Leave').trim(),
    reason: String(input.reason || '').trim(),
    status: String(input.status || 'PENDING').trim(),
    manager_id: String(input.manager_id || input.managerId || rep?.managerId || '').trim(),
    created_at: input.created_at || input.createdAt || new Date().toISOString(),
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
    leaves: data.leaves || [],
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
  'PUT /api/reference-data': async (data, body) => {
    data.specializations = normalizeArray(body.specializations).map((item) => String(item).trim()).filter(Boolean);
    data.degrees = normalizeArray(body.degrees).map((item) => String(item).trim()).filter(Boolean);
    await saveData(data);
    return { specializations: data.specializations, degrees: data.degrees };
  },
  'POST /api/products': async (data, body) => {
    const product = { id: nextId(data.products || []), ...cleanProduct(body), created_at: new Date().toISOString() };
    if (!product.name) return { status: 400, payload: { error: 'Product name is required' } };
    data.products = data.products || [];
    data.products.push(product);
    await saveData(data);
    return product;
  },
  'POST /api/doctors': async (data, body) => {
    const doctor = { id: nextId(data.doctors), ...cleanDoctor(body), created_at: new Date().toISOString() };
    addLocationRequestIfPending(data, doctor, body.requestedBy || body.rep_id);
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
      addLocationRequestIfPending(data, doctor, row.requestedBy || row.rep_id);
      data.doctors.push(doctor);
      imported.push(doctor);
    }
    await saveData(data);
    return { imported: imported.length, doctors: imported };
  },
  'POST /api/expenses': async (data, body) => {
    data.expenses = data.expenses || [];
    const expense = cleanExpense(body, data);
    if (!expense.rep_id || !expense.expense_type || !expense.amount) {
      return { status: 400, payload: { error: 'Salesperson, type, and amount are required' } };
    }
    data.expenses.push(expense);
    await saveData(data);
    return expense;
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
      data.doctors[index] = { ...data.doctors[index], ...cleanDoctor(body, data.doctors[index]), updated_at: new Date().toISOString() };
      addLocationRequestIfPending(data, data.doctors[index], body.requestedBy || body.rep_id);
      await saveData(data);
      return send(req, res, 200, data.doctors[index]);
    }
    if (req.method === 'DELETE') {
      data.doctors[index] = { ...data.doctors[index], is_active: 0, updated_at: new Date().toISOString() };
      await saveData(data);
      return send(req, res, 200, data.doctors[index]);
    }
  }

  const productMatch = pathname.match(/^\/api\/products\/([^/]+)$/);
  if (productMatch) {
    data.products = data.products || [];
    const index = data.products.findIndex((item) => String(item.id) === productMatch[1]);
    if (index < 0) return send(req, res, 404, { error: 'Product not found' });
    if (req.method === 'PUT') {
      data.products[index] = { ...data.products[index], ...cleanProduct(body), updated_at: new Date().toISOString() };
      await saveData(data);
      return send(req, res, 200, data.products[index]);
    }
    if (req.method === 'DELETE') {
      data.products[index] = { ...data.products[index], status: 'INACTIVE', updated_at: new Date().toISOString() };
      await saveData(data);
      return send(req, res, 200, data.products[index]);
    }
  }

  const locationDecisionMatch = pathname.match(/^\/api\/doctor-location-requests\/([^/]+)\/(approve|reject)$/);
  if (locationDecisionMatch && req.method === 'POST') {
    data.doctorLocationRequests = data.doctorLocationRequests || [];
    const index = data.doctorLocationRequests.findIndex((item) => String(item.id) === locationDecisionMatch[1]);
    if (index < 0) return send(req, res, 404, { error: 'Doctor location request not found' });
    const request = data.doctorLocationRequests[index];
    const status = locationDecisionMatch[2] === 'approve' ? 'APPROVED' : 'REJECTED';
    data.doctorLocationRequests[index] = {
      ...request,
      status,
      reviewedAt: new Date().toISOString(),
      reviewedBy: String(body.managerId || body.adminId || ''),
      rejectionReason: status === 'REJECTED' ? String(body.reason || '') : '',
    };
    const doctorIndex = data.doctors.findIndex((doctor) => String(doctor.id) === String(request.doctorId));
    if (doctorIndex >= 0) {
      if (status === 'APPROVED') {
        data.doctors[doctorIndex] = {
          ...data.doctors[doctorIndex],
          approvedLatitude: Number(request.latitude),
          approvedLongitude: Number(request.longitude),
          latitude: Number(request.latitude),
          longitude: Number(request.longitude),
          pendingLatitude: null,
          pendingLongitude: null,
          locationApprovalStatus: 'APPROVED',
          updated_at: new Date().toISOString(),
        };
      } else {
        data.doctors[doctorIndex] = {
          ...data.doctors[doctorIndex],
          pendingLatitude: null,
          pendingLongitude: null,
          locationApprovalStatus: 'REJECTED',
          updated_at: new Date().toISOString(),
        };
      }
    }
    await saveData(data);
    return send(req, res, 200, data.doctorLocationRequests[index]);
  }

  const expenseDecisionMatch = pathname.match(/^\/api\/expenses\/([^/]+)\/(approve|reject)$/);
  if (expenseDecisionMatch && req.method === 'POST') {
    data.expenses = data.expenses || [];
    const index = data.expenses.findIndex((item) => String(item.id) === expenseDecisionMatch[1]);
    if (index < 0) return send(req, res, 404, { error: 'Expense not found' });
    data.expenses[index] = {
      ...data.expenses[index],
      status: expenseDecisionMatch[2] === 'approve' ? 'APPROVED' : 'REJECTED',
      reviewedAt: new Date().toISOString(),
      reviewedBy: String(body.managerId || body.adminId || ''),
    };
    await saveData(data);
    return send(req, res, 200, data.expenses[index]);
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

  const leaveApproveMatch = pathname.match(/^\/api\/leaves\/([^/]+)\/approve$/);
  if (leaveApproveMatch && req.method === 'POST') {
    const leaves = data.leaves || [];
    const index = leaves.findIndex((item) => String(item.id) === leaveApproveMatch[1]);
    if (index < 0) return send(req, res, 404, { error: 'Leave request not found' });
    leaves[index] = {
      ...leaves[index],
      status: 'APPROVED',
      manager_id: String(body.managerId || leaves[index].manager_id || ''),
      approvedAt: new Date().toISOString(),
    };
    data.leaves = leaves;
    await saveData(data);
    return send(req, res, 200, leaves[index]);
  }

  const leaveRejectMatch = pathname.match(/^\/api\/leaves\/([^/]+)\/reject$/);
  if (leaveRejectMatch && req.method === 'POST') {
    const leaves = data.leaves || [];
    const index = leaves.findIndex((item) => String(item.id) === leaveRejectMatch[1]);
    if (index < 0) return send(req, res, 404, { error: 'Leave request not found' });
    leaves[index] = {
      ...leaves[index],
      status: 'REJECTED',
      manager_id: String(body.managerId || leaves[index].manager_id || ''),
      rejectedAt: new Date().toISOString(),
    };
    data.leaves = leaves;
    await saveData(data);
    return send(req, res, 200, leaves[index]);
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
      const visibleDoctorIds = new Set(
        data.doctors
          .filter((doctor) => doctor.is_active !== 0 && (!repId || String(doctor.assignedRepId || '') === String(repId)))
          .map((doctor) => String(doctor.id)),
      );
      return send(req, res, 200, {
        branding: data.branding,
        settings: data.settings,
        products: data.products || [],
        specializations: data.specializations || [],
        degrees: data.degrees || [],
        doctors: data.doctors.filter((doctor) => doctor.is_active !== 0 && visibleDoctorIds.has(String(doctor.id))),
        reps: data.reps.filter((item) => item.status !== 'INACTIVE').map(stripSensitiveRep),
        schedules: (data.schedules || []).filter((schedule) => String(schedule.rep_id) === String(repId)),
        leaves: (data.leaves || []).filter((leave) => String(leave.rep_id) === String(repId)),
        expenses: (data.expenses || []).filter((expense) => String(expense.rep_id) === String(repId)),
        visits: (data.visits || []).filter((visit) => String(visit.rep_id) === String(repId)),
        doctorLocationRequests: (data.doctorLocationRequests || []).filter(
          (request) => String(request.repId || '') === String(repId) || visibleDoctorIds.has(String(request.doctorId)),
        ),
        currentRep: rep ? stripSensitiveRep(rep) : null,
      });
    }

    if (pathname === '/api/sync/push' && req.method === 'POST') {
      const tokenRepId = verifyToken(req);
      if (req.headers.authorization && !tokenRepId) {
        return send(req, res, 401, { error: 'Invalid sync token' });
      }
      upsertRows(data.attendance, (body.attendance || []).map((row) => ({
        ...row,
        check_in_type: row.check_in_type || row.checkInType || inferCheckInType(row),
        photo_uri: normalizeUpload(row.photo_uri || row.photoUri),
      })), (row) => `${row.rep_id || row.repId}:${row.date}:${row.check_in_type || 'MORNING'}:${row.id}`);
      upsertRows(data.visits, (body.visits || []).map((row) => {
        const productIds = normalizeProductIds(row.product_ids || row.productIds);
        const productNames = productIds
          .map((id) => (data.products || []).find((product) => String(product.id) === String(id))?.name)
          .filter(Boolean);
        return {
          ...row,
          product_ids: productIds,
          product_names: normalizeProductNames(row.product_names || row.productNames).length
            ? normalizeProductNames(row.product_names || row.productNames)
            : productNames,
          photo_uri: normalizeUpload(row.photo_uri || row.photoUri),
        };
      }), (row) => `${row.rep_id || row.repId}:${row.id}`);
      for (const row of body.doctors || []) {
        const existingIndex = data.doctors.findIndex(
          (item) => String(item.id) === String(row.portal_id || row.id),
        );
        const existing = existingIndex >= 0 ? data.doctors[existingIndex] : {};
        const doctor = {
          id: existingIndex >= 0 ? data.doctors[existingIndex].id : nextId(data.doctors),
          ...cleanDoctor({ ...row, assignedRepId: row.assignedRepId || row.assigned_rep_id || row.rep_id || tokenRepId }, existing),
          created_at: row.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        if (!doctor.name) continue;
        addLocationRequestIfPending(data, doctor, row.rep_id || tokenRepId);
        if (existingIndex >= 0) data.doctors[existingIndex] = { ...data.doctors[existingIndex], ...doctor };
        else data.doctors.push(doctor);
      }
      data.expenses = data.expenses || [];
      for (const row of body.expenses || []) {
        const expense = cleanExpense(row, data);
        const index = data.expenses.findIndex((item) => String(item.id) === String(expense.id) && String(item.rep_id) === String(expense.rep_id));
        if (index >= 0) data.expenses[index] = { ...data.expenses[index], ...expense };
        else data.expenses.push(expense);
      }
      data.schedules = data.schedules || [];
      for (const row of body.schedules || []) {
        const schedule = cleanSchedule(row, data);
        const index = data.schedules.findIndex(
          (item) => String(item.id) === String(schedule.id) && String(item.rep_id) === String(schedule.rep_id),
        );
        if (index >= 0) data.schedules[index] = { ...data.schedules[index], ...schedule };
        else data.schedules.push(schedule);
      }
      data.leaves = data.leaves || [];
      for (const row of body.leaves || []) {
        const leave = cleanLeave(row, data);
        const index = data.leaves.findIndex(
          (item) => String(item.id) === String(leave.id) && String(item.rep_id) === String(leave.rep_id),
        );
        if (index >= 0) data.leaves[index] = { ...data.leaves[index], ...leave };
        else data.leaves.push(leave);
      }
      await saveData(data);
      return send(req, res, 200, {
        success: true,
        attendance: data.attendance.length,
        visits: data.visits.length,
        schedules: data.schedules.length,
        doctors: data.doctors.length,
        leaves: data.leaves.length,
        expenses: data.expenses.length,
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
