import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import {
  BadgeCheck,
  Bell,
  CalendarCheck,
  Download,
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
  UserPlus,
  Users,
} from 'lucide-react';
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
};

type AppState = {
  branding: Branding;
  settings: Record<string, string>;
  doctors: Doctor[];
  reps: Rep[];
  attendance: Attendance[];
  visits: Visit[];
};

type Tab = 'dashboard' | 'doctors' | 'sales' | 'attendance' | 'branding' | 'settings';

const apiBase = `${window.location.protocol}//${window.location.hostname}:8787/api`;

const emptyDoctor: Omit<Doctor, 'id'> = {
  name: '',
  degree: '',
  specialization: '',
  priority: 2,
  territory: '',
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
                <button className="ghost-button" onClick={() => { setDoctorForm(emptyDoctor); setEditingDoctorId(null); }}>Clear</button>
              </div>
              <div className="form-grid">
                <label>Name<input value={doctorForm.name} onChange={(event) => setDoctorForm({ ...doctorForm, name: event.target.value })} /></label>
                <label>Degree<input value={doctorForm.degree} onChange={(event) => setDoctorForm({ ...doctorForm, degree: event.target.value })} /></label>
                <label>Specialization<input value={doctorForm.specialization} onChange={(event) => setDoctorForm({ ...doctorForm, specialization: event.target.value })} /></label>
                <label>Phone<input value={doctorForm.phone} onChange={(event) => setDoctorForm({ ...doctorForm, phone: event.target.value })} /></label>
                <label>Territory<input value={doctorForm.territory} onChange={(event) => setDoctorForm({ ...doctorForm, territory: event.target.value })} /></label>
                <label>Priority<select value={doctorForm.priority} onChange={(event) => setDoctorForm({ ...doctorForm, priority: Number(event.target.value) })}><option value={1}>High</option><option value={2}>Medium</option><option value={3}>Low</option></select></label>
                <label>Latitude<input type="number" value={doctorForm.latitude ?? ''} onChange={(event) => setDoctorForm({ ...doctorForm, latitude: Number(event.target.value) })} /></label>
                <label>Longitude<input type="number" value={doctorForm.longitude ?? ''} onChange={(event) => setDoctorForm({ ...doctorForm, longitude: Number(event.target.value) })} /></label>
                <label className="span-2">Notes<textarea value={doctorForm.notes} onChange={(event) => setDoctorForm({ ...doctorForm, notes: event.target.value })} /></label>
              </div>
              <div className="map-tools">
                <input value={mapPaste} onChange={(event) => setMapPaste(event.target.value)} placeholder="Paste Google Maps URL or lat,lng" />
                <button className="secondary-button" onClick={applyMapPaste}><MapPin size={16} /> Use location</button>
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
                <label>Password<input value={repForm.password || ''} onChange={(event) => setRepForm({ ...repForm, password: event.target.value })} /></label>
                <label>Territory<input value={repForm.territory} onChange={(event) => setRepForm({ ...repForm, territory: event.target.value })} /></label>
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
                    <div><strong>{rep.name}</strong><span>{rep.email} - {rep.territory || 'No territory'}</span></div>
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
                <h2>Attendance Sync Log</h2>
                <button className="secondary-button" onClick={() => navigator.clipboard.writeText(JSON.stringify(state.attendance, null, 2))}><Download size={16} /> Copy JSON</button>
              </div>
              <AttendanceTable attendance={state.attendance.slice().reverse()} repsById={repsById} />
            </div>
            <div className="panel">
              <div className="panel-header"><h2>Visit Reports</h2><span>{state.visits.length} synced</span></div>
              <table>
                <thead><tr><th>Sales Person</th><th>Doctor</th><th>Check In</th><th>Check Out</th><th>Flag</th><th>Notes</th></tr></thead>
                <tbody>
                  {state.visits.map((visit) => {
                    const repName = repsById.get(String(visit.rep_id || ''))?.name || visit.rep_id || '-';
                    const doctor = state.doctors.find((item) => String(item.id) === String(visit.doctor_id));
                    return <tr key={`${visit.rep_id}-${visit.id}`}><td>{repName}</td><td>{doctor?.name || visit.doctor_id || '-'}</td><td>{formatTime(visit.check_in_time)}</td><td>{formatTime(visit.check_out_time)}</td><td>{visit.flag_status || 'VALID'}</td><td>{visit.notes || '-'}</td></tr>;
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
