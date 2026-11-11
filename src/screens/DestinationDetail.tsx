import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useApp, useTrip } from '../app/AppContext'
import { Bar, BottomNav, ErrorPage, HeroAmount, Loading } from '../components/ui'
import { IconBack, IconEdit, IconPlus } from '../components/Icons'
import { HeroDecor, ReceiptArt } from '../components/Illustrations'
import { Stamp } from '../components/Travel'
import { ExpenseRow } from '../components/ExpenseRow'
import { ExpenseSheet } from '../components/ExpenseSheet'
import { DestinationSheet } from '../components/DestinationSheet'
import { destStats, myShare, remainingOf } from '../lib/calc'
import { countryLabel, TRANSPORT, type Expense } from '../lib/types'
import { money, money0 } from '../lib/format'
import { dateRange, shortDate } from '../lib/dates'
import { fromUSD } from '../lib/fx'

export default function DestinationDetail() {
  const { tripId, destId } = useParams()
  const { uid, fx, profile } = useApp()
  const { data, error, reload } = useTrip(tripId)
  const [openExpense, setOpenExpense] = useState<Expense | null>(null)
  const [editing, setEditing] = useState(false)

  if (error) return <ErrorPage message={error} />
  if (!data || !uid) return <Loading />
  const stats = destStats(data, uid)
  const idx = stats.findIndex((s) => s.dest.id === destId)
  const s = stats[idx]
  if (!s) return <ErrorPage message="No se encontró este destino" />

  const equiv = profile?.equiv_currency ?? 'UYU'
  const list = data.expenses
    .filter((e) => e.destination_id === s.dest.id && (myShare(e, uid) > 0 || e.paid_from_fund))
    .sort((a, b) => (a.spent_on === b.spent_on ? (a.created_at < b.created_at ? 1 : -1) : a.spent_on < b.spent_on ? 1 : -1))
  const pend = list.filter((e) => remainingOf(e).local > 0.004)
  const variant = s.pct > 1 ? 'over' : s.pct >= 0.8 ? 'warn' : undefined
  const mode = TRANSPORT.find((t) => t.id === s.dest.transport_mode)?.label
  const prev = stats[idx - 1]
  const next = stats[idx + 1]

  return (
    <div className="app">
      <main className="page">
        <header className="hero">
          <HeroDecor />
          <div className="hero-top">
            <Link to={`/v/${data.trip.id}/ruta`} className="icon-btn" aria-label="Volver a la ruta"><IconBack /></Link>
            <button className="icon-btn" onClick={() => setEditing(true)} aria-label="Editar destino"><IconEdit size={18} /></button>
          </div>
          <div className="row between" style={{ marginTop: 10, alignItems: 'flex-end' }}>
            <div className="col" style={{ gap: 2 }}>
              <span className="hero-sub" style={{ margin: 0 }}>
                {[countryLabel(s.dest), dateRange(s.dest.start_date, s.dest.end_date), `${s.days} ${s.days === 1 ? 'noche' : 'noches'}`].filter(Boolean).join(' · ')}
              </span>
              <h1 className="hero-title">{s.dest.city}</h1>
              {s.status === 'current' && <span className="tag yellow" style={{ alignSelf: 'flex-start', marginTop: 6 }}>ESTÁS AQUÍ · DÍA {s.dayIndex} DE {s.days}</span>}
            </div>
            <span style={{ color: 'var(--yellow)' }}>
              <Stamp city={s.dest.city} label={s.status === 'past' ? 'Visitado' : 'Llegada'} date={shortDate(s.dest.start_date)} size={70} tone="amber" tilt={-10} />
            </span>
          </div>
        </header>

        <div className="desk-grid narrow-left">
          <div className="desk-col sticky">
            <section className="section">
              <div className="card">
                <span className="text13 muted" style={{ fontWeight: 500 }}>Tu presupuesto en {s.dest.city}</span>
                <div className="row between baseline">
                  <HeroAmount value={s.spent} size={38} />
                  <span className="text14 muted">de {money0(s.budget)}</span>
                </div>
                <Bar pct={s.pct} variant={variant} />
                <div className="row between text13 ink2">
                  <span>≈ {money0(fromUSD(s.spent, equiv, fx.rates), equiv)}</span>
                  <span>
                    {s.left >= 0 ? 'Quedan' : 'Excedido'} <strong className="semi">{money(Math.abs(s.left))}</strong>
                  </span>
                </div>
                {(s.lodgingPrepaid > 0 || mode) && (
                  <div className="divider col" style={{ gap: 4 }}>
                    {s.lodgingPrepaid > 0 && <span className="text13 muted">Alojamiento reservado (fuera del presupuesto): {money0(s.lodgingPrepaid)}</span>}
                    {mode && <span className="text13 muted">Llegada en {mode.toLowerCase()} · moneda local {s.dest.currency}</span>}
                  </div>
                )}
              </div>
              <Link to={`/v/${data.trip.id}/gasto?destino=${s.dest.id}`} className="btn accent block">
                <IconPlus size={20} /> Agregar gasto en {s.dest.city}
              </Link>
            </section>

            {pend.length > 0 && (
              <section className="section">
                <span className="label-caps" style={{ paddingLeft: 4 }}>Pagos pendientes</span>
                <div className="card yellow tight" style={{ padding: '4px 16px' }}>
                  {pend.map((e) => {
                    const r = remainingOf(e)
                    return (
                      <button key={e.id} type="button" className="list-item" style={{ background: 'none', border: 'none', borderBottom: '1px solid var(--yellow-line)', width: '100%', textAlign: 'left' }} onClick={() => setOpenExpense(e)}>
                        <div className="col grow">
                          <span className="text15 semi brown">{e.description || 'Seña'}</span>
                          <span className="small" style={{ color: 'var(--brown-2)' }}>
                            {e.payee ? `A ${e.payee}` : 'Saldo'}
                            {e.due_date ? ` · antes del ${shortDate(e.due_date)}` : ''}
                            {e.paid_from_fund ? ' · fondo común' : ''}
                          </span>
                        </div>
                        <span className="text15 semi brown">{money(r.local, e.currency, { decimals: 2 })}</span>
                      </button>
                    )
                  })}
                </div>
              </section>
            )}
          </div>

          <div className="desk-col">
            <section className="section mt-lg" style={{ gap: 8 }}>
              <div className="section-head">
                <h2 className="h2">Gastos en {s.dest.city}</h2>
                <span className="text13 muted">{list.length}</span>
              </div>
              {list.length === 0 && (
                <div className="card empty-art">
                  <ReceiptArt size={100} />
                  <span className="text14 muted">Todavía no hay gastos en este destino.</span>
                </div>
              )}
              {list.map((e) => (
                <ExpenseRow key={e.id} e={e} data={data} uid={uid} onClick={() => setOpenExpense(e)} />
              ))}
            </section>

            <section className="section mt-lg">
              <div className="grid2">
                {prev ? (
                  <Link to={`/v/${data.trip.id}/d/${prev.dest.id}`} className="btn ghost small" style={{ justifyContent: 'flex-start' }}>← {prev.dest.city}</Link>
                ) : <span />}
                {next ? (
                  <Link to={`/v/${data.trip.id}/d/${next.dest.id}`} className="btn ghost small" style={{ justifyContent: 'flex-end' }}>{next.dest.city} →</Link>
                ) : <span />}
              </div>
            </section>
          </div>
        </div>
      </main>

      {openExpense && (
        <ExpenseSheet e={openExpense} data={data} from="destino" onClose={() => setOpenExpense(null)} onChanged={() => { setOpenExpense(null); reload() }} />
      )}
      {editing && (
        <DestinationSheet
          data={data}
          dest={s.dest}
          budget={s.budget}
          defaultStart={s.dest.start_date}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false)
            reload()
          }}
        />
      )}
      <BottomNav tripId={data.trip.id} active="ruta" />
    </div>
  )
}
