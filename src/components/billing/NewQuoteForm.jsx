import { useState } from 'react';
import FormModal from '../common/FormModal';
import { clinicianName } from '../appointments/constants';

export default function NewQuoteForm({ plans, patients, onSave, onClose }) {
  const [planId, setPlanId] = useState('');
  const [patientId, setPatientId] = useState('');
  const [title, setTitle] = useState('Consultation');
  return (
    <FormModal title="New quotation" submitLabel="Create draft" canSubmit={!!planId || !!patientId} onSubmit={() => onSave(planId ? { planId } : { patientId, title })} onClose={onClose}>
      <div className="field"><label htmlFor="nq-plan">For a surgical plan</label>
        <select id="nq-plan" value={planId} onChange={(e) => { setPlanId(e.target.value); setPatientId(''); }} autoFocus>
          <option value="">{plans.length ? 'Choose a plan…' : 'No plans are waiting for a quotation'}</option>
          {plans.map((p) => <option key={p.id} value={p.id}>{p.patient}: {p.procedure} ({clinicianName(p.surgeonId)})</option>)}
        </select></div>
      <p className="muted" style={{ margin: '0 0 12px' }}>Or, for anything else (a consultation fee, for example):</p>
      <div className="row2">
        <div className="field"><label htmlFor="nq-pat">Patient</label>
          <select id="nq-pat" value={patientId} onChange={(e) => { setPatientId(e.target.value); setPlanId(''); }}>
            <option value="">Choose a patient…</option>{patients.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.id})</option>)}</select></div>
        <div className="field"><label htmlFor="nq-t">Quotation for</label><input id="nq-t" value={title} onChange={(e) => setTitle(e.target.value)} disabled={!patientId} /></div>
      </div>
    </FormModal>
  );
}
