import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CalendarPlus, ChevronLeft, ChevronRight } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import CalendarGrid from '../../components/appointments/CalendarGrid';
import ScheduleForm from '../../components/surgery/ScheduleForm';
import { THEATRES, theatreName } from '../../components/surgery/constants';
import { clinicianName } from '../../components/appointments/constants';
import { useRole } from '../../context/RoleContext';
import { api } from '../../services/api';
import { getBlockers } from '../../utils/planning';
import { isActive } from '../../utils/theatre';
import { addDays, fmtDay, isSunday, todayISO } from '../../utils/dates';

export default function Surgery() {
  const { role } = useRole();
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const [date, setDate] = useState(todayISO());
  const [list, setList] = useState([]);
  const [awaiting, setAwaiting] = useState([]);
  const [plans, setPlans] = useState([]);
  const [showAll, setShowAll] = useState(false);
  const [form, setForm] = useState(null);
  const today = todayISO();
  const canSchedule = ['director', 'surgeon', 'nurse'].includes(role);

  const load = useCallback(() => {
    api.getSurgeries({ from: date, to: date }).then(setList);
    api.getAwaitingScheduling().then(setAwaiting);
    api.getPlans().then(setPlans);
  }, [date]);
  useEffect(load, [load]);

  // Arriving from a plan: /surgery?plan=<planId>
  useEffect(() => {
    const id = params.get('plan');
    if (!id || awaiting.length === 0) return;
    if (awaiting.some((p) => p.id === id)) setForm({ initial: { planId: id } });
    setParams({}, { replace: true });
  }, [params, awaiting, setParams]);

  const step = (dir) => { let n = addDays(date, dir); if (isSunday(n)) n = addDays(n, dir); setDate(n); };
  const planById = useMemo(() => new Map(plans.map((p) => [p.id, p])), [plans]);
  const visible = list.filter((s) => showAll || isActive(s)).sort((a, b) => a.start.localeCompare(b.start));
  const events = visible.map((s) => ({ ...s, type: s.procedure }));
  const columns = THEATRES.map((t) => ({
    key: t.id, date, label: t.name, sub: `${visible.filter((s) => s.theatreId === t.id).length} cases`, isToday: date === today,
    match: (a) => a.theatreId === t.id && a.date === date,
  }));

  const create = async (s) => { await api.createSurgery(s); load(); };

  return (
    <>
      <PageHeader title="Surgery & theatre" subtitle="Theatre allocation and the day’s list. Click a case to run it."
        action={canSchedule && <button className="btn primary" onClick={() => setForm({ initial: { date } })}><CalendarPlus size={16} aria-hidden /> Schedule surgery</button>} />

      <section className="card" style={{ marginBottom: 16 }}>
        <h2>Ready to schedule</h2>
        {awaiting.length === 0 ? <p className="empty">No plans are waiting. A plan appears here once it’s marked Ready in Surgical planning.</p> : (
          <div className="table-wrap"><table>
            <thead><tr><th>Patient</th><th>Procedure</th><th>Surgeon</th><th>Target date</th><th /></tr></thead>
            <tbody>{awaiting.map((p) => (
              <tr key={p.id}><td>{p.patient}</td><td>{p.procedure}</td><td>{clinicianName(p.surgeonId)}</td><td>{p.targetDate}</td>
                <td>{canSchedule && <button className="btn small primary" onClick={() => setForm({ initial: { planId: p.id } })}>Schedule</button>}</td></tr>))}
            </tbody>
          </table></div>
        )}
      </section>

      <div className="cal-toolbar">
        <div className="nav">
          <button className="btn" onClick={() => step(-1)} aria-label="Previous day"><ChevronLeft size={16} /></button>
          <button className="btn" onClick={() => setDate(today)}>Today</button>
          <button className="btn" onClick={() => step(1)} aria-label="Next day"><ChevronRight size={16} /></button>
          <strong className="range">{fmtDay(date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</strong>
        </div>
        <label className="check"><input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} /> Show postponed and cancelled</label>
      </div>

      {isSunday(date) ? <div className="card empty">The centre is closed on Sundays. Use the arrows to pick another day.</div> : (
        <>
          <div className="card cal-card">
            <CalendarGrid columns={columns} appts={events} onApptClick={(s) => nav(`/surgery/${s.id}`)}
              onSlotClick={({ date: d, time, columnKey }) => canSchedule && setForm({ initial: { date: d, start: time, theatreId: columnKey } })} />
          </div>
          <section className="card" style={{ marginTop: 16 }}>
            <h2>Day list</h2>
            {visible.length === 0 ? <p className="empty">No cases on this day. Click a theatre slot to schedule one.</p> : (
              <div className="table-wrap"><table>
                <thead><tr><th>Time</th><th>Patient</th><th>Procedure</th><th>Theatre</th><th>Surgeon</th><th>Status</th><th /></tr></thead>
                <tbody>{visible.map((s) => {
                  const pl = planById.get(s.planId);
                  const incomplete = pl && ['Scheduled', 'Postponed'].includes(s.status) && getBlockers(pl).length > 0;
                  return (
                    <tr key={s.id}>
                      <td>{s.start}</td><td><Link className="plink" to={`/surgery/${s.id}`}>{s.patient}</Link></td><td>{s.procedure}</td>
                      <td>{theatreName(s.theatreId)}</td><td>{clinicianName(s.surgeonId)}</td>
                      <td><StatusBadge value={s.status} /></td>
                      <td>{incomplete && <span className="badge bad" title={getBlockers(pl)[0]}>Plan incomplete</span>}</td>
                    </tr>);
                })}</tbody>
              </table></div>
            )}
          </section>
        </>
      )}

      {form && <ScheduleForm key="new" initial={form.initial} plans={awaiting} onSave={create} onClose={() => setForm(null)} />}
    </>
  );
}
