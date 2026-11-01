/**
 * Tipos de cambio del día (base USD) y utilidades de monedas.
 * Fuente: open.er-api.com (gratuita, sin clave). Se guarda en el teléfono
 * una vez por día; si no hay internet se usa la última cotización guardada.
 */
import { todayISO } from './dates'

export type Rates = Record<string, number> // unidades de cada moneda por 1 USD

const CACHE_KEY = 'worldy.fx'

// Valores de respaldo aproximados, solo si nunca se pudo descargar la cotización
const FALLBACK: Rates = {
  USD: 1, UYU: 40, EUR: 0.92, GBP: 0.79, ARS: 1100, BRL: 5.6, CLP: 950, PYG: 7600,
  MXN: 18.5, COP: 4000, PEN: 3.7, BOB: 6.9, JPY: 150, CNY: 7.2, CHF: 0.88, CAD: 1.37,
  AUD: 1.52, NZD: 1.66, THB: 35, CZK: 23, HUF: 360, PLN: 4, TRY: 34, MAD: 10, ZAR: 18.5,
  DKK: 6.9, SEK: 10.5, NOK: 10.7, ISK: 138, HRK: 7, INR: 84, IDR: 15800, VND: 25000,
  KRW: 1380, SGD: 1.34, HKD: 7.8, AED: 3.67, EGP: 48, ILS: 3.7, CRC: 520, DOP: 60,
}

export interface FxState {
  rates: Rates
  date: string
  source: 'live' | 'cache' | 'fallback'
}

export function loadCachedRates(): FxState {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as { rates: Rates; date: string }
      if (parsed.rates && parsed.rates.USD) return { rates: parsed.rates, date: parsed.date, source: 'cache' }
    }
  } catch {
    /* sin almacenamiento disponible */
  }
  return { rates: FALLBACK, date: '', source: 'fallback' }
}

export async function fetchRates(): Promise<FxState> {
  const cached = loadCachedRates()
  if (cached.source === 'cache' && cached.date === todayISO()) return cached
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD')
    if (!res.ok) throw new Error(String(res.status))
    const json = (await res.json()) as { result: string; rates: Rates }
    if (json.result !== 'success' || !json.rates) throw new Error('respuesta inválida')
    const state: FxState = { rates: json.rates, date: todayISO(), source: 'live' }
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ rates: state.rates, date: state.date }))
    } catch {
      /* ignorar */
    }
    return state
  } catch {
    return cached
  }
}

/** Convierte un monto en cualquier moneda a USD */
export function toUSD(amount: number, currency: string, rates: Rates): number {
  const r = rates[currency]
  if (!r) return amount
  return amount / r
}

/** Convierte USD a cualquier moneda */
export function fromUSD(usd: number, currency: string, rates: Rates): number {
  const r = rates[currency]
  if (!r) return usd
  return usd * r
}

let namesCache: Intl.DisplayNames | null = null
export function currencyName(code: string): string {
  try {
    namesCache ??= new Intl.DisplayNames(['es'], { type: 'currency' })
    const n = namesCache.of(code)
    if (!n) return code
    return n.charAt(0).toUpperCase() + n.slice(1)
  } catch {
    return code
  }
}

/** Todas las monedas del mundo que conoce el navegador */
export function allCurrencies(rates: Rates): string[] {
  let list: string[] = []
  try {
    list = (Intl as unknown as { supportedValuesOf: (k: string) => string[] }).supportedValuesOf('currency')
  } catch {
    list = Object.keys(rates)
  }
  const set = new Set([...list, ...Object.keys(rates)])
  return [...set].filter((c) => /^[A-Z]{3}$/.test(c)).sort()
}

const COUNTRY_CURRENCY: Record<string, string> = {
  uruguay: 'UYU', argentina: 'ARS', brasil: 'BRL', chile: 'CLP', paraguay: 'PYG', bolivia: 'BOB',
  peru: 'PEN', 'perú': 'PEN', colombia: 'COP', 'méxico': 'MXN', mexico: 'MXN', 'estados unidos': 'USD',
  eeuu: 'USD', 'canadá': 'CAD', canada: 'CAD', 'españa': 'EUR', espana: 'EUR', francia: 'EUR',
  italia: 'EUR', portugal: 'EUR', alemania: 'EUR', 'países bajos': 'EUR', holanda: 'EUR', 'bélgica': 'EUR',
  austria: 'EUR', grecia: 'EUR', irlanda: 'EUR', croacia: 'EUR', finlandia: 'EUR', eslovenia: 'EUR',
  'reino unido': 'GBP', inglaterra: 'GBP', escocia: 'GBP', suiza: 'CHF', 'república checa': 'CZK',
  chequia: 'CZK', 'hungría': 'HUF', polonia: 'PLN', 'turquía': 'TRY', marruecos: 'MAD', egipto: 'EGP',
  'japón': 'JPY', japon: 'JPY', china: 'CNY', tailandia: 'THB', 'corea del sur': 'KRW', india: 'INR',
  indonesia: 'IDR', vietnam: 'VND', singapur: 'SGD', australia: 'AUD', 'nueva zelanda': 'NZD',
  dinamarca: 'DKK', suecia: 'SEK', noruega: 'NOK', islandia: 'ISK', 'sudáfrica': 'ZAR', israel: 'ILS',
  'emiratos árabes unidos': 'AED', 'costa rica': 'CRC', 'república dominicana': 'DOP', cuba: 'CUP',
}

/** Sugiere la moneda de un país a partir de su nombre */
export function guessCurrency(country: string): string | null {
  const k = country.trim().toLowerCase()
  return COUNTRY_CURRENCY[k] ?? null
}
