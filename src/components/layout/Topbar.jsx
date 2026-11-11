import { Menu } from 'lucide-react';
import { useRole } from '../../context/RoleContext';
import { ROLES } from '../../routes/modules';

export default function Topbar({ onMenu }) {
  const { role, setRole } = useRole();
  return (
    <header className="topbar">
      <button className="menu-btn" onClick={onMenu} aria-label="Open menu"><Menu /></button>
      <div className="spacer" />
      <label className="role-select">Viewing as
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </label>
    </header>
  );
}
