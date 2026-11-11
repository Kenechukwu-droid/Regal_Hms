import { useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { useRole } from '../../context/RoleContext';
import { AllergyForm, ConditionForm } from './HistoryForms';

const EDIT_ROLES = ['director', 'surgeon', 'nurse'];

function Section({ title, onAdd, addLabel, children }) {
  return (
    <section className="card">
      <div className="section-head"><h2>{title}</h2>
        {onAdd && <button className="btn small" onClick={onAdd}><Plus size={14} aria-hidden /> {addLabel}</button>}
      </div>
      {children}
    </section>
  );
}
const Empty = ({ children }) => <p className="muted">{children}</p>;

export default function MedicalHistory({ p, handlers }) {
  const { role } = useRole();
  const canEdit = EDIT_ROLES.includes(role);
  const [editing, setEditing] = useState(null); // { type: 'allergy' | 'condition', item: obj | null }
  const close = () => setEditing(null);
  const edit = (type, item = null) => canEdit && setEditing({ type, item });

  const EditBtn = ({ type, item, label }) => canEdit && (
    <button className="icon-btn" onClick={() => edit(type, item)} aria-label={`Edit ${label}`}><Pencil size={15} aria-hidden /></button>
  );

  return (
    <div className="grid hist">
      <Section title="Allergies" onAdd={canEdit && (() => edit('allergy'))} addLabel="Add allergy">
        {p.allergies.length === 0 ? (
          <>
            <Empty>{p.allergiesRecorded === false ? 'Allergies haven’t been recorded for this patient.' : 'No known allergies.'}</Empty>
            {canEdit && p.allergiesRecorded === false && (
              <button className="btn small" style={{ marginTop: 10 }} onClick={handlers.confirmNoAllergies}>Confirm no known allergies</button>
            )}
          </>
        ) : (
          <ul className="list">{p.allergies.map((a) => (
            <li key={a.id}>
              <div><b>{a.substance}</b><div className="muted">{a.reaction || 'Reaction not recorded'}</div></div>
              <div className="row-end"><span className={`badge ${a.severity === 'severe' ? 'bad' : a.severity === 'moderate' ? 'warn' : ''}`}>{a.severity}</span>
                <EditBtn type="allergy" item={a} label={a.substance} /></div>
            </li>))}
          </ul>
        )}
      </Section>

      <Section title="Conditions" onAdd={canEdit && (() => edit('condition'))} addLabel="Add condition">
        {p.conditions.length === 0 ? <Empty>None recorded.</Empty> : (
          <ul className="list">{p.conditions.map((c) => (
            <li key={c.id}>
              <div><b>{c.name}</b><div className="muted">{c.since ? `Since ${c.since}` : 'Year not recorded'}</div></div>
              <div className="row-end"><span className="badge">{c.status}</span><EditBtn type="condition" item={c} label={c.name} /></div>
            </li>))}
          </ul>
        )}
      </Section>

      <Section title="Current medication">
        {p.medications.length === 0 ? <Empty>None recorded.</Empty> : (
          <ul className="list">{p.medications.map((m) => <li key={m.id}><div><b>{m.name}</b><div className="muted">{m.dose}</div></div></li>)}</ul>)}
      </Section>
      <Section title="Previous surgeries">
        {p.pastSurgeries.length === 0 ? <Empty>None recorded.</Empty> : (
          <ul className="list">{p.pastSurgeries.map((s) => <li key={s.id}><div><b>{s.name}</b> <span className="muted">({s.year})</span><div className="muted">{s.note}</div></div></li>)}</ul>)}
      </Section>
      <Section title="Family history"><p style={{ margin: 0 }}>{p.familyHistory}</p></Section>
      <Section title="Lifestyle">
        <dl className="facts"><dt>Smoking</dt><dd>{p.lifestyle.smoking}</dd><dt>Alcohol</dt><dd>{p.lifestyle.alcohol}</dd></dl>
      </Section>

      {editing?.type === 'allergy' && (
        <AllergyForm item={editing.item} existing={p.allergies} onSave={handlers.saveAllergy} onDelete={handlers.deleteAllergy} onClose={close} />)}
      {editing?.type === 'condition' && (
        <ConditionForm item={editing.item} existing={p.conditions} onSave={handlers.saveCondition} onDelete={handlers.deleteCondition} onClose={close} />)}
    </div>
  );
}
