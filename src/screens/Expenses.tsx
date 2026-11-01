import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useApp, useTrip } from '../app/AppContext'
import { BottomNav, ErrorPage, Loading, Sheet, Bar } from '../components/ui'
import { IconSearch, IconSwap } from '../components/Icons'
import { ExpenseRow } from '../components/ExpenseRow'
import { ExpenseSheet } from '../components/ExpenseSheet'
import { myRoute, myShare, totals, wallets } from '../lib/calc'
import { CATEGORIES, categoryLabel, type Expense, type Purchase } from '../lib/types'
import { money, money0, num } from '../lib/format'
import { shortDate, todayISO, addDays } from '../lib/dates'

export default function Expenses() {
  const { tripId } = useParams()
  const { uid, repo, toast } = useApp()
  const { data, error, reload } = useTrip(tripId)
  const [q, setQ] = useState('')
  const [destFilter, setDestFilter] = useState<string>('all')
  const [catFilter, setCatFilter] = useState<string>('all')
  const [methodFilter, setMethodFilter] = useState<string>('all')
  const [view, setView] = useState<'day' | 'cat'>('day')
  const [openExpense, setOpenExpense] = useState<Expense | null>(null)
  const [openPurchase, setOpenPurchase] = useState<Purchase | null>(null)

  if (error) return <ErrorPage message={error} />
  if (!data || !uid) return <Loading />

  const tt = totals(data, uid)
  const route = myRoute(data, uid)
  const ws = wallets(data.purchases, data.expenses, uid).filter((w) => w.balance > 0.009)
  const text = q.trim().toLowerCase()
  const list = data.expenses
    .filter((e) => myShare(e, uid) > 0)
    .filter((e) => destFilter === 'all' || (destFilter === 'none' ? e.destination_id === null : e.destination_id === destFilter))
    .filter((e) => catFilter === 'all' || e.category === catFilter)
    .filter((e) => methodFilter === 'all' || e.method === methodFilter)
    .filter((e) => !text || e.description.toLowerCase().includes(text) || categoryLabel(e.category).toLowerCase().includes(text))
    .sort((a, b) => (a.spent_on === b.spent_on ? (a.created_at < b.created_at ? 1 : -1) : a.spent_on < b.spent_on ? 1 : -1))
  const purchases = data.purchases.filter((p) => !text && catFilter === 'all' && methodFilter !== 'card' && destFilter === 'all' && p.user_id === uid)

  const today = todayISO()
  const yesterday = addDays(today, -1)
  const dayLabel = (d: string) => (d < data.trip.start_date ? 'Antes del viaje' : d === today ? `Hoy · ${shortDate(d)}` : d === yesterday ? `Ayer · ${shortDate(d)}` : shortDate(d))

  // Agrupar por día (lo anterior al viaje queda en un solo grupo)
  type Item = { kind: 'e'; e: Expense } | { kind: 'p'; p: Purchase }
  const groups = new Map<string, Item[]>()
  const keyOf = (d: string) => (d < data.trip.start_date ? '0000-before' : d)
  for (const e of list) {
    const k = keyOf(e.spent_on)
    groups.set(k, [...(groups.get(k) ?? []), { kind: 'e', e }])
  }
  for (const p of purchases) {
    const k = keyOf(p.bought_on)
    groups.set(k, [...(groups.get(k) ?? []), { kind: 'p', p }])
  }
  const groupKeys = [...groups.keys()].sort((a, b) => (a < b ? 1 : -1))

  const catTotals = CATEGORIES.map((c) => ({
    ...c,
    usd: list.filter((e) => e.category === c.id).reduce((a, e) => a + myShare(e, uid), 0),
    count: list.filter((e) => e.category === c.id).length,
  })).filter((c) => c.count > 0).sort((a, b) => b.usd - a.usd)
  const maxCat = Math.max(...catTotals.map((c) => c.usd), 1)

  const delPurchase = async (p: Purchase) => {
    try {
      await repo.deletePurchase(p.id)
      toast('Compra eliminada')
      setOpenPurchase(null)
      reload()
    } catch (e) {
      toast(e instanceof Error ? e.message : 'No se pudo eliminar')
    }
  }

  return (
    <div className="app">
      <header className="hero">
        <div className="hero-top">
          <Link to="/" className="brand">Worldy</Link>
        </div>
        <h1 className="hero-title" style={{ fontSize: 30, marginTop: 10 }}>Mis gastos</h1>
        <div className="row between" style={{ marginTop: 10, alignItems: 'flex-end' }}>
          <div className="col" style={{ gap: 4 }}>
            <span className="small" style={{ color: 'var(--green-muted)' }}>En destino</span>
            <span className="amount-hero" style={{ fontSize: 34 }}>
              <span className="cur" style={{ fontSize: 14, verticalAlign: 14 }}>US$</span>
              {num(tt.spentInBudget, tt.spentInBudget >= 1000 ? 0 : 2)}
            </span>
          </div>
          <div className="col" style={{ alignItems: 'flex-end', gap: 4 }}>
            <span className="small" style={{ color: 'var(--green-muted)' }}>Fuera del presupuesto</span>
            <span className="amount-md" style={{ fontSize: 18 }}>{money0(tt.outsideBudget)}</span>
          </div>
        </div>
      </header>

      <section className="section">
        <label className="sr-only" htmlFor="buscar">Buscar gasto</label>
        <div className="input row" style={{ height: 48, borderColor: 'var(--line)', gap: 10 }}>
          <span className="muted" style={{ display: 'flex' }}><IconSearch /></span>
          <input id="buscar" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar gasto" style={{ border: 'none', outline: 'none', flex: 1, minWidth: 0, background: 'transparent', fontSize: 15 }} />
        </div>
        <div className="grid2" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
          <select aria-label="Destino" className="input" value={destFilter} onChange={(e) => setDestFilter(e.target.value)} style={{ height: 40, fontSize: 13, paddingLeft: 10 }}>
            <option value="all">Destinos</option>
            {route.map((d) => <option key={d.id} value={d.id}>{d.city}</option>)}
            <option value="none">General</option>
          </select>
          <select aria-label="Categoría" className="input" value={catFilter} onChange={(e) => setCatFilter(e.target.value)} style={{ height: 40, fontSize: 13, paddingLeft: 10 }}>
            <option value="all">Categorías</option>
            {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <select aria-label="Forma de pago" className="input" value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)} style={{ height: 40, fontSize: 13, paddingLeft: 10 }}>
            <option value="all">Pago</option>
            <option value="card">Tarjeta</option>
            <option value="cash">Efectivo</option>
          </select>
        </div>
        <div className="seg green">
          <button type="button" className={view === 'day' ? 'on' : ''} onClick={() => setView('day')}>Por día</button>
          <button type="button" className={view === 'cat' ? 'on' : ''} onClick={() => setView('cat')}>Por categoría</button>
        </div>
      </section>

      {ws.map((w) => (
        <section className="section" key={w.currency}>
          <div className="card yellow" style={{ padding: '14px 16px', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="col">
              <span className="small" style={{ color: 'var(--brown-2)' }}>Efectivo disponible</span>
              <span className="amount-md brown">{money(w.balance, w.currency, { decimals: 2 })}</span>
            </div>
            <span className="text13" style={{ color: 'var(--brown-2)' }}>≈ {money(w.balance * w.avgUsdPerUnit)}</span>
          </div>
        </section>
      ))}

      {view === 'day' &&
        groupKeys.map((k) => {
          const items = groups.get(k)!
          const sum = items.reduce((a, it) => a + (it.kind === 'e' ? myShare(it.e, uid) : 0), 0)
          const label = k === '0000-before' ? 'Antes del viaje' : dayLabel(k)
          return (
            <section className="section mt-lg" key={k} style={{ gap: 8, marginTop: 22 }}>
              <div className="row between baseline" style={{ padding: '0 4px' }}>
                <span className="text13 bold ink2">{label}</span>
                <span className="text13 muted">{money(sum)}</span>
              </div>
              {items.map((it) =>
                it.kind === 'e' ? (
                  <ExpenseRow key={it.e.id} e={it.e} data={data} uid={uid} onClick={() => setOpenExpense(it.e)} />
                ) : (
                  <button key={it.p.id} type="button" className="tile dashed" onClick={() => setOpenPurchase(it.p)}>
                    <div className="ico yellow"><IconSwap /></div>
                    <div className="col grow">
                      <span className="text15 semi">Compra de {it.p.currency}</span>
                      <span className="small muted">{it.p.place || 'Cambio'} · no es un gasto</span>
                    </div>
                    <div className="col" style={{ alignItems: 'flex-end' }}>
                      <span className="text15 amount muted">{money(it.p.paid_amount, it.p.paid_currency)} → {money(it.p.received_amount, it.p.currency)}</span>
                      <span className="small muted">1 {it.p.currency} = US$ {num(it.p.paid_usd / it.p.received_amount)}</span>
                    </div>
                  </button>
                ),
              )}
            </section>
          )
        })}

      {view === 'cat' && (
        <section className="section">
          <div className="card">
            {catTotals.map((c) => (
              <div key={c.id} className="col" style={{ gap: 4 }}>
                <div className="row between text14">
                  <span>{c.label} <span className="muted small">· {c.count}</span></span>
                  <span className="semi">{money(c.usd)}</span>
                </div>
                <Bar pct={c.usd / maxCat} thin />
              </div>
            ))}
            {catTotals.length === 0 && <span className="text14 muted">Sin gastos con estos filtros.</span>}
          </div>
        </section>
      )}

      {view === 'day' && groupKeys.length === 0 && <div className="empty">No hay gastos con estos filtros.</div>}

      {openExpense && (
        <ExpenseSheet e={openExpense} data={data} onClose={() => setOpenExpense(null)} onChanged={() => { setOpenExpense(null); reload() }} />
      )}
      {openPurchase && (
        <Sheet title={`Compra de ${openPurchase.currency}`} onClose={() => setOpenPurchase(null)}>
          <div className="card tight">
            <div className="list-item text14"><span className="grow muted">Entregaste</span><span>{money(openPurchase.paid_amount, openPurchase.paid_currency)}</span></div>
            <div className="list-item text14"><span className="grow muted">Recibiste</span><span>{money(openPurchase.received_amount, openPurchase.currency)}</span></div>
            <div className="list-item text14"><span className="grow muted">Lugar</span><span>{openPurchase.place}</span></div>
            <div className="list-item text14"><span className="grow muted">Fecha</span><span>{shortDate(openPurchase.bought_on)}</span></div>
          </div>
          <button className="btn danger block" onClick={() => delPurchase(openPurchase)}>Eliminar compra</button>
        </Sheet>
      )}
      <BottomNav tripId={data.trip.id} active="gastos" />
    </div>
  )
}
