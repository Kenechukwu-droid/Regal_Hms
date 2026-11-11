import { naira } from './constants';

// `children` lets an invoice add "Paid" and "Balance" rows under the total.
export default function Totals({ subtotal, discount, total, editableDiscount, onDiscount, children }) {
  return (
    <dl className="totals">
      <dt>Subtotal</dt><dd>{naira(subtotal)}</dd>
      <dt><label htmlFor="disc">Discount</label></dt>
      <dd>{editableDiscount
        ? <input id="disc" className="n-in wide" inputMode="numeric" value={discount} onChange={(e) => onDiscount(e.target.value)} aria-label="Discount in naira" />
        : discount ? `−${naira(discount)}` : '—'}</dd>
      <dt className="grand">Total</dt><dd className="grand">{naira(total)}</dd>
      {children}
    </dl>
  );
}
