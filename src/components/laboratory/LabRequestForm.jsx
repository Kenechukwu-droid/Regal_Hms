import { useState } from 'react';
import FormModal from '../common/FormModal';
import { TEST_NAMES, TESTS } from '../../utils/laboratory';

export default function LabRequestForm({ patients, initialPatientId = '', requestedBy, onSave, onClose }) {
  const [f, setF] = useState({ patientId: initialPatientId, tests: [], priority: 'Routine', clinicalNote: '' });
  const toggle = (t) => setF((p) => ({ ...p, tests: p.tests.includes(t) ? p.tests.filter((x) => x !== t) : [...p.tests, t] }));
  return (
    <FormModal title="New lab request" submitLabel={f.tests.length > 1 ? `Request ${f.tests.length} tests` : 'Request test'} canSubmit={f.patientId && f.tests.length > 0}
      onSubmit={() => onSave({ ...f, requestedBy })} onClose={onClose}>
      <div className="field"><label htmlFor="lr-p">Patient</label>
        <select id="lr-p" value={f.patientId} onChange={(e) => setF({ ...f, patientId: e.target.value })} autoFocus>
          <option value="">Select a patient…</option>{patients.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.id})</option>)}</select></div>
      <div className="field"><label>Tests</label>
        <div className="checks">{TEST_NAMES.map((t) => (
          <label key={t} className="check"><input type="checkbox" checked={f.tests.includes(t)} onChange={() => toggle(t)} /> {t}<span className="muted small-text"> · {TESTS[t].sample}</span></label>))}</div></div>
      <div className="row2">
        <div className="field"><label htmlFor="lr-r">Priority</label>
          <select id="lr-r" value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value })}><option>Routine</option><option>Urgent</option></select></div>
      </div>
      <div className="field"><label htmlFor="lr-n">Clinical note (optional)</label>
        <textarea id="lr-n" rows={2} value={f.clinicalNote} onChange={(e) => setF({ ...f, clinicalNote: e.target.value })} placeholder="Why it is needed, for example: before rhinoplasty" /></div>
    </FormModal>
  );
}
