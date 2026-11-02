import { useEffect, useRef, useState } from 'react'
import { IconPlane, IconTrain } from './Icons'
import type { Destination } from '../lib/types'
import { TRANSPORT } from '../lib/types'
import { shortDate } from '../lib/dates'
import { money0 } from '../lib/format'

/** Código de 3 letras al estilo aeropuerto: "París" → PAR */
export function cityCode(city: string): string {
  const clean = city
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z]/g, '')
    .toUpperCase()
  return (clean || '???').slice(0, 3)
}

/** Sello de pasaporte circular */
export function Stamp({ city, label, tone = 'green', date, size = 74, tilt = -8 }: { city: string; label?: string; tone?: 'green' | 'amber'; date?: string; size?: number; tilt?: number }) {
  // Ajusta el tamaño del texto curvo al ancho del sello
  const fit = (t: string) => Math.max(5.5, Math.min(8, (size * 0.6) / (t.length * 0.66)))
  return (
    <span className={`stamp ${tone}`} style={{ width: size, height: size, transform: `rotate(${tilt}deg)` }} aria-label={`Sello de ${city}`}>
      <span className="stamp-inner">
        {label && <span className="stamp-label" style={{ fontSize: fit(label) }}>{label}</span>}
        <span className="stamp-code" style={{ fontSize: Math.round(size * 0.24) }}>{cityCode(city)}</span>
        {date && <span className="stamp-label" style={{ fontSize: fit(date) }}>{date}</span>}
      </span>
    </span>
  )
}

/** Tarjeta tipo pase de abordar para el próximo tramo */
export function BoardingPass({ from, to, budget }: { from: Destination | null; fromLabel?: string; to: Destination; budget: number }) {
  const mode = TRANSPORT.find((t) => t.id === to.transport_mode)?.label ?? 'Traslado'
  return (
    <div className="boarding">
      <div className="boarding-main">
        <div className="row between">
          <span className="label-caps" style={{ color: 'var(--green-mid)' }}>Próximo tramo</span>
          <span className="small muted">{mode}</span>
        </div>
        <div className="row between" style={{ alignItems: 'flex-end' }}>
          <div className="col">
            <span className="boarding-code">{from ? cityCode(from.city) : '···'}</span>
            <span className="small muted ellipsis">{from?.city ?? 'Salida'}</span>
          </div>
          <div className="boarding-path" aria-hidden="true">
            <span />
            {to.transport_mode === 'tren' ? <IconTrain size={18} /> : <IconPlane size={18} />}
            <span />
          </div>
          <div className="col" style={{ alignItems: 'flex-end' }}>
            <span className="boarding-code">{cityCode(to.city)}</span>
            <span className="small muted ellipsis">{to.city}</span>
          </div>
        </div>
      </div>
      <div className="boarding-stub">
        <div className="col">
          <span className="small muted">Fecha</span>
          <span className="text14 semi">{shortDate(to.start_date)}</span>
        </div>
        <div className="col">
          <span className="small muted">País</span>
          <span className="text14 semi ellipsis">{to.country || '—'}</span>
        </div>
        <div className="col" style={{ alignItems: 'flex-end' }}>
          <span className="small muted">Presupuesto</span>
          <span className="text14 semi">{money0(budget)}</span>
        </div>
      </div>
    </div>
  )
}

/** Número que cuenta hasta su valor (respeta "reducir movimiento") */
export function useCountUp(value: number, ms = 750): number {
  const [shown, setShown] = useState(value)
  const from = useRef(0)
  useEffect(() => {
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      setShown(value)
      return
    }
    const start = performance.now()
    const a = from.current
    let raf = 0
    const tick = (t: number) => {
      const k = Math.min((t - start) / ms, 1)
      const eased = 1 - Math.pow(1 - k, 3)
      setShown(a + (value - a) * eased)
      if (k < 1) raf = requestAnimationFrame(tick)
      else from.current = value
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, ms])
  return shown
}

export function greeting(name?: string | null): string {
  const h = new Date().getHours()
  const base = h < 6 ? 'Buenas noches' : h < 13 ? 'Buen día' : h < 20 ? 'Buenas tardes' : 'Buenas noches'
  const first = name && name !== 'Tú' ? name.trim().split(/\s+/)[0] : ''
  return first ? `${base}, ${first}` : base
}
