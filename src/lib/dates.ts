const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

/** Fecha local de hoy en formato AAAA-MM-DD */
export function todayISO(now: Date = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function parts(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return { y, m, d }
}

/** Días entre dos fechas (b - a) */
export function daysBetween(a: string, b: string): number {
  const pa = parts(a)
  const pb = parts(b)
  const ta = Date.UTC(pa.y, pa.m - 1, pa.d)
  const tb = Date.UTC(pb.y, pb.m - 1, pb.d)
  return Math.round((tb - ta) / 86400000)
}

export function addDays(iso: string, n: number): string {
  const p = parts(iso)
  const dt = new Date(Date.UTC(p.y, p.m - 1, p.d + n))
  return dt.toISOString().slice(0, 10)
}

/** "18 may" */
export function shortDate(iso: string): string {
  const p = parts(iso)
  return `${p.d} ${MONTHS[p.m - 1]}`
}

/** "16 – 21 may" o "28 may – 2 jun" */
export function dateRange(a: string, b: string): string {
  const pa = parts(a)
  const pb = parts(b)
  if (pa.m === pb.m && pa.y === pb.y) return `${pa.d} – ${pb.d} ${MONTHS[pb.m - 1]}`
  return `${shortDate(a)} – ${shortDate(b)}`
}

export function longDate(iso: string): string {
  const p = parts(iso)
  return `${p.d} ${MONTHS[p.m - 1]} ${p.y}`
}

export function nights(a: string, b: string): number {
  return Math.max(daysBetween(a, b), 0)
}
