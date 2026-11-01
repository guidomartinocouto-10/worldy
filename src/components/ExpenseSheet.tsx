import { useState } from 'react'
import { Sheet } from './ui'
import { useApp } from '../app/AppContext'
import type { Expense, TripData } from '../lib/types'
import { categoryLabel } from '../lib/types'
import { countsInBudget, myShare } from '../lib/calc'
import { money } from '../lib/format'
import { longDate } from '../lib/dates'
import { fromUSD } from '../lib/fx'

export function ExpenseSheet({ e, data, onClose, onChanged }: { e: Expense; data: TripData; onClose: () => void; onChanged: () => void }) {
  const { uid, repo, toast, fx, profile } = useApp()
  const [confirm, setConfirm] = useState(false)
  const name = (id: string) => (id === uid ? 'Tú' : data.members.find((m) => m.user_id === id)?.profile.name ?? 'Viajero')
  const dest = data.destinations.find((d) => d.id === e.destination_id)
  const equiv = profile?.equiv_currency ?? 'UYU'
  const mine = myShare(e, uid ?? '')

  const del = async () => {
    try {
      await repo.deleteExpense(e.id)
      toast('Gasto eliminado')
      onChanged()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'No se pudo eliminar')
    }
  }

  return (
    <Sheet title={e.description || categoryLabel(e.category)} onClose={onClose}>
      <div className="card">
        <div className="row between baseline">
          <span className="text13 muted">Monto</span>
          <span className="amount-md">{money(e.amount, e.currency, { decimals: 2 })}</span>
        </div>
        <div className="row between text14">
          <span className="muted">En dólares</span>
          <span>{money(e.amount_usd)}</span>
        </div>
        <div className="row between text14">
          <span className="muted">En {equiv}</span>
          <span>{money(fromUSD(e.amount_usd, equiv, fx.rates), equiv)}</span>
        </div>
        {e.shares.length > 1 && (
          <div className="row between text14">
            <span className="muted">Tu parte</span>
            <span className="semi">{money(mine)}</span>
          </div>
        )}
      </div>
      <div className="card tight">
        <div className="list-item text14"><span className="grow muted">Categoría</span><span>{categoryLabel(e.category)}</span></div>
        <div className="list-item text14"><span className="grow muted">Destino</span><span>{dest ? dest.city : 'General del viaje'}</span></div>
        <div className="list-item text14"><span className="grow muted">Fecha</span><span>{longDate(e.spent_on)}</span></div>
        <div className="list-item text14"><span className="grow muted">Forma de pago</span><span>{e.method === 'cash' ? 'Efectivo' : 'Tarjeta'}</span></div>
        <div className="list-item text14"><span className="grow muted">Pagó</span><span>{name(e.paid_by)}</span></div>
        <div className="list-item text14"><span className="grow muted">Presupuesto</span><span>{countsInBudget(e, data.trip) ? 'Se descuenta' : 'Fuera del presupuesto'}</span></div>
      </div>
      {e.shares.length > 1 && (
        <div className="card tight">
          {e.shares.map((s) => (
            <div key={s.user_id} className="list-item text14">
              <span className="grow">{name(s.user_id)}</span>
              <span>{money(s.share_usd)}</span>
            </div>
          ))}
        </div>
      )}
      {e.created_by === uid &&
        (confirm ? (
          <div className="grid2">
            <button className="btn ghost" onClick={() => setConfirm(false)}>Cancelar</button>
            <button className="btn danger" onClick={del}>Sí, eliminar</button>
          </div>
        ) : (
          <button className="btn danger block" onClick={() => setConfirm(true)}>
            Eliminar gasto
          </button>
        ))}
    </Sheet>
  )
}
