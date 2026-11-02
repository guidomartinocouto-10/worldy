import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useApp, useTrip } from '../app/AppContext'
import { Avatar, BottomNav, ErrorPage, Loading, Sheet } from '../components/ui'
import { InviteCard } from '../components/InviteCard'
import { FriendsArt, HeroDecor } from '../components/Illustrations'
import { ExpenseSheet } from '../components/ExpenseSheet'
import { balancesWith, myShare } from '../lib/calc'
import { firstName, money, num, parseAmount } from '../lib/format'
import { shortDate } from '../lib/dates'
import type { Expense } from '../lib/types'

export default function Group() {
  const { tripId } = useParams()
  const { uid, repo, toast } = useApp()
  const { data, error, reload } = useTrip(tripId)
  const [payOpen, setPayOpen] = useState(false)
  const [payWith, setPayWith] = useState<string>('')
  const [payDir, setPayDir] = useState<'i_paid' | 'they_paid'>('i_paid')
  const [payText, setPayText] = useState('')
  const [openExpense, setOpenExpense] = useState<Expense | null>(null)

  if (error) return <ErrorPage message={error} />
  if (!data || !uid) return <Loading />

  const others = data.members.filter((m) => m.user_id !== uid)
  const bal = balancesWith(data, uid)
  const net = [...bal.values()].reduce((a, v) => a + v, 0)
  const shared = data.expenses
    .filter((e) => e.shares.length > 1 && (e.paid_by === uid || myShare(e, uid) > 0))
    .sort((a, b) => (a.spent_on < b.spent_on ? 1 : -1))

  const openPay = (otherId: string) => {
    const v = bal.get(otherId) ?? 0
    setPayWith(otherId)
    setPayDir(v < 0 ? 'i_paid' : 'they_paid')
    setPayText(Math.abs(v) > 0 ? num(Math.abs(v)) : '')
    setPayOpen(true)
  }

  const savePay = async () => {
    const amount = parseAmount(payText)
    if (!(amount > 0) || !payWith) return
    try {
      if (payDir === 'i_paid') await repo.addSettlement(data.trip.id, uid, payWith, amount)
      else await repo.addSettlement(data.trip.id, payWith, uid, amount)
      toast('Pago registrado')
      setPayOpen(false)
      reload()
    } catch (e) {
      toast(e instanceof Error ? e.message : 'No se pudo registrar')
    }
  }

  return (
    <div className="app">
      <main className="page">
      <header className="hero">
        <HeroDecor />
        <div className="hero-top">
          <Link to="/" className="brand">Worldy</Link>
        </div>
        <p className="hero-sub">
          {data.trip.name} · {data.members.length} {data.members.length === 1 ? 'viajero' : 'viajeros'}
        </p>
        <h1 className="hero-title" style={{ fontSize: 30 }}>Cuentas del grupo</h1>
        {others.length > 0 && (
          <div className="row between" style={{ marginTop: 14, padding: '14px 16px', borderRadius: 16, background: 'rgba(255,255,255,0.12)' }}>
            <span className="text14" style={{ color: '#e4efe8' }}>Tu saldo</span>
            <div className="col" style={{ alignItems: 'flex-end' }}>
              <span className="small" style={{ color: 'var(--green-muted)' }}>
                {Math.abs(net) < 0.01 ? 'Están a mano' : net > 0 ? 'Te deben' : 'Debes'}
              </span>
              {Math.abs(net) >= 0.01 && (
                <span className="amount-hero" style={{ fontSize: 28, color: 'var(--yellow)' }}>
                  <span className="cur" style={{ fontSize: 13, verticalAlign: 10, color: 'var(--yellow)' }}>US$</span>
                  {num(Math.abs(net))}
                </span>
              )}
            </div>
          </div>
        )}
      </header>

      {others.length === 0 ? (
        <section className="section">
          <div className="card">
            <div className="empty-art" style={{ padding: 0 }}><FriendsArt /></div>
            <span className="text15 bold">Invita a tus compañeros</span>
            <span className="text13 muted">Comparte el código para que se unan al viaje. Cada uno carga sus gastos y define su presupuesto.</span>
            <InviteCard trip={data.trip} />
          </div>
        </section>
      ) : (
        <div className="desk-grid">
          <div className="desk-col">
          <section className="section">
            <h2 className="h2">Saldos</h2>
            <div className="card tight">
              {others.map((m) => {
                const v = bal.get(m.user_id) ?? 0
                return (
                  <button key={m.user_id} type="button" className="list-item" style={{ background: 'none', border: 'none', borderBottom: '1px solid var(--line-2)', width: '100%', textAlign: 'left' }} onClick={() => openPay(m.user_id)}>
                    <Avatar profile={m.profile} className={v < 0 ? '' : ''} />
                    <span className="grow text15 bold">{m.profile.name}</span>
                    <span className={`text14 semi ${v < 0 ? 'amber' : v > 0 ? 'green-text' : 'muted'}`}>
                      {Math.abs(v) < 0.01 ? 'A mano' : v > 0 ? `Te debe ${money(v)}` : `Le debes ${money(-v)}`}
                    </span>
                  </button>
                )
              })}
            </div>
            <button className="btn primary block" onClick={() => openPay(others[0].user_id)}>
              Registrar un pago
            </button>
          </section>

          <section className="section mt-lg">
            <h2 className="h2">Invitar a más viajeros</h2>
            <InviteCard trip={data.trip} />
          </section>
          </div>
          <div className="desk-col">
          <section className="section mt-lg" style={{ gap: 8 }}>
            <h2 className="h2" style={{ marginBottom: 4 }}>Gastos divididos</h2>
            {shared.length === 0 && <div className="empty">Todavía no hay gastos divididos. Al cargar un gasto, activa “Dividir gasto”.</div>}
            {shared.map((e) => {
              const payer = e.paid_by === uid ? 'Pagaste tú' : `Pagó ${firstName(data.members.find((m) => m.user_id === e.paid_by)?.profile.name ?? '')}`
              const mine = myShare(e, uid)
              const owedToMe = e.paid_by === uid ? e.amount_usd - mine : 0
              return (
                <button key={e.id} type="button" className="tile" onClick={() => setOpenExpense(e)}>
                  <div className="col grow">
                    <span className="text15 semi ellipsis">{e.description || 'Gasto'}</span>
                    <span className="small muted">{payer} · entre {e.shares.length} · {shortDate(e.spent_on)}</span>
                  </div>
                  <div className="col" style={{ alignItems: 'flex-end' }}>
                    <span className="text15 amount">{money(e.amount_usd)}</span>
                    {e.paid_by === uid ? (
                      <span className="small semi green-text">Te deben {money(owedToMe)}</span>
                    ) : (
                      <span className="small semi amber">Debes {money(mine)}</span>
                    )}
                  </div>
                </button>
              )
            })}
          </section>

          </div>
        </div>
      )}

      {payOpen && (
        <Sheet title="Registrar un pago" onClose={() => setPayOpen(false)}>
          <div className="field">
            <label htmlFor="pay-with">Con</label>
            <select id="pay-with" className="input" value={payWith} onChange={(e) => setPayWith(e.target.value)}>
              {others.map((m) => <option key={m.user_id} value={m.user_id}>{m.profile.name}</option>)}
            </select>
          </div>
          <div className="seg">
            <button type="button" className={payDir === 'i_paid' ? 'on' : ''} onClick={() => setPayDir('i_paid')}>Yo le pagué</button>
            <button type="button" className={payDir === 'they_paid' ? 'on' : ''} onClick={() => setPayDir('they_paid')}>Me pagó</button>
          </div>
          <div className="field">
            <label htmlFor="pay-amount">Monto en dólares</label>
            <input id="pay-amount" className="input" inputMode="decimal" value={payText} onChange={(e) => setPayText(e.target.value)} />
          </div>
          <button className="btn primary block" onClick={savePay} disabled={!(parseAmount(payText) > 0)}>Guardar pago</button>
        </Sheet>
      )}
      {openExpense && (
        <ExpenseSheet e={openExpense} data={data} onClose={() => setOpenExpense(null)} onChanged={() => { setOpenExpense(null); reload() }} />
      )}
      </main>
      <BottomNav tripId={data.trip.id} active="grupo" />
    </div>
  )
}
