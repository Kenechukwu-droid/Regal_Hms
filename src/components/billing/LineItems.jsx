import { Plus, Trash2 } from 'lucide-react';
import { CATEGORIES, naira } from './constants';
import { lineTotal } from '../../utils/billing';

export default function LineItems({ lines, editable, onChange }) {
  const set = (i, k) => (e) => onChange(lines.map((l, j) => (j === i ? { ...l, [k]: e.target.value } : l)));
  const add = () => onChange([...lines, { id: Math.max(0, ...lines.map((l) => l.id)) + 1, category: 'Other', description: '', qty: 1, unitPrice: 0 }]);
  const remove = (i) => onChange(lines.filter((_, j) => j !== i));

  if (!editable) {
    return (
      <div className="table-wrap"><table className="lines">
        <thead><tr><th>Item</th><th className="num">Qty</th><th className="num">Price</th><th className="num">Amount</th></tr></thead>
        <tbody>{lines.map((l) => (
          <tr key={l.id}><td>{l.description}<div className="muted small-text">{l.category}</div></td>
            <td className="num">{l.qty}</td><td className="num">{naira(l.unitPrice)}</td><td className="num">{naira(lineTotal(l))}</td></tr>))}
        </tbody>
      </table></div>
    );
  }
  return (
    <>
      <div className="table-wrap"><table className="lines">
        <thead><tr><th>Category</th><th>Description</th><th className="num">Qty</th><th className="num">Price (₦)</th><th className="num">Amount</th><th /></tr></thead>
        <tbody>{lines.map((l, i) => (
          <tr key={l.id}>
            <td><select aria-label={`Line ${i + 1} category`} value={l.category} onChange={set(i, 'category')}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></td>
            <td><input aria-label={`Line ${i + 1} description`} value={l.description} onChange={set(i, 'description')} /></td>
            <td className="num"><input className="n-in" inputMode="numeric" aria-label={`Line ${i + 1} quantity`} value={l.qty} onChange={set(i, 'qty')} /></td>
            <td className="num"><input className="n-in wide" inputMode="numeric" aria-label={`Line ${i + 1} price`} value={l.unitPrice} onChange={set(i, 'unitPrice')} /></td>
            <td className="num">{naira(Number.isFinite(lineTotal(l)) ? lineTotal(l) : 0)}</td>
            <td><button type="button" className="icon-btn" aria-label={`Remove line ${i + 1}`} onClick={() => remove(i)}><Trash2 size={16} /></button></td>
          </tr>))}
        </tbody>
      </table></div>
      <button type="button" className="btn small" onClick={add}><Plus size={14} aria-hidden /> Add line</button>
    </>
  );
}
