/**
 * Modo demo: todo se guarda en este dispositivo, con un viaje de ejemplo.
 * Sirve para probar la app antes de conectar Supabase.
 */
import type { Repo } from './repo'
import type { Budget, Destination, Expense, Member, Profile, Purchase, Settlement, Trip, TripData } from './types'
import { addDays, todayISO } from './dates'
import { splitEqual } from './calc'

const KEY = 'worldy.demo.v1'
const ME = 'demo-me'

interface Store {
  signedIn: boolean
  profiles: Profile[]
  trips: Trip[]
  members: Omit<Member, 'profile'>[]
  destinations: Destination[]
  budgets: Budget[]
  expenses: Expense[]
  purchases: Purchase[]
  settlements: Settlement[]
}

const uuid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36)

function seed(): Store {
  const today = todayISO()
  const start = addDays(today, -6)
  const d = (n: number) => addDays(start, n)
  const before = addDays(start, -60)
  const tripId = 'demo-europa'
  const profiles: Profile[] = [
    { id: ME, name: 'Tú', avatar_url: null, equiv_currency: 'UYU' },
    { id: 'demo-so', name: 'Sofía', avatar_url: null, equiv_currency: 'UYU' },
    { id: 'demo-ma', name: 'Martín', avatar_url: null, equiv_currency: 'UYU' },
    { id: 'demo-jp', name: 'Juan', avatar_url: null, equiv_currency: 'UYU' },
  ]
  const dest = (id: string, city: string, country: string, currency: string, a: number, b: number, position: number, mode: Destination['transport_mode'], owner: string | null = null): Destination => ({
    id, trip_id: tripId, city, country, currency, start_date: d(a), end_date: d(b), position, owner_id: owner, transport_mode: mode,
  })
  const destinations = [
    dest('d-mad', 'Madrid', 'España', 'EUR', 0, 4, 0, 'vuelo'),
    dest('d-par', 'París', 'Francia', 'EUR', 4, 9, 1, 'vuelo'),
    dest('d-rom', 'Roma', 'Italia', 'EUR', 9, 13, 2, 'vuelo'),
    dest('d-lis', 'Lisboa', 'Portugal', 'EUR', 13, 15, 3, 'vuelo'),
    dest('d-opo', 'Oporto', 'Portugal', 'EUR', 15, 16, 4, 'tren', ME),
  ]
  const budgets: Budget[] = [
    ['d-mad', 700], ['d-par', 900], ['d-rom', 700], ['d-lis', 450], ['d-opo', 370],
  ].map(([destination_id, amount_usd]) => ({ id: uuid(), trip_id: tripId, destination_id: String(destination_id), user_id: ME, amount_usd: Number(amount_usd) }))

  const expenses: Expense[] = []
  const exp = (
    destination_id: string | null, category: Expense['category'], description: string, amount: number, currency: string,
    amount_usd: number, spent_on: string, opts: { method?: 'cash' | 'card'; paid_by?: string; split?: string[] } = {},
  ) => {
    const id = uuid()
    const paid_by = opts.paid_by ?? ME
    const shares = opts.split ? splitEqual(amount_usd, opts.split) : [{ user_id: ME, share_usd: amount_usd }]
    expenses.push({
      id, trip_id: tripId, destination_id, created_by: paid_by, paid_by, category, description, amount, currency, amount_usd,
      method: opts.method ?? 'card', card_debited_usd: (opts.method ?? 'card') === 'card' && currency !== 'USD' ? amount_usd : null,
      spent_on, created_at: new Date().toISOString(), shares: shares.map((s) => ({ ...s, expense_id: id })),
    })
  }
  const all = [ME, 'demo-so', 'demo-ma', 'demo-jp']
  // Pasajes y alojamiento reservados antes del viaje
  exp('d-mad', 'pasajes', 'Vuelo Montevideo → Madrid', 650, 'USD', 650, before)
  exp('d-par', 'pasajes', 'Vuelo Madrid → París', 120, 'USD', 120, before)
  exp('d-rom', 'pasajes', 'Vuelo París → Roma', 140, 'USD', 140, before)
  exp('d-lis', 'pasajes', 'Vuelo Roma → Lisboa', 150, 'USD', 150, before)
  exp('d-opo', 'pasajes', 'Tren Lisboa → Oporto', 40, 'USD', 40, before)
  exp(null, 'pasajes', 'Vuelo Oporto → Montevideo', 550, 'USD', 550, before)
  exp('d-mad', 'alojamiento', 'Hotel en Madrid · 4 noches', 440, 'USD', 440, before)
  exp('d-par', 'alojamiento', 'Hotel en París · 5 noches', 620, 'USD', 620, before)
  exp('d-rom', 'alojamiento', 'Hotel en Roma · 4 noches', 480, 'USD', 480, before)
  exp('d-lis', 'alojamiento', 'Apartamento en Lisboa · 2 noches', 240, 'USD', 240, before)
  // Madrid (finalizado)
  exp('d-mad', 'comida', 'Comidas en Madrid', 188.02, 'EUR', 203.06, d(1))
  exp('d-mad', 'tours', 'Museo del Prado y tour', 138.9, 'EUR', 150, d(2))
  exp('d-mad', 'transporte', 'Metro y taxis', 55.56, 'EUR', 60, d(2))
  exp('d-mad', 'salidas', 'Salida en La Latina', 83.33, 'EUR', 90, d(3))
  exp('d-mad', 'comida', 'Supermercado', 31.37, 'EUR', 33.88, d(3), { split: [ME, 'demo-ma'] })
  // París (actual)
  exp('d-par', 'transporte', 'Taxi al hotel', 55.56, 'EUR', 60, d(4), { paid_by: 'demo-jp', split: all })
  exp('d-par', 'compras', 'Compras en Le Bon Marché', 351.85, 'EUR', 380, d(4))
  exp('d-par', 'tours', 'Excursión a Versalles', 134.83, 'EUR', 145.62, d(4))
  exp('d-par', 'comida', 'Cena en Saint-Germain', 111.11, 'EUR', 120, d(5))
  exp('d-par', 'salidas', 'Bar en Montmartre', 32, 'EUR', 34.56, d(5))
  exp('d-par', 'comida', 'Almuerzo en el Marais', 24, 'EUR', 25.92, d(5))
  exp('d-par', 'tours', 'Crucero por el Sena', 18, 'EUR', 19.44, d(5))
  exp('d-par', 'comida', 'Cena en Le Marais', 45, 'EUR', 49.1, d(6), { split: all })
  exp('d-par', 'tours', 'Museo de Orsay', 16, 'EUR', 17.4, d(6))
  exp('d-par', 'transporte', 'Metro ida y vuelta', 4.3, 'EUR', 4.78, d(6), { method: 'cash' })

  const purchases: Purchase[] = [
    { id: uuid(), trip_id: tripId, user_id: ME, paid_amount: 100, paid_currency: 'USD', paid_usd: 100, received_amount: 90, currency: 'EUR', place: 'Casa de cambio', bought_on: d(5) },
  ]

  return {
    signedIn: false,
    profiles,
    trips: [{ id: tripId, name: 'Europa (ejemplo)', start_date: start, end_date: d(16), origin_city: 'Montevideo', invite_code: 'K7Q29P', created_by: ME }],
    members: all.map((user_id) => ({ trip_id: tripId, user_id, role: user_id === ME ? 'owner' : 'member' })),
    destinations,
    budgets,
    expenses,
    purchases,
    settlements: [],
  }
}

function load(): Store {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as Store
  } catch {
    /* ignorar */
  }
  return seed()
}

export function createDemoRepo(): Repo {
  let s = load()
  const listeners = new Set<(uid: string | null) => void>()
  const save = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(s))
    } catch {
      /* ignorar */
    }
  }
  const notify = () => listeners.forEach((l) => l(s.signedIn ? ME : null))
  const profile = (id: string) => s.profiles.find((p) => p.id === id) ?? { id, name: 'Viajero', avatar_url: null, equiv_currency: 'UYU' }

  const build = (trip: Trip): TripData => ({
    trip,
    members: s.members.filter((m) => m.trip_id === trip.id).map((m) => ({ ...m, profile: profile(m.user_id) })),
    destinations: s.destinations.filter((d) => d.trip_id === trip.id && (d.owner_id === null || d.owner_id === ME)),
    budgets: s.budgets.filter((b) => b.trip_id === trip.id && b.user_id === ME),
    expenses: s.expenses.filter((e) => e.trip_id === trip.id),
    purchases: s.purchases.filter((p) => p.trip_id === trip.id && p.user_id === ME),
    settlements: s.settlements.filter((x) => x.trip_id === trip.id),
  })

  const myTrips = () => s.trips.filter((t) => s.members.some((m) => m.trip_id === t.id && m.user_id === ME))

  const setBudgetRaw = (tripId: string, destinationId: string, amount: number) => {
    const b = s.budgets.find((x) => x.destination_id === destinationId && x.user_id === ME)
    if (b) b.amount_usd = Math.max(amount, 0)
    else s.budgets.push({ id: uuid(), trip_id: tripId, destination_id: destinationId, user_id: ME, amount_usd: Math.max(amount, 0) })
  }

  return {
    mode: 'demo',
    async currentUserId() {
      return s.signedIn ? ME : null
    },
    onAuthChange(cb) {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    async signInWithGoogle() {
      s.signedIn = true
      save()
      notify()
    },
    async signOut() {
      s.signedIn = false
      save()
      notify()
    },
    async getProfile(id) {
      return profile(id)
    },
    async updateProfile(patch) {
      const p = s.profiles.find((x) => x.id === ME)
      if (p) Object.assign(p, patch)
      save()
    },
    async loadAllTrips() {
      return myTrips().map(build)
    },
    async loadTrip(tripId) {
      const t = myTrips().find((x) => x.id === tripId)
      if (!t) throw new Error('No se encontró el viaje')
      return build(t)
    },
    async createTrip(t) {
      const trip: Trip = { ...t, id: uuid(), invite_code: Math.random().toString(36).slice(2, 8).toUpperCase(), created_by: ME }
      s.trips.push(trip)
      s.members.push({ trip_id: trip.id, user_id: ME, role: 'owner' })
      save()
      return trip
    },
    async updateTrip(id, patch) {
      const t = s.trips.find((x) => x.id === id)
      if (t) Object.assign(t, patch)
      save()
    },
    async joinTrip(code) {
      const c = code.replace(/[\s·]/g, '').toUpperCase()
      const t = s.trips.find((x) => x.invite_code === c)
      if (!t) throw new Error('Código no válido')
      if (!s.members.some((m) => m.trip_id === t.id && m.user_id === ME)) s.members.push({ trip_id: t.id, user_id: ME, role: 'member' })
      save()
      return t.id
    },
    async leaveTrip(tripId) {
      s.members = s.members.filter((m) => !(m.trip_id === tripId && m.user_id === ME))
      save()
    },
    async saveDestination(d) {
      if (d.id) {
        const cur = s.destinations.find((x) => x.id === d.id)
        if (cur) Object.assign(cur, d)
        save()
        return cur as Destination
      }
      const created: Destination = { ...d, id: uuid() }
      s.destinations.push(created)
      save()
      return created
    },
    async deleteDestination(id) {
      s.destinations = s.destinations.filter((x) => x.id !== id)
      s.budgets = s.budgets.filter((b) => b.destination_id !== id)
      s.expenses.forEach((e) => {
        if (e.destination_id === id) e.destination_id = null
      })
      save()
    },
    async setBudget(tripId, destinationId, amountUsd) {
      setBudgetRaw(tripId, destinationId, amountUsd)
      save()
    },
    async moveBudget(tripId, fromDest, toDest, amountUsd) {
      const cur = (d: string) => s.budgets.find((b) => b.destination_id === d && b.user_id === ME)?.amount_usd ?? 0
      const a = cur(fromDest)
      const b = cur(toDest)
      setBudgetRaw(tripId, fromDest, a - amountUsd)
      setBudgetRaw(tripId, toDest, b + amountUsd)
      save()
    },
    async addExpense(e) {
      const id = uuid()
      const shares = (e.shares.length ? e.shares : [{ user_id: ME, share_usd: e.amount_usd }]).map((x) => ({ ...x, expense_id: id }))
      s.expenses.push({ ...e, id, created_by: ME, created_at: new Date().toISOString(), shares })
      save()
    },
    async deleteExpense(id) {
      s.expenses = s.expenses.filter((e) => e.id !== id)
      save()
    },
    async addPurchase(p) {
      s.purchases.push({ ...p, id: uuid(), user_id: ME })
      save()
    },
    async deletePurchase(id) {
      s.purchases = s.purchases.filter((p) => p.id !== id)
      save()
    },
    async addSettlement(tripId, fromUser, toUser, amountUsd) {
      s.settlements.push({ id: uuid(), trip_id: tripId, from_user: fromUser, to_user: toUser, amount_usd: amountUsd, created_by: ME, created_at: new Date().toISOString() })
      save()
    },
  }
}

export function resetDemo() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignorar */
  }
}
