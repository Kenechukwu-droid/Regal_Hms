import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import StatusBadge from '../../components/common/StatusBadge';
import FormModal from '../../components/common/FormModal';
import ResultsTable from '../../components/laboratory/ResultsTable';
import { fmtDateTime } from '../../components/aftercare/constants';
import { useAuth } from '../../context/AuthContext';
import { TESTS, flaggedResults, isProcedure, labActions, missingFields } from '../../utils/laboratory';
import { api } from '../../services/api';

export default function LabRequest() {
  const { id } = useParams();
  const { user } = useAuth();
  const [r, setR] = useState(undefined);           // undefined = loading, null = not found
  const [results, setResults] = useState({});
  const [sampleNote, setSampleNote] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState('');

  const apply = (x) => { setR(x); setResults(x.results); setSampleNote(x.sampleNote); setReviewNote(x.reviewNote); };
  useEffect(() => { setR(undefined); api.getLabRequest(id).then((x) => (x ? apply(x) : setR(null))).catch(() => setR(null)); }, [id]);

  if (r === undefined) return <p className="empty">Loading request…</p>;
  if (r === null) return <p className="empty">Request not found. <Link to="/laboratory">Back to laboratory</Link></p>;

  const proc = isProcedure(r.test);
  const can = labActions(r, user);          // take, release, work, review, cancel
  const canEnter = can.work;                // only the nurse or surgeon who took the request
  const canReview = can.review;
  const draft = { ...r, results };
  const flags = flaggedResults(draft);
  const missing = missingFields(draft);

  const act = async (patch) => {
    setBusy(true); setErr('');
    try { apply(await api.saveLabRequest({ ...r, results, sampleNote, reviewNote, ...patch })); }
    catch (e) { setErr(e.message); }
    setBusy(false);
  };
  const claim = async (fn) => { setBusy(true); setErr(''); try { apply(await fn(r.id)); } catch (e) { setErr(e.message); } setBusy(false); };
  const submitCancel = async () => apply(await api.saveLabRequest({ ...r, status: 'Cancelled', cancelReason: reason.trim() }));

  return (
    <>
      <Link to="/laboratory" className="back"><ArrowLeft size={16} aria-hidden /> Laboratory</Link>
      <div className="profile-head">
        <div>
          <h1>{r.test}: <Link className="plink h1link" to={`/patients/${r.patientId}`}>{r.patient}</Link></h1>
          <p className="muted">{r.id} · requested {fmtDateTime(r.requestedAt)} by {r.requestedBy}{r.consultationId && <> · <Link className="plink" to={`/consultations/${r.consultationId}`}>from consultation</Link></>}</p>
        </div>
        <div className="spacer" />{r.priority === 'Urgent' && <span className="badge bad">Urgent</span>}<StatusBadge value={r.status} />
      </div>
      {r.status === 'Cancelled' && <p className="locked-note">Cancelled: {r.cancelReason}.</p>}
      {r.clinicalNote && <p className="locked-note">Clinical note: {r.clinicalNote}</p>}
      {err && <p className="form-error" role="alert">{err}</p>}

      <div className="grid" style={{ maxWidth: 860 }}>
        <section className="card">
          <h2>{proc ? 'Procedure' : 'Sample'}</h2>
          <p className="muted" style={{ marginTop: 0 }}>{TESTS[r.test].sample}</p>
          {!['Reviewed', 'Cancelled'].includes(r.status) && r.status !== 'Resulted' && (
            <p style={{ marginTop: 0 }}>{r.takenById ? <><b>Taken by {r.takenById === user.staffId ? 'you' : r.takenByName}</b> on {fmtDateTime(r.takenAt)}. </> : <b>Waiting in the laboratory’s queue. </b>}
              {can.take && <button className="btn small primary" disabled={busy} onClick={() => claim(api.takeLabRequest)}>Take this request</button>}
              {can.release && <button className="btn small" disabled={busy} onClick={() => claim(api.releaseLabRequest)}>Put back in the queue</button>}</p>)}
          {r.collectedAt ? <p style={{ margin: 0 }}>{proc ? 'Done' : 'Collected'} {fmtDateTime(r.collectedAt)} by {r.collectedBy}.{r.sampleNote && ` ${r.sampleNote}`}</p> : (
            r.status === 'Requested' && canEnter ? (
              <>
                <div className="field"><label htmlFor="sn">Note (optional)</label><input id="sn" value={sampleNote} onChange={(e) => setSampleNote(e.target.value)} placeholder="Haemolysed, repeat sample, and so on" /></div>
                <button className="btn primary" disabled={busy} onClick={() => act({ status: 'Collected' })}>{proc ? 'Mark as done' : 'Mark sample collected'}</button>
              </>
            ) : <p className="muted" style={{ margin: 0 }}>{r.status === 'Cancelled' ? 'Not collected.' : (r.takenById ? `${r.takenByName} (Laboratory) is on it. Waiting to ${proc ? 'do it' : 'collect the sample'}.` : 'Waiting for the laboratory team to take it.')}</p>)}
        </section>

        {['Collected', 'Resulted', 'Reviewed'].includes(r.status) && (
          <section className="card">
            <h2>Results</h2>
            <ResultsTable req={r} results={results} onChange={r.status === 'Collected' && canEnter ? (k, v) => setResults((p) => ({ ...p, [k]: v })) : undefined} />
            {r.resultedAt && <p className="muted" style={{ marginBottom: 0 }}>Entered {fmtDateTime(r.resultedAt)} by {r.resultedBy}.</p>}
            {r.status === 'Collected' && canEnter && (
              <div className="actions">
                <button className="btn primary" disabled={busy || missing.length > 0} onClick={() => act({ status: 'Resulted' })}>Save results</button>
                {missing.length > 0 && <span className="muted">Still to enter: {missing.join(', ')}.</span>}
              </div>)}
            {r.status === 'Collected' && !canEnter && <p className="muted">Waiting for {r.takenByName || 'the laboratory team'} to enter the results.</p>}
          </section>
        )}

        {['Resulted', 'Reviewed'].includes(r.status) && (
          <section className="card">
            <h2>Review</h2>
            {flags.length > 0 && <div className="allergy severe" role="alert"><div><b>Outside the reference range</b>
              <ul className="blockers dark">{flags.map((f) => <li key={f.label}>{f.label}: {f.value} {f.unit} ({f.flag})</li>)}</ul></div></div>}
            {r.status === 'Reviewed' ? (
              <p style={{ margin: 0 }}>Signed off {fmtDateTime(r.reviewedAt)} by {r.reviewedBy}.{r.reviewNote && ` ${r.reviewNote}`}</p>
            ) : canReview ? (
              <>
                <div className="field"><label htmlFor="rn">{flags.length ? 'Note on the abnormal result (required)' : 'Note (optional)'}</label>
                  <textarea id="rn" rows={2} value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} placeholder="What it means for this patient and what happens next" /></div>
                <button className="btn primary" disabled={busy || (flags.length > 0 && !reviewNote.trim())} onClick={() => act({ status: 'Reviewed' })}>Sign off result</button>
              </>
            ) : <p className="muted" style={{ margin: 0 }}>{can.ownWork ? 'You entered these results, so another surgeon or the Medical Director signs them off.' : 'Waiting for a surgeon to review.'}</p>}
          </section>
        )}

        {can.cancel && <div><button className="btn danger-text" onClick={() => { setReason(''); setCancelling(true); }}>Cancel request</button></div>}
      </div>

      {cancelling && (
        <FormModal title="Cancel lab request" submitLabel="Cancel request" canSubmit={reason.trim().length > 0} onSubmit={submitCancel} onClose={() => setCancelling(false)}>
          <div className="field"><label htmlFor="cr">Reason</label><textarea id="cr" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} autoFocus /></div>
        </FormModal>
      )}
    </>
  );
}
