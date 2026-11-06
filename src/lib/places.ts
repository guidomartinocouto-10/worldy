/**
 * Sugerencias de países y ciudades al escribir.
 * - Países: lista completa en español, sin internet (la trae el navegador).
 * - Ciudades: buscador gratuito de Open-Meteo (datos de GeoNames), en español.
 */

// Moneda de cada país (código ISO de 2 letras → moneda)
const CUR: Record<string, string> = {
  AD: 'EUR', AE: 'AED', AF: 'AFN', AG: 'XCD', AL: 'ALL', AM: 'AMD', AO: 'AOA', AR: 'ARS', AT: 'EUR', AU: 'AUD',
  AW: 'AWG', AZ: 'AZN', BA: 'BAM', BB: 'BBD', BD: 'BDT', BE: 'EUR', BF: 'XOF', BG: 'BGN', BH: 'BHD', BI: 'BIF',
  BJ: 'XOF', BN: 'BND', BO: 'BOB', BR: 'BRL', BS: 'BSD', BT: 'BTN', BW: 'BWP', BY: 'BYN', BZ: 'BZD', CA: 'CAD',
  CD: 'CDF', CF: 'XAF', CG: 'XAF', CH: 'CHF', CI: 'XOF', CL: 'CLP', CM: 'XAF', CN: 'CNY', CO: 'COP', CR: 'CRC',
  CU: 'CUP', CV: 'CVE', CW: 'ANG', CY: 'EUR', CZ: 'CZK', DE: 'EUR', DJ: 'DJF', DK: 'DKK', DM: 'XCD', DO: 'DOP',
  DZ: 'DZD', EC: 'USD', EE: 'EUR', EG: 'EGP', ER: 'ERN', ES: 'EUR', ET: 'ETB', FI: 'EUR', FJ: 'FJD', FM: 'USD',
  FR: 'EUR', GA: 'XAF', GB: 'GBP', GD: 'XCD', GE: 'GEL', GH: 'GHS', GI: 'GIP', GL: 'DKK', GM: 'GMD', GN: 'GNF',
  GQ: 'XAF', GR: 'EUR', GT: 'GTQ', GW: 'XOF', GY: 'GYD', HK: 'HKD', HN: 'HNL', HR: 'EUR', HT: 'HTG', HU: 'HUF',
  ID: 'IDR', IE: 'EUR', IL: 'ILS', IN: 'INR', IQ: 'IQD', IR: 'IRR', IS: 'ISK', IT: 'EUR', JM: 'JMD', JO: 'JOD',
  JP: 'JPY', KE: 'KES', KG: 'KGS', KH: 'KHR', KI: 'AUD', KM: 'KMF', KN: 'XCD', KR: 'KRW', KW: 'KWD', KY: 'KYD',
  KZ: 'KZT', LA: 'LAK', LB: 'LBP', LC: 'XCD', LI: 'CHF', LK: 'LKR', LR: 'LRD', LS: 'LSL', LT: 'EUR', LU: 'EUR',
  LV: 'EUR', LY: 'LYD', MA: 'MAD', MC: 'EUR', MD: 'MDL', ME: 'EUR', MG: 'MGA', MH: 'USD', MK: 'MKD', ML: 'XOF',
  MM: 'MMK', MN: 'MNT', MO: 'MOP', MR: 'MRU', MT: 'EUR', MU: 'MUR', MV: 'MVR', MW: 'MWK', MX: 'MXN', MY: 'MYR',
  MZ: 'MZN', NA: 'NAD', NE: 'XOF', NG: 'NGN', NI: 'NIO', NL: 'EUR', NO: 'NOK', NP: 'NPR', NR: 'AUD', NZ: 'NZD',
  OM: 'OMR', PA: 'PAB', PE: 'PEN', PF: 'XPF', PG: 'PGK', PH: 'PHP', PK: 'PKR', PL: 'PLN', PR: 'USD', PS: 'ILS',
  PT: 'EUR', PW: 'USD', PY: 'PYG', QA: 'QAR', RO: 'RON', RS: 'RSD', RU: 'RUB', RW: 'RWF', SA: 'SAR', SB: 'SBD',
  SC: 'SCR', SD: 'SDG', SE: 'SEK', SG: 'SGD', SI: 'EUR', SK: 'EUR', SL: 'SLE', SM: 'EUR', SN: 'XOF', SO: 'SOS',
  SR: 'SRD', SS: 'SSP', ST: 'STN', SV: 'USD', SY: 'SYP', SZ: 'SZL', TD: 'XAF', TG: 'XOF', TH: 'THB', TJ: 'TJS',
  TL: 'USD', TM: 'TMT', TN: 'TND', TO: 'TOP', TR: 'TRY', TT: 'TTD', TV: 'AUD', TW: 'TWD', TZ: 'TZS', UA: 'UAH',
  UG: 'UGX', US: 'USD', UY: 'UYU', UZ: 'UZS', VA: 'EUR', VC: 'XCD', VE: 'VES', VN: 'VND', VU: 'VUV', WS: 'WST',
  XK: 'EUR', YE: 'YER', ZA: 'ZAR', ZM: 'ZMW', ZW: 'USD', BQ: 'USD', MF: 'EUR', GP: 'EUR', MQ: 'EUR', RE: 'EUR',
  NC: 'XPF', GF: 'EUR', BM: 'BMD', VG: 'USD', VI: 'USD', TC: 'USD', AI: 'XCD', MS: 'XCD', FO: 'DKK', IM: 'GBP',
  JE: 'GBP', GG: 'GBP', AX: 'EUR', SX: 'ANG', BL: 'EUR', PM: 'EUR', YT: 'EUR', GU: 'USD', AS: 'USD', MP: 'USD',
}

export interface CountryOption {
  code: string
  name: string
  currency: string
}

const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()

let countries: CountryOption[] | null = null
export function allCountries(): CountryOption[] {
  if (countries) return countries
  let names: Intl.DisplayNames | null = null
  try {
    names = new Intl.DisplayNames(['es'], { type: 'region' })
  } catch {
    names = null
  }
  countries = Object.keys(CUR)
    .map((code) => ({ code, name: names?.of(code) ?? code, currency: CUR[code] }))
    .filter((c) => c.name && c.name !== c.code)
    .sort((a, b) => a.name.localeCompare(b.name, 'es'))
  return countries
}

/** Países que coinciden con lo escrito (primero los que empiezan igual) */
export function searchCountries(q: string, limit = 6): CountryOption[] {
  const t = norm(q)
  if (!t) return []
  const list = allCountries()
  const starts = list.filter((c) => norm(c.name).startsWith(t))
  const contains = list.filter((c) => !norm(c.name).startsWith(t) && norm(c.name).includes(t))
  return [...starts, ...contains].slice(0, limit)
}

export function countryByName(name: string): CountryOption | null {
  const t = norm(name)
  return allCountries().find((c) => norm(c.name) === t) ?? null
}

export function currencyOfCountryCode(code: string): string | null {
  return CUR[code.toUpperCase()] ?? null
}

export interface CityOption {
  id: number
  name: string
  region: string
  country: string
  countryCode: string
  currency: string | null
}

const cityCache = new Map<string, CityOption[]>()

/** Busca ciudades en el mundo mientras se escribe. Devuelve [] sin internet. */
export async function searchCities(q: string, signal?: AbortSignal): Promise<CityOption[]> {
  const t = q.trim()
  if (t.length < 2) return []
  const key = norm(t)
  const hit = cityCache.get(key)
  if (hit) return hit
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(t)}&count=8&language=es&format=json`
    const res = await fetch(url, { signal })
    if (!res.ok) return []
    const json = (await res.json()) as {
      results?: { id: number; name: string; admin1?: string; country?: string; country_code?: string; feature_code?: string; population?: number }[]
    }
    const names = allCountries()
    const out = (json.results ?? [])
      .filter((r) => r.country_code && !/^(PCLI|PCLD|ADM1)$/.test(r.feature_code ?? ''))
      .map((r) => {
        const cc = (r.country_code ?? '').toUpperCase()
        return {
          id: r.id,
          name: r.name,
          region: r.admin1 && r.admin1 !== r.name ? r.admin1 : '',
          country: names.find((c) => c.code === cc)?.name ?? r.country ?? '',
          countryCode: cc,
          currency: CUR[cc] ?? null,
        }
      })
    cityCache.set(key, out)
    return out
  } catch {
    return []
  }
}
