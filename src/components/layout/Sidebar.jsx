import { NavLink } from 'react-router-dom';
import { MODULES } from '../../routes/modules';
import { useRole } from '../../context/RoleContext';

export default function Sidebar({ open, onNavigate }) {
  const { role } = useRole();
  const visible = MODULES.filter((m) => m.roles.includes(role));
  const groups = [...new Set(visible.map((m) => m.group))];

  return (
    <aside className={`sidebar ${open ? 'open' : ''}`} aria-label="Main navigation">
      <div className="brand"><b>Regal</b><span>Plastic Surgery Centre</span></div>
      {groups.map((g) => (
        <div key={g}>
          <div className="nav-group">{g}</div>
          {visible.filter((m) => m.group === g).map(({ id, label, path, icon: Icon, priority }) => (
            <NavLink key={id} to={path} end={path === '/'} onClick={onNavigate}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Icon size={18} aria-hidden /> {label}
              {priority === 'P1' && <span className="tag">Next</span>}
            </NavLink>
          ))}
        </div>
      ))}
    </aside>
  );
}
