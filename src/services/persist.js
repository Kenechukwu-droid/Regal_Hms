// Prototype only. While the screens run on demo data, everything people create (staff, invitations, accounts,
// tasks, prescriptions and so on) is kept in the browser's localStorage, so it survives a refresh and is shared
// between tabs of the same browser. Without this, an invitation link opened in a new tab finds nothing and says it has expired.
// The real backend keeps all of this in its database, and this file is not used when VITE_USE_MOCK=false.
import * as mock from './mockData';

const KEY = 'regal.demo.db.v2';
const COLLECTIONS = ['patients', 'profiles', 'appointments', 'consultations', 'plans', 'surgeries', 'aftercare', 'quotations', 'invoices',
  'labRequests', 'medications', 'stockMovements', 'prescriptions', 'staff', 'accounts', 'departmentReports', 'threads', 'tasks'];
const ls = () => { try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch { return null; } };

let stamp = null;   // the version of the saved data that this tab last read or wrote

function apply(snapshot) {
  COLLECTIONS.forEach((name) => {
    const target = mock[name]; const saved = snapshot.data[name]; if (!target || saved === undefined) return;
    if (Array.isArray(target)) target.splice(0, target.length, ...saved);
    else { Object.keys(target).forEach((k) => delete target[k]); Object.assign(target, saved); }
  });
  mock.setCounters(snapshot.counters);
}

export function saveDemo() {
  const store = ls(); if (!store) return;
  try {
    const data = {}; COLLECTIONS.forEach((n) => { data[n] = mock[n]; });
    stamp = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    store.setItem(KEY, JSON.stringify({ stamp, data, counters: mock.getCounters() }));
  } catch { /* storage full or blocked: the demo still works, it just won't survive a refresh */ }
}

// Picks up changes another tab has saved. Cheap: it only parses the data when the version has changed.
export function syncDemo() {
  const store = ls(); if (!store) return;
  try {
    const raw = store.getItem(KEY); if (!raw) return;
    const snap = JSON.parse(raw); if (snap.stamp === stamp) return;
    apply(snap); stamp = snap.stamp;
  } catch { /* unreadable saved data: carry on with what is in memory */ }
}

export function startDemo() { const store = ls(); if (store?.getItem(KEY)) syncDemo(); else saveDemo(); }
export function resetDemo() { try { ls()?.removeItem(KEY); sessionStorage.clear(); } catch { /* nothing to clear */ } window.location.assign('/login'); }
