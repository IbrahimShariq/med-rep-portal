import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties, ReactElement } from 'react';
import {
  AlertTriangle,
  BadgeCheck,
  CalendarCheck,
  CheckCircle,
  ClipboardList,
  Download,
  Image as ImageIcon,
  LayoutDashboard,
  Package,
  RefreshCw,
  Save,
  Search,
  Settings,
  Stethoscope,
  Trash2,
  Upload,
  UserPlus,
  Users,
  WalletCards,
  XCircle,
} from 'lucide-react';
import ExcelJS from 'exceljs';
import './App.css';

type Branding = { appName: string; logoText: string; primaryColor: string; logoUrl: string };
type Rep = {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: string;
  territory: string;
  managerId?: string;
  baseLatitude: number | null;
  baseLongitude: number | null;
  profilePicture: string;
  requireAttendancePhoto?: boolean;
  status: string;
};
type Doctor = {
  id: string;
  name: string;
  degree: string;
  additionalDegree?: string;
  specialization: string;
  priority: number;
  territory: string;
  address: string;
  assignedRepId?: string;
  approvedLatitude?: number | null;
  approvedLongitude?: number | null;
  latitude: number | null;
  longitude: number | null;
  pendingLatitude?: number | null;
  pendingLongitude?: number | null;
  locationApprovalStatus?: string;
  productIds?: string[];
  photoUri?: string;
  phone: string;
  notes: string;
  is_active: number;
};
type Attendance = {
  id: string | number;
  rep_id?: string;
  repId?: string;
  date: string;
  check_in_type?: string;
  check_in_time?: string;
  check_out_time?: string;
  status?: string;
  exception_reason?: string;
  check_in_latitude?: number;
  check_in_longitude?: number;
  photo_uri?: string;
};
type Visit = {
  id: string | number;
  rep_id?: string;
  doctor_id?: string | number;
  check_in_time?: string;
  check_out_time?: string;
  flag_status?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
  product_ids?: string[];
  product_names?: string[];
  photo_uri?: string;
};
type Product = { id: string; name: string; description?: string; status?: string };
type Expense = {
  id: string | number;
  rep_id?: string;
  repId?: string;
  date: string;
  expense_type?: string;
  expenseType?: string;
  amount: number;
  description?: string;
  attachment_uri?: string;
  status?: string;
};
type LocationRequest = {
  id: string | number;
  doctorId: string;
  doctorName?: string;
  repId?: string;
  latitude: number;
  longitude: number;
  status: string;
  requestedAt?: string;
  reviewedAt?: string;
};
type Schedule = { id: string | number; rep_id?: string; doctor_id?: string | number; date: string; status?: string };
type LeaveRequest = { id: string | number; rep_id?: string; date: string; leave_type?: string; status?: string };
type AppState = {
  branding: Branding;
  settings: Record<string, string>;
  doctors: Doctor[];
  reps: Rep[];
  attendance: Attendance[];
  visits: Visit[];
  schedules: Schedule[];
  leaves: LeaveRequest[];
  products: Product[];
  expenses: Expense[];
  doctorLocationRequests: LocationRequest[];
  specializations: string[];
  degrees: string[];
};
type Tab = 'dashboard' | 'doctors' | 'sales' | 'products' | 'expenses' | 'reports' | 'settings';

const apiBase = (import.meta.env.VITE_API_BASE as string | undefined)
  ?? (import.meta.env.DEV ? 'http://localhost:8787/api' : '/api');

const emptyDoctor: Omit<Doctor, 'id'> = {
  name: '',
  degree: '',
  additionalDegree: '',
  specialization: '',
  priority: 2,
  territory: '',
  address: '',
  assignedRepId: '',
  approvedLatitude: null,
  approvedLongitude: null,
  latitude: 33.6844,
  longitude: 73.0479,
  pendingLatitude: null,
  pendingLongitude: null,
  locationApprovalStatus: 'PENDING',
  productIds: [],
  photoUri: '',
  phone: '',
  notes: '',
  is_active: 1,
};

const emptyRep: Omit<Rep, 'id'> = {
  name: '',
  email: '',
  password: '',
  role: 'REP',
  territory: '',
  managerId: '',
  baseLatitude: 33.6844,
  baseLongitude: 73.0479,
  profilePicture: '',
  requireAttendancePhoto: false,
  status: 'ACTIVE',
};

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || 'API request failed');
  return payload as T;
}

function dateOnly(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value.slice(0, 10) : date.toISOString().slice(0, 10);
}

function formatTime(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function mapLink(latitude?: number | null, longitude?: number | null) {
  if (latitude == null || longitude == null) return '';
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}

function includesSearch(values: unknown[], query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return values.join(' ').toLowerCase().includes(q);
}

function productIds(value?: string[] | string) {
  if (Array.isArray(value)) return value.map(String);
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return String(value).split(',').map((item) => item.trim()).filter(Boolean);
  }
}

function namesFromVisit(visit: Visit, products: Product[]) {
  const names = Array.isArray(visit.product_names) ? visit.product_names : productIds(visit.product_names as unknown as string);
  if (names.length) return names;
  return productIds(visit.product_ids).map((id) => products.find((product) => String(product.id) === String(id))?.name || id);
}

function isFlagged(status?: string) {
  return !!status && !['VALID', 'APPROVED', 'SUBMITTED', 'DRAFT'].includes(status);
}

function fileToDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      reject(new Error('Use JPG, PNG, or WEBP images only.'));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      reject(new Error('Image is too large. Maximum file size is 5 MB.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Could not read that image.'));
    reader.readAsDataURL(file);
  });
}

async function downloadWorkbook(filename: string, sheets: Record<string, Record<string, unknown>[]>) {
  const workbook = new ExcelJS.Workbook();
  Object.entries(sheets).forEach(([name, rows]) => {
    const worksheet = workbook.addWorksheet(name.slice(0, 31));
    const keys = Object.keys(rows[0] || { Empty: '' });
    worksheet.columns = keys.map((key) => ({ header: key, key, width: Math.max(16, key.length + 2) }));
    rows.forEach((row) => worksheet.addRow(row));
    worksheet.getRow(1).font = { bold: true };
  });
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function readImportCell(row: Record<string, unknown>, ...keys: string[]) {
  const key = keys.find((item) => row[item] != null && row[item] !== '');
  return key ? row[key] : '';
}

function Pill({ value }: { value?: string }) {
  const label = value || 'VALID';
  return <span className={`pill ${label}`}>{isFlagged(label) ? 'RED FLAG: ' : ''}{label}</span>;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [state, setState] = useState<AppState | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [doctorForm, setDoctorForm] = useState<Omit<Doctor, 'id'>>(emptyDoctor);
  const [editingDoctorId, setEditingDoctorId] = useState<string | null>(null);
  const [repForm, setRepForm] = useState<Omit<Rep, 'id'>>(emptyRep);
  const [editingRepId, setEditingRepId] = useState<string | null>(null);
  const [productForm, setProductForm] = useState({ name: '', description: '' });
  const [expenseForm, setExpenseForm] = useState({ rep_id: '', date: new Date().toISOString().slice(0, 10), expense_type: 'Travel', amount: '', description: '', attachment_uri: '' });
  const [filters, setFilters] = useState({ from: '', to: '', repId: '', doctorId: '', productId: '', specialization: '', degree: '', status: '' });
  const [newSpecialization, setNewSpecialization] = useState('');
  const [newDegree, setNewDegree] = useState('');

  const loadState = async () => {
    setLoading(true);
    try {
      setState(await api<AppState>('/state'));
      setMessage('Synced with portal API');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to load portal data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadState();
  }, []);

  const repsById = useMemo(() => new Map((state?.reps || []).map((rep) => [String(rep.id), rep])), [state?.reps]);
  const doctorsById = useMemo(() => new Map((state?.doctors || []).map((doctor) => [String(doctor.id), doctor])), [state?.doctors]);
  const activeProducts = useMemo(() => (state?.products || []).filter((product) => product.status !== 'INACTIVE'), [state?.products]);

  const filteredDoctors = useMemo(() => (state?.doctors || [])
    .filter((doctor) => doctor.is_active !== 0)
    .filter((doctor) => !filters.repId || doctor.assignedRepId === filters.repId)
    .filter((doctor) => !filters.specialization || doctor.specialization === filters.specialization)
    .filter((doctor) => !filters.degree || doctor.degree === filters.degree)
    .filter((doctor) => !filters.productId || productIds(doctor.productIds).includes(filters.productId))
    .filter((doctor) => includesSearch([doctor.name, doctor.degree, doctor.specialization, doctor.territory, doctor.address, doctor.phone, repsById.get(doctor.assignedRepId || '')?.name], search)), [filters, repsById, search, state?.doctors]);

  const filteredVisits = useMemo(() => (state?.visits || [])
    .filter((visit) => {
      const doctor = doctorsById.get(String(visit.doctor_id || ''));
      const products = namesFromVisit(visit, activeProducts);
      const visitDate = dateOnly(visit.check_in_time);
      if (filters.from && visitDate < filters.from) return false;
      if (filters.to && visitDate > filters.to) return false;
      if (filters.repId && String(visit.rep_id || '') !== filters.repId) return false;
      if (filters.doctorId && String(visit.doctor_id || '') !== filters.doctorId) return false;
      if (filters.productId && !productIds(visit.product_ids).includes(filters.productId)) return false;
      if (filters.specialization && doctor?.specialization !== filters.specialization) return false;
      if (filters.degree && doctor?.degree !== filters.degree) return false;
      if (filters.status && (visit.flag_status || 'VALID') !== filters.status) return false;
      return includesSearch([repsById.get(String(visit.rep_id || ''))?.name, doctor?.name, products.join(' '), visit.notes, visit.flag_status], search);
    }), [activeProducts, doctorsById, filters, repsById, search, state?.visits]);

  const filteredAttendance = useMemo(() => (state?.attendance || []).filter((record) => {
    const repId = String(record.rep_id || record.repId || '');
    const recordDate = record.date || dateOnly(record.check_in_time);
    if (filters.from && recordDate < filters.from) return false;
    if (filters.to && recordDate > filters.to) return false;
    if (filters.repId && repId !== filters.repId) return false;
    if (filters.status && (record.status || 'VALID') !== filters.status) return false;
    return includesSearch([repsById.get(repId)?.name, record.date, record.check_in_type, record.status], search);
  }), [filters, repsById, search, state?.attendance]);

  const filteredExpenses = useMemo(() => (state?.expenses || []).filter((expense) => {
    const repId = String(expense.rep_id || expense.repId || '');
    if (filters.from && expense.date < filters.from) return false;
    if (filters.to && expense.date > filters.to) return false;
    if (filters.repId && repId !== filters.repId) return false;
    if (filters.status && (expense.status || 'SUBMITTED') !== filters.status) return false;
    return includesSearch([repsById.get(repId)?.name, expense.expense_type, expense.description, expense.status, expense.amount], search);
  }), [filters, repsById, search, state?.expenses]);

  const productDoctorRows = useMemo(() => {
    const rows: { product: Product; doctor: Doctor; visits: Visit[] }[] = [];
    activeProducts.forEach((product) => {
      filteredDoctors
        .filter((doctor) => productIds(doctor.productIds).includes(String(product.id))
          || filteredVisits.some((visit) => String(visit.doctor_id) === String(doctor.id) && productIds(visit.product_ids).includes(String(product.id))))
        .forEach((doctor) => rows.push({
          product,
          doctor,
          visits: filteredVisits.filter((visit) => String(visit.doctor_id) === String(doctor.id) && productIds(visit.product_ids).includes(String(product.id))),
        }));
    });
    return rows;
  }, [activeProducts, filteredDoctors, filteredVisits]);

  const redFlags = useMemo(() => [
    ...filteredVisits.filter((visit) => isFlagged(visit.flag_status)).map((visit) => ({ type: 'Visit', repId: visit.rep_id, doctorId: visit.doctor_id, status: visit.flag_status, date: dateOnly(visit.check_in_time) })),
    ...filteredAttendance.filter((record) => isFlagged(record.status)).map((record) => ({ type: 'Check-In', repId: record.rep_id || record.repId, doctorId: '', status: record.status, date: record.date })),
  ], [filteredAttendance, filteredVisits]);

  const saveDoctor = async () => {
    if (!doctorForm.name.trim()) return;
    const payload = { ...doctorForm, latitude: doctorForm.latitude, longitude: doctorForm.longitude };
    await api<Doctor>(editingDoctorId ? `/doctors/${editingDoctorId}` : '/doctors', {
      method: editingDoctorId ? 'PUT' : 'POST',
      body: JSON.stringify(payload),
    });
    setDoctorForm(emptyDoctor);
    setEditingDoctorId(null);
    await loadState();
  };

  const saveRep = async () => {
    if (!repForm.name.trim() || !repForm.email.trim()) return;
    await api<Rep>(editingRepId ? `/reps/${editingRepId}` : '/reps', {
      method: editingRepId ? 'PUT' : 'POST',
      body: JSON.stringify(repForm),
    });
    setRepForm(emptyRep);
    setEditingRepId(null);
    await loadState();
  };

  const saveProduct = async () => {
    if (!productForm.name.trim()) return;
    await api<Product>('/products', { method: 'POST', body: JSON.stringify(productForm) });
    setProductForm({ name: '', description: '' });
    await loadState();
  };

  const saveExpense = async () => {
    if (!expenseForm.rep_id || !expenseForm.expense_type || !Number(expenseForm.amount)) return;
    await api<Expense>('/expenses', { method: 'POST', body: JSON.stringify(expenseForm) });
    setExpenseForm({ rep_id: '', date: new Date().toISOString().slice(0, 10), expense_type: 'Travel', amount: '', description: '', attachment_uri: '' });
    await loadState();
  };

  const decideLocation = async (id: string | number, action: 'approve' | 'reject') => {
    await api<LocationRequest>(`/doctor-location-requests/${id}/${action}`, { method: 'POST', body: JSON.stringify({ adminId: 'portal' }) });
    await loadState();
  };

  const decideExpense = async (id: string | number, action: 'approve' | 'reject') => {
    await api<Expense>(`/expenses/${id}/${action}`, { method: 'POST', body: JSON.stringify({ adminId: 'portal' }) });
    await loadState();
  };

  const saveReferenceData = async (nextState: AppState) => {
    const result = await api<{ specializations: string[]; degrees: string[] }>('/reference-data', {
      method: 'PUT',
      body: JSON.stringify({ specializations: nextState.specializations, degrees: nextState.degrees }),
    });
    setState({ ...nextState, ...result });
  };

  const exportWorkbook = async () => {
    if (!state) return;
    await downloadWorkbook('med-rep-export.xlsx', {
      Doctors: filteredDoctors.map((doctor) => ({
        Name: doctor.name,
        Degree: doctor.degree,
        Specialization: doctor.specialization,
        Salesperson: repsById.get(doctor.assignedRepId || '')?.name || '',
        Territory: doctor.territory,
        Products: productIds(doctor.productIds).map((id) => activeProducts.find((product) => String(product.id) === id)?.name || id).join(', '),
        'Location Status': doctor.locationApprovalStatus || '',
      })),
      Visits: filteredVisits.map((visit) => ({
        Salesperson: repsById.get(String(visit.rep_id || ''))?.name || '',
        Doctor: doctorsById.get(String(visit.doctor_id || ''))?.name || '',
        Products: namesFromVisit(visit, activeProducts).join(', '),
        Date: dateOnly(visit.check_in_time),
        Flag: visit.flag_status || 'VALID',
        Notes: visit.notes || '',
      })),
      CheckIns: filteredAttendance.map((record) => ({
        Salesperson: repsById.get(String(record.rep_id || record.repId || ''))?.name || '',
        Date: record.date,
        Type: record.check_in_type || 'MORNING',
        Time: formatTime(record.check_in_time),
        Status: record.status || 'VALID',
      })),
      Expenses: filteredExpenses.map((expense) => ({
        Salesperson: repsById.get(String(expense.rep_id || expense.repId || ''))?.name || '',
        Date: expense.date,
        Type: expense.expense_type || expense.expenseType || '',
        Amount: expense.amount,
        Status: expense.status || 'SUBMITTED',
      })),
      Products: activeProducts.map((product) => ({ Name: product.name, Description: product.description || '', Status: product.status || 'ACTIVE' })),
    });
  };

  const importDoctors = async (file?: File) => {
    if (!file || !state) return;
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await file.arrayBuffer());
    const worksheet = workbook.worksheets[0];
    const headers: string[] = [];
    worksheet.getRow(1).eachCell((cell, colNumber) => {
      headers[colNumber] = String(cell.value || '').trim();
    });
    const rows: Record<string, unknown>[] = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const item: Record<string, unknown> = {};
      row.eachCell((cell, colNumber) => {
        if (headers[colNumber]) item[headers[colNumber]] = cell.value;
      });
      rows.push(item);
    });
    const doctors = rows.map((row) => {
      const assignedName = String(readImportCell(row, 'Salesperson', 'Assigned Salesperson')).trim();
      const productNames = String(readImportCell(row, 'Products', 'Associated Products')).split(',').map((item) => item.trim()).filter(Boolean);
      return {
        name: String(readImportCell(row, 'Name', 'name')).trim(),
        degree: String(readImportCell(row, 'Degree', 'degree')).trim(),
        specialization: String(readImportCell(row, 'Specialization', 'specialization')).trim(),
        phone: String(readImportCell(row, 'Phone', 'phone')).trim(),
        territory: String(readImportCell(row, 'Territory', 'territory')).trim(),
        address: String(readImportCell(row, 'Address', 'address')).trim(),
        latitude: readImportCell(row, 'Latitude', 'latitude') === '' ? null : Number(readImportCell(row, 'Latitude', 'latitude')),
        longitude: readImportCell(row, 'Longitude', 'longitude') === '' ? null : Number(readImportCell(row, 'Longitude', 'longitude')),
        assignedRepId: state.reps.find((rep) => rep.name.toLowerCase() === assignedName.toLowerCase())?.id || '',
        productIds: productNames.map((name) => activeProducts.find((product) => product.name.toLowerCase() === name.toLowerCase())?.id).filter(Boolean),
        notes: String(readImportCell(row, 'Notes', 'notes')).trim(),
        is_active: 1,
      };
    }).filter((doctor) => doctor.name);
    const result = await api<{ imported: number }>('/doctors/import', { method: 'POST', body: JSON.stringify({ doctors }) });
    setMessage(`Imported ${result.imported} doctors.`);
    await loadState();
  };

  const navItems: { id: Tab; label: string; icon: ReactElement }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { id: 'doctors', label: 'Doctors', icon: <Stethoscope size={20} /> },
    { id: 'sales', label: 'Salespersons', icon: <Users size={20} /> },
    { id: 'products', label: 'Products', icon: <Package size={20} /> },
    { id: 'expenses', label: 'Expenses', icon: <WalletCards size={20} /> },
    { id: 'reports', label: 'Reports', icon: <ClipboardList size={20} /> },
    { id: 'settings', label: 'Settings', icon: <Settings size={20} /> },
  ];

  const brandedStyle = { '--brand': state?.branding.primaryColor || '#2563eb' } as CSSProperties;

  return (
    <div className="app-shell" style={brandedStyle}>
      <aside className="sidebar">
        <div className="brand-lockup">
          {state?.branding.logoUrl ? <img src={state.branding.logoUrl} alt="" className="brand-image" /> : <div className="brand-mark">{state?.branding.logoText || 'MR'}</div>}
          <div><strong>{state?.branding.appName || 'Med Rep'}</strong><span>Admin portal</span></div>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => <button key={item.id} className={activeTab === item.id ? 'active' : ''} onClick={() => setActiveTab(item.id)}>{item.icon}{item.label}</button>)}
        </nav>
      </aside>

      <main className="workspace">
        <div className="topbar">
          <div><p className="eyebrow">Field activity control</p><h1>{navItems.find((item) => item.id === activeTab)?.label}</h1></div>
          <div className="top-actions">
            <label className="search"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search records..." /></label>
            <button className="secondary-button" onClick={exportWorkbook}><Download size={16} /> Export</button>
            <button className="icon-button" onClick={loadState} title="Refresh"><RefreshCw size={18} /></button>
          </div>
        </div>
        <div className="status-line">{loading ? 'Loading...' : message}</div>

        {state && activeTab === 'dashboard' ? (
          <section className="stack">
            <div className="metric-grid">
              <div className="metric"><Stethoscope /><span>Doctors</span><strong>{filteredDoctors.length}</strong></div>
              <div className="metric"><Users /><span>Salespersons</span><strong>{state.reps.length}</strong></div>
              <div className="metric"><CalendarCheck /><span>Check-Ins</span><strong>{state.attendance.length}</strong></div>
              <div className="metric"><AlertTriangle /><span>Red Flags</span><strong>{redFlags.length}</strong></div>
            </div>
            <div className="panel">
              <div className="panel-header"><h2>Latest Check-Ins</h2><span>Morning and evening separated</span></div>
              <AttendanceTable records={filteredAttendance.slice(-8).reverse()} repsById={repsById} />
            </div>
          </section>
        ) : null}

        {state && activeTab === 'doctors' ? (
          <section className="two-column">
            <div className="panel">
              <div className="panel-header"><h2>{editingDoctorId ? 'Edit Doctor' : 'Create Doctor'}</h2><div className="top-actions"><label className="file-button"><Upload size={16} /> Import<input type="file" accept=".xlsx" onChange={(event) => importDoctors(event.target.files?.[0])} /></label><button className="ghost-button" onClick={() => { setDoctorForm(emptyDoctor); setEditingDoctorId(null); }}>Clear</button></div></div>
              <div className="form-grid">
                <label>Name<input value={doctorForm.name} onChange={(event) => setDoctorForm({ ...doctorForm, name: event.target.value })} /></label>
                <label>Assigned Salesperson<select value={doctorForm.assignedRepId || ''} onChange={(event) => setDoctorForm({ ...doctorForm, assignedRepId: event.target.value })}><option value="">Unassigned</option>{state.reps.map((rep) => <option key={rep.id} value={rep.id}>{rep.name}</option>)}</select></label>
                <label>Degree<select value={doctorForm.degree} onChange={(event) => setDoctorForm({ ...doctorForm, degree: event.target.value })}><option value="">Select degree</option>{state.degrees.map((degree) => <option key={degree}>{degree}</option>)}</select></label>
                <label>Additional Degree<input value={doctorForm.additionalDegree || ''} onChange={(event) => setDoctorForm({ ...doctorForm, additionalDegree: event.target.value })} placeholder="Optional" /></label>
                <label>Specialization<select value={doctorForm.specialization} onChange={(event) => setDoctorForm({ ...doctorForm, specialization: event.target.value })}><option value="">Select specialization</option>{state.specializations.map((specialization) => <option key={specialization}>{specialization}</option>)}</select></label>
                <label>Phone<input value={doctorForm.phone} onChange={(event) => setDoctorForm({ ...doctorForm, phone: event.target.value })} /></label>
                <label>Territory<input value={doctorForm.territory} onChange={(event) => setDoctorForm({ ...doctorForm, territory: event.target.value })} /></label>
                <label>Priority<select value={doctorForm.priority} onChange={(event) => setDoctorForm({ ...doctorForm, priority: Number(event.target.value) })}><option value={1}>High</option><option value={2}>Medium</option><option value={3}>Low</option></select></label>
                <label>Latitude<input type="number" value={doctorForm.latitude ?? ''} onChange={(event) => setDoctorForm({ ...doctorForm, latitude: Number(event.target.value) })} /></label>
                <label>Longitude<input type="number" value={doctorForm.longitude ?? ''} onChange={(event) => setDoctorForm({ ...doctorForm, longitude: Number(event.target.value) })} /></label>
                <label className="span-2">Associated Products<select multiple value={doctorForm.productIds || []} onChange={(event) => setDoctorForm({ ...doctorForm, productIds: Array.from(event.target.selectedOptions).map((option) => option.value) })}>{activeProducts.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
                <label className="span-2">Profile Photo<input type="file" accept="image/jpeg,image/png,image/webp" onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  try { setDoctorForm({ ...doctorForm, photoUri: await fileToDataUri(file) }); } catch (error) { setMessage(error instanceof Error ? error.message : 'Photo upload failed'); }
                }} /></label>
                <label className="span-2">Notes<textarea value={doctorForm.notes} onChange={(event) => setDoctorForm({ ...doctorForm, notes: event.target.value })} /></label>
              </div>
              <button className="primary-button" onClick={saveDoctor}><Save size={16} /> Save Doctor</button>
            </div>
            <div className="panel">
              <div className="panel-header"><h2>Doctor Directory</h2><span>{filteredDoctors.length} records</span></div>
              <div className="report-controls">
                <label>Salesperson<select value={filters.repId} onChange={(event) => setFilters({ ...filters, repId: event.target.value })}><option value="">All</option>{state.reps.map((rep) => <option key={rep.id} value={rep.id}>{rep.name}</option>)}</select></label>
                <label>Product<select value={filters.productId} onChange={(event) => setFilters({ ...filters, productId: event.target.value })}><option value="">All</option>{activeProducts.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
              </div>
              <div className="record-list">
                {filteredDoctors.length === 0 ? <div className="empty-state">No doctors match the current search.</div> : filteredDoctors.map((doctor) => (
                  <article className="record" key={doctor.id}>
                    <div><strong>{doctor.name}</strong><span>{doctor.specialization} - {doctor.degree || 'No degree'} - {repsById.get(doctor.assignedRepId || '')?.name || 'Unassigned'}</span><Pill value={doctor.locationApprovalStatus} /></div>
                    <div className="record-actions">
                      {doctor.photoUri ? <a href={doctor.photoUri} target="_blank" rel="noreferrer"><ImageIcon size={16} /></a> : null}
                      <button onClick={() => { const { id: _id, ...form } = doctor; setDoctorForm({ ...emptyDoctor, ...form, latitude: doctor.approvedLatitude ?? doctor.latitude, longitude: doctor.approvedLongitude ?? doctor.longitude }); setEditingDoctorId(doctor.id); }}>Edit</button>
                      <button onClick={async () => { await api<Doctor>(`/doctors/${doctor.id}`, { method: 'DELETE' }); await loadState(); }}><Trash2 size={15} /></button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {state && activeTab === 'sales' ? (
          <section className="two-column">
            <div className="panel">
              <div className="panel-header"><h2>{editingRepId ? 'Edit Salesperson' : 'Create Salesperson'}</h2><button className="ghost-button" onClick={() => { setRepForm(emptyRep); setEditingRepId(null); }}>Clear</button></div>
              <div className="form-grid">
                <label>Name<input value={repForm.name} onChange={(event) => setRepForm({ ...repForm, name: event.target.value })} /></label>
                <label>Email<input value={repForm.email} onChange={(event) => setRepForm({ ...repForm, email: event.target.value })} /></label>
                <label>Password<input value={repForm.password || ''} onChange={(event) => setRepForm({ ...repForm, password: event.target.value })} /></label>
                <label>Role<select value={repForm.role} onChange={(event) => setRepForm({ ...repForm, role: event.target.value })}><option value="REP">Salesperson</option><option value="MANAGER">Manager</option><option value="ADMIN">Admin</option></select></label>
                <label>Territory<input value={repForm.territory} onChange={(event) => setRepForm({ ...repForm, territory: event.target.value })} /></label>
                <label>Manager<select value={repForm.managerId || ''} onChange={(event) => setRepForm({ ...repForm, managerId: event.target.value })}><option value="">No manager</option>{state.reps.filter((rep) => rep.id !== editingRepId).map((rep) => <option key={rep.id} value={rep.id}>{rep.name}</option>)}</select></label>
                <label>Require Attendance Photo<select value={String(!!repForm.requireAttendancePhoto)} onChange={(event) => setRepForm({ ...repForm, requireAttendancePhoto: event.target.value === 'true' })}><option value="false">No</option><option value="true">Yes</option></select></label>
              </div>
              <button className="primary-button" onClick={saveRep}><UserPlus size={16} /> Save Salesperson</button>
            </div>
            <div className="panel">
              <div className="panel-header"><h2>Salespersons</h2><span>{state.reps.length} records</span></div>
              <div className="record-list">{state.reps.filter((rep) => includesSearch([rep.name, rep.email, rep.role, rep.territory, rep.status], search)).map((rep) => <article className="record" key={rep.id}><div><strong>{rep.name}</strong><span>{rep.role} - {rep.email} - {rep.territory || 'No territory'}</span></div><div className="record-actions"><button onClick={() => { const { id: _id, ...form } = rep; setRepForm({ ...form, password: '' }); setEditingRepId(rep.id); }}>Edit</button></div></article>)}</div>
            </div>
          </section>
        ) : null}

        {state && activeTab === 'products' ? (
          <section className="two-column">
            <div className="panel">
              <div className="panel-header"><h2>Create Product</h2><span>Used in visit forms</span></div>
              <div className="form-grid">
                <label>Name<input value={productForm.name} onChange={(event) => setProductForm({ ...productForm, name: event.target.value })} /></label>
                <label>Description<input value={productForm.description} onChange={(event) => setProductForm({ ...productForm, description: event.target.value })} /></label>
              </div>
              <button className="primary-button" onClick={saveProduct}><Save size={16} /> Save Product</button>
            </div>
            <div className="panel">
              <div className="panel-header"><h2>Products</h2><span>{activeProducts.length} active</span></div>
              <div className="record-list">{activeProducts.filter((product) => includesSearch([product.name, product.description, product.status], search)).map((product) => <article className="record" key={product.id}><div><strong>{product.name}</strong><span>{product.description || 'No description'}</span></div><div className="record-actions"><button onClick={async () => { await api<Product>(`/products/${product.id}`, { method: 'DELETE' }); await loadState(); }}><Trash2 size={15} /></button></div></article>)}</div>
            </div>
          </section>
        ) : null}

        {state && activeTab === 'expenses' ? (
          <section className="stack">
            <div className="panel">
              <div className="panel-header"><h2>Add Expense</h2><span>Admin or manager review</span></div>
              <div className="form-grid">
                <label>Salesperson<select value={expenseForm.rep_id} onChange={(event) => setExpenseForm({ ...expenseForm, rep_id: event.target.value })}><option value="">Select salesperson</option>{state.reps.map((rep) => <option key={rep.id} value={rep.id}>{rep.name}</option>)}</select></label>
                <label>Date<input type="date" value={expenseForm.date} onChange={(event) => setExpenseForm({ ...expenseForm, date: event.target.value })} /></label>
                <label>Type<input value={expenseForm.expense_type} onChange={(event) => setExpenseForm({ ...expenseForm, expense_type: event.target.value })} /></label>
                <label>Amount<input type="number" value={expenseForm.amount} onChange={(event) => setExpenseForm({ ...expenseForm, amount: event.target.value })} /></label>
                <label className="span-2">Attachment<input type="file" accept="image/jpeg,image/png,image/webp" onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  try { setExpenseForm({ ...expenseForm, attachment_uri: await fileToDataUri(file) }); } catch (error) { setMessage(error instanceof Error ? error.message : 'Attachment upload failed'); }
                }} /></label>
                <label className="span-2">Description<textarea value={expenseForm.description} onChange={(event) => setExpenseForm({ ...expenseForm, description: event.target.value })} /></label>
              </div>
              <button className="primary-button" onClick={saveExpense}><Save size={16} /> Submit Expense</button>
            </div>
            <div className="panel">
              <div className="panel-header"><h2>Expense Review</h2><span>{filteredExpenses.length} records</span></div>
              <ExpenseTable records={filteredExpenses} repsById={repsById} onDecision={decideExpense} />
            </div>
          </section>
        ) : null}

        {state && activeTab === 'reports' ? (
          <section className="stack">
            <div className="panel">
              <div className="panel-header"><h2>Report Filters</h2><span>Salesperson, doctor, product, status, date</span></div>
              <div className="report-controls">
                <label>From<input type="date" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} /></label>
                <label>To<input type="date" value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} /></label>
                <label>Salesperson<select value={filters.repId} onChange={(event) => setFilters({ ...filters, repId: event.target.value })}><option value="">All</option>{state.reps.map((rep) => <option key={rep.id} value={rep.id}>{rep.name}</option>)}</select></label>
                <label>Doctor<select value={filters.doctorId} onChange={(event) => setFilters({ ...filters, doctorId: event.target.value })}><option value="">All</option>{state.doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.name}</option>)}</select></label>
                <label>Product<select value={filters.productId} onChange={(event) => setFilters({ ...filters, productId: event.target.value })}><option value="">All</option>{activeProducts.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
                <label>Specialization<select value={filters.specialization} onChange={(event) => setFilters({ ...filters, specialization: event.target.value })}><option value="">All</option>{state.specializations.map((item) => <option key={item}>{item}</option>)}</select></label>
                <label>Degree<select value={filters.degree} onChange={(event) => setFilters({ ...filters, degree: event.target.value })}><option value="">All</option>{state.degrees.map((item) => <option key={item}>{item}</option>)}</select></label>
                <label>Status<input value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })} placeholder="VALID, PENDING..." /></label>
              </div>
            </div>
            <div className="panel"><div className="panel-header"><h2>Visit Reports</h2><span>{filteredVisits.length} visits</span></div><VisitTable records={filteredVisits} repsById={repsById} doctorsById={doctorsById} products={activeProducts} /></div>
            <div className="panel"><div className="panel-header"><h2>Morning and Evening Check-In Report</h2><span>{filteredAttendance.length} check-ins</span></div><AttendanceTable records={filteredAttendance} repsById={repsById} /></div>
            <div className="panel"><div className="panel-header"><h2>Product-Wise Doctor Report</h2><span>{productDoctorRows.length} relationships</span></div><ProductDoctorTable rows={productDoctorRows} repsById={repsById} /></div>
            <div className="panel"><div className="panel-header"><h2>Red Flag Report</h2><span>{redFlags.length} flags</span></div><table><thead><tr><th>Type</th><th>Salesperson</th><th>Doctor</th><th>Date</th><th>Status</th></tr></thead><tbody>{redFlags.length === 0 ? <tr><td colSpan={5}>No red flags found.</td></tr> : redFlags.map((flag, index) => <tr key={index}><td>{flag.type}</td><td>{repsById.get(String(flag.repId || ''))?.name || flag.repId || '-'}</td><td>{doctorsById.get(String(flag.doctorId || ''))?.name || '-'}</td><td>{flag.date}</td><td><Pill value={flag.status} /></td></tr>)}</tbody></table></div>
            <div className="panel"><div className="panel-header"><h2>Doctor Location Approval Report</h2><span>{state.doctorLocationRequests.length} requests</span></div><LocationTable records={state.doctorLocationRequests} repsById={repsById} onDecision={decideLocation} /></div>
            <div className="panel"><div className="panel-header"><h2>Expense Report</h2><span>{filteredExpenses.length} expenses</span></div><ExpenseTable records={filteredExpenses} repsById={repsById} onDecision={decideExpense} /></div>
          </section>
        ) : null}

        {state && activeTab === 'settings' ? (
          <section className="stack">
            <div className="panel narrow">
              <div className="panel-header"><h2>System Settings</h2><span>Synced to mobile</span></div>
              <div className="form-grid">{Object.entries(state.settings).filter(([key]) => !['attendance_radius_meters', 'max_upload_size_mb', 'supported_upload_formats', 'require_attendance_photo'].includes(key)).map(([key, value]) => <label key={key}>{key.replace(/_/g, ' ')}<input value={value} onChange={(event) => setState({ ...state, settings: { ...state.settings, [key]: event.target.value } })} /></label>)}</div>
              <button className="primary-button" onClick={async () => { const settings = await api<Record<string, string>>('/settings', { method: 'PUT', body: JSON.stringify(state.settings) }); setState({ ...state, settings }); }}><Save size={16} /> Save Settings</button>
            </div>
            <div className="panel narrow">
              <div className="panel-header"><h2>Specializations and Degrees</h2><span>Dropdown values</span></div>
              <div className="form-grid">
                <label>New Specialization<input value={newSpecialization} onChange={(event) => setNewSpecialization(event.target.value)} /></label>
                <button className="secondary-button" onClick={() => { if (!newSpecialization.trim()) return; const next = { ...state, specializations: [...new Set([...state.specializations, newSpecialization.trim()])] }; setNewSpecialization(''); saveReferenceData(next); }}>Add Specialization</button>
                <label>New Degree<input value={newDegree} onChange={(event) => setNewDegree(event.target.value)} /></label>
                <button className="secondary-button" onClick={() => { if (!newDegree.trim()) return; const next = { ...state, degrees: [...new Set([...state.degrees, newDegree.trim()])] }; setNewDegree(''); saveReferenceData(next); }}>Add Degree</button>
              </div>
              <p>{state.specializations.join(', ')}</p>
              <p>{state.degrees.join(', ')}</p>
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}

function AttendanceTable({ records, repsById }: { records: Attendance[]; repsById: Map<string, Rep> }) {
  return <table><thead><tr><th>Salesperson</th><th>Date</th><th>Type</th><th>Time</th><th>Status</th><th>Location</th><th>Photo</th></tr></thead><tbody>{records.length === 0 ? <tr><td colSpan={7}>No check-ins found.</td></tr> : records.map((record) => {
    const repId = String(record.rep_id || record.repId || '');
    const href = mapLink(record.check_in_latitude, record.check_in_longitude);
    return <tr key={`${repId}-${record.date}-${record.check_in_type}-${record.id}`}><td>{repsById.get(repId)?.name || repId || '-'}</td><td>{record.date}</td><td>{record.check_in_type || 'MORNING'}</td><td>{formatTime(record.check_in_time)}</td><td><Pill value={record.status} /></td><td>{href ? <a href={href} target="_blank" rel="noreferrer">Map</a> : '-'}</td><td>{record.photo_uri ? <a href={record.photo_uri} target="_blank" rel="noreferrer">View</a> : '-'}</td></tr>;
  })}</tbody></table>;
}

function VisitTable({ records, repsById, doctorsById, products }: { records: Visit[]; repsById: Map<string, Rep>; doctorsById: Map<string, Doctor>; products: Product[] }) {
  return <table><thead><tr><th>Salesperson</th><th>Doctor</th><th>Products</th><th>Check In</th><th>Flag</th><th>Location</th><th>Photo</th><th>Notes</th></tr></thead><tbody>{records.length === 0 ? <tr><td colSpan={8}>No visits found.</td></tr> : records.map((visit) => {
    const doctor = doctorsById.get(String(visit.doctor_id || ''));
    const href = mapLink(visit.latitude, visit.longitude);
    return <tr key={`${visit.rep_id}-${visit.id}`}><td>{repsById.get(String(visit.rep_id || ''))?.name || visit.rep_id || '-'}</td><td>{doctor?.name || visit.doctor_id || '-'}</td><td>{namesFromVisit(visit, products).join(', ') || '-'}</td><td>{formatTime(visit.check_in_time)}</td><td><Pill value={visit.flag_status} /></td><td>{href ? <a href={href} target="_blank" rel="noreferrer">Map</a> : '-'}</td><td>{visit.photo_uri ? <a href={visit.photo_uri} target="_blank" rel="noreferrer">View</a> : '-'}</td><td>{visit.notes || '-'}</td></tr>;
  })}</tbody></table>;
}

function ProductDoctorTable({ rows, repsById }: { rows: { product: Product; doctor: Doctor; visits: Visit[] }[]; repsById: Map<string, Rep> }) {
  return <table><thead><tr><th>Product</th><th>Doctor</th><th>Specialization</th><th>Salesperson</th><th>Total Visits</th><th>Last Visit</th><th>Last Remarks/Status</th></tr></thead><tbody>{rows.length === 0 ? <tr><td colSpan={7}>No product-doctor records found.</td></tr> : rows.map((row) => {
    const latest = row.visits.slice().sort((a, b) => String(b.check_in_time || '').localeCompare(String(a.check_in_time || '')))[0];
    return <tr key={`${row.product.id}-${row.doctor.id}`}><td>{row.product.name}</td><td>{row.doctor.name}</td><td>{row.doctor.specialization}</td><td>{repsById.get(row.doctor.assignedRepId || '')?.name || row.doctor.assignedRepId || '-'}</td><td>{row.visits.length}</td><td>{dateOnly(latest?.check_in_time) || '-'}</td><td>{latest?.notes || latest?.flag_status || '-'}</td></tr>;
  })}</tbody></table>;
}

function LocationTable({ records, repsById, onDecision }: { records: LocationRequest[]; repsById: Map<string, Rep>; onDecision: (id: string | number, action: 'approve' | 'reject') => void }) {
  return <table><thead><tr><th>Doctor</th><th>Requested By</th><th>Requested At</th><th>Status</th><th>Location</th><th>Actions</th></tr></thead><tbody>{records.length === 0 ? <tr><td colSpan={6}>No location requests found.</td></tr> : records.map((record) => <tr key={record.id}><td>{record.doctorName || record.doctorId}</td><td>{repsById.get(String(record.repId || ''))?.name || record.repId || '-'}</td><td>{formatTime(record.requestedAt)}</td><td><Pill value={record.status} /></td><td><a href={mapLink(record.latitude, record.longitude)} target="_blank" rel="noreferrer">Map</a></td><td className="table-actions">{record.status === 'PENDING' ? <><button onClick={() => onDecision(record.id, 'approve')}><CheckCircle size={14} />Approve</button><button onClick={() => onDecision(record.id, 'reject')}><XCircle size={14} />Reject</button></> : '-'}</td></tr>)}</tbody></table>;
}

function ExpenseTable({ records, repsById, onDecision }: { records: Expense[]; repsById: Map<string, Rep>; onDecision: (id: string | number, action: 'approve' | 'reject') => void }) {
  return <table><thead><tr><th>Salesperson</th><th>Date</th><th>Type</th><th>Amount</th><th>Status</th><th>Attachment</th><th>Actions</th></tr></thead><tbody>{records.length === 0 ? <tr><td colSpan={7}>No expenses found.</td></tr> : records.map((expense) => {
    const repId = String(expense.rep_id || expense.repId || '');
    const status = expense.status || 'SUBMITTED';
    return <tr key={`${repId}-${expense.id}`}><td>{repsById.get(repId)?.name || repId || '-'}</td><td>{expense.date}</td><td>{expense.expense_type || expense.expenseType || '-'}</td><td>{Number(expense.amount || 0).toLocaleString()}</td><td><Pill value={status} /></td><td>{expense.attachment_uri ? <a href={expense.attachment_uri} target="_blank" rel="noreferrer">View</a> : '-'}</td><td className="table-actions">{status === 'SUBMITTED' ? <><button onClick={() => onDecision(expense.id, 'approve')}><BadgeCheck size={14} />Approve</button><button onClick={() => onDecision(expense.id, 'reject')}><XCircle size={14} />Reject</button></> : '-'}</td></tr>;
  })}</tbody></table>;
}
