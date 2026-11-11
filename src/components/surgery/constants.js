export const THEATRES = [{ id: 't1', name: 'Theatre 1' }, { id: 't2', name: 'Theatre 2' }];
export const theatreName = (id) => THEATRES.find((t) => t.id === id)?.name ?? id;
export const TURNOVER = 30; // minutes of cleaning between cases in the same theatre

// Wording is a placeholder: replace with the centre's own surgical safety protocol.
export const SAFETY_STEPS = [
  { key: 'signIn', label: 'Sign in', when: 'Before anaesthesia', text: 'Patient identity, procedure and site confirmed. Consent checked. Allergies reviewed.' },
  { key: 'timeOut', label: 'Time out', when: 'Before incision', text: 'Team introduced. Patient, site and procedure stated aloud. Antibiotics given. Imaging displayed.' },
  { key: 'signOut', label: 'Sign out', when: 'Before leaving theatre', text: 'Procedure recorded. Instrument, swab and needle counts correct. Specimens labelled. Recovery concerns shared.' },
];
export const fmtTime = (iso) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
