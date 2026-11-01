export type CategoryId =
  | 'alojamiento'
  | 'comida'
  | 'transporte'
  | 'actividades'
  | 'tours'
  | 'salidas'
  | 'compras'
  | 'seguros'
  | 'pasajes'
  | 'otros'

export const CATEGORIES: { id: CategoryId; label: string }[] = [
  { id: 'alojamiento', label: 'Alojamiento' },
  { id: 'comida', label: 'Comida' },
  { id: 'transporte', label: 'Transporte' },
  { id: 'actividades', label: 'Actividades' },
  { id: 'tours', label: 'Tours' },
  { id: 'salidas', label: 'Salidas nocturnas' },
  { id: 'compras', label: 'Compras' },
  { id: 'seguros', label: 'Seguros' },
  { id: 'pasajes', label: 'Pasajes' },
  { id: 'otros', label: 'Otros' },
]

export const categoryLabel = (id: string) => CATEGORIES.find((c) => c.id === id)?.label ?? id

export type TransportMode = 'vuelo' | 'tren' | 'bus' | 'auto' | 'barco' | 'otro'
export const TRANSPORT: { id: TransportMode; label: string }[] = [
  { id: 'vuelo', label: 'Vuelo' },
  { id: 'tren', label: 'Tren' },
  { id: 'bus', label: 'Bus' },
  { id: 'auto', label: 'Auto' },
  { id: 'barco', label: 'Barco' },
  { id: 'otro', label: 'Otro' },
]

export interface Profile {
  id: string
  name: string
  avatar_url: string | null
  equiv_currency: string
}

export interface Trip {
  id: string
  name: string
  start_date: string
  end_date: string
  origin_city: string
  invite_code: string
  created_by: string
}

export interface Member {
  trip_id: string
  user_id: string
  role: 'owner' | 'member'
  profile: Profile
}

export interface Destination {
  id: string
  trip_id: string
  city: string
  country: string
  currency: string
  start_date: string
  end_date: string
  position: number
  owner_id: string | null
  transport_mode: TransportMode
}

export interface Budget {
  id: string
  trip_id: string
  destination_id: string
  user_id: string
  amount_usd: number
}

export interface Share {
  expense_id: string
  user_id: string
  share_usd: number
}

export interface Expense {
  id: string
  trip_id: string
  destination_id: string | null
  created_by: string
  paid_by: string
  category: CategoryId
  description: string
  amount: number
  currency: string
  amount_usd: number
  method: 'cash' | 'card'
  card_debited_usd: number | null
  spent_on: string
  created_at: string
  shares: Share[]
}

export interface Purchase {
  id: string
  trip_id: string
  user_id: string
  paid_amount: number
  paid_currency: string
  paid_usd: number
  received_amount: number
  currency: string
  place: string
  bought_on: string
}

export interface Settlement {
  id: string
  trip_id: string
  from_user: string
  to_user: string
  amount_usd: number
  created_by: string
  created_at: string
}

export interface TripData {
  trip: Trip
  members: Member[]
  destinations: Destination[]
  budgets: Budget[]
  expenses: Expense[]
  purchases: Purchase[]
  settlements: Settlement[]
}

export interface TripSummary {
  trip: Trip
  memberCount: number
  destinationCount: number
  myBudget: number
  mySpent: number
  myTotal: number
}

export type NewExpense = Omit<Expense, 'id' | 'created_at' | 'shares' | 'created_by'> & {
  shares: { user_id: string; share_usd: number }[]
}
export type NewDestination = Omit<Destination, 'id'>
export type NewPurchase = Omit<Purchase, 'id' | 'user_id'>
