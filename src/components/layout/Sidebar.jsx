import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { MODULES, canOpen } from '../../routes/modules';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

export default function Sidebar({ open, onNavigate }) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [badges, setBadges] = useState({});
  const visible = MODULES.filter((m) => canOpen(m, user));
  const groups = [...new Set(visible.map((m) => m.group))];

  // Checks for new messages now, whenever you move to another page, and every 30 seconds
  useEffect(() => {
    let live = true;
    const tick = () => api.getBadges().then((b) => live && setBadges(b)).catch(() => {});
    tick(); const t = setInterval(tick, 30000);
    return () => { live = false; clearInterval(t); };
  }, [pathname]);

  return (
    <aside className={`sidebar ${open ? 'open' : ''}`} aria-label="Main navigation">
      <div className="brand"><b>Regal</b><span>Plastic Surgery Centre</span></div>
      {groups.map((g) => (
        <div key={g}>
          <div className="nav-group">{g}</div>
          {visible.filter((m) => m.group === g).map(({ id, label, path, icon: Icon, soon }) => (
            <NavLink key={id} to={path} end={path === '/'} onClick={onNavigate}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Icon size={18} aria-hidden /> {label}
              {soon && <span className="tag">Soon</span>}
              {badges[id] > 0 && <span className="count" aria-label={`${badges[id]} waiting`}>{badges[id]}</span>}
            </NavLink>
          ))}
        </div>
      ))}
    </aside>
  );
}
