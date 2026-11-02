import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useApp, useTrip } from '../app/AppContext'
import { BottomNav, Bar, ErrorPage, HeroAmount, Loading } from '../components/ui'
import { IconAlert, IconCheck } from '../components/Icons'
import { HeroDecor, MapArt, ReceiptArt } from '../components/Illustrations'
import { BoardingPass, Stamp, greeting } from '../components/Travel'
import { ExpenseRow } from '../components/ExpenseRow'
import { MoveBudgetSheet } from '../components/MoveBudgetSheet'
import { ExpenseSheet } from '../components/ExpenseSheet'
import { currentAlert, destStats, myShare, totals } from '../lib/calc'
import { fromUSD } from '../lib/fx'
import { money, money0, initials } from '../lib/format'
import { dateRange, daysBetween, shortDate, todayISO } from '../lib/dates'
import type { Expense } from '../lib/types'

export default function TripHome() {
  const { tripId } = useParams()
  const { uid, profile, fx, repo, toast } = useApp()
  const { data, error, reload } = useTrip(tripId)
  const [moveOpen, setMoveOpen] = useState(false)
  const [openExpense, setOpenExpense] = useState<Expense | null>(null)

  if (error) return <ErrorPage message={error} />
  if (!data || !uid) return <Loading />

  const equiv = profile?.equiv_currency ?? 'UYU'
  const today = todayISO()
  const stats = destStats(data, uid, today)
  const tt = totals(data, uid)
  const alert = currentAlert(stats)
  const current = stats.find((s) => s.status === 'current')
  const upcoming = stats.filter((s) => s.status === 'upcoming').slice(0, 3)
  const pastLeft = stats.filter((s) => s.status === 'past' && s.left > 0.5)
  const recent = [...data.expenses]
    .filter((e) => myShare(e, uid) > 0 && e.spent_on >= data.trip.start_date)
    .sort((a, b) => (a.spent_on === b.spent_on ? (a.created_at < b.created_at ? 1 : -1) : a.spent_on < b.spent_on ? 1 : -1))
    .slice(0, 4)
  const totalDays = daysBetween(data.trip.start_date, data.trip.end_date) + 1
  const dayN = daysBetween(data.trip.start_date, today) + 1
  const started = today >= data.trip.start_date
  const ended = today > data.trip.end_date

  const applyMove = async (fromId: string, amount: number) => {
    if (!current) return
    try {
      await repo.moveBudget(data.trip.id, fromId, current.dest.id, amount)
      toast(`Se movieron ${money0(amount)} a ${current.dest.city}`)
      reload()
    } catch (e) {
      toast(e instanceof Error ? e.message : 'No se pudo mover el presupuesto')
    }
  }

  return (
    <div className="app">
      <main className="page">
      <header className="hero overlap">
        <HeroDecor />
        <div className="hero-top">
          <Link to="/" className="brand">Worldy</Link>
          <Link to="/perfil" className="avatar-btn" aria-label="Mi perfil">
            {profile?.avatar_url ? <img src={profile.avatar_url} alt="" referrerPolicy="no-referrer" /> : initials(profile?.name ?? '?')}
          </Link>
        </div>
        <p className="greeting">{greeting(profile?.name)}</p>
        <p className="hero-sub" style={{ marginTop: 2 }}>
          {dateRange(data.trip.start_date, data.trip.end_date)} · {data.members.length === 1 ? 'individual' : `${data.members.length} viajeros`}
        </p>
        <h1 className="hero-title">{data.trip.name}</h1>
        <div className="pills">
          <span className="pill">{stats.length} {stats.length === 1 ? 'destino' : 'destinos'}</span>
          <span className="pill">
            {!started ? `Faltan ${daysBetween(today, data.trip.start_date)} días` : ended ? 'Finalizado' : `Día ${dayN} de ${totalDays}`}
          </span>
        </div>
      </header>

      <div className="desk-grid">
      <div className="desk-col sticky">
      <section className="section" style={{ marginTop: 0 }}>
        <div className="card raised">
          <span className="text13 muted" style={{ fontWeight: 500 }}>Tu presupuesto en destino</span>
          <div className="row between baseline">
            <HeroAmount value={tt.spentInBudget} />
            <span className="text14 muted">de {money0(tt.budget)}</span>
          </div>
          <Bar pct={tt.budget ? tt.spentInBudget / tt.budget : 0} variant={tt.spentInBudget > tt.budget && tt.budget > 0 ? 'over' : undefined} />
          <div className="row between text13 ink2">
            <span>≈ {money0(fromUSD(tt.spentInBudget, equiv, fx.rates), equiv)}</span>
            <span>
              {tt.left >= 0 ? 'Quedan' : 'Excedido'} <strong className="semi">{money0(Math.abs(tt.left))}</strong>
            </span>
          </div>
          <div className="divider col" style={{ gap: 6 }}>
            <div className="row between text13 muted">
              <span>Pagado fuera del presupuesto</span>
              <span className="ink2">{money0(tt.outsideBudget)}</span>
            </div>
            <span className="small muted">
              Pasajes {money0(tt.pasajes)} · Alojamientos reservados {money0(tt.lodgingPrepaid)}
            </span>
            <div className="row between" style={{ marginTop: 4, alignItems: 'flex-start' }}>
              <span className="text14 bold">Tu costo total hasta hoy</span>
              <div className="col" style={{ alignItems: 'flex-end', flexShrink: 0 }}>
                <span className="text15 semi">{money0(tt.total)}</span>
                <span className="small muted">≈ {money0(fromUSD(tt.total, equiv, fx.rates), equiv)}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {alert && (
        <section className="section">
          <div className="card yellow" style={{ padding: 16 }}>
            <div className="row" style={{ alignItems: 'flex-start' }}>
              <div className="ico" style={{ background: 'var(--yellow)', color: 'var(--brown)' }}>
                <IconAlert />
              </div>
              <div className="col" style={{ gap: 4 }}>
                <strong className="brown" style={{ fontFamily: 'var(--display)', fontSize: 17 }}>
                  {alert.kind === 'over'
                    ? `Te pasaste en ${alert.stats.dest.city}`
                    : alert.kind === 'warning'
                      ? `¡Cuidado con ${alert.stats.dest.city}! ${Math.round(alert.stats.pct * 100)} %`
                      : `Vas rápido en ${alert.stats.dest.city}`}
                </strong>
                <span className="text13" style={{ color: 'var(--brown-2)', lineHeight: 1.45 }}>
                  Llevas {alert.stats.dayIndex} de {alert.stats.days} días y{' '}
                  {alert.stats.left >= 0 ? `te quedan ${money(alert.stats.left)}` : `excediste ${money(-alert.stats.left)}`}.
                  {alert.kind === 'pace' && ` A este ritmo gastarías ${money0(alert.projected)}.`}
                  {alert.suggestion && ` ${alert.suggestion.from.dest.city} tiene ${money0(alert.suggestion.from.left)} libres.`}
                </span>
              </div>
            </div>
            <div className="row" style={{ gap: 8 }}>
              {alert.suggestion && alert.suggestion.amount > 0 && (
                <button className="btn primary small grow" onClick={() => applyMove(alert.suggestion!.from.dest.id, alert.suggestion!.amount)}>
                  Mover {money0(alert.suggestion.amount)} de {alert.suggestion.from.dest.city}
                </button>
              )}
              <button className="btn ghost-yellow small" onClick={() => setMoveOpen(true)} style={!alert.suggestion ? { flex: 1 } : undefined}>
                {alert.suggestion ? 'Otro' : 'Mover presupuesto'}
              </button>
            </div>
          </div>
        </section>
      )}

      </div>
      <div className="desk-col">
      {!alert && current && current.budget > 0 && current.pct <= current.dayIndex / current.days && (
        <section className="section">
          <div className="cheer">
            <div className="ico"><IconCheck /></div>
            <div className="col">
              <strong className="text15">¡Vas muy bien en {current.dest.city}!</strong>
              <span className="text13" style={{ color: 'var(--green-mid)' }}>
                Usaste el {Math.round(current.pct * 100)} % del presupuesto y llevas {current.dayIndex} de {current.days} días.
              </span>
            </div>
          </div>
        </section>
      )}

      <section className="section mt-lg">
        <div className="section-head">
          <h2 className="h2">Tu ruta</h2>
          <Link to={`/v/${data.trip.id}/ruta`} className="link-btn">
            {stats.length ? 'Ver completa' : 'Armar ruta'}
          </Link>
        </div>

        {stats.length === 0 && (
          <div className="card empty-art">
            <MapArt />
            <p className="tl-city" style={{ fontSize: 19 }}>Tu mapa está en blanco</p>
            <span className="text14 muted">Agrega los destinos de tu viaje y cuánto planeas gastar en cada uno.</span>
            <Link to={`/v/${data.trip.id}/ruta`} className="btn primary small">
              Armar la ruta
            </Link>
          </div>
        )}

        {current && (
          <div className="card current" style={{ gap: 10 }}>
            <div className="row between">
              <span className="tag yellow">ESTÁS AQUÍ</span>
              <span className="text13" style={{ color: 'var(--brown-2)' }}>
                {dateRange(current.dest.start_date, current.dest.end_date)} · día {current.dayIndex} de {current.days}
              </span>
            </div>
            <div className="row between">
              <div className="col">
                <span className="tl-city" style={{ fontSize: 28 }}>{current.dest.city}</span>
                <span className="text14 muted">{current.dest.country}</span>
              </div>
              <span className="stamp-pop"><Stamp city={current.dest.city} label="Llegada" date={shortDate(current.dest.start_date)} tone="amber" size={68} /></span>
            </div>
            <Bar pct={current.pct} variant={current.pct > 1 ? 'over' : 'warn'} />
            <div className="row between text13">
              <span className="ink2">
                {money(current.spent)} de {money0(current.budget)}
              </span>
              <span className="bold amber">
                {current.left >= 0 ? `Quedan ${money(current.left)}` : `Excedido ${money(-current.left)}`}
              </span>
            </div>
          </div>
        )}

        {upcoming.length > 0 && (current || !started) && (
          <BoardingPass from={current?.dest ?? null} to={upcoming[0].dest} budget={upcoming[0].budget} />
        )}

        {upcoming.length > 0 && (
          <>
            <span className="label-caps" style={{ marginTop: 6 }}>Próximos · presupuesto libre</span>
            <div className="card tight">
              {upcoming.map((s, i) => (
                <div className="list-item" key={s.dest.id}>
                  <span className="num-badge">{i + 1}</span>
                  <div className="col grow">
                    <span className="text15 bold">
                      {s.dest.city} <span className="muted" style={{ fontWeight: 400 }}>· {s.dest.country}</span>
                    </span>
                    <span className="small muted">
                      {dateRange(s.dest.start_date, s.dest.end_date)} · presupuesto {money0(s.budget)}
                    </span>
                  </div>
                  <div className="col" style={{ alignItems: 'flex-end' }}>
                    <span className="text15 semi green-text">{money0(Math.max(s.left, 0))}</span>
                    <span className="small muted">libres</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {pastLeft.map((s) => (
          <div key={s.dest.id} className="card soft" style={{ padding: '12px 16px', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="text13 ink2">
              Ya visitado: <strong>{s.dest.city}</strong> · te sobraron {money0(s.left)}
            </span>
            {current && (
              <button className="link-btn" onClick={() => applyMove(s.dest.id, Math.floor(s.left))}>
                Usar
              </button>
            )}
          </div>
        ))}
      </section>

      <section className="section mt-lg" style={{ gap: 8 }}>
        <div className="section-head">
          <h2 className="h2">Últimos gastos</h2>
          {recent.length > 0 && (
            <Link to={`/v/${data.trip.id}/gastos`} className="link-btn">
              Ver todos
            </Link>
          )}
        </div>
        {recent.length === 0 && (
          <div className="card empty-art">
            <ReceiptArt size={110} />
            <span className="text14 muted">Aún no registraste gastos durante el viaje. Usa el botón + para agregar el primero.</span>
          </div>
        )}
        {recent.map((e) => (
          <ExpenseRow key={e.id} e={e} data={data} uid={uid} onClick={() => setOpenExpense(e)} />
        ))}
        {ended && (
          <Link to={`/v/${data.trip.id}/resumen`} className="btn primary block" style={{ marginTop: 8 }}>
            Ver resumen final del viaje
          </Link>
        )}
        {!ended && started && (
          <Link to={`/v/${data.trip.id}/resumen`} className="link-btn center">
            Ver resumen del viaje
          </Link>
        )}
      </section>

      </div>
      </div>

      {moveOpen && current && (
        <MoveBudgetSheet
          stats={stats}
          target={current}
          onClose={() => setMoveOpen(false)}
          onMove={async (fromId, amount) => {
            setMoveOpen(false)
            await applyMove(fromId, amount)
          }}
        />
      )}
      {openExpense && (
        <ExpenseSheet e={openExpense} data={data} onClose={() => setOpenExpense(null)} onChanged={() => { setOpenExpense(null); reload() }} />
      )}
      </main>
      <BottomNav tripId={data.trip.id} active="inicio" />
    </div>
  )
}
