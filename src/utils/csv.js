// Cells that start with = + @ could run as formulas when opened in Excel, so they are prefixed with an apostrophe.
export const csvCell = (v) => {
  let s = String(v ?? '');
  if (/^[=+@\t\r]/.test(s) || (s.startsWith('-') && Number.isNaN(Number(s)))) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};
export function downloadCsv(filename, rows) {
  const body = rows.map((r) => r.map(csvCell).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([`\ufeff${body}`], { type: 'text/csv;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}
