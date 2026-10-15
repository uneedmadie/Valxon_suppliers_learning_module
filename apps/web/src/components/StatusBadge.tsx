/**
 * Štítky stavů pro správce (ověřeno, návrh, zamítnuto, publikováno…). Studentovi se nezobrazují.
 */
const STYLES: Record<string, { label: string; className: string }> = {
  verified: { label: 'Ověřeno', className: 'bg-fresh text-green' },
  proposed: { label: 'Návrh k ověření', className: 'bg-amber-soft text-amber' },
  rejected: { label: 'Zamítnuto', className: 'bg-[#eef0f3] text-[#7a818c]' },
  approved: { label: 'Schváleno', className: 'bg-fresh text-green' },
  draft: { label: 'Koncept', className: 'bg-amber-soft text-amber' },
  published: { label: 'Publikováno', className: 'bg-fresh text-green' },
  review: { label: 'Ke kontrole', className: 'bg-amber-soft text-amber' },
  importing: { label: 'Probíhá import', className: 'bg-rose-pale text-rose-dark' },
  processed: { label: 'Zpracováno', className: 'bg-fresh text-green' },
  pending: { label: 'Čeká', className: 'bg-[#eef0f3] text-[#7a818c]' },
  failed: { label: 'Selhalo', className: 'bg-rose-pale text-rose-dark' },
  blocked: { label: 'Blokováno', className: 'bg-rose-pale text-rose-dark' },
  matched: { label: 'Spárováno', className: 'bg-fresh text-green' },
  confirmed: { label: 'Potvrzeno správcem', className: 'bg-fresh text-green' },
  ambiguous: { label: 'Nejasná shoda', className: 'bg-amber-soft text-amber' },
  not_found: { label: 'Nenalezeno', className: 'bg-rose-pale text-rose-dark' },
  queued: { label: 'Ve frontě', className: 'bg-[#eef0f3] text-[#7a818c]' },
  running: { label: 'Běží', className: 'bg-rose-pale text-rose-dark' },
  completed: { label: 'Dokončeno', className: 'bg-fresh text-green' },
  completed_with_errors: { label: 'Dokončeno s chybami', className: 'bg-amber-soft text-amber' },
  high: { label: 'Jistota: vysoká', className: 'bg-[#eef0f3] text-dark' },
  medium: { label: 'Jistota: střední', className: 'bg-[#eef0f3] text-[#59606a]' },
  low: { label: 'Jistota: nízká', className: 'bg-[#eef0f3] text-[#7a818c]' },
};

export function StatusBadge({ status }: { status: string }) {
  const style = STYLES[status] ?? { label: status, className: 'bg-[#eef0f3] text-[#59606a]' };
  return <span className={`inline-block rounded px-1.5 py-1 text-[10px] font-bold whitespace-nowrap ${style.className}`}>{style.label}</span>;
}
