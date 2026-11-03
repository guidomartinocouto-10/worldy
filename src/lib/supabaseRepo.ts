import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Repo } from './repo'
import type { Budget, Destination, Expense, Member, Profile, Purchase, Settlement, Trip, TripData } from './types'
import {
  enqueue, getQueue, isNetworkError, newId, readCache, recalledUid, rememberUid, removeFromQueue, saveCache, setStatus, getStatus,
} from './offline'

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
    let id: string | undefined
    try {
      const { data } = await sb.auth.getSession()
      id = data.session?.user.id
    } catch {
      /* sin conexión */
    }
    if (id) {
      rememberUid(id)
      return id
    }
    const recalled = !navigator.onLine ? recalledUid() : null
    if (recalled) return recalled
    throw new Error('No has iniciado sesión')
  }

  // ---------- Sin conexión: subir pendientes ----------
  async function pushExpense(e: Expense) {
    const { shares, pending: _p, ...row } = e
    void _p
    check(await sb.from('expenses').upsert(row, { onConflict: 'id', ignoreDuplicates: true }))
    const res = await sb
      .from('expense_shares')
      .upsert(shares.map((x) => ({ expense_id: e.id, user_id: x.user_id, share_usd: x.share_usd })), {
        onConflict: 'expense_id,user_id',
        ignoreDuplicates: true,
      })
    if (res.error) {
      if (isNetworkError(new Error(res.error.message))) throw new Error(res.error.message)
      // Si no se pudieron guardar las partes, se deshace el gasto para no dejarlo incompleto
      await sb.from('expenses').delete().eq('id', e.id)
      throw new Error(res.error.message)
    }
  }

  async function pushPurchase(p: Purchase) {
    const { pending: _p, ...row } = p
    void _p
    check(await sb.from('currency_purchases').upsert(row, { onConflict: 'id', ignoreDuplicates: true }))
  }

  async function flush() {
    if (getStatus().syncing || !navigator.onLine || getQueue().length === 0) return
    setStatus({ syncing: true })
    try {
      for (const item of getQueue()) {
        try {
          if (item.kind === 'expense') await pushExpense(item.expense)
          else await pushPurchase(item.purchase)
          removeFromQueue(item.kind === 'expense' ? item.expense.id : item.purchase.id)
        } catch (e) {
          if (isNetworkError(e)) break
          console.error('No se pudo subir un movimiento pendiente', e)
          removeFromQueue(item.kind === 'expense' ? item.expense.id : item.purchase.id)
        }
      }
    } finally {
      setStatus({ syncing: false })
    }
  }
  window.addEventListener('online', () => {
    flush()
  })
  setTimeout(() => flush(), 1500)

  /** Agrega a los datos los movimientos que todavía no se subieron */
  function withPending(d: TripData): TripData {
    const q = getQueue()
    const exp = q.flatMap((i) => (i.kind === 'expense' && i.expense.trip_id === d.trip.id && !d.expenses.some((e) => e.id === i.expense.id) ? [{ ...i.expense, pending: true }] : []))
    const pur = q.flatMap((i) => (i.kind === 'purchase' && i.purchase.trip_id === d.trip.id && !d.purchases.some((p) => p.id === i.purchase.id) ? [{ ...i.purchase, pending: true }] : []))
    return exp.length || pur.length ? { ...d, expenses: [...d.expenses, ...exp], purchases: [...d.purchases, ...pur] } : d
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
      try {
        const { data } = await sb.auth.getSession()
        const id = data.session?.user.id ?? null
        if (id) rememberUid(id)
        if (id || navigator.onLine) return id
      } catch {
        /* sin conexión */
      }
      return navigator.onLine ? null : recalledUid()
    },

    onAuthChange(cb) {
      const { data } = sb.auth.onAuthStateChange((event, session) => {
        const id = session?.user.id ?? null
        if (id) rememberUid(id)
        if (event === 'SIGNED_OUT') rememberUid(null)
        // Sin conexión no se cierra la sesión: se sigue usando la última cuenta
        if (!id && event !== 'SIGNED_OUT' && !navigator.onLine) return cb(recalledUid())
        cb(id)
      })
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
      try {
        const p = check(await sb.from('profiles').select('*').eq('id', id).maybeSingle()) as Profile | null
        const profile = p ?? { id, name: 'Viajero', avatar_url: null, equiv_currency: 'UYU' }
        saveCache(`profile:${id}`, profile)
        return profile
      } catch (e) {
        const c = readCache<Profile>(`profile:${id}`)
        if (c && isNetworkError(e)) return c.value
        throw e
      }
    },

    async updateProfile(patch) {
      const id = await uid()
      check(await sb.from('profiles').update(patch).eq('id', id))
    },

    async loadAllTrips() {
      try {
        flush()
        const id = await uid()
        const rows = check(await sb.from('trip_members').select('trip_id').eq('user_id', id)) as { trip_id: string }[]
        const all = await loadMany(rows.map((r) => r.trip_id))
        saveCache('all', all)
        all.forEach((d) => saveCache(`trip:${d.trip.id}`, d))
        setStatus({ cachedAt: null })
        return all.map(withPending)
      } catch (e) {
        const c = readCache<TripData[]>('all')
        if (c && isNetworkError(e)) {
          setStatus({ cachedAt: c.at, online: false })
          return c.value.map(withPending)
        }
        throw e
      }
    },

    async loadTrip(tripId) {
      try {
        flush()
        const [data] = await loadMany([tripId])
        if (!data) throw new Error('No se encontró el viaje')
        saveCache(`trip:${tripId}`, data)
        setStatus({ cachedAt: null })
        return withPending(data)
      } catch (e) {
        if (isNetworkError(e)) {
          const c = readCache<TripData>(`trip:${tripId}`)
          const fromAll = readCache<TripData[]>('all')
          const hit = c ?? (fromAll ? { at: fromAll.at, value: fromAll.value.find((d) => d.trip.id === tripId) } : null)
          if (hit?.value) {
            setStatus({ cachedAt: hit.at, online: false })
            return withPending(hit.value)
          }
          throw new Error('Sin conexión. Abre este viaje una vez con internet para poder usarlo sin conexión.')
        }
        throw e
      }
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
      const me = await uid()
      const expenseId = newId()
      const finalShares = e.shares.length ? e.shares : [{ user_id: me, share_usd: e.amount_usd }]
      const full: Expense = {
        ...e,
        id: expenseId,
        created_by: me,
        created_at: new Date().toISOString(),
        shares: finalShares.map((s) => ({ ...s, expense_id: expenseId })),
      }
      if (!navigator.onLine) {
        enqueue({ kind: 'expense', expense: full })
        return
      }
      try {
        await pushExpense(full)
      } catch (err) {
        if (!isNetworkError(err)) throw err
        enqueue({ kind: 'expense', expense: full })
      }
    },

    async deleteExpense(expenseId) {
      if (removeFromQueue(expenseId)) return
      check(await sb.from('expenses').delete().eq('id', expenseId))
    },

    async addPurchase(p) {
      const me = await uid()
      const full: Purchase = { ...p, id: newId(), user_id: me }
      if (!navigator.onLine) {
        enqueue({ kind: 'purchase', purchase: full })
        return
      }
      try {
        await pushPurchase(full)
      } catch (err) {
        if (!isNetworkError(err)) throw err
        enqueue({ kind: 'purchase', purchase: full })
      }
    },

    async deletePurchase(purchaseId) {
      if (removeFromQueue(purchaseId)) return
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
