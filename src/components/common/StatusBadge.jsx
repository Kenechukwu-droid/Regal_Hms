const TONE = { 'In progress': 'warn', Scheduled: '', 'Checked in': 'ok', Confirmed: 'ok', Pending: 'warn', Draft: 'warn', 'In theatre': 'warn', Recovering: 'warn', Postponed: 'warn', Ready: 'ok', 'On hold': 'warn', Cancelled: 'bad', Completed: 'ok', Recovery: 'warn', Sent: '', Accepted: 'ok', Declined: 'bad', Expired: 'warn', Paid: 'ok', 'Part-paid': 'warn', Unpaid: 'warn', Overdue: 'bad', Void: 'bad', 'In recovery': 'warn', 'Routine follow-up': 'ok', Surgery: 'bad' };
export default function StatusBadge({ value }) {
  return <span className={`badge ${TONE[value] ?? ''}`}>{value}</span>;
}
