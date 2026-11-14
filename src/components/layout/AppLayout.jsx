import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import NoAccess from '../common/NoAccess';
import { useAuth } from '../../context/AuthContext';
import { ROLES, canOpen, moduleForPath } from '../../routes/modules';

export default function AppLayout() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const { pathname } = useLocation();
  const mod = moduleForPath(pathname);
  const allowed = !mod || canOpen(mod, user);   // enforce the sidebar's rules for typed or bookmarked addresses too
  return (
    <div className="shell">
      <Sidebar open={open} onNavigate={() => setOpen(false)} />
      <div className="main">
        <Topbar onMenu={() => setOpen((o) => !o)} />
        <main className="content">{allowed ? <Outlet /> : <NoAccess moduleName={mod.label} roleName={ROLES[user.role]} />}</main>
      </div>
    </div>
  );
}
