import { useState } from 'react';
import FormModal from '../common/FormModal';

export const SEVERITIES = ['mild', 'moderate', 'severe'];
export const CONDITION_STATUSES = ['Active', 'Controlled', 'Resolved'];

export function AllergyForm({ item, existing, onSave, onDelete, onClose }) {
  const [f, setF] = useState(item || { substance: '', reaction: '', severity: 'moderate' });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const name = f.substance.trim();
  const duplicate = existing.some((a) => a.id !== f.id && a.substance.toLowerCase() === name.toLowerCase());

  return (
    <FormModal title={item ? 'Edit allergy' : 'Add allergy'} submitLabel={item ? 'Save changes' : 'Add allergy'}
      canSubmit={name && !duplicate} onSubmit={() => onSave({ ...f, substance: name, reaction: f.reaction.trim() })}
      onDelete={item ? () => onDelete(item.id) : undefined} deleteLabel="Remove allergy" onClose={onClose}>
      <div className="field"><label htmlFor="al-s">Allergen</label>
        <input id="al-s" value={f.substance} onChange={set('substance')} placeholder="Penicillin, latex, iodine…" autoFocus />
        {duplicate && <small className="form-error">This allergen is already on the record. Edit that entry instead.</small>}
      </div>
      <div className="field"><label htmlFor="al-r">Reaction</label>
        <input id="al-r" value={f.reaction} onChange={set('reaction')} placeholder="Rash, swelling, anaphylaxis…" /></div>
      <div className="field"><label htmlFor="al-v">Severity</label>
        <select id="al-v" value={f.severity} onChange={set('severity')}>{SEVERITIES.map((s) => <option key={s}>{s}</option>)}</select></div>
    </FormModal>
  );
}

export function ConditionForm({ item, existing, onSave, onDelete, onClose }) {
  const [f, setF] = useState(item || { name: '', since: '', status: 'Active' });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const name = f.name.trim();
  const duplicate = existing.some((c) => c.id !== f.id && c.name.toLowerCase() === name.toLowerCase());
  const yearOk = f.since === '' || /^(19|20)\d{2}$/.test(f.since);

  return (
    <FormModal title={item ? 'Edit condition' : 'Add condition'} submitLabel={item ? 'Save changes' : 'Add condition'}
      canSubmit={name && !duplicate && yearOk} onSubmit={() => onSave({ ...f, name })}
      onDelete={item ? () => onDelete(item.id) : undefined} deleteLabel="Remove condition" onClose={onClose}>
      <div className="field"><label htmlFor="co-n">Condition</label>
        <input id="co-n" value={f.name} onChange={set('name')} placeholder="Hypertension, asthma…" autoFocus />
        {duplicate && <small className="form-error">This condition is already on the record. Edit that entry instead.</small>}
      </div>
      <div className="field"><label htmlFor="co-y">Year diagnosed (optional)</label>
        <input id="co-y" value={f.since} onChange={set('since')} inputMode="numeric" maxLength={4} placeholder="2019" />
        {!yearOk && <small className="form-error">Enter a four-digit year, for example 2019.</small>}
      </div>
      <div className="field"><label htmlFor="co-s">Status</label>
        <select id="co-s" value={f.status} onChange={set('status')}>{CONDITION_STATUSES.map((s) => <option key={s}>{s}</option>)}</select></div>
    </FormModal>
  );
}
