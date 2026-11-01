import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Repo } from './repo'
import type { Budget, Destination, Expense, Member, Profile, Purchase, Settlement, Trip, TripData } from './types'

const n = (v: unknown) => (v === null || v === undefined ? 0 : Number(v))

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data as T
}

export function createSupabaseRepo(url: string, anonKey: string): Repo {
  const sb: SupabaseClient = createClient(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  })

  async function uid(): Promise<string> {
    const { data } = await sb.auth.getSession()
    const id = data.session?.user.id
    if (!id) throw new Error('No has iniciado sesión')
    return id
  }

  async function loadMany(tripIds: string[]): Promise<TripData[]> {
    if (tripIds.length === 0) return []
    const [trips, members, dests, budgets, expenses, purchases, settlements] = await Promise.all([
      sb.from('trips').select('*').in('id', tripIds),
      sb.from('trip_members').select('*').in('trip_id', tripIds),
      sb.from('destinations').select('*').in('trip_id', tripIds),
      sb.from('budgets').select('*').in('trip_id', tripIds),
      sb.from('expenses').select('*, shares:expense_shares(*)').in('trip_id', tripIds),
      sb.from('currency_purchases').select('*').in('trip_id', tripIds),
      sb.from('settlements').select('*').in('trip_id', tripIds),
    ])
    const memberRows = check(members) as { trip_id: string; user_id: string; role: 'owner' | 'member' }[]
    const userIds = [...new Set(memberRows.map((m) => m.user_id))]
    const profiles = userIds.length
      ? (check(await sb.from('profiles').select('*').in('id', userIds)) as Profile[])
      : []
    const profileOf = (id: string): Profile =>
      profiles.find((p) => p.id === id) ?? { id, name: 'Viajero', avatar_url: null, equiv_currency: 'UYU' }

    const tripRows = check(trips) as Trip[]
    const destRows = (check(dests) as Destination[]).map((d) => ({ ...d, position: n(d.position) }))
    const budgetRows = (check(budgets) as Budget[]).map((b) => ({ ...b, amount_usd: n(b.amount_usd) }))
    const expenseRows = (check(expenses) as Expense[]).map((e) => ({
      ...e,
      amount: n(e.amount),
      amount_usd: n(e.amount_usd),
      card_debited_usd: e.card_debited_usd === null ? null : n(e.card_debited_usd),
      shares: (e.shares ?? []).map((s) => ({ ...s, share_usd: n(s.share_usd) })),
    }))
    const purchaseRows = (check(purchases) as Purchase[]).map((p) => ({
      ...p,
      paid_amount: n(p.paid_amount),
      paid_usd: n(p.paid_usd),
      received_amount: n(p.received_amount),
    }))
    const settlementRows = (check(settlements) as Settlement[]).map((s) => ({ ...s, amount_usd: n(s.amount_usd) }))

    return tripRows.map((trip) => ({
      trip,
      members: memberRows
        .filter((m) => m.trip_id === trip.id)
        .map<Member>((m) => ({ ...m, profile: profileOf(m.user_id) })),
      destinations: destRows.filter((d) => d.trip_id === trip.id),
      budgets: budgetRows.filter((b) => b.trip_id === trip.id),
      expenses: expenseRows.filter((e) => e.trip_id === trip.id),
      purchases: purchaseRows.filter((p) => p.trip_id === trip.id),
      settlements: settlementRows.filter((s) => s.trip_id === trip.id),
    }))
  }

  return {
    mode: 'supabase',

    async currentUserId() {
      const { data } = await sb.auth.getSession()
      return data.session?.user.id ?? null
    },

    onAuthChange(cb) {
      const { data } = sb.auth.onAuthStateChange((_e, session) => cb(session?.user.id ?? null))
      return () => data.subscription.unsubscribe()
    },

    async signInWithGoogle() {
      const { error } = await sb.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      })
      if (error) throw new Error(error.message)
    },

    async signOut() {
      await sb.auth.signOut()
    },

    async getProfile(id) {
      const p = check(await sb.from('profiles').select('*').eq('id', id).maybeSingle()) as Profile | null
      return p ?? { id, name: 'Viajero', avatar_url: null, equiv_currency: 'UYU' }
    },

    async updateProfile(patch) {
      const id = await uid()
      check(await sb.from('profiles').update(patch).eq('id', id))
    },

    async loadAllTrips() {
      const id = await uid()
      const rows = check(await sb.from('trip_members').select('trip_id').eq('user_id', id)) as { trip_id: string }[]
      return loadMany(rows.map((r) => r.trip_id))
    },

    async loadTrip(tripId) {
      const [data] = await loadMany([tripId])
      if (!data) throw new Error('No se encontró el viaje')
      return data
    },

    async createTrip(t) {
      const id = await uid()
      return check(await sb.from('trips').insert({ ...t, created_by: id }).select().single()) as Trip
    },

    async updateTrip(id, patch) {
      check(await sb.from('trips').update(patch).eq('id', id))
    },

    async joinTrip(code) {
      return check(await sb.rpc('join_trip', { code })) as string
    },

    async leaveTrip(tripId) {
      const id = await uid()
      check(await sb.from('trip_members').delete().eq('trip_id', tripId).eq('user_id', id))
    },

    async saveDestination(d) {
      const { id, ...rest } = d
      if (id) return check(await sb.from('destinations').update(rest).eq('id', id).select().single()) as Destination
      return check(await sb.from('destinations').insert(rest).select().single()) as Destination
    },

    async deleteDestination(id) {
      check(await sb.from('destinations').delete().eq('id', id))
    },

    async setBudget(tripId, destinationId, amountUsd) {
      const id = await uid()
      check(
        await sb
          .from('budgets')
          .upsert(
            { trip_id: tripId, destination_id: destinationId, user_id: id, amount_usd: amountUsd },
            { onConflict: 'destination_id,user_id' },
          ),
      )
    },

    async moveBudget(tripId, fromDest, toDest, amountUsd) {
      const id = await uid()
      const rows = check(
        await sb.from('budgets').select('*').eq('user_id', id).in('destination_id', [fromDest, toDest]),
      ) as Budget[]
      const cur = (d: string) => n(rows.find((r) => r.destination_id === d)?.amount_usd)
      const upsert = (d: string, v: number) =>
        sb
          .from('budgets')
          .upsert({ trip_id: tripId, destination_id: d, user_id: id, amount_usd: Math.max(v, 0) }, { onConflict: 'destination_id,user_id' })
      check(await upsert(fromDest, cur(fromDest) - amountUsd))
      check(await upsert(toDest, cur(toDest) + amountUsd))
      check(
        await sb
          .from('budget_moves')
          .insert({ trip_id: tripId, user_id: id, from_destination: fromDest, to_destination: toDest, amount_usd: amountUsd }),
      )
    },

    async addExpense(e) {
      const id = await uid()
      const { shares, ...row } = e
      const created = check(await sb.from('expenses').insert({ ...row, created_by: id }).select().single()) as Expense
      const finalShares = shares.length ? shares : [{ user_id: id, share_usd: e.amount_usd }]
      check(await sb.from('expense_shares').insert(finalShares.map((s) => ({ ...s, expense_id: created.id }))))
    },

    async deleteExpense(expenseId) {
      check(await sb.from('expenses').delete().eq('id', expenseId))
    },

    async addPurchase(p) {
      const id = await uid()
      check(await sb.from('currency_purchases').insert({ ...p, user_id: id }))
    },

    async deletePurchase(purchaseId) {
      check(await sb.from('currency_purchases').delete().eq('id', purchaseId))
    },

    async addSettlement(tripId, fromUser, toUser, amountUsd) {
      const id = await uid()
      check(
        await sb
          .from('settlements')
          .insert({ trip_id: tripId, from_user: fromUser, to_user: toUser, amount_usd: amountUsd, created_by: id }),
      )
    },
  }
}
