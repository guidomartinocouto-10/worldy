import { useState } from 'react'
import { Sheet } from './ui'
import type { DestStats } from '../lib/calc'
import { money0, parseAmount } from '../lib/format'

export function MoveBudgetSheet({
  stats,
  target,
  onClose,
  onMove,
}: {
  stats: DestStats[]
  target?: DestStats
  onClose: () => void
  onMove: (fromId: string, amount: number, toId: string) => void
}) {
  const [toId, setToId] = useState(target?.dest.id ?? stats[0]?.dest.id ?? '')
  const donors = stats.filter((s) => s.dest.id !== toId && s.left > 0)
  const [fromId, setFromId] = useState(donors[0]?.dest.id ?? '')
  const from = stats.find((s) => s.dest.id === fromId)
  const [amountText, setAmountText] = useState('')
  const amount = parseAmount(amountText)
  const valid = from && amount > 0 && amount <= from.left + 0.001 && fromId !== toId

  return (
    <Sheet title="Mover presupuesto" onClose={onClose}>
      {!target && (
        <div className="field">
          <label htmlFor="to">Hacia</label>
          <select id="to" className="input" value={toId} onChange={(e) => setToId(e.target.value)}>
            {stats.map((s) => (
              <option key={s.dest.id} value={s.dest.id}>
                {s.dest.city}
              </option>
            ))}
          </select>
        </div>
      )}
      {target && <p className="text14 ink2" style={{ margin: 0 }}>Hacia <strong>{target.dest.city}</strong></p>}
      {donors.length === 0 ? (
        <p className="text14 muted">Ningún otro destino tiene presupuesto libre.</p>
      ) : (
        <>
          <div className="field">
            <span className="label">Desde</span>
            <div className="card tight">
              {donors.map((s) => (
                <label key={s.dest.id} className="list-item" style={{ cursor: 'pointer' }}>
                  <input type="radio" name="from" checked={fromId === s.dest.id} onChange={() => setFromId(s.dest.id)} style={{ accentColor: 'var(--green)', width: 20, height: 20 }} />
                  <span className="grow text15 semi">{s.dest.city}</span>
                  <span className="text14 green-text semi">{money0(s.left)} libres</span>
                </label>
              ))}
            </div>
          </div>
          <div className="field">
            <label htmlFor="monto-mover">Monto en dólares</label>
            <input id="monto-mover" className="input" inputMode="decimal" value={amountText} onChange={(e) => setAmountText(e.target.value)} placeholder="0" />
          </div>
          <button className="btn primary block" disabled={!valid} onClick={() => valid && onMove(fromId, Math.round(amount * 100) / 100, toId)}>
            Mover
          </button>
        </>
      )}
    </Sheet>
  )
}
