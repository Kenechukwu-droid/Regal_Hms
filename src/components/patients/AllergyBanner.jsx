import { TriangleAlert, ShieldCheck, CircleHelp } from 'lucide-react';

// Always visible at the top of a profile: allergies are a safety item.
export default function AllergyBanner({ allergies, recorded = true }) {
  if (recorded === false) {
    return <div className="allergy unknown"><CircleHelp size={18} aria-hidden /> Allergies not yet recorded. Confirm with the patient before any medication or procedure.</div>;
  }
  if (allergies.length === 0) {
    return <div className="allergy none"><ShieldCheck size={18} aria-hidden /> No known allergies</div>;
  }
  const severe = allergies.some((a) => a.severity === 'severe');
  return (
    <div className={`allergy ${severe ? 'severe' : 'moderate'}`} role="alert">
      <TriangleAlert size={18} aria-hidden />
      <strong>Allergies:</strong>
      {allergies.map((a) => <span key={a.id} className="chip">{a.substance} <small>({a.severity})</small></span>)}
    </div>
  );
}
