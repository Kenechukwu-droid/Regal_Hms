import { useState } from 'react';
import FormModal from '../common/FormModal';
import { allergyConflict, remaining, usableStock } from '../../utils/pharmacy';

export default function DispenseForm({ rx, meds, allergies, onSave, onClose }) {
  const open = rx.lines.filter((l) => remaining(l) > 0);
  const medOf = (id) => meds.find((m) => m.id === id);
  const [qty, setQty] = useState(() => Object.fromEntries(open.map((l) => [l.itemId, String(Math.max(0, Math.min(remaining(l), usableStock(medOf(l.itemId)))))])));
  const [witness, setWitness] = useState('');

  const rows = open.map((l) => {
    const m = medOf(l.itemId); const n = Number(qty[l.itemId] || 0);
    const clash = allergyConflict(m, allergies);
    let issue = '';
    if (!Number.isInteger(n) || n < 0) issue = 'Whole number, please.';
    else if (n > remaining(l)) issue = `Only ${remaining(l)} left on the prescription.`;
    else if (n > usableStock(m)) issue = `Only ${usableStock(m)} in date in stock.`;
    else if (n > 0 && clash && !rx.allergyOverride) issue = `Blocked: ${clash} allergy, no override from the prescriber.`;
    return { l, m, n, issue };
  });
  const picked = rows.filter((r) => r.n > 0);
  const needsWitness = picked.some((r) => r.m.controlled);
  const ok = picked.length > 0 && rows.every((r) => !r.issue) && (!needsWitness || witness.trim());

  return (
    <FormModal wide title={`Dispense ${rx.id}`} submitLabel="Dispense" canSubmit={ok}
      onSubmit={() => onSave({ lines: rows.map((r) => ({ itemId: r.l.itemId, qty: r.n })), witness })} onClose={onClose}>
      <p style={{ marginTop: 0 }}>For <b>{rx.patient}</b>. Stock is taken from the batch that expires first.</p>
      <div className="table-wrap"><table>
        <thead><tr><th>Medicine</th><th>Left to dispense</th><th>In stock</th><th>Dispense now</th></tr></thead>
        <tbody>{rows.map(({ l, m, issue }) => (
          <tr key={l.itemId}>
            <td>{l.name}{m.controlled && <span className="badge bad" style={{ marginLeft: 6 }}>Controlled</span>}
              {issue && <div className="form-error small-text">{issue}</div>}</td>
            <td>{remaining(l)}</td><td>{usableStock(m)}</td>
            <td><input aria-label={`Quantity of ${l.name}`} className="qty" inputMode="numeric" value={qty[l.itemId]} onChange={(e) => setQty({ ...qty, [l.itemId]: e.target.value })} /></td>
          </tr>))}
        </tbody>
      </table></div>
      {needsWitness && <div className="field" style={{ marginTop: 12 }}><label htmlFor="dw">Witness (second member of staff, required for controlled medicines)</label>
        <input id="dw" value={witness} onChange={(e) => setWitness(e.target.value)} /></div>}
    </FormModal>
  );
}
