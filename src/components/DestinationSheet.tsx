import { useMemo, useState } from 'react'
import { Sheet, Switch } from './ui'
import { useApp } from '../app/AppContext'
import type { Destination, TransportMode, TripData } from '../lib/types'
import { TRANSPORT } from '../lib/types'
import { allCurrencies, currencyName, guessCurrency } from '../lib/fx'
import { parseAmount } from '../lib/format'
import { addDays } from '../lib/dates'

export function DestinationSheet({
  data,
  dest,
  budget,
  defaultStart,
  onClose,
  onSaved,
}: {
  data: TripData
  dest: Destination | null
  budget: number
  defaultStart: string
  onClose: () => void
  onSaved: () => void
}) {
  const { repo, uid, fx, toast } = useApp()
  const [city, setCity] = useState(dest?.city ?? '')
  const [country, setCountry] = useState(dest?.country ?? '')
  const [currency, setCurrency] = useState(dest?.currency ?? 'USD')
  const [currencyTouched, setCurrencyTouched] = useState(!!dest)
  const [start, setStart] = useState(dest?.start_date ?? defaultStart)
  const [end, setEnd] = useState(dest?.end_date ?? addDays(defaultStart, 3))
  const [mode, setMode] = useState<TransportMode>(dest?.transport_mode ?? 'vuelo')
  const [personal, setPersonal] = useState(dest ? dest.owner_id !== null : false)
  const [budgetText, setBudgetText] = useState(budget ? String(budget).replace('.', ',') : '')
  const [busy, setBusy] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const currencies = useMemo(() => allCurrencies(fx.rates), [fx.rates])
  const isGroup = data.members.length > 1
  const canEditShared = !dest || dest.owner_id === null || dest.owner_id === uid

  const onCountry = (v: string) => {
    setCountry(v)
    if (!currencyTouched) {
      const g = guessCurrency(v)
      if (g) setCurrency(g)
    }
  }

  const valid = city.trim() && start && end && end >= start
  const save = async () => {
    if (!valid || !uid) return
    setBusy(true)
    try {
      const saved = await repo.saveDestination({
        id: dest?.id,
        trip_id: data.trip.id,
        city: city.trim(),
        country: country.trim(),
        currency,
        start_date: start,
        end_date: end,
        position: dest?.position ?? data.destinations.length,
        owner_id: dest ? dest.owner_id : personal && isGroup ? uid : null,
        transport_mode: mode,
      })
      const b = parseAmount(budgetText)
      await repo.setBudget(data.trip.id, saved.id, Number.isFinite(b) ? Math.max(b, 0) : 0)
      toast(dest ? 'Destino actualizado' : 'Destino agregado')
      onSaved()
    } catch (e) {
      toast(e instanceof Error ? e.message : 'No se pudo guardar')
    } finally {
      setBusy(false)
    }
  }

  const del = async () => {
    if (!dest) return
    try {
      await repo.deleteDestination(dest.id)
      toast('Destino eliminado')
      onSaved()
    } catch (e) {
      toast(e instanceof Error ? e.message : 'No se pudo eliminar')
    }
  }

  return (
    <Sheet title={dest ? `Editar ${dest.city}` : 'Agregar destino'} onClose={onClose}>
      <div className="card" style={{ gap: 14 }}>
        <div className="grid2" style={{ gap: 10 }}>
          <div className="field">
            <label htmlFor="city">Ciudad</label>
            <input id="city" className="input" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ej. Roma" disabled={!canEditShared} />
          </div>
          <div className="field">
            <label htmlFor="country">País</label>
            <input id="country" className="input" value={country} onChange={(e) => onCountry(e.target.value)} placeholder="Ej. Italia" disabled={!canEditShared} />
          </div>
        </div>
        <div className="grid2" style={{ gap: 10 }}>
          <div className="field">
            <label htmlFor="d-start">Llegada</label>
            <input id="d-start" type="date" className="input" value={start} onChange={(e) => setStart(e.target.value)} disabled={!canEditShared} />
          </div>
          <div className="field">
            <label htmlFor="d-end">Salida</label>
            <input id="d-end" type="date" className="input" value={end} min={start} onChange={(e) => setEnd(e.target.value)} disabled={!canEditShared} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="d-cur">Moneda local</label>
          <select id="d-cur" className="input" value={currency} onChange={(e) => { setCurrency(e.target.value); setCurrencyTouched(true) }} disabled={!canEditShared}>
            {currencies.map((c) => (
              <option key={c} value={c}>
                {c} · {currencyName(c)}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <span className="label">Cómo llegas</span>
          <div className="chips">
            {TRANSPORT.map((t) => (
              <button key={t.id} type="button" className={`chip${mode === t.id ? ' on' : ''}`} onClick={() => setMode(t.id)} disabled={!canEditShared}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
        {isGroup && !dest && (
          <div className="row between">
            <div className="col">
              <span className="text15 bold">Solo para mí</span>
              <span className="small muted">Un destino personal no aparece en la ruta de los demás</span>
            </div>
            <Switch on={personal} onChange={setPersonal} label="Destino solo para mí" />
          </div>
        )}
      </div>

      <div className="card">
        <div className="field">
          <label htmlFor="d-budget">Tu presupuesto en destino (USD)</label>
          <input id="d-budget" className="input" inputMode="decimal" value={budgetText} onChange={(e) => setBudgetText(e.target.value)} placeholder="Ej. 700" />
        </div>
        <span className="small muted">
          Lo que planeas gastar estando allí: comida, transporte local, tours, salidas, compras y el alojamiento que pagues durante el viaje. No incluye pasajes ni alojamientos reservados antes. {isGroup && 'Es personal: cada viajero define el suyo.'}
        </span>
      </div>

      <button className="btn accent block" onClick={save} disabled={!valid || busy}>
        {busy ? 'Guardando…' : 'Guardar'}
      </button>
      {dest && canEditShared &&
        (confirmDel ? (
          <div className="grid2">
            <button className="btn ghost" onClick={() => setConfirmDel(false)}>Cancelar</button>
            <button className="btn danger" onClick={del}>Sí, eliminar</button>
          </div>
        ) : (
          <button className="btn danger block" onClick={() => setConfirmDel(true)}>
            Eliminar destino
          </button>
        ))}
    </Sheet>
  )
}
