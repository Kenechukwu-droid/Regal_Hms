import { Fragment } from 'react';
// Letterhead for quotations, invoices and receipts. Add the centre's address and bank details here when confirmed.
export default function DocHeader({ title, number, rows }) {
  return (
    <div className="doc-head">
      <div><b className="doc-brand">Regal Plastic Surgery Centre</b><div className="muted">Port Harcourt, Nigeria</div></div>
      <div className="doc-title"><h2>{title}</h2><div className="muted">{number}</div></div>
      {rows && <dl className="facts doc-facts">{rows.map(([k, v]) => <Fragment key={k}><dt>{k}</dt><dd>{v}</dd></Fragment>)}</dl>}
    </div>
  );
}
