import { DAY_START, DAY_END } from './constants';
import { timeToMin, minToTime } from '../../utils/dates';
import { endMin } from '../../utils/scheduling';

const PX = 40 / 30; // pixels per minute: 40px per 30-minute row
const HOURS = [];
for (let m = DAY_START; m < DAY_END; m += 60) HOURS.push(m);

// Place overlapping appointments side by side instead of on top of each other.
function layout(events) {
  const sorted = [...events].sort((a, b) => timeToMin(a.start) - timeToMin(b.start) || b.duration - a.duration);
  const out = []; let cluster = []; let clusterEnd = -1;
  const flush = () => { const n = Math.max(1, ...cluster.map((c) => c.lane + 1)); cluster.forEach((c) => out.push({ ...c, lanes: n })); cluster = []; };
  for (const ev of sorted) {
    const s = timeToMin(ev.start);
    if (cluster.length && s >= clusterEnd) { flush(); clusterEnd = -1; }
    const used = cluster.filter((c) => c.end > s).map((c) => c.lane);
    let lane = 0; while (used.includes(lane)) lane++;
    cluster.push({ ev, lane, end: endMin(ev) });
    clusterEnd = Math.max(clusterEnd, endMin(ev));
  }
  if (cluster.length) flush();
  return out;
}

export default function CalendarGrid({ columns, appts, onSlotClick, onApptClick, onHeaderClick }) {
  const height = (DAY_END - DAY_START) * PX;

  const clickBody = (e, col) => {
    if (e.target !== e.currentTarget) return; // ignore clicks on appointment blocks
    const y = e.clientY - e.currentTarget.getBoundingClientRect().top;
    const min = DAY_START + Math.floor(y / PX / 30) * 30;
    onSlotClick({ date: col.date, time: minToTime(min), clinicianId: col.clinicianId, columnKey: col.key });
  };

  return (
    <div className="cal">
      <div className="cal-inner" style={{ gridTemplateColumns: `56px repeat(${columns.length}, minmax(130px, 1fr))` }}>
        <div className="cal-corner" />
        {columns.map((c) => (
          <div key={c.key} className={`cal-head ${c.isToday ? 'today' : ''}`}>
            {onHeaderClick
              ? <button onClick={() => onHeaderClick(c)}><b>{c.label}</b><span>{c.sub}</span></button>
              : <div><b>{c.label}</b><span>{c.sub}</span></div>}
          </div>
        ))}

        <div className="cal-times" style={{ height }}>
          {HOURS.map((m) => <span key={m} style={{ top: (m - DAY_START) * PX }}>{minToTime(m)}</span>)}
        </div>

        {columns.map((col) => {
          const mine = appts.filter((a) => (col.match ? col.match(a) : a.date === col.date && (!col.clinicianId || a.clinicianId === col.clinicianId)));
          return (
            <div key={col.key} className={`cal-body ${col.isToday ? 'today' : ''}`} style={{ height }} onClick={(e) => clickBody(e, col)}>
              {layout(mine).map(({ ev, lane, lanes }) => {
                const top = (timeToMin(ev.start) - DAY_START) * PX;
                const h = Math.max(ev.duration * PX - 2, 18);
                const cls = ev.status.toLowerCase().replace(' ', '-');
                return (
                  <button key={ev.id} className={`appt ${cls}`} onClick={() => onApptClick(ev)}
                    style={{ top, height: h, left: `calc(${(lane / lanes) * 100}% + 2px)`, width: `calc(${100 / lanes}% - 4px)` }}
                    aria-label={`${ev.start} ${ev.patient}, ${ev.type}, ${ev.status}`}>
                    <b>{ev.start} {ev.patient}</b>
                    {h > 34 && <span>{ev.type}</span>}
                    {h > 52 && ev.status !== 'Confirmed' && <span className="st">{ev.status}</span>}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
