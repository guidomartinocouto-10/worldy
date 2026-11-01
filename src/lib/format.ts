const nf2 = new Intl.NumberFormat('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const nf0 = new Intl.NumberFormat('es-UY', { maximumFractionDigits: 0 })

const SYMBOLS: Record<string, string> = { USD: 'US$', UYU: '$U', EUR: '€', GBP: '£', BRL: 'R$', ARS: 'AR$', JPY: '¥' }

export function symbol(currency: string): string {
  if (SYMBOLS[currency]) return SYMBOLS[currency]
  try {
    const p = new Intl.NumberFormat('es', { style: 'currency', currency, currencyDisplay: 'narrowSymbol' })
      .formatToParts(0)
      .find((x) => x.type === 'currency')
    return p?.value ?? currency
  } catch {
    return currency
  }
}

/** Número con separadores: 1.295 o 12,28 */
export function num(n: number, decimals: 0 | 2 = 2): string {
  return (decimals === 0 ? nf0 : nf2).format(round2(n))
}

/** Redondea a 2 decimales evitando errores de coma flotante */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

/** "US$ 12,28" — los montos grandes (≥ 1000) sin decimales */
export function money(n: number, currency = 'USD', opts: { decimals?: 0 | 2 } = {}): string {
  const decimals = opts.decimals ?? (Math.abs(n) >= 1000 ? 0 : 2)
  return `${symbol(currency)} ${num(n, decimals)}`
}

/** Monto redondo, sin decimales */
export function money0(n: number, currency = 'USD'): string {
  return `${symbol(currency)} ${num(n, 0)}`
}

/** Convierte texto escrito por el usuario ("1.234,50" o "1234.5") a número */
export function parseAmount(text: string): number {
  const t = text.trim().replace(/\s/g, '')
  if (!t) return NaN
  let normalized = t
  if (t.includes(',') && t.includes('.')) {
    normalized = t.lastIndexOf(',') > t.lastIndexOf('.') ? t.replace(/\./g, '').replace(',', '.') : t.replace(/,/g, '')
  } else if (t.includes(',')) {
    normalized = t.replace(',', '.')
  }
  const v = Number(normalized)
  return Number.isFinite(v) ? v : NaN
}

export function initials(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean)
  if (p.length === 0) return '?'
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase()
  return (p[0][0] + p[p.length - 1][0]).toUpperCase()
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name
}
