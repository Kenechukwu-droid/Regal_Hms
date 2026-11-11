import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function AppLayout() {
  const [open, setOpen] = useState(false);
  return (
    <div className="shell">
      <Sidebar open={open} onNavigate={() => setOpen(false)} />
      <div className="main">
        <Topbar onMenu={() => setOpen((o) => !o)} />
        <main className="content"><Outlet /></main>
      </div>
    </div>
  );
}
