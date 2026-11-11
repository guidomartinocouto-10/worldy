/**
 * Cálculos de Worldy: presupuestos, alertas, efectivo y deudas.
 * Funciones puras (sin acceso a la base de datos) para poder probarlas.
 */
import type { Destination, Expense, Purchase, TripData, Trip, CategoryId } from './types'
import { daysBetween, todayISO } from './dates'
import { round2 } from './format'

export const ALERT_PCT = 0.8

/** Parte del gasto que le corresponde a un usuario */
export function myShare(e: Expense, uid: string): number {
  return e.shares.find((s) => s.user_id === uid)?.share_usd ?? 0
}

/** Gasto anterior al inicio del viaje (pagado por adelantado) */
export function isPrepaid(e: Pick<Expense, 'spent_on'>, trip: Trip): boolean {
  return e.spent_on < trip.start_date
}

/**
 * ¿El gasto se descuenta del presupuesto en destino?
 * No: los pasajes entre países, ni el alojamiento reservado antes del viaje.
 * Sí: todo lo demás, incluido el alojamiento que se paga durante el viaje.
 */
export function countsInBudget(e: Expense, trip: Trip): boolean {
  if (!e.destination_id) return false
  if (e.category === 'pasajes') return false
  if (e.category === 'alojamiento' && isPrepaid(e, trip)) return false
  return true
}

/** Destinos visibles para el usuario (compartidos + propios), en orden */
export function myRoute(data: TripData, uid: string): Destination[] {
  return data.destinations
    .filter((d) => d.owner_id === null || d.owner_id === uid)
    .sort((a, b) => (a.start_date === b.start_date ? a.position - b.position : a.start_date < b.start_date ? -1 : 1))
}

export interface DestStats {
  dest: Destination
  budget: number
  spent: number // descontado del presupuesto
  left: number
  pct: number
  lodgingPrepaid: number
  lodgingTotal: number
  total: number // todo lo gastado en el destino (incluye alojamiento reservado)
  status: 'past' | 'current' | 'upcoming'
  dayIndex: number
  days: number
}

export function destStatus(d: Destination, today: string, isLast: boolean): 'past' | 'current' | 'upcoming' {
  if (today < d.start_date) return 'upcoming'
  if (today < d.end_date || (isLast && today === d.end_date)) return 'current'
  if (d.start_date === d.end_date && today === d.start_date) return 'current'
  return 'past'
}

export function destStats(data: TripData, uid: string, today = todayISO()): DestStats[] {
  const route = myRoute(data, uid)
  return route.map((dest, i) => {
    const budget = data.budgets.find((b) => b.destination_id === dest.id && b.user_id === uid)?.amount_usd ?? 0
    let spent = 0
    let lodgingPrepaid = 0
    let lodgingTotal = 0
    let total = 0
    for (const e of data.expenses) {
      if (e.destination_id !== dest.id) continue
      const s = myShare(e, uid)
      if (!s) continue
      if (e.category === 'pasajes') continue // los pasajes se cuentan aparte
      total += s
      if (e.category === 'alojamiento') {
        lodgingTotal += s
        if (isPrepaid(e, data.trip)) lodgingPrepaid += s
      }
      if (countsInBudget(e, data.trip)) spent += s
    }
    const status = destStatus(dest, today, i === route.length - 1)
    const days = Math.max(daysBetween(dest.start_date, dest.end_date), 1)
    const dayIndex = status === 'current' ? Math.min(daysBetween(dest.start_date, today) + 1, days) : status === 'past' ? days : 0
    return {
      dest,
      budget: round2(budget),
      spent: round2(spent),
      left: round2(budget - spent),
      pct: budget > 0 ? spent / budget : spent > 0 ? 1 : 0,
      lodgingPrepaid: round2(lodgingPrepaid),
      lodgingTotal: round2(lodgingTotal),
      total: round2(total),
      status,
      dayIndex,
      days,
    }
  })
}

export interface Alert {
  stats: DestStats
  kind: 'over' | 'warning' | 'pace'
  projected: number
  suggestion: { from: DestStats; amount: number } | null
}

const ceil10 = (n: number) => Math.ceil(n / 10) * 10

/**
 * Alerta del destino actual: al 80 %, al pasarse, o si el ritmo diario
 * indica que se va a pasar. Sugiere de qué destino sacar la diferencia.
 */
export function currentAlert(stats: DestStats[]): Alert | null {
  const cur = stats.find((s) => s.status === 'current')
  if (!cur || (cur.budget <= 0 && cur.spent <= 0)) return null
  const projected = cur.dayIndex > 0 ? (cur.spent / cur.dayIndex) * cur.days : cur.spent
  const over = cur.spent > cur.budget
  const warning = cur.pct >= ALERT_PCT
  const expectedPct = cur.dayIndex / cur.days
  const pace = cur.budget > 0 && cur.pct > expectedPct + 0.15 && projected > cur.budget
  if (!over && !warning && !pace) return null
  // Lo que falta para terminar el destino gastando al ritmo diario planeado en los días que quedan
  const remainingDays = Math.max(cur.days - cur.dayIndex, 0)
  const needed = cur.spent + remainingDays * (cur.budget / cur.days) - cur.budget
  const amount = Math.max(ceil10(needed > 0 ? needed : cur.budget * 0.1), 10)
  // Donante: primero el próximo destino con presupuesto libre, si no, uno ya visitado con sobrante
  const upcoming = stats.filter((s) => s.status === 'upcoming' && s.left > 0)
  const past = stats.filter((s) => s.status === 'past' && s.left > 0)
  const donor = upcoming[0] ?? [...past].sort((a, b) => b.left - a.left)[0] ?? null
  return {
    stats: cur,
    kind: over ? 'over' : warning ? 'warning' : 'pace',
    projected: round2(projected),
    suggestion: donor ? { from: donor, amount: Math.min(amount, Math.floor(donor.left)) } : null,
  }
}

export interface Totals {
  budget: number // presupuesto en destino total
  spentInBudget: number
  left: number
  pasajes: number
  lodgingPrepaid: number
  outsideBudget: number // pasajes + alojamiento reservado + otros fuera de presupuesto
  total: number // costo total real hasta hoy
  estimated: number // costo estimado del viaje
}

export function totals(data: TripData, uid: string): Totals {
  const stats = destStats(data, uid)
  const budget = stats.reduce((a, s) => a + s.budget, 0)
  let spentInBudget = 0
  let pasajes = 0
  let lodgingPrepaid = 0
  let total = 0
  for (const e of data.expenses) {
    const s = myShare(e, uid)
    if (!s) continue
    total += s
    if (e.category === 'pasajes') pasajes += s
    else if (e.category === 'alojamiento' && isPrepaid(e, data.trip)) lodgingPrepaid += s
    if (countsInBudget(e, data.trip)) spentInBudget += s
  }
  const outsideBudget = total - spentInBudget
  return {
    budget: round2(budget),
    spentInBudget: round2(spentInBudget),
    left: round2(budget - spentInBudget),
    pasajes: round2(pasajes),
    lodgingPrepaid: round2(lodgingPrepaid),
    outsideBudget: round2(outsideBudget),
    total: round2(total),
    estimated: round2(outsideBudget + budget),
  }
}

/** Gasto por categoría (sin pasajes) para el resumen */
export function byCategory(data: TripData, uid: string): { category: CategoryId; usd: number }[] {
  const map = new Map<CategoryId, number>()
  for (const e of data.expenses) {
    if (e.category === 'pasajes') continue
    const s = myShare(e, uid)
    if (!s) continue
    map.set(e.category, (map.get(e.category) ?? 0) + s)
  }
  return [...map.entries()].map(([category, usd]) => ({ category, usd: round2(usd) })).sort((a, b) => b.usd - a.usd)
}

// ---------------- Efectivo ----------------

export interface Wallet {
  currency: string
  received: number
  spent: number
  balance: number
  avgUsdPerUnit: number // promedio de todas las compras
}

/** Efectivo por moneda: lo comprado menos lo gastado en efectivo */
export function wallets(purchases: Purchase[], expenses: Expense[], uid: string): Wallet[] {
  const map = new Map<string, { received: number; paidUsd: number; spent: number }>()
  for (const p of purchases) {
    if (p.user_id !== uid) continue
    const w = map.get(p.currency) ?? { received: 0, paidUsd: 0, spent: 0 }
    w.received += p.received_amount
    w.paidUsd += p.paid_usd
    map.set(p.currency, w)
  }
  for (const e of expenses) {
    if (e.method !== 'cash' || e.paid_by !== uid || e.paid_from_fund) continue
    const w = map.get(e.currency)
    if (!w) continue
    w.spent += paidLocal(e)
  }
  return [...map.entries()].map(([currency, w]) => ({
    currency,
    received: round2(w.received),
    spent: round2(w.spent),
    balance: round2(w.received - w.spent),
    avgUsdPerUnit: w.received > 0 ? w.paidUsd / w.received : 0,
  }))
}

// ---------------- Deudas entre viajeros ----------------

// ---------- Señas y pagos parciales ----------

/** Lo pagado hasta ahora, en la moneda del gasto */
export function paidLocal(e: Pick<Expense, 'amount' | 'payments'>): number {
  if (!e.payments || e.payments.length === 0) return e.amount
  return Math.min(e.payments.reduce((a, p) => a + p.amount, 0), e.amount)
}

/** Fracción pagada (1 = pagado completo) */
export function paidFraction(e: Pick<Expense, 'amount' | 'payments'>): number {
  return e.amount > 0 ? paidLocal(e) / e.amount : 1
}

/** Lo que falta pagar, en la moneda del gasto y en dólares */
export function remainingOf(e: Expense): { local: number; usd: number } {
  const local = round2(e.amount - paidLocal(e))
  return { local, usd: round2(local * (e.amount > 0 ? e.amount_usd / e.amount : 1)) }
}

/** Gastos con saldo pendiente que te involucran (tuyos, divididos contigo o del fondo) */
export function pendingPayments(data: TripData, uid: string): Expense[] {
  return data.expenses
    .filter((e) => remainingOf(e).local > 0.004)
    .filter((e) => e.paid_by === uid || e.paid_from_fund || myShare(e, uid) > 0)
    .sort((a, b) => ((a.due_date ?? '9999') < (b.due_date ?? '9999') ? -1 : 1))
}

// ---------- Fondo común ----------

export interface FundStats {
  deposited: number
  used: number // pagado con el fondo
  balance: number
  pendingUsd: number // saldos de señas que todavía hay que pagar con el fondo
  perUser: Map<string, { deposited: number; used: number }>
}

export function fundStats(data: TripData): FundStats {
  const perUser = new Map<string, { deposited: number; used: number }>()
  const get = (u: string) => {
    const v = perUser.get(u) ?? { deposited: 0, used: 0 }
    perUser.set(u, v)
    return v
  }
  let deposited = 0
  let used = 0
  let pendingUsd = 0
  for (const d of data.deposits) {
    deposited += d.amount_usd
    get(d.user_id).deposited += d.amount_usd
  }
  for (const e of data.expenses) {
    if (!e.paid_from_fund) continue
    const f = paidFraction(e)
    used += e.amount_usd * f
    pendingUsd += remainingOf(e).usd
    for (const s of e.shares) get(s.user_id).used += s.share_usd * f
  }
  for (const v of perUser.values()) {
    v.deposited = round2(v.deposited)
    v.used = round2(v.used)
  }
  return { deposited: round2(deposited), used: round2(used), balance: round2(deposited - used), pendingUsd: round2(pendingUsd), perUser }
}

/** Saldo con cada persona: positivo = te debe; negativo = le debes */
export function balancesWith(data: TripData, uid: string): Map<string, number> {
  const bal = new Map<string, number>()
  const add = (other: string, v: number) => bal.set(other, (bal.get(other) ?? 0) + v)
  for (const e of data.expenses) {
    // Lo pagado con el fondo común no genera deudas entre personas
    if (e.paid_from_fund) continue
    // En una seña, solo cuenta lo que ya se pagó
    const f = paidFraction(e)
    if (e.paid_by === uid) {
      for (const s of e.shares) if (s.user_id !== uid) add(s.user_id, s.share_usd * f)
    } else {
      const mine = myShare(e, uid)
      if (mine) add(e.paid_by, -mine * f)
    }
  }
  for (const st of data.settlements) {
    if (st.from_user === uid) add(st.to_user, st.amount_usd)
    else if (st.to_user === uid) add(st.from_user, -st.amount_usd)
  }
  for (const [k, v] of bal) bal.set(k, round2(v))
  return bal
}

/** Divide un total en partes iguales que suman exactamente el total */
export function splitEqual(total: number, userIds: string[]): { user_id: string; share_usd: number }[] {
  if (userIds.length === 0) return []
  const cents = Math.round(total * 100)
  const base = Math.floor(cents / userIds.length)
  let rest = cents - base * userIds.length
  return userIds.map((user_id) => {
    const extra = rest > 0 ? 1 : 0
    rest -= extra
    return { user_id, share_usd: (base + extra) / 100 }
  })
}
