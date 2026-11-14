import { Check, Minus } from 'lucide-react';
import { MODULES, ROLES } from '../../routes/modules';
import { ACTIONS, PERMISSIONS, ROLE_KEYS } from '../../utils/permissions';
import { canMessage } from '../../utils/messaging';

const LABEL = { viewRevenue: 'See company revenue and the money overview in Billing', viewStaff: 'See the staff list', manageStaff: 'Add staff, import from the portal, invitations and sign-in resets', reviewReports: 'Read, acknowledge or send back department reports' };

function Grid({ title, note, rows }) {
  return (
    <section className="card" style={{ marginBottom: 16 }}>
      <h2>{title}</h2>{note && <p className="muted" style={{ marginTop: 0 }}>{note}</p>}
      <div className="table-wrap"><table className="matrix">
        <thead><tr><th>What</th>{Object.entries(ROLES).map(([k, v]) => <th key={k} className="c">{v}</th>)}</tr></thead>
        <tbody>{rows.map(([label, roles]) => (
          <tr key={label}><td>{label}</td>{Object.keys(ROLES).map((k) => (
            <td key={k} className="c">{roles.includes(k) ? <Check size={16} className="yes" aria-label="Allowed" /> : <Minus size={16} className="no" aria-label="Not allowed" />}</td>))}</tr>))}
        </tbody>
      </table></div>
    </section>
  );
}

// Read-only on purpose: these rules come from the code, so they can't drift from what the app really does.
export default function PermissionsMatrix() {
  return (
    <>
      <Grid title="Which pages each role can open" note="To change a person’s access, change their role in the staff directory." rows={MODULES.map((m) => [m.id === 'staff' ? 'Staff & Reports (department heads: only their own report)' : m.label, m.roles])} />
      <Grid title="Sensitive information" rows={Object.entries(PERMISSIONS).map(([k, roles]) => [LABEL[k], roles])} />
      <Grid title="Who can message whom" note="Departments can be messaged too, as long as the sender may message everyone in them." rows={Object.entries(ROLES).map(([k, v]) => [`${v} can message`, ROLE_KEYS.filter((r) => canMessage(k, r))])} />
      <Grid title="Actions inside the pages" note="Each page applies these itself. The backend must enforce them too." rows={ACTIONS} />
    </>
  );
}
