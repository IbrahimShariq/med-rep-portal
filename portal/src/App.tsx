import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import {
  BadgeCheck,
  Bell,
  CalendarCheck,
  CalendarDays,
  Download,
  FileSpreadsheet,
  Image,
  LayoutDashboard,
  Loader2,
  MapPin,
  RefreshCw,
  Save,
  Search,
  Settings,
  Stethoscope,
  Trash2,
  Upload,
  UserPlus,
  Users,
} from 'lucide-react';
import ExcelJS from 'exceljs';
import './App.css';

type Branding = {
  appName: string;
  logoText: string;
  primaryColor: string;
  logoUrl: string;
};

type Doctor = {
  id: string;
  name: string;
  degree: string;
  specialization: string;
  priority: number;
  territory: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  phone: string;
  notes: string;
  is_active: number;
};

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
  status: string;
};

type Attendance = {
  id: string | number;
  rep_id?: string;
  repId?: string;
  date: string;
  check_in_time?: string;
  check_out_time?: string;
  status?: string;
  exception_reason?: string;
  distance_from_base_m?: number;
};

type Visit = {
  id: string | number;
  rep_id?: string;
  doctor_id?: string | number;
  check_in_time?: string;
  check_out_time?: string;
  flag_status?: string;
  notes?: string;
  joint_with_rep_ids?: string[];
  joint_visit?: number;
};

type Schedule = {
  id: string | number;
  rep_id?: string;
  repId?: string;
  doctor_id?: string | number;
  date: string;
  shift?: string;
  notes?: string;
  status?: string;
  approval_chain?: string[];
  approvals?: { managerId: string; approvedAt: string }[];
};

type AppState = {
  branding: Branding;
  settings: Record<string, string>;
  doctors: Doctor[];
  reps: Rep[];
  attendance: Attendance[];
  visits: Visit[];
  schedules: Schedule[];
};

type Tab = 'dashboard' | 'doctors' | 'sales' | 'attendance' | 'branding' | 'settings';

const apiBase = (import.meta.env.VITE_API_BASE as string | undefined)
  ?? (import.meta.env.DEV ? 'http://localhost:8787/api' : '/api');

const emptyDoctor: Omit<Doctor, 'id'> = {
  name: '',
  degree: '',
  specialization: '',
  priority: 2,
  territory: '',
  address: '',
  latitude: 33.6844,
  longitude: 73.0479,
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
  status: 'ACTIVE',
};

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || 'API request failed');
  return payload as T;
}

function parseGoogleMapUrl(url: string) {
  const atMatch = url.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (atMatch) return { latitude: Number(atMatch[1]), longitude: Number(atMatch[2]) };

  const queryMatch = url.match(/[?&](?:q|query)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
  if (queryMatch) return { latitude: Number(queryMatch[1]), longitude: Number(queryMatch[2]) };

  const plainMatch = url.match(/(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
  if (plainMatch) return { latitude: Number(plainMatch[1]), longitude: Number(plainMatch[2]) };

  return null;
}

function formatTime(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function dateOnly(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toISOString().slice(0, 10);
}

async function downloadWorkbook(filename: string, sheets: Record<string, Record<string, unknown>[]>) {
  const workbook = new ExcelJS.Workbook();
  Object.entries(sheets).forEach(([name, rows]) => {
    const worksheet = workbook.addWorksheet(name.slice(0, 31));
    const keys = Object.keys(rows[0] || { Empty: '' });
    worksheet.columns = keys.map((key) => ({ header: key, key, width: Math.max(14, key.length + 2) }));
    rows.forEach((row) => worksheet.addRow(row));
    worksheet.getRow(1).font = { bold: true };
  });
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function normalizeDoctorImport(row: Record<string, unknown>) {
  const read = (...keys: string[]) => {
    const key = keys.find((item) => row[item] != null && row[item] !== '');
    return key ? row[key] : '';
  };
  return {
    name: String(read('Name', 'name')).trim(),
    degree: String(read('Degree', 'degree')).trim(),
    specialization: String(read('Specialization', 'specialization')).trim(),
    priority: Number(read('Priority', 'priority') || 2),
    territory: String(read('Territory', 'territory')).trim(),
    address: String(read('Address', 'address')).trim(),
    latitude: read('Latitude', 'latitude') === '' ? null : Number(read('Latitude', 'latitude')),
    longitude: read('Longitude', 'longitude') === '' ? null : Number(read('Longitude', 'longitude')),
    phone: String(read('Phone', 'phone')).trim(),
    notes: String(read('Notes', 'notes')).trim(),
    is_active: 1,
  };
}

function getPresetRange(preset: string) {
  const now = new Date();
  const start = new Date(now);
  if (preset === 'last-week') start.setDate(now.getDate() - 7);
  if (preset === 'last-month') start.setMonth(now.getMonth() - 1);
  if (preset === 'last-year') start.setFullYear(now.getFullYear() - 1);
  if (preset === 'all') return { from: '', to: '' };
  return { from: start.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) };
}

function jointRepIds(value: unknown) {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return value ? value.split(',').map((item) => item.trim()).filter(Boolean) : [];
    }
  }
  return [];
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
  const [mapPaste, setMapPaste] = useState('');
  const [geocoding, setGeocoding] = useState(false);
  const [reportRepId, setReportRepId] = useState('');
  const [reportRegion, setReportRegion] = useState('');
  const [reportFrom, setReportFrom] = useState('');
  const [reportTo, setReportTo] = useState('');
  const [reportPreset, setReportPreset] = useState('all');

  const loadState = async () => {
    setLoading(true);
    try {
      setState(await api<AppState>('/state'));
      setMessage('Synced with local API');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to reach API server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadState();
  }, []);

  const repsById = useMemo(() => {
    const lookup = new Map<string, Rep>();
    state?.reps.forEach((rep) => lookup.set(rep.id, rep));
    return lookup;
  }, [state?.reps]);

  const activeDoctors = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (state?.doctors || [])
      .filter((doctor) => doctor.is_active !== 0)
      .filter((doctor) =>
        [doctor.name, doctor.specialization, doctor.territory, doctor.phone]
          .join(' ')
          .toLowerCase()
          .includes(q),
      );
  }, [search, state?.doctors]);

  const regions = useMemo(() => {
    const values = new Set<string>();
    state?.reps.forEach((rep) => rep.territory && values.add(rep.territory));
    state?.doctors.forEach((doctor) => doctor.territory && values.add(doctor.territory));
    return [...values].sort();
  }, [state?.doctors, state?.reps]);

  const filteredAttendance = useMemo(() => {
    return (state?.attendance || []).filter((record) => {
      const repId = String(record.rep_id || record.repId || '');
      const rep = repsById.get(repId);
      const recordDate = record.date || dateOnly(record.check_in_time);
      if (reportRepId && repId !== reportRepId) return false;
      if (reportRegion && rep?.territory !== reportRegion) return false;
      if (reportFrom && recordDate < reportFrom) return false;
      if (reportTo && recordDate > reportTo) return false;
      return true;
    });
  }, [reportFrom, reportRegion, reportRepId, reportTo, repsById, state?.attendance]);

  const filteredVisits = useMemo(() => {
    return (state?.visits || []).filter((visit) => {
      const repId = String(visit.rep_id || '');
      const rep = repsById.get(repId);
      const doctor = state?.doctors.find((item) => String(item.id) === String(visit.doctor_id));
      const recordDate = dateOnly(visit.check_in_time);
      if (reportRepId && repId !== reportRepId && !jointRepIds(visit.joint_with_rep_ids).includes(reportRepId)) return false;
      if (reportRegion && rep?.territory !== reportRegion && doctor?.territory !== reportRegion) return false;
      if (reportFrom && recordDate < reportFrom) return false;
      if (reportTo && recordDate > reportTo) return false;
      return true;
    });
  }, [reportFrom, reportRegion, reportRepId, reportTo, repsById, state?.doctors, state?.visits]);

  const calendarDays = useMemo(() => {
    const map = new Map<string, { attendance: number; visits: number }>();
    filteredAttendance.forEach((record) => {
      const key = record.date || dateOnly(record.check_in_time);
      const current = map.get(key) || { attendance: 0, visits: 0 };
      current.attendance += 1;
      map.set(key, current);
    });
    filteredVisits.forEach((visit) => {
      const key = dateOnly(visit.check_in_time);
      if (!key) return;
      const current = map.get(key) || { attendance: 0, visits: 0 };
      current.visits += 1;
      map.set(key, current);
    });
    return [...map.entries()].sort(([a], [b]) => b.localeCompare(a));
  }, [filteredAttendance, filteredVisits]);

  const saveBranding = async () => {
    if (!state) return;
    const branding = await api<Branding>('/branding', {
      method: 'PUT',
      body: JSON.stringify(state.branding),
    });
    setState({ ...state, branding });
    setMessage('Branding saved. App and portal will use the new name/logo on next sync.');
  };

  const saveSettings = async () => {
    if (!state) return;
    const settings = await api<Record<string, string>>('/settings', {
      method: 'PUT',
      body: JSON.stringify(state.settings),
    });
    setState({ ...state, settings });
    setMessage('Settings saved and ready for mobile sync.');
  };

  const submitDoctor = async () => {
    if (!state || !doctorForm.name.trim()) return;
    const path = editingDoctorId ? `/doctors/${editingDoctorId}` : '/doctors';
    const method = editingDoctorId ? 'PUT' : 'POST';
    await api<Doctor>(path, { method, body: JSON.stringify(doctorForm) });
    setDoctorForm(emptyDoctor);
    setEditingDoctorId(null);
    setMapPaste('');
    await loadState();
  };

  const editDoctor = (doctor: Doctor) => {
    const { id: _id, ...form } = doctor;
    setDoctorForm(form);
    setEditingDoctorId(doctor.id);
    setActiveTab('doctors');
  };

  const deleteDoctor = async (id: string) => {
    await api<Doctor>(`/doctors/${id}`, { method: 'DELETE' });
    await loadState();
  };

  const downloadDoctorTemplate = async () => {
    await downloadWorkbook('doctor-import-template.xlsx', {
      Doctors: [
        {
          Name: 'Dr. Example',
          Degree: 'MBBS',
          Specialization: 'Cardiology',
          Priority: 1,
          Territory: 'Blue Area',
          Address: 'Blue Area, Islamabad',
          Latitude: 33.7104,
          Longitude: 73.0567,
          Phone: '0300-0000000',
          Notes: 'Morning visits preferred',
        },
      ],
    });
  };

  const importDoctors = async (file?: File) => {
    if (!file) return;
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
    const doctors = rows.map(normalizeDoctorImport).filter((doctor) => doctor.name);
    if (doctors.length === 0) {
      setMessage('No valid doctors found in that workbook.');
      return;
    }
    const result = await api<{ imported: number }>('/doctors/import', {
      method: 'POST',
      body: JSON.stringify({ doctors }),
    });
    setMessage(`Imported ${result.imported} doctors from Excel.`);
    await loadState();
  };

  const submitRep = async () => {
    if (!state || !repForm.name.trim() || !repForm.email.trim()) return;
    const path = editingRepId ? `/reps/${editingRepId}` : '/reps';
    const method = editingRepId ? 'PUT' : 'POST';
    await api<Rep>(path, { method, body: JSON.stringify(repForm) });
    setRepForm(emptyRep);
    setEditingRepId(null);
    await loadState();
  };

  const editRep = (rep: Rep) => {
    const { id: _id, ...form } = rep;
    setRepForm({ ...form, password: rep.password || '' });
    setEditingRepId(rep.id);
    setActiveTab('sales');
  };

  const deleteRep = async (id: string) => {
    await api<Rep>(`/reps/${id}`, { method: 'DELETE' });
    await loadState();
  };

  const applyMapPaste = () => {
    const coords = parseGoogleMapUrl(mapPaste);
    if (!coords) {
      setMessage('Could not find coordinates in that Google Maps link.');
      return;
    }
    setDoctorForm({ ...doctorForm, latitude: coords.latitude, longitude: coords.longitude });
    setMapPaste('');
    setMessage('Doctor location updated from Google Maps link.');
  };

  const geocodeDoctorAddress = async () => {
    const query = doctorForm.address || doctorForm.territory || doctorForm.name;
    if (!query.trim()) {
      setMessage('Add an address first so the map can search it.');
      return;
    }
    setGeocoding(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
      const response = await fetch(url, { headers: { Accept: 'application/json' } });
      const [match] = await response.json();
      if (!match) {
        setMessage('No map result found for that address.');
        return;
      }
      setDoctorForm({
        ...doctorForm,
        latitude: Number(match.lat),
        longitude: Number(match.lon),
      });
      setMessage('Map location found from address.');
    } catch {
      setMessage('Map search failed. Paste a Google Maps link or coordinates instead.');
    } finally {
      setGeocoding(false);
    }
  };

  const setReportRange = (preset: string) => {
    const range = getPresetRange(preset);
    setReportPreset(preset);
    setReportFrom(range.from);
    setReportTo(range.to);
  };

  const exportReports = async () => {
    if (!state) return;
    await downloadWorkbook('med-rep-report.xlsx', {
      Attendance: filteredAttendance.map((record) => {
        const repId = String(record.rep_id || record.repId || '');
        const rep = repsById.get(repId);
        return {
          'Sales Person': rep?.name || repId,
          Region: rep?.territory || '',
          Date: record.date,
          'Check In': formatTime(record.check_in_time),
          'Check Out': formatTime(record.check_out_time),
          Status: record.status || 'VALID',
          'Distance From Base (m)': record.distance_from_base_m ?? 0,
          Reason: record.exception_reason || '',
        };
      }),
      Visits: filteredVisits.map((visit) => {
        const repId = String(visit.rep_id || '');
        const rep = repsById.get(repId);
        const doctor = state.doctors.find((item) => String(item.id) === String(visit.doctor_id));
        return {
          'Sales Person': rep?.name || repId,
          Region: rep?.territory || doctor?.territory || '',
          Doctor: doctor?.name || visit.doctor_id || '',
          Date: dateOnly(visit.check_in_time),
          'Check In': formatTime(visit.check_in_time),
          'Check Out': formatTime(visit.check_out_time),
          Flag: visit.flag_status || 'VALID',
          'Joint Visit': visit.joint_visit ? 'Yes' : 'No',
          'Joint With': jointRepIds(visit.joint_with_rep_ids).map((id) => repsById.get(String(id))?.name || id).join(', '),
          Notes: visit.notes || '',
        };
      }),
    });
  };

  const mapQuery = `${doctorForm.latitude || 33.6844},${doctorForm.longitude || 73.0479}`;
  const mapUrl = `https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&z=15&output=embed`;
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`;

  const navItems: { id: Tab; label: string; icon: ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { id: 'doctors', label: 'Doctors', icon: <Stethoscope size={20} /> },
    { id: 'sales', label: 'Sales Profiles', icon: <Users size={20} /> },
    { id: 'attendance', label: 'Reports', icon: <CalendarCheck size={20} /> },
    { id: 'branding', label: 'Branding', icon: <Image size={20} /> },
    { id: 'settings', label: 'Settings', icon: <Settings size={20} /> },
  ];

  return (
    <div className="app-shell" style={{ '--brand': state?.branding.primaryColor || '#2563eb' } as CSSProperties}>
      <aside className="sidebar">
        <div className="brand-lockup">
          {state?.branding.logoUrl ? (
            <img src={state.branding.logoUrl} alt="" className="brand-image" />
          ) : (
            <div className="brand-mark">{state?.branding.logoText || 'MR'}</div>
          )}
          <div>
            <strong>{state?.branding.appName || 'Med Rep'}</strong>
            <span>Call Reporting System</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <button key={item.id} className={activeTab === item.id ? 'active' : ''} onClick={() => setActiveTab(item.id)}>
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Admin Portal</p>
            <h1>{navItems.find((item) => item.id === activeTab)?.label}</h1>
          </div>
          <div className="top-actions">
            <div className="search">
              <Search size={17} />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search doctors, territory..." />
            </div>
            <button className="icon-button" onClick={loadState} title="Refresh data">
              {loading ? <Loader2 className="spin" size={19} /> : <RefreshCw size={19} />}
            </button>
            <button className="icon-button" title={message || 'System status'}>
              <Bell size={19} />
            </button>
          </div>
        </header>

        {message ? <div className="status-line">{message}</div> : null}

        {!state && loading ? (
          <div className="empty-state">
            <Loader2 className="spin" />
            <p>Loading portal data...</p>
          </div>
        ) : null}

        {state && activeTab === 'dashboard' ? (
          <section className="stack">
            <div className="metric-grid">
              <div className="metric"><Users /><span>Active Sales Persons</span><strong>{state.reps.filter((rep) => rep.status === 'ACTIVE').length}</strong></div>
              <div className="metric"><Stethoscope /><span>Active Doctors</span><strong>{activeDoctors.length}</strong></div>
              <div className="metric"><CalendarCheck /><span>Synced Attendance</span><strong>{state.attendance.length}</strong></div>
              <div className="metric"><BadgeCheck /><span>Synced Visits</span><strong>{state.visits.length}</strong></div>
            </div>

            <div className="panel">
              <div className="panel-header">
                <h2>Latest Attendance</h2>
                <button className="ghost-button" onClick={() => setActiveTab('attendance')}>View reports</button>
              </div>
              <AttendanceTable attendance={state.attendance.slice(-8).reverse()} repsById={repsById} />
            </div>
          </section>
        ) : null}

        {state && activeTab === 'doctors' ? (
          <section className="two-column">
            <div className="panel">
              <div className="panel-header">
                <h2>{editingDoctorId ? 'Edit Doctor' : 'Add Doctor'}</h2>
                <div className="button-row">
                  <button className="ghost-button" onClick={() => { setDoctorForm(emptyDoctor); setEditingDoctorId(null); }}>Clear</button>
                  <button className="secondary-button" onClick={downloadDoctorTemplate}><FileSpreadsheet size={16} /> Template</button>
                  <label className="file-button">
                    <Upload size={16} /> Import
                    <input
                      type="file"
                      accept=".xlsx"
                      onChange={(event) => importDoctors(event.target.files?.[0])}
                    />
                  </label>
                </div>
              </div>
              <div className="form-grid">
                <label>Name<input value={doctorForm.name} onChange={(event) => setDoctorForm({ ...doctorForm, name: event.target.value })} /></label>
                <label>Degree<input value={doctorForm.degree} onChange={(event) => setDoctorForm({ ...doctorForm, degree: event.target.value })} /></label>
                <label>Specialization<input value={doctorForm.specialization} onChange={(event) => setDoctorForm({ ...doctorForm, specialization: event.target.value })} /></label>
                <label>Phone<input value={doctorForm.phone} onChange={(event) => setDoctorForm({ ...doctorForm, phone: event.target.value })} /></label>
                <label>Territory<input value={doctorForm.territory} onChange={(event) => setDoctorForm({ ...doctorForm, territory: event.target.value })} /></label>
                <label>Priority<select value={doctorForm.priority} onChange={(event) => setDoctorForm({ ...doctorForm, priority: Number(event.target.value) })}><option value={1}>High</option><option value={2}>Medium</option><option value={3}>Low</option></select></label>
                <label className="span-2">Address<input value={doctorForm.address || ''} onChange={(event) => setDoctorForm({ ...doctorForm, address: event.target.value })} placeholder="Clinic address" /></label>
                <label>Latitude<input type="number" value={doctorForm.latitude ?? ''} onChange={(event) => setDoctorForm({ ...doctorForm, latitude: Number(event.target.value) })} /></label>
                <label>Longitude<input type="number" value={doctorForm.longitude ?? ''} onChange={(event) => setDoctorForm({ ...doctorForm, longitude: Number(event.target.value) })} /></label>
                <label className="span-2">Notes<textarea value={doctorForm.notes} onChange={(event) => setDoctorForm({ ...doctorForm, notes: event.target.value })} /></label>
              </div>
              <div className="map-tools">
                <input value={mapPaste} onChange={(event) => setMapPaste(event.target.value)} placeholder="Paste Google Maps URL or lat,lng" />
                <button className="secondary-button" onClick={applyMapPaste}><MapPin size={16} /> Use location</button>
                <button className="secondary-button" onClick={geocodeDoctorAddress} disabled={geocoding}>
                  {geocoding ? <Loader2 className="spin" size={16} /> : <Search size={16} />} Search address
                </button>
              </div>
              <iframe title="Doctor Google Map" className="map-frame" src={mapUrl} loading="lazy" />
              <div className="button-row">
                <a className="secondary-link" href={googleMapsUrl} target="_blank" rel="noreferrer">Open in Google Maps</a>
                <button className="primary-button" onClick={submitDoctor}><Save size={16} /> Save Doctor</button>
              </div>
            </div>

            <div className="panel">
              <div className="panel-header"><h2>Doctor Directory</h2><span>{activeDoctors.length} active</span></div>
              <div className="record-list">
                {activeDoctors.map((doctor) => (
                  <article className="record" key={doctor.id}>
                    <div><strong>{doctor.name}</strong><span>{doctor.specialization} - {doctor.territory}</span></div>
                    <div className="record-actions">
                      <button onClick={() => editDoctor(doctor)}>Edit</button>
                      <button onClick={() => deleteDoctor(doctor.id)}><Trash2 size={15} /></button>
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
              <div className="panel-header">
                <h2>{editingRepId ? 'Edit Sales Profile' : 'Create Sales Profile'}</h2>
                <button className="ghost-button" onClick={() => { setRepForm(emptyRep); setEditingRepId(null); }}>Clear</button>
              </div>
              <div className="profile-preview">
                {repForm.profilePicture ? <img src={repForm.profilePicture} alt="" /> : <div>{repForm.name.charAt(0) || 'S'}</div>}
                <span>{repForm.name || 'New Sales Person'}</span>
              </div>
              <div className="form-grid">
                <label>Name<input value={repForm.name} onChange={(event) => setRepForm({ ...repForm, name: event.target.value })} /></label>
                <label>Email<input value={repForm.email} onChange={(event) => setRepForm({ ...repForm, email: event.target.value })} /></label>
                <label>Password<input value={repForm.password || ''} onChange={(event) => setRepForm({ ...repForm, password: event.target.value })} placeholder={editingRepId ? 'Leave blank to keep current password' : ''} /></label>
                <label>Territory<input value={repForm.territory} onChange={(event) => setRepForm({ ...repForm, territory: event.target.value })} /></label>
                <label>Manager<select value={repForm.managerId || ''} onChange={(event) => setRepForm({ ...repForm, managerId: event.target.value })}>
                  <option value="">No manager</option>
                  {state.reps.filter((rep) => rep.id !== editingRepId && rep.status !== 'INACTIVE').map((rep) => <option key={rep.id} value={rep.id}>{rep.name}</option>)}
                </select></label>
                <label>Base Latitude<input type="number" value={repForm.baseLatitude ?? ''} onChange={(event) => setRepForm({ ...repForm, baseLatitude: Number(event.target.value) })} /></label>
                <label>Base Longitude<input type="number" value={repForm.baseLongitude ?? ''} onChange={(event) => setRepForm({ ...repForm, baseLongitude: Number(event.target.value) })} /></label>
                <label className="span-2">Profile Picture URL<input value={repForm.profilePicture} onChange={(event) => setRepForm({ ...repForm, profilePicture: event.target.value })} /></label>
              </div>
              <button className="primary-button" onClick={submitRep}><UserPlus size={16} /> Save Sales Profile</button>
            </div>

            <div className="panel">
              <div className="panel-header"><h2>Sales Persons</h2><span>{state.reps.length} profiles</span></div>
              <div className="record-list">
                {state.reps.map((rep) => (
                  <article className="record" key={rep.id}>
                    <div><strong>{rep.name}</strong><span>{rep.email} - {rep.territory || 'No territory'} - Manager: {rep.managerId ? repsById.get(rep.managerId)?.name || rep.managerId : 'None'}</span></div>
                    <div className="record-actions">
                      <button onClick={() => editRep(rep)}>Edit</button>
                      <button onClick={() => deleteRep(rep.id)}><Trash2 size={15} /></button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {state && activeTab === 'attendance' ? (
          <section className="stack">
            <div className="panel">
              <div className="panel-header">
                <h2>Report Filters</h2>
                <button className="primary-button" onClick={exportReports}><Download size={16} /> Download Excel</button>
              </div>
              <div className="report-controls">
                <label>Sales Person<select value={reportRepId} onChange={(event) => setReportRepId(event.target.value)}>
                  <option value="">All sales persons</option>
                  {state.reps.map((rep) => <option key={rep.id} value={rep.id}>{rep.name}</option>)}
                </select></label>
                <label>Region<select value={reportRegion} onChange={(event) => setReportRegion(event.target.value)}>
                  <option value="">All regions</option>
                  {regions.map((region) => <option key={region} value={region}>{region}</option>)}
                </select></label>
                <label>Date Range<select value={reportPreset} onChange={(event) => setReportRange(event.target.value)}>
                  <option value="all">All time</option>
                  <option value="last-week">Last week</option>
                  <option value="last-month">Last month</option>
                  <option value="last-year">Last year</option>
                  <option value="custom">Custom</option>
                </select></label>
                <label>From<input type="date" value={reportFrom} onChange={(event) => { setReportPreset('custom'); setReportFrom(event.target.value); }} /></label>
                <label>To<input type="date" value={reportTo} onChange={(event) => { setReportPreset('custom'); setReportTo(event.target.value); }} /></label>
              </div>
            </div>
            <div className="panel">
              <div className="panel-header"><h2>Calendar View</h2><span>{calendarDays.length} active days</span></div>
              <div className="calendar-grid">
                {calendarDays.length === 0 ? (
                  <div className="empty-calendar">No records match the selected filters.</div>
                ) : calendarDays.map(([day, counts]) => (
                  <div className="calendar-day" key={day}>
                    <CalendarDays size={18} />
                    <strong>{day}</strong>
                    <span>{counts.attendance} attendance</span>
                    <span>{counts.visits} visits</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="panel">
              <div className="panel-header">
                <h2>Attendance Sync Log</h2>
                <span>{filteredAttendance.length} records</span>
              </div>
              <AttendanceTable attendance={filteredAttendance.slice().reverse()} repsById={repsById} />
            </div>
            <div className="panel">
              <div className="panel-header"><h2>Visit Reports</h2><span>{filteredVisits.length} synced</span></div>
              <table>
                <thead><tr><th>Sales Person</th><th>Doctor</th><th>Check In</th><th>Check Out</th><th>Flag</th><th>Joint Visit</th><th>Notes</th></tr></thead>
                <tbody>
                  {filteredVisits.map((visit) => {
                    const repName = repsById.get(String(visit.rep_id || ''))?.name || visit.rep_id || '-';
                    const doctor = state.doctors.find((item) => String(item.id) === String(visit.doctor_id));
                    const jointNames = jointRepIds(visit.joint_with_rep_ids).map((id) => repsById.get(String(id))?.name || id).join(', ');
                    return <tr key={`${visit.rep_id}-${visit.id}`}><td>{repName}</td><td>{doctor?.name || visit.doctor_id || '-'}</td><td>{formatTime(visit.check_in_time)}</td><td>{formatTime(visit.check_out_time)}</td><td>{visit.flag_status || 'VALID'}</td><td>{visit.joint_visit ? `Yes (${jointNames})` : '-'}</td><td>{visit.notes || '-'}</td></tr>;
                  })}
                </tbody>
              </table>
            </div>
            <div className="panel">
              <div className="panel-header"><h2>Schedule Approvals</h2><span>{(state.schedules || []).length} schedules</span></div>
              <table>
                <thead><tr><th>Sales Person</th><th>Doctor</th><th>Date</th><th>Status</th><th>Approval Chain</th></tr></thead>
                <tbody>
                  {(state.schedules || []).map((schedule) => {
                    const repId = String(schedule.rep_id || schedule.repId || '');
                    const doctor = state.doctors.find((item) => String(item.id) === String(schedule.doctor_id));
                    const approved = new Set((schedule.approvals || []).map((approval) => approval.managerId));
                    return (
                      <tr key={`${repId}-${schedule.id}`}>
                        <td>{repsById.get(repId)?.name || repId}</td>
                        <td>{doctor?.name || schedule.doctor_id || '-'}</td>
                        <td>{schedule.date}</td>
                        <td><span className={`pill ${schedule.status || 'PENDING'}`}>{schedule.status || 'PENDING'}</span></td>
                        <td>{(schedule.approval_chain || []).map((id) => `${repsById.get(id)?.name || id}${approved.has(id) ? ' approved' : ' pending'}`).join(' > ') || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {state && activeTab === 'branding' ? (
          <section className="panel narrow">
            <div className="panel-header"><h2>Dynamic App Name and Logo</h2><span>Synced to app</span></div>
            <div className="brand-editor">
              <div className="brand-preview">
                {state.branding.logoUrl ? <img src={state.branding.logoUrl} alt="" /> : <div>{state.branding.logoText}</div>}
                <strong>{state.branding.appName}</strong>
              </div>
              <label>App Name<input value={state.branding.appName} onChange={(event) => setState({ ...state, branding: { ...state.branding, appName: event.target.value } })} /></label>
              <label>Logo Text<input value={state.branding.logoText} onChange={(event) => setState({ ...state, branding: { ...state.branding, logoText: event.target.value } })} /></label>
              <label>Logo Image URL<input value={state.branding.logoUrl} onChange={(event) => setState({ ...state, branding: { ...state.branding, logoUrl: event.target.value } })} /></label>
              <label>Primary Color<input type="color" value={state.branding.primaryColor} onChange={(event) => setState({ ...state, branding: { ...state.branding, primaryColor: event.target.value } })} /></label>
              <button className="primary-button" onClick={saveBranding}><Save size={16} /> Save Branding</button>
            </div>
          </section>
        ) : null}

        {state && activeTab === 'settings' ? (
          <section className="panel narrow">
            <div className="panel-header"><h2>System Settings</h2><span>Used by mobile validation</span></div>
            <div className="form-grid">
              {Object.entries(state.settings).map(([key, value]) => (
                <label key={key}>{key.replace(/_/g, ' ')}<input value={value} onChange={(event) => setState({ ...state, settings: { ...state.settings, [key]: event.target.value } })} /></label>
              ))}
            </div>
            <button className="primary-button" onClick={saveSettings}><Save size={16} /> Save Settings</button>
          </section>
        ) : null}
      </main>
    </div>
  );
}

function AttendanceTable({ attendance, repsById }: { attendance: Attendance[]; repsById: Map<string, Rep> }) {
  return (
    <table>
      <thead><tr><th>Sales Person</th><th>Date</th><th>Check In</th><th>Check Out</th><th>Status</th><th>Distance</th><th>Reason</th></tr></thead>
      <tbody>
        {attendance.length === 0 ? (
          <tr><td colSpan={7}>No attendance synced yet.</td></tr>
        ) : attendance.map((record) => {
          const repId = String(record.rep_id || record.repId || '');
          return (
            <tr key={`${repId}-${record.date}-${record.id}`}>
              <td>{repsById.get(repId)?.name || repId || '-'}</td>
              <td>{record.date || '-'}</td>
              <td>{formatTime(record.check_in_time)}</td>
              <td>{formatTime(record.check_out_time)}</td>
              <td><span className={`pill ${record.status || 'VALID'}`}>{record.status || 'VALID'}</span></td>
              <td>{record.distance_from_base_m ?? 0} m</td>
              <td>{record.exception_reason || '-'}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
