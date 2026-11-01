import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../app/AppContext'
import { IconBack } from '../components/Icons'
import { addDays, todayISO } from '../lib/dates'
import type { Trip } from '../lib/types'
import { InviteCard } from '../components/InviteCard'

export default function NewTrip() {
  const { repo, toast } = useApp()
  const nav = useNavigate()
  const [name, setName] = useState('')
  const [start, setStart] = useState(addDays(todayISO(), 30))
  const [end, setEnd] = useState(addDays(todayISO(), 44))
  const [origin, setOrigin] = useState('Montevideo')
  const [busy, setBusy] = useState(false)
  const [created, setCreated] = useState<Trip | null>(null)

  const valid = name.trim().length > 0 && start && end && end >= start

  const create = async () => {
    if (!valid) return
    setBusy(true)
    try {
      const t = await repo.createTrip({ name: name.trim(), start_date: start, end_date: end, origin_city: origin.trim() })
      setCreated(t)
    } catch (e) {
      toast(e instanceof Error ? e.message : 'No se pudo crear el viaje')
    } finally {
      setBusy(false)
    }
  }

  if (created) {
    return (
      <div className="app no-nav">
        <header className="topbar">
          <span className="spacer44" />
          <span className="topbar-title">¡Viaje creado!</span>
          <span className="spacer44" />
        </header>
        <div className="section">
          <div className="card">
            <span className="tl-city" style={{ fontSize: 24 }}>{created.name}</span>
            <span className="text14 muted">Invita a tus compañeros de viaje. La ruta se comparte y cada viajero define su propio presupuesto.</span>
            <InviteCard trip={created} />
          </div>
        </div>
        <div className="section mt-lg">
          <button className="btn accent block" onClick={() => nav(`/v/${created.id}/ruta`)}>
            Armar la ruta
          </button>
          <span className="small muted center">Puedes invitar viajeros ahora o más adelante desde Grupo</span>
        </div>
      </div>
    )
  }

  return (
    <div className="app no-nav">
      <header className="topbar">
        <Link to="/" className="icon-btn light" aria-label="Volver">
          <IconBack />
        </Link>
        <span className="topbar-title">Nuevo viaje</span>
        <span className="spacer44" />
      </header>

      <div className="section">
        <div className="card" style={{ gap: 16 }}>
          <div className="field">
            <label htmlFor="nombre">Nombre del viaje</label>
            <input id="nombre" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Europa 2027" autoFocus />
          </div>
          <div className="grid2" style={{ gap: 10 }}>
            <div className="field">
              <label htmlFor="desde">Desde</label>
              <input id="desde" type="date" className="input" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="hasta">Hasta</label>
              <input id="hasta" type="date" className="input" value={end} min={start} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label htmlFor="salida">Ciudad de salida</label>
            <input id="salida" className="input" value={origin} onChange={(e) => setOrigin(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="section">
        <div className="card soft">
          <span className="text14 semi">Monedas</span>
          <span className="text13 muted">
            Los presupuestos se definen en dólares (USD). Cada gasto muestra también su valor en tu moneda de equivalencia, que puedes cambiar en tu perfil.
          </span>
        </div>
      </div>

      <div className="section mt-lg">
        <button className="btn accent block" onClick={create} disabled={!valid || busy}>
          {busy ? 'Creando…' : 'Crear viaje'}
        </button>
      </div>
    </div>
  )
}
