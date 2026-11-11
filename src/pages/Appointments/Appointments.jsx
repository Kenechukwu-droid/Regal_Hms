import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarPlus, ChevronLeft, ChevronRight } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import CalendarGrid from '../../components/appointments/CalendarGrid';
import AppointmentForm from '../../components/appointments/AppointmentForm';
import { CLINICIANS } from '../../components/appointments/constants';
import { api } from '../../services/api';
import { blocks } from '../../utils/scheduling';
import { addDays, fmtDay, isSunday, startOfWeek, todayISO } from '../../utils/dates';

export default function Appointments() {
  const [params, setParams] = useSearchParams();
  const [anchor, setAnchor] = useState(todayISO());
  const [view, setView] = useState('week');          // 'week' | 'day'
  const [clinician, setClinician] = useState('all'); // week view only
  const [showCancelled, setShowCancelled] = useState(false);
  const [appts, setAppts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState([]);
  const [form, setForm] = useState(null);            // { item?, initial? }

  const today = todayISO();
  const weekStart = startOfWeek(anchor);
  const from = view === 'week' ? weekStart : anchor;
  const to = view === 'week' ? addDays(weekStart, 5) : anchor;

  const load = useCallback(() => {
    let live = true;
    setLoading(true);
    api.getAppointments({ from, to }).then((d) => live && setAppts(d)).finally(() => live && setLoading(false));
    return () => { live = false; };
  }, [from, to]);
  useEffect(load, [load]);
  useEffect(() => { api.getPatients().then(setPatients); }, []);

  // Arriving from a patient profile: /appointments?book=<patientId>
  useEffect(() => {
    const id = params.get('book');
    if (!id || patients.length === 0) return;
    const p = patients.find((x) => x.id === id);
    if (p) setForm({ initial: { patientId: p.id, patient: p.name } });
    setParams({}, { replace: true });
  }, [params, patients, setParams]);

  const step = (dir) => {
    if (view === 'week') return setAnchor(addDays(anchor, 7 * dir));
    let next = addDays(anchor, dir);
    if (isSunday(next)) next = addDays(next, dir);
    setAnchor(next);
  };

  const columns = useMemo(() => view === 'week'
    ? Array.from({ length: 6 }, (_, i) => {
        const date = addDays(weekStart, i);
        return { key: date, date, label: fmtDay(date, { weekday: 'short' }), sub: fmtDay(date, { day: 'numeric', month: 'short' }), isToday: date === today };
      })
    : CLINICIANS.map((c) => ({ key: c.id, date: anchor, clinicianId: c.id, label: c.name, sub: c.role, isToday: anchor === today })),
  [view, weekStart, anchor, today]);

  const visible = appts.filter((a) => (showCancelled || blocks(a)) && (view === 'day' || clinician === 'all' || a.clinicianId === clinician));
  const label = view === 'week'
    ? `${fmtDay(weekStart, { day: 'numeric', month: 'short' })} to ${fmtDay(addDays(weekStart, 5), { day: 'numeric', month: 'short', year: 'numeric' })}`
    : fmtDay(anchor, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const openSlot = ({ date, time, clinicianId }) => setForm({
    initial: { date, start: time, ...(clinicianId ? { clinicianId } : view === 'week' && clinician !== 'all' ? { clinicianId: clinician } : {}) },
  });
  const save = async (a) => { await api.saveAppointment(a); load(); };

  return (
    <>
      <PageHeader title="Appointments" subtitle="Click an empty slot to book, or an appointment to change it."
        action={<button className="btn primary" onClick={() => setForm({ initial: view === 'day' ? { date: anchor } : {} })}><CalendarPlus size={16} aria-hidden /> Book appointment</button>} />

      <div className="cal-toolbar">
        <div className="nav">
          <button className="btn" onClick={() => step(-1)} aria-label={view === 'week' ? 'Previous week' : 'Previous day'}><ChevronLeft size={16} /></button>
          <button className="btn" onClick={() => setAnchor(today)}>Today</button>
          <button className="btn" onClick={() => step(1)} aria-label={view === 'week' ? 'Next week' : 'Next day'}><ChevronRight size={16} /></button>
          <strong className="range">{label}</strong>
        </div>
        <div className="controls">
          <div className="seg" role="group" aria-label="Calendar view">
            <button className={view === 'week' ? 'on' : ''} onClick={() => setView('week')}>Week</button>
            <button className={view === 'day' ? 'on' : ''} onClick={() => setView('day')}>Day</button>
          </div>
          {view === 'week' && (
            <select value={clinician} onChange={(e) => setClinician(e.target.value)} aria-label="Filter by clinician" className="role-filter">
              <option value="all">All clinicians</option>
              {CLINICIANS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          <label className="check"><input type="checkbox" checked={showCancelled} onChange={(e) => setShowCancelled(e.target.checked)} /> Show cancelled</label>
        </div>
      </div>

      {view === 'day' && isSunday(anchor)
        ? <div className="card empty">The centre is closed on Sundays. Use the arrows to pick another day.</div>
        : (
          <div className="card cal-card" aria-busy={loading}>
            <CalendarGrid columns={columns} appts={visible} onSlotClick={openSlot} onApptClick={(item) => setForm({ item })}
              onHeaderClick={view === 'week' ? (c) => { setAnchor(c.date); setView('day'); } : undefined} />
          </div>
        )}

      {form && <AppointmentForm key={form.item?.id ?? 'new'} item={form.item} initial={form.initial} patients={patients} onSave={save} onClose={() => setForm(null)} />}
    </>
  );
}
