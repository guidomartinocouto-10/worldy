import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sheet } from './ui'
import { useApp } from '../app/AppContext'
import type { Card, Expense, NewExpense, TripData } from '../lib/types'
import { categoryLabel } from '../lib/types'
import { countsInBudget, myShare, paidLocal, remainingOf } from '../lib/calc'
import { money, parseAmount, round2 } from '../lib/format'
import { longDate, shortDate, todayISO } from '../lib/dates'
import { fromUSD } from '../lib/fx'
import { CardPicker } from './CardPicker'
import { IconEdit } from './Icons'

/** Convierte un gasto guardado en los datos para editarlo */
export function toNewExpense(e: Expense): NewExpense {
  const { id: _i, created_at: _c, created_by: _b, pending: _p, ...rest } = e
  void _i
  void _c
  void _b
  void _p
  return { ...rest, shares: e.shares.map((s) => ({ user_id: s.user_id, share_usd: s.share_usd })) }
}

export function cardLabel(data: TripData, cardId: string | null, ownerFallback?: string): string | null {
  if (!cardId) return null
  const c = data.cards.find((x) => x.id === cardId)
  if (c) return c.name
  return ownerFallback ? `Tarjeta de ${ownerFallback}` : 'Tarjeta'
}

export function ExpenseSheet({ e, data, onClose, onChanged, from }: { e: Expense; data: TripData; onClose: () => void; onChanged: () => void; from?: 'destino' }) {
  const { uid, repo, toast, fx, profile } = useApp()
  const nav = useNavigate()
  const [confirm, setConfirm] = useState(false)
  const [paying, setPaying] = useState(false)
  const rem = remainingOf(e)
  const [payText, setPayText] = useState(String(rem.local).replace('.', ','))
  const [payDate, setPayDate] = useState(todayISO())
  const [payCard, setPayCard] = useState<string | null>(e.card_id)
  const [cards, setCards] = useState<Card[]>(data.cards)
  const name = (id: string) => (id === uid ? 'Tú' : data.members.find((m) => m.user_id === id)?.profile.name ?? 'Viajero')
  const dest = data.destinations.find((d) => d.id === e.destination_id)
  const equiv = profile?.equiv_currency ?? 'UYU'
  const mine = myShare(e, uid ?? '')
  const mineCanEdit = e.created_by === uid
  const partial = !!e.payments

  const del = async () => {
    try {
      await repo.deleteExpense(e.id)
      toast('Gasto eliminado')
      onChanged()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'No se pudo eliminar')
    }
  }

  const registerPayment = async () => {
    const amount = parseAmount(payText)
    if (!(amount > 0)) return
    try {
      const payments = [...(e.payments ?? []), { amount: round2(Math.min(amount, rem.local)), date: payDate, card_id: payCard }]
      await repo.updateExpense(e.id, { ...toNewExpense(e), payments })
      toast(amount >= rem.local - 0.004 ? '¡Saldo pagado por completo!' : 'Pago registrado')
      onChanged()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'No se pudo registrar el pago')
    }
  }

  return (
    <Sheet title={e.description || categoryLabel(e.category)} onClose={onClose}>
      <div className="card">
        <div className="row between baseline">
          <span className="text13 muted">{partial ? 'Precio total' : 'Monto'}</span>
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
            <span className="muted">Tu parte (va a tu presupuesto)</span>
            <span className="semi">{money(mine)}</span>
          </div>
        )}
      </div>

      {partial && (
        <div className="card yellow" style={{ gap: 8 }}>
          <div className="row between text14 brown">
            <span>Pagado</span>
            <span className="semi">{money(paidLocal(e), e.currency, { decimals: 2 })}</span>
          </div>
          {e.payments!.map((p, i) => (
            <span key={i} className="small" style={{ color: 'var(--brown-2)' }}>
              · {money(p.amount, e.currency, { decimals: 2 })} el {shortDate(p.date)}
              {cardLabel(data, p.card_id) ? ` con ${cardLabel(data, p.card_id)}` : ''}
            </span>
          ))}
          {rem.local > 0.004 ? (
            <strong className="text15 brown">
              Falta pagar {money(rem.local, e.currency, { decimals: 2 })}
              {e.payee ? ` a ${e.payee}` : ''}
              {e.due_date ? ` antes del ${shortDate(e.due_date)}` : ''}
            </strong>
          ) : (
            <strong className="text15" style={{ color: 'var(--green)' }}>Pagado por completo ✓</strong>
          )}
          {mineCanEdit && rem.local > 0.004 && !paying && (
            <button className="btn primary small" onClick={() => setPaying(true)}>
              Registrar pago del saldo
            </button>
          )}
          {paying && (
            <div className="col" style={{ gap: 10, marginTop: 4 }}>
              <div className="grid2" style={{ gap: 8 }}>
                <div className="field">
                  <label htmlFor="pay-amt">Monto ({e.currency})</label>
                  <input id="pay-amt" className="input" inputMode="decimal" value={payText} onChange={(ev) => setPayText(ev.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor="pay-date">Fecha</label>
                  <input id="pay-date" type="date" className="input" value={payDate} onChange={(ev) => setPayDate(ev.target.value)} />
                </div>
              </div>
              <CardPicker data={{ ...data, cards }} value={payCard} onChange={(id) => setPayCard(id)} onCreated={(c) => setCards((cs) => [...cs, c])} label="¿Con qué tarjeta?" />
              <button className="btn primary small" onClick={registerPayment} disabled={!(parseAmount(payText) > 0)}>
                Guardar pago
              </button>
            </div>
          )}
        </div>
      )}

      <div className="card tight">
        <div className="list-item text14"><span className="grow muted">Categoría</span><span>{categoryLabel(e.category)}</span></div>
        <div className="list-item text14"><span className="grow muted">Destino</span><span>{dest ? dest.city : 'General del viaje'}</span></div>
        <div className="list-item text14"><span className="grow muted">Fecha</span><span>{longDate(e.spent_on)}</span></div>
        <div className="list-item text14">
          <span className="grow muted">Forma de pago</span>
          <span>{e.method === 'cash' ? 'Efectivo' : cardLabel(data, e.card_id, name(e.paid_by)) ?? 'Tarjeta'}</span>
        </div>
        <div className="list-item text14"><span className="grow muted">Pagó</span><span>{e.paid_from_fund ? 'Fondo común' : name(e.paid_by)}</span></div>
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
      {mineCanEdit && (
        <button className="btn ghost block" onClick={() => nav(`/v/${data.trip.id}/gasto?editar=${e.id}${from === 'destino' ? '&volver=destino' : ''}`)}>
          <IconEdit /> Editar gasto
        </button>
      )}
      {!mineCanEdit && <span className="small muted center">Solo {name(e.created_by)} puede editar este gasto.</span>}
      {mineCanEdit &&
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
