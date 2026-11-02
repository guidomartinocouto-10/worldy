import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../app/AppContext'
import type { TripData } from '../lib/types'
import { totals, destStats } from '../lib/calc'
import { money0 } from '../lib/format'
import { dateRange, daysBetween, todayISO } from '../lib/dates'
import { Avatar, Bar, Loading, Sheet } from '../components/ui'
import { IconPlus } from '../components/Icons'
import { HeroDecor, SuitcaseArt } from '../components/Illustrations'
import { Stamp, greeting } from '../components/Travel'

export default function Trips() {
  const { repo, uid, profile, toast } = useApp()
  const nav = useNavigate()
  const [trips, setTrips] = useState<TripData[] | null>(null)
  const [joinOpen, setJoinOpen] = useState(false)
  const [code, setCode] = useState('')
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    repo.loadAllTrips().then(setTrips).catch((e) => {
      setTrips([])
      toast(e instanceof Error ? e.message : 'Error al cargar')
    })
  }, [repo, toast])

  if (!trips || !uid) return <Loading />
  const today = todayISO()
  const sorted = [...trips].sort((a, b) => (a.trip.start_date < b.trip.start_date ? 1 : -1))
  const current = sorted.filter((t) => t.trip.start_date <= today && today <= t.trip.end_date)
  const upcoming = sorted.filter((t) => t.trip.start_date > today).reverse()
  const past = sorted.filter((t) => t.trip.end_date < today)

  const join = async () => {
    setErr(null)
    try {
      const id = await repo.joinTrip(code)
      nav(`/v/${id}`)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Código no válido')
    }
  }

  return (
    <div className="app no-nav">
      <header className="topbar" style={{ paddingLeft: 20, paddingRight: 20 }}>
        <span className="brand" style={{ color: 'var(--green)' }}>
          Worldy
        </span>
        <Link to="/perfil" className="avatar-btn" style={{ background: '#fff', color: 'var(--green)' }} aria-label="Mi perfil">
          {profile?.avatar_url ? <img src={profile.avatar_url} alt="" referrerPolicy="no-referrer" /> : (profile?.name ?? '?').slice(0, 2).toUpperCase()}
        </Link>
      </header>
      <div style={{ padding: '8px 20px 0' }}>
        <p className="text14 muted" style={{ margin: 0 }}>
          {greeting(profile?.name)}
        </p>
        <h1 className="hero-title">Mis viajes</h1>
      </div>

      {trips.length === 0 && (
        <div className="section">
          <div className="card empty-art">
            <SuitcaseArt />
            <p className="tl-city" style={{ fontSize: 20 }}>¿A dónde vamos?</p>
            <p className="text14 muted" style={{ maxWidth: 280 }}>
              Crea tu primer viaje o únete al de tus amigos con su código de invitación.
            </p>
          </div>
        </div>
      )}

      {current.length > 0 && (
        <section className="section">
          <span className="label-caps" style={{ paddingLeft: 4 }}>En curso</span>
          {current.map((t) => {
            const tt = totals(t, uid)
            const cur = destStats(t, uid).find((s) => s.status === 'current')
            return (
              <Link key={t.trip.id} to={`/v/${t.trip.id}`} className="card hero" style={{ background: 'var(--green)', color: '#fff', border: 'none', textDecoration: 'none', borderRadius: 22, padding: 20, gap: 12 }}>
                <HeroDecor />
                <div className="row between" style={{ alignItems: 'flex-start' }}>
                  <div className="col">
                    <span className="tl-city" style={{ fontSize: 24 }}>{t.trip.name}</span>
                    <span className="text13" style={{ color: 'var(--green-muted)' }}>
                      {dateRange(t.trip.start_date, t.trip.end_date)} · día {daysBetween(t.trip.start_date, today) + 1} de {daysBetween(t.trip.start_date, t.trip.end_date) + 1}
                    </span>
                  </div>
                  {cur && <span className="tag yellow">{cur.dest.city.toUpperCase()}</span>}
                </div>
                <div className="row">
                  <div className="row" style={{ gap: 0 }}>
                    {t.members.slice(0, 5).map((m, i) => (
                      <span key={m.user_id} style={{ marginLeft: i ? -8 : 0 }}>
                        <Avatar profile={m.profile} size={32} className="sel" />
                      </span>
                    ))}
                  </div>
                  <span className="grow" />
                  <span className="text13" style={{ color: 'var(--green-muted)' }}>
                    {money0(tt.spentInBudget)} de {money0(tt.budget)}
                  </span>
                </div>
                <div className="bar thin" style={{ background: 'rgba(255,255,255,0.18)' }}>
                  <div style={{ width: `${Math.min(tt.budget ? tt.spentInBudget / tt.budget : 0, 1) * 100}%`, background: 'var(--yellow)' }} />
                </div>
              </Link>
            )
          })}
        </section>
      )}

      {upcoming.length > 0 && (
        <section className="section mt-lg">
          <span className="label-caps" style={{ paddingLeft: 4 }}>En planificación</span>
          {upcoming.map((t) => (
            <TripRow key={t.trip.id} t={t} uid={uid} />
          ))}
        </section>
      )}

      {past.length > 0 && (
        <section className="section mt-lg">
          <span className="label-caps" style={{ paddingLeft: 4 }}>Finalizados</span>
          {past.map((t) => (
            <TripRow key={t.trip.id} t={t} uid={uid} past />
          ))}
        </section>
      )}

      <div className="section mt-lg" style={{ gap: 10 }}>
        <Link to="/nuevo" className="btn accent block">
          <IconPlus size={18} />
          Crear viaje
        </Link>
        <button className="btn ghost block" onClick={() => setJoinOpen(true)}>
          Unirme con un código
        </button>
      </div>

      {joinOpen && (
        <Sheet title="Unirme a un viaje" onClose={() => setJoinOpen(false)}>
          <div className="field">
            <label htmlFor="code">Código de invitación</label>
            <input id="code" className="input" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Ej. K7Q29P" autoCapitalize="characters" style={{ letterSpacing: 2, fontWeight: 600 }} />
          </div>
          {err && <p className="error">{err}</p>}
          <button className="btn primary block" onClick={join} disabled={code.replace(/\W/g, '').length < 4}>
            Unirme
          </button>
        </Sheet>
      )}
    </div>
  )
}

function TripRow({ t, uid, past }: { t: TripData; uid: string; past?: boolean }) {
  const tt = totals(t, uid)
  return (
    <Link to={past ? `/v/${t.trip.id}/resumen` : `/v/${t.trip.id}`} className={`card${past ? ' soft' : ''}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div className="row between">
        <div className="col">
          <span className="tl-city" style={past ? { color: 'var(--ink-2)' } : undefined}>{t.trip.name}</span>
          <span className="text13 muted">
            {dateRange(t.trip.start_date, t.trip.end_date)} · {t.destinations.length} destinos · {t.members.length === 1 ? 'individual' : `${t.members.length} viajeros`}
          </span>
        </div>
        <div className="col" style={{ alignItems: 'flex-end' }}>
          <span className="text15 amount">{money0(past ? tt.total : tt.estimated)}</span>
          <span className="small muted">{past ? 'gasto total' : 'estimado'}</span>
        </div>
      </div>
      {!past && tt.budget > 0 && <Bar pct={tt.budget ? tt.spentInBudget / tt.budget : 0} thin />}
      {past && t.destinations.length > 0 && (
        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
          {t.destinations.slice(0, 6).map((d, i) => (
            <Stamp key={d.id} city={d.city} size={46} tilt={[-10, 6, -4, 9, -7, 3][i]} tone={i % 2 ? 'amber' : 'green'} />
          ))}
        </div>
      )}
    </Link>
  )
}
