import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';

export default function NoAccess({ moduleName, roleName }) {
  return (
    <div className="card noaccess">
      <Lock size={28} aria-hidden />
      <h1>No access</h1>
      <p>{roleName} accounts can’t open {moduleName || 'this page'}. If you need it for your work, ask the Medical Director to change your role.</p>
      <Link className="btn primary" to="/">Back to the dashboard</Link>
    </div>
  );
}
