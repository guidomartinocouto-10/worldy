import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useApp, useTrip } from '../app/AppContext'
import { BottomNav, ErrorPage, Loading } from '../components/ui'
import { IconHome, IconPlane, IconPlus, IconTrain } from '../components/Icons'
import { DestinationSheet } from '../components/DestinationSheet'
import { HeroDecor, MapArt } from '../components/Illustrations'
import { Stamp } from '../components/Travel'
import { MoveBudgetSheet } from '../components/MoveBudgetSheet'
import { destStats, myShare, pendingPayments, totals, type DestStats } from '../lib/calc'
import { money0, money } from '../lib/format'
import { dateRange, nights, shortDate } from '../lib/dates'
import { TRANSPORT, countryLabel, type Destination } from '../lib/types'

export default function Route() {
  const { tripId } = useParams()
  const { uid, repo, toast } = useApp()
  const { data, error, reload } = useTrip(tripId)
  const nav = useNavigate()
  const [editing, setEditing] = useState<Destination | 'new' | null>(null)
  const [moveOpen, setMoveOpen] = useState(false)

  if (error) return <ErrorPage message={error} />
  if (!data || !uid) return <Loading />

  const stats = destStats(data, uid)
  const pending = pendingPayments(data, uid)
  const tt = totals(data, uid)
  const isGroup = data.members.length > 1
  const lastEnd = stats.length ? stats[stats.length - 1].dest.end_date : data.trip.start_date
  const legCost = (destId: string | null) =>
    data.expenses.filter((e) => e.category === 'pasajes' && e.destination_id === destId).reduce((a, e) => a + myShare(e, uid), 0)
  const generalPasajes = legCost(null)

  return (
    <div className="app">
      <main className="page">
      <header className="hero">
        <HeroDecor />
        <div className="hero-top">
          <Link to="/" className="brand">Worldy</Link>
        </div>
        <p className="hero-sub">
          {data.trip.name} · {dateRange(data.trip.start_date, data.trip.end_date)} · {nights(data.trip.start_date, data.trip.end_date)} noches
        </p>
        <h1 className="hero-title" style={{ fontSize: 30 }}>Planifica tu ruta</h1>
        {isGroup && (
          <div className="pills">
            <span className="pill">Ruta compartida con {data.members.length} viajeros · presupuesto personal</span>
          </div>
        )}
      </header>

      <div className="desk-grid narrow-left">
      <div className="desk-col sticky">
      <section className="section">
        <div className="card">
          <div className="row between baseline">
            <span className="text13 muted" style={{ fontWeight: 500 }}>Tus pagos fuera del presupuesto</span>
            <span className="text15 semi">{money0(tt.outsideBudget)}</span>
          </div>
          <div className="grid2">
            <div className="card soft" style={{ padding: '10px 12px', gap: 2 }}>
              <span className="small bold muted" style={{ letterSpacing: 0.5 }}>PASAJES</span>
              <span className="text15 semi">{money0(tt.pasajes)}</span>
            </div>
            <div className="card soft" style={{ padding: '10px 12px', gap: 2 }}>
              <span className="small bold muted" style={{ letterSpacing: 0.5 }}>ALOJ. RESERVADO</span>
              <span className="text15 semi">{money0(tt.lodgingPrepaid)}</span>
            </div>
          </div>
          <div className="row between baseline" style={{ marginTop: 4 }}>
            <span className="text13 muted" style={{ fontWeight: 500 }}>Tu presupuesto en destino</span>
            <span className="text15 semi">{money0(tt.budget)}</span>
          </div>
          <div className="row between baseline divider">
            <span className="text14 bold">Tu costo estimado del viaje</span>
            <span className="text15 semi">{money0(tt.estimated)}</span>
          </div>
          {stats.length > 1 && (
            <button className="link-btn" style={{ alignSelf: 'flex-start', padding: 0 }} onClick={() => setMoveOpen(true)}>
              Mover presupuesto entre destinos
            </button>
          )}
        </div>
      </section>

      </div>
      <div className="desk-col">
      <section className="section mt-lg" style={{ gap: 0 }}>
        <div className="row" style={{ padding: '4px 0' }}>
          <span className="tl-dot" style={{ marginTop: 0 }}><IconHome size={16} /></span>
          <span className="text14 ink2">
            Salida desde <strong>{data.trip.origin_city || 'casa'}</strong> · {shortDate(data.trip.start_date)}
          </span>
        </div>

        {stats.length === 0 && (
          <div className="card empty-art" style={{ margin: '16px 0 0 44px' }}>
            <MapArt size={130} />
            <span className="text14 muted">Agrega tu primer destino: ciudad, fechas y cuánto planeas gastar allí.</span>
          </div>
        )}
        {stats.map((s, i) => (
          <Stop key={s.dest.id} s={s} index={i} cost={legCost(s.dest.id)} uid={uid} onEdit={() => nav(`/v/${data.trip.id}/d/${s.dest.id}`)} pendingCount={pending.filter((e) => e.destination_id === s.dest.id).length} />
        ))}

        <div className="tl-connector" style={{ minHeight: 28 }}>
          <div className="tl-line"><div /></div>
        </div>
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <span className="tl-dot" style={{ background: 'transparent', border: '2px dashed #8fae9a', marginTop: 12 }} />
          <div className="col grow" style={{ gap: 8 }}>
            <button className="add-dashed" onClick={() => setEditing('new')}>
              <IconPlus size={18} /> Agregar destino
            </button>
            {isGroup && <span className="small muted center">Para todo el grupo o solo para ti</span>}
          </div>
        </div>
        <div className="tl-connector" style={{ minHeight: 28 }}>
          <div className="tl-line"><div /></div>
        </div>
        <div className="row" style={{ padding: '4px 0' }}>
          <span className="tl-dot" style={{ marginTop: 0 }}><IconHome size={16} /></span>
          <span className="text14 ink2">
            Regreso a <strong>{data.trip.origin_city || 'casa'}</strong> · {shortDate(data.trip.end_date)}
            {generalPasajes > 0 && ` · otros pasajes ${money0(generalPasajes)}`}
          </span>
        </div>
        <p className="small muted" style={{ marginTop: 16 }}>
          Para registrar un pasaje, agrega un gasto con la categoría Pasajes y elige el destino de llegada.
        </p>
      </section>

      </div>
      </div>

      {editing && (
        <DestinationSheet
          data={data}
          dest={editing === 'new' ? null : editing}
          budget={editing === 'new' ? 0 : stats.find((s) => s.dest.id === editing.id)?.budget ?? 0}
          defaultStart={lastEnd}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            reload()
          }}
        />
      )}
      {moveOpen && (
        <MoveBudgetSheet
          stats={stats}
          onClose={() => setMoveOpen(false)}
          onMove={async (fromId, amount, toId) => {
            setMoveOpen(false)
            try {
              await repo.moveBudget(data.trip.id, fromId, toId, amount)
              toast('Presupuesto actualizado')
              reload()
            } catch (e) {
              toast(e instanceof Error ? e.message : 'No se pudo mover')
            }
          }}
        />
      )}
      </main>
      <BottomNav tripId={data.trip.id} active="ruta" />
    </div>
  )
}

function Stop({ s, index, cost, uid, onEdit, pendingCount }: { s: DestStats; index: number; cost: number; uid: string; onEdit: () => void; pendingCount: number }) {
  const mode = TRANSPORT.find((t) => t.id === s.dest.transport_mode)?.label ?? 'Traslado'
  const cls = s.status === 'current' ? 'current' : s.status === 'past' ? 'past' : ''
  return (
    <>
      <div className="tl-connector">
        <div className="tl-line"><div /></div>
        <span className="tl-chip">
          {s.dest.transport_mode === 'tren' ? <IconTrain /> : <IconPlane />}
          {mode}
          {cost > 0 && ` · ${money0(cost)}`}
        </span>
      </div>
      <div className="tl-stop">
        <span className={`tl-dot ${s.status === 'current' ? 'current' : ''}`}>{index + 1}</span>
        <button type="button" className={`tl-card ${cls}`} onClick={onEdit}>
          <div className="row between" style={{ width: '100%', alignItems: 'flex-start' }}>
            <span className="tl-city" style={s.status === 'past' ? { color: 'var(--ink-2)' } : undefined}>
              {s.dest.city}
              {s.dest.owner_id === uid && (
                <span className="tag" style={{ marginLeft: 6, verticalAlign: 'middle', fontFamily: 'var(--body)' }}>SOLO TÚ</span>
              )}
            </span>
            {s.status === 'past' ? (
              <span className="stamp-pop"><Stamp city={s.dest.city} label="Visitado" size={58} tilt={-12} /></span>
            ) : s.status === 'current' ? (
              <span className="small bold amber">ESTÁS AQUÍ</span>
            ) : (
              <span className="text15 semi">{money0(s.budget)}</span>
            )}
          </div>
          <span className={`text13 ${s.status === 'current' ? '' : 'muted'}`} style={s.status === 'current' ? { color: 'var(--brown-2)' } : undefined}>
            {[countryLabel(s.dest), dateRange(s.dest.start_date, s.dest.end_date), `${s.days} ${s.days === 1 ? 'noche' : 'noches'}`].filter(Boolean).join(' · ')}
          </span>
          {s.lodgingPrepaid > 0 ? (
            <span className="text13 ink2">Alojamiento reservado {money0(s.lodgingPrepaid)}</span>
          ) : s.status === 'upcoming' && s.lodgingTotal === 0 ? (
            <span className="text13 amber">Alojamiento sin reservar · se paga allá, dentro del presupuesto</span>
          ) : null}
          {(s.status !== 'upcoming' || s.spent > 0) && (
            <span className="text13 ink2">
              {s.status === 'upcoming' ? 'Ya cargado' : 'En destino'} {money(s.spent)} de {money0(s.budget)}
              {s.status === 'upcoming' && s.budget > 0 && ` · quedan ${money0(Math.max(s.left, 0))}`}
              {s.status === 'past' && s.left > 0 && (
                <>
                  {' · '}sobraron <strong className="green-text semi">{money0(s.left)}</strong>
                </>
              )}
            </span>
          )}
          {pendingCount > 0 && (
            <span className="text13 amber semi">
              {pendingCount === 1 ? '1 seña' : `${pendingCount} señas`} con saldo pendiente
            </span>
          )}
        </button>
      </div>
    </>
  )
}
