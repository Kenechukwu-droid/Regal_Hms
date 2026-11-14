import { Link } from 'react-router-dom';
import { LogOut, Menu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../routes/modules';

export default function Topbar({ onMenu }) {
  const { user, logout } = useAuth();
  const initials = user.name.replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.|Nurse)\s+/i, '').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <header className="topbar">
      <button className="menu-btn" onClick={onMenu} aria-label="Open menu"><Menu /></button>
      <div className="spacer" />
      <Link to="/account" className="user-chip" aria-label="Your account"><span className="avatar sm" aria-hidden>{initials}</span>
        <span className="who"><b>{user.name}</b><span>{ROLES[user.role]}</span></span></Link>
      <button className="btn small" onClick={() => logout()}><LogOut size={14} aria-hidden /> Sign out</button>
    </header>
  );
}
