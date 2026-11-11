import { useMemo, useState } from 'react'
import { useApp } from '../app/AppContext'
import { Avatar, Sheet, Bar } from './ui'
import { fundStats, remainingOf } from '../lib/calc'
import type { Expense, TripData } from '../lib/types'
import { firstName, money, money0, parseAmount, round2 } from '../lib/format'
import { allCurrencies, toUSD } from '../lib/fx'
import { shortDate, todayISO } from '../lib/dates'

/** Fondo común: lo que aportó cada uno, lo que se pagó con la tarjeta grupal y el saldo */
export function FundSection({ data, onChanged, onOpenExpense }: { data: TripData; onChanged: () => void; onOpenExpense: (e: Expense) => void }) {
  const { uid, repo, fx, toast } = useApp()
  const [open, setOpen] = useState(false)
  const [who, setWho] = useState(uid ?? '')
  const [amountText, setAmountText] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [date, setDate] = useState(todayISO())
  const [note, setNote] = useState('')
  const currencies = useMemo(() => allCurrencies(fx.rates), [fx.rates])
  const groupCard = data.cards.find((c) => c.kind === 'group')
  const st = fundStats(data)
  const fundExpenses = data.expenses.filter((e) => e.paid_from_fund)
  const name = (id: string) => (id === uid ? 'Tú' : firstName(data.members.find((m) => m.user_id === id)?.profile.name ?? 'Viajero'))

  const createFund = async () => {
    try {
      await repo.addCard({ name: 'Fondo común', kind: 'group', trip_id: data.trip.id })
      toast('Fondo común creado')
      onChanged()
    } catch (e) {
      toast(e instanceof Error ? e.message : 'No se pudo crear el fondo')
    }
  }

  const amount = parseAmount(amountText)
  const saveDeposit = async () => {
    if (!(amount > 0) || !who) return
    try {
      await repo.addDeposit({
        trip_id: data.trip.id,
        user_id: who,
        amount: round2(amount),
        currency,
        amount_usd: round2(currency === 'USD' ? amount : toUSD(amount, currency, fx.rates)),
        deposited_on: date,
        note: note.trim(),
      })
      toast('Aporte registrado')
      setOpen(false)
      setAmountText('')
      setNote('')
      onChanged()
    } catch (e) {
      toast(e instanceof Error ? e.message : 'No se pudo registrar el aporte')
    }
  }

  if (!groupCard && data.deposits.length === 0) {
    return (
      <div className="card">
        <span className="text15 bold">Fondo común</span>
        <span className="text13 muted">
          ¿Tienen una tarjeta con plata de todos? Creen el fondo común: registran lo que aporta cada uno y, al pagar con esa tarjeta, el gasto sale del fondo y se divide entre todos sin generar deudas.
        </span>
        <button className="btn primary small" onClick={createFund}>Crear fondo común</button>
      </div>
    )
  }

  const movements = [
    ...data.deposits.map((d) => ({ key: d.id, date: d.deposited_on, kind: 'in' as const, d })),
    ...fundExpenses.map((e) => ({ key: e.id, date: e.spent_on, kind: 'out' as const, e })),
  ].sort((a, b) => (a.date < b.date ? 1 : -1))

  return (
    <div className="card" style={{ gap: 14 }}>
      <div className="row between">
        <div className="col">
          <span className="text15 bold">{groupCard?.name ?? 'Fondo común'}</span>
          <span className="small muted">Disponible en el fondo</span>
        </div>
        <span className="amount-md" style={{ fontSize: 26, color: st.balance < 0 ? 'var(--danger)' : 'var(--green)' }}>{money(st.balance)}</span>
      </div>
      <Bar pct={st.deposited ? st.used / st.deposited : 0} variant={st.used > st.deposited ? 'over' : undefined} />
      <div className="row between text13 ink2">
        <span>Aportado {money0(st.deposited)}</span>
        <span>Usado {money0(st.used)}</span>
      </div>
      {st.pendingUsd > 0.5 && (
        <span className="small amber semi">Faltan pagar {money0(st.pendingUsd)} de señas con el fondo · quedaría {money0(st.balance - st.pendingUsd)}</span>
      )}

      <div className="card tight" style={{ background: 'var(--soft)', border: 'none' }}>
        {data.members.map((m) => {
          const u = st.perUser.get(m.user_id) ?? { deposited: 0, used: 0 }
          const diff = round2(u.deposited - u.used)
          return (
            <div key={m.user_id} className="list-item">
              <Avatar profile={m.profile} me={m.user_id === uid} size={34} />
              <div className="col grow">
                <span className="text14 semi">{name(m.user_id)}</span>
                <span className="small muted">Aportó {money0(u.deposited)} · usó {money0(u.used)}</span>
              </div>
              <span className={`text13 semi ${diff < -0.5 ? 'amber' : 'green-text'}`}>{diff >= 0 ? `+${money0(diff)}` : `−${money0(-diff)}`}</span>
            </div>
          )
        })}
      </div>
      <button className="btn primary small" onClick={() => setOpen(true)}>Registrar aporte</button>

      {movements.length > 0 && (
        <div className="col" style={{ gap: 6 }}>
          <span className="label-caps">Movimientos</span>
          {movements.slice(0, 8).map((mv) =>
            mv.kind === 'in' ? (
              <div key={mv.key} className="row between text13">
                <span className="ink2">Aporte de {name(mv.d.user_id)} · {shortDate(mv.d.deposited_on)}</span>
                <span className="semi green-text" style={{ whiteSpace: "nowrap", marginLeft: 8 }}>+{money(mv.d.amount_usd)}</span>
              </div>
            ) : (
              <button key={mv.key} type="button" className="row between text13" onClick={() => onOpenExpense(mv.e)} style={{ background: 'none', border: 'none', padding: 0, textAlign: 'left', width: '100%' }}>
                <span className="ink2 ellipsis">
                  {mv.e.description || 'Gasto'} · {shortDate(mv.e.spent_on)}
                  {remainingOf(mv.e).local > 0.004 ? ' · seña' : ''}
                </span>
                <span className="semi" style={{ whiteSpace: "nowrap", marginLeft: 8 }}>−{money(mv.e.amount_usd - remainingOf(mv.e).usd)}</span>
              </button>
            ),
          )}
        </div>
      )}

      {open && (
        <Sheet title="Registrar aporte" onClose={() => setOpen(false)}>
          <div className="card" style={{ gap: 14 }}>
            <div className="field">
              <span className="label">¿Quién aportó?</span>
              <div className="chips">
                {data.members.map((m) => (
                  <button key={m.user_id} type="button" className={`chip${who === m.user_id ? ' on' : ''}`} onClick={() => setWho(m.user_id)}>
                    {m.user_id === uid ? 'Yo' : firstName(m.profile.name)}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <label htmlFor="dep-amount">Monto</label>
              <div className="row" style={{ gap: 8 }}>
                <select aria-label="Moneda" className="input" value={currency} onChange={(e) => setCurrency(e.target.value)} style={{ width: 110, flexShrink: 0 }}>
                  {currencies.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <input id="dep-amount" className="input" inputMode="decimal" value={amountText} onChange={(e) => setAmountText(e.target.value)} placeholder="Ej. 500" />
              </div>
            </div>
            <div className="grid2" style={{ gap: 8 }}>
              <div className="field">
                <label htmlFor="dep-date">Fecha</label>
                <input id="dep-date" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="dep-note">Nota</label>
                <input id="dep-note" className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Opcional" />
              </div>
            </div>
          </div>
          <button className="btn primary block" onClick={saveDeposit} disabled={!(amount > 0)}>Guardar aporte</button>
        </Sheet>
      )}
    </div>
  )
}
