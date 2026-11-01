import type { Destination, NewDestination, NewExpense, NewPurchase, Profile, Trip, TripData } from './types'

/** Operaciones de datos de la app. Hay dos versiones: Supabase (real) y demo (en el teléfono). */
export interface Repo {
  mode: 'supabase' | 'demo'
  currentUserId(): Promise<string | null>
  onAuthChange(cb: (uid: string | null) => void): () => void
  signInWithGoogle(): Promise<void>
  signOut(): Promise<void>

  getProfile(uid: string): Promise<Profile>
  updateProfile(patch: Partial<Pick<Profile, 'name' | 'equiv_currency'>>): Promise<void>

  loadAllTrips(): Promise<TripData[]>
  loadTrip(tripId: string): Promise<TripData>
  createTrip(t: Pick<Trip, 'name' | 'start_date' | 'end_date' | 'origin_city'>): Promise<Trip>
  updateTrip(id: string, patch: Partial<Pick<Trip, 'name' | 'start_date' | 'end_date' | 'origin_city'>>): Promise<void>
  joinTrip(code: string): Promise<string>
  leaveTrip(tripId: string): Promise<void>

  saveDestination(d: NewDestination & { id?: string }): Promise<Destination>
  deleteDestination(id: string): Promise<void>
  setBudget(tripId: string, destinationId: string, amountUsd: number): Promise<void>
  moveBudget(tripId: string, fromDest: string, toDest: string, amountUsd: number): Promise<void>

  addExpense(e: NewExpense): Promise<void>
  deleteExpense(id: string): Promise<void>
  addPurchase(p: NewPurchase): Promise<void>
  deletePurchase(id: string): Promise<void>
  addSettlement(tripId: string, fromUser: string, toUser: string, amountUsd: number): Promise<void>
}
