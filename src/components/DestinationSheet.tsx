import { useCallback, useMemo, useState } from 'react'
import { Sheet, Switch } from './ui'
import { useApp } from '../app/AppContext'
import type { Destination, TransportMode, TripData } from '../lib/types'
import { TRANSPORT } from '../lib/types'
import { allCurrencies, currencyName, guessCurrency } from '../lib/fx'
import { Autocomplete, type Suggestion } from './Autocomplete'
import { IconPin } from './Icons'
import { countryByName, searchCities, searchCountries, type CityOption, type CountryOption } from '../lib/places'
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
  // Un destino de solo país guarda el nombre del país también como ciudad
  const [city, setCity] = useState(dest && dest.city !== dest.country ? dest.city : '')
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
      const g = countryByName(v)?.currency ?? guessCurrency(v)
      if (g) setCurrency(g)
    }
  }

  const countrySuggestions = useCallback(
    (q: string): Suggestion<CountryOption>[] =>
      searchCountries(q).map((c) => ({ key: c.code, label: c.name, detail: `Moneda: ${c.currency}`, value: c })),
    [],
  )
  const citySuggestions = useCallback(
    async (q: string, signal: AbortSignal): Promise<Suggestion<CityOption>[]> => {
      const res = await searchCities(q, signal)
      const cc = countryByName(country)?.code
      const sorted = cc ? [...res.filter((r) => r.countryCode === cc), ...res.filter((r) => r.countryCode !== cc)] : res
      return sorted.map((c) => ({ key: String(c.id), label: c.name, detail: [c.region, c.country].filter(Boolean).join(', '), value: c }))
    },
    [country],
  )

  const place = city.trim() || country.trim()
  const valid = place && start && end && end >= start
  const save = async () => {
    if (!valid || !uid) return
    setBusy(true)
    try {
      const saved = await repo.saveDestination({
        id: dest?.id,
        trip_id: data.trip.id,
        city: place,
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
        <Autocomplete<CountryOption>
          id="country"
          label="País"
          value={country}
          onChange={onCountry}
          onPick={(s) => {
            setCountry(s.value.name)
            if (!currencyTouched) setCurrency(s.value.currency)
          }}
          getSuggestions={countrySuggestions}
          placeholder="Ej. Italia"
          disabled={!canEditShared}
        />
        <Autocomplete<CityOption>
          id="city"
          label="Ciudad (opcional)"
          value={city}
          onChange={setCity}
          onPick={(s) => {
            setCity(s.value.name)
            if (s.value.country) setCountry(s.value.country)
            if (s.value.currency && !currencyTouched) setCurrency(s.value.currency)
          }}
          getSuggestions={citySuggestions}
          placeholder="Ej. Roma · déjalo vacío para todo el país"
          disabled={!canEditShared}
          icon={<IconPin size={16} />}
        />
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
