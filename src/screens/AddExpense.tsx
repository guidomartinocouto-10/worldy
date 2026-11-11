import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useApp, useTrip } from '../app/AppContext'
import { Avatar, ErrorPage, Loading, Switch } from '../components/ui'
import { IconClose } from '../components/Icons'
import { CATEGORIES, type Card, type CategoryId, type Payment, type TripData } from '../lib/types'
import { CardPicker } from '../components/CardPicker'
import { destStats, myRoute, paidLocal, splitEqual, wallets } from '../lib/calc'
import { allCurrencies, currencyName, fromUSD, toUSD } from '../lib/fx'
import { firstName, money, num, parseAmount, round2, symbol } from '../lib/format'
import { todayISO } from '../lib/dates'

const joinNames = (n: string[]) => (n.length > 1 ? `${n.slice(0, -1).join(', ')} y ${n[n.length - 1]}` : n[0] ?? '')

export function destinationForDate(data: TripData, uid: string, date: string): string | null {
  const route = myRoute(data, uid)
  const hit = route.find((d) => d.start_date <= date && date < d.end_date) ?? route.find((d) => d.start_date <= date && date <= d.end_date)
  if (hit) return hit.id
  if (date < data.trip.start_date) return null
  return route.length ? route[route.length - 1].id : null
}

export default function AddExpense() {
  const { tripId } = useParams()
  const { data, error } = useTrip(tripId)
  const { uid } = useApp()
  if (error) return <ErrorPage message={error} />
  if (!data || !uid) return <Loading />
  return <ExpenseForm data={data} uid={uid} />
}

const fmtInput = (n: number) => String(Math.round(n * 100) / 100).replace('.', ',')

function ExpenseForm({ data, uid }: { data: TripData; uid: string }) {
  const { repo, fx, profile, toast } = useApp()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const route = myRoute(data, uid)
  // ?editar=ID edita un gasto; ?destino=ID carga el gasto en ese destino
  const editing = data.expenses.find((e) => e.id === params.get('editar') && e.created_by === uid) ?? null
  const presetDest = route.find((d) => d.id === params.get('destino')) ?? null
  const backTo = presetDest || params.get('volver') === 'destino'
    ? `/v/${data.trip.id}/d/${(editing?.destination_id ?? presetDest?.id) || ''}`
    : `/v/${data.trip.id}`
  const initialDate = editing?.spent_on ?? (presetDest && (todayISO() < presetDest.start_date || todayISO() > presetDest.end_date) ? presetDest.start_date : todayISO())
  const [date, setDate] = useState(initialDate)
  const [destId, setDestId] = useState<string | null>(() => (editing ? editing.destination_id : presetDest?.id ?? destinationForDate(data, uid, todayISO())))
  const [destTouched, setDestTouched] = useState(!!editing || !!presetDest)
  const dest = route.find((d) => d.id === destId) ?? null
  const [currency, setCurrency] = useState(editing?.currency ?? dest?.currency ?? 'USD')
  const [currencyTouched, setCurrencyTouched] = useState(!!editing)
  const [amountText, setAmountText] = useState(editing ? fmtInput(editing.amount) : '')
  const [method, setMethod] = useState<'card' | 'cash'>(editing?.method ?? 'card')
  const [debitedText, setDebitedText] = useState(editing?.card_debited_usd ? fmtInput(editing.card_debited_usd) : '')
  const [category, setCategory] = useState<CategoryId>(editing?.category ?? 'comida')
  const [description, setDescription] = useState(editing?.description ?? '')
  const isGroup = data.members.length > 1
  const [split, setSplit] = useState(editing ? editing.shares.length > 1 || editing.paid_from_fund : false)
  const [payer, setPayer] = useState(editing?.paid_by ?? uid)
  const [participants, setParticipants] = useState<string[]>(() =>
    editing && editing.shares.length > 1 ? editing.shares.map((x) => x.user_id) : data.members.map((m) => m.user_id),
  )
  const [cards, setCards] = useState<Card[]>(data.cards)
  const [cardId, setCardId] = useState<string | null>(editing?.card_id ?? null)
  const card = cards.find((c) => c.id === cardId) ?? null
  const fund = card?.kind === 'group'
  // Seña: queda una parte por pagar
  const [partial, setPartial] = useState(!!editing?.payments)
  const [paidText, setPaidText] = useState(editing?.payments ? fmtInput(paidLocal(editing)) : '')
  const [payee, setPayee] = useState(editing?.payee ?? '')
  const [dueDate, setDueDate] = useState(editing?.due_date ?? '')
  const [busy, setBusy] = useState(false)
  const currencies = useMemo(() => allCurrencies(fx.rates), [fx.rates])
  const equiv = profile?.equiv_currency ?? 'UYU'

  const onDate = (v: string) => {
    setDate(v)
    if (!destTouched) {
      const id = destinationForDate(data, uid, v)
      setDestId(id)
      const d = route.find((x) => x.id === id)
      if (d && !currencyTouched) setCurrency(d.currency)
    }
  }
  const onDest = (v: string) => {
    const id = v || null
    setDestId(id)
    setDestTouched(true)
    const d = route.find((x) => x.id === id)
    if (d && !currencyTouched) setCurrency(d.currency)
  }

  const amount = parseAmount(amountText)
  const debited = parseAmount(debitedText)
  const wallet = wallets(data.purchases, data.expenses, uid).find((w) => w.currency === currency)
  const payerIsMe = payer === uid

  let usd = NaN
  let rateNote = ''
  if (amount > 0) {
    if (currency === 'USD') {
      usd = amount
    } else if (method === 'card' && debited > 0 && !partial) {
      usd = debited
      rateNote = `Según lo debitado: 1 ${currency} = US$ ${num(debited / amount)}`
    } else if (method === 'cash' && wallet && payerIsMe) {
      usd = amount * wallet.avgUsdPerUnit
      rateNote = `Promedio de tus compras: 1 ${currency} = US$ ${num(wallet.avgUsdPerUnit)}`
    } else {
      usd = toUSD(amount, currency, fx.rates)
      rateNote = `Tipo de cambio de hoy: 1 ${currency} = US$ ${num(toUSD(1, currency, fx.rates))}`
    }
  }
  usd = round2(usd)

  const shareUsers = split || fund ? participants : [uid]
  const shares = Number.isFinite(usd) && usd > 0 ? splitEqual(usd, shareUsers) : []
  const myPart = shares.find((s) => s.user_id === uid)?.share_usd ?? 0
  const name = (id: string) => (id === uid ? 'Tú' : firstName(data.members.find((m) => m.user_id === id)?.profile.name ?? ''))

  const prepaid = date < data.trip.start_date
  const outOfBudget = category === 'pasajes' || (category === 'alojamiento' && prepaid) || !destId

  const paidNow = parseAmount(paidText)
  const partialValid = !partial || (paidNow >= 0 && paidNow < amount)
  const remainingLocal = partial && amount > 0 && paidNow >= 0 ? Math.max(amount - paidNow, 0) : 0

  let debtText = ''
  if (fund) {
    debtText = 'Se paga con el fondo común: no genera deudas entre ustedes'
  } else if (split && myPart >= 0 && shares.length) {
    if (payerIsMe) {
      const others = shares.filter((s) => s.user_id !== uid)
      if (others.length) debtText = `${joinNames(others.map((s) => name(s.user_id)))} te ${others.length > 1 ? 'deben' : 'debe'} ${money(others[0].share_usd)}${others.length > 1 ? ' cada uno' : ''}`
    } else if (myPart > 0) {
      debtText = `Le debes ${money(myPart)} a ${name(payer)}`
    }
  }

  const valid = amount > 0 && usd > 0 && shares.length > 0 && (!(split || fund) || participants.length > 0) && partialValid

  const buildPayments = (): Payment[] | null => {
    if (!partial) return null
    const paid = round2(paidNow > 0 ? paidNow : 0)
    // Si al editar no cambió lo pagado, se conserva el historial de pagos
    if (editing?.payments && Math.abs(paidLocal(editing) - paid) < 0.005) return editing.payments
    return paid > 0 ? [{ amount: paid, date, card_id: cardId }] : []
  }

  const save = async () => {
    if (!valid) return
    setBusy(true)
    try {
      const payload = {
        trip_id: data.trip.id,
        destination_id: destId,
        paid_by: split && !fund ? payer : uid,
        category,
        description: description.trim(),
        amount: round2(amount),
        currency,
        amount_usd: usd,
        method: card ? ('card' as const) : method,
        card_debited_usd: (card || method === 'card') && debited > 0 && !partial ? round2(debited) : null,
        spent_on: date,
        shares,
        paid_from_fund: !!fund,
        card_id: cardId,
        payments: buildPayments(),
        payee: partial && payee.trim() ? payee.trim() : null,
        due_date: partial && dueDate ? dueDate : null,
      }
      if (editing) {
        await repo.updateExpense(editing.id, payload)
        toast('Gasto actualizado')
      } else {
        await repo.addExpense(payload)
        const st = destId && !outOfBudget ? destStats(data, uid).find((x) => x.dest.id === destId) : null
        if (partial && remainingLocal > 0) {
          toast(`Seña guardada · falta pagar ${money(remainingLocal, currency, { decimals: 2 })}${payee.trim() ? ` a ${payee.trim()}` : ''}`)
        } else if (st && st.budget > 0) {
          const left = st.left - myPart
          toast(left >= 0 ? `¡Listo! Te quedan ${money(left)} en ${st.dest.city}` : `Guardado. Te pasaste ${money(-left)} en ${st.dest.city}`)
        } else toast('¡Listo! Gasto guardado')
      }
      nav(backTo)
    } catch (e) {
      toast(e instanceof Error ? e.message : 'No se pudo guardar')
      setBusy(false)
    }
  }

  const toggleParticipant = (id: string) =>
    setParticipants((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))

  return (
    <div className="app no-nav">
      <header className="topbar">
        <Link to={backTo} className="icon-btn light" aria-label="Cerrar">
          <IconClose />
        </Link>
        <span className="topbar-title">{editing ? 'Editar gasto' : presetDest ? `Gasto en ${presetDest.city}` : 'Nuevo movimiento'}</span>
        <span className="spacer44" />
      </header>

      <div className="section" style={{ marginTop: 8 }}>
        {!editing && (
          <div className="seg green">
            <Link to={`/v/${data.trip.id}/gasto${presetDest ? `?destino=${presetDest.id}` : ''}`} className="on">Gasto</Link>
            <Link to={`/v/${data.trip.id}/cambio`}>Compra de moneda</Link>
          </div>
        )}
        <div className="grid2" style={{ gap: 8 }}>
          <div className="field">
            <label htmlFor="g-dest">Destino</label>
            <select id="g-dest" className="input" value={destId ?? ''} onChange={(e) => onDest(e.target.value)} style={{ height: 44, fontSize: 14 }}>
              {route.map((d) => (
                <option key={d.id} value={d.id}>{d.city}</option>
              ))}
              <option value="">General del viaje</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="g-date">Fecha</label>
            <input id="g-date" type="date" className="input" value={date} onChange={(e) => onDate(e.target.value)} style={{ height: 44, fontSize: 14 }} />
          </div>
        </div>
      </div>

      <section className="section">
        <div className="card" style={{ gap: 14 }}>
          <label htmlFor="monto" className="text13 muted" style={{ fontWeight: 500 }}>{partial ? 'Monto total (precio completo)' : 'Monto en moneda local'}</label>
          <div className="big-input">
            <select aria-label="Moneda" className="input cur-select" value={currency} onChange={(e) => { setCurrency(e.target.value); setCurrencyTouched(true) }}>
              {currencies.map((c) => (
                <option key={c} value={c}>{c} {symbol(c) !== c ? symbol(c) : ''}</option>
              ))}
            </select>
            <input id="monto" inputMode="decimal" placeholder="0,00" value={amountText} onChange={(e) => setAmountText(e.target.value)} autoFocus={!editing} />
          </div>
          <span className="small muted">{currencyName(currency)} · cualquier moneda del mundo</span>
          <div className="grid2">
            <div className="card soft" style={{ padding: '10px 12px', gap: 2 }}>
              <span className="small bold muted" style={{ letterSpacing: 0.5 }}>EN DÓLARES</span>
              <span className="amount-md" style={{ fontSize: 17 }}>{Number.isFinite(usd) && usd > 0 ? money(usd) : '—'}</span>
            </div>
            <div className="card soft" style={{ padding: '10px 12px', gap: 2 }}>
              <span className="small bold muted ellipsis" style={{ letterSpacing: 0.5 }}>EN {currencyName(equiv).toUpperCase()}</span>
              <span className="amount-md" style={{ fontSize: 17 }}>{Number.isFinite(usd) && usd > 0 ? money(fromUSD(usd, equiv, fx.rates), equiv) : '—'}</span>
            </div>
          </div>
          {rateNote && <span className="small muted">{rateNote}</span>}
        </div>
      </section>

      <section className="section">
        <div className="card">
          <span className="text13 muted" style={{ fontWeight: 500 }}>Forma de pago</span>
          <div className="seg">
            <button type="button" className={method === 'cash' ? 'on' : ''} onClick={() => { setMethod('cash'); setCardId(null) }}>Efectivo</button>
            <button type="button" className={method === 'card' ? 'on' : ''} onClick={() => setMethod('card')}>Tarjeta</button>
          </div>
          {method === 'card' && (
            <CardPicker
              data={{ ...data, cards }}
              value={cardId}
              label="¿Con qué tarjeta?"
              onChange={(id, c) => {
                setCardId(id)
                if (c?.kind === 'group') setSplit(true)
              }}
              onCreated={(c) => setCards((cs) => [...cs, c])}
            />
          )}
          {fund && (
            <div className="card green" style={{ padding: '12px 14px', gap: 4 }}>
              <span className="text13 bold" style={{ color: 'var(--green-dark)' }}>Pagado con el fondo común</span>
              <span className="small" style={{ color: 'var(--green-mid)' }}>Sale del dinero que aportaron entre todos. A cada uno se le suma su parte al presupuesto.</span>
            </div>
          )}
          {method === 'card' && currency !== 'USD' && !partial && (
            <div className="field">
              <label htmlFor="debitado" style={{ color: 'var(--ink)' }}>Monto debitado de tu tarjeta (USD)</label>
              <input id="debitado" className="input" inputMode="decimal" placeholder="Opcional" value={debitedText} onChange={(e) => setDebitedText(e.target.value)} />
              <span className="small muted" style={{ lineHeight: 1.4 }}>
                Se registra el monto cobrado por la tarjeta. Si aún no lo conoces, déjalo vacío y se usará el tipo de cambio del día.
              </span>
            </div>
          )}
          {method === 'cash' && currency !== 'USD' && (
            <div className="card green" style={{ padding: '12px 14px', gap: 4 }}>
              {wallet && payerIsMe ? (
                <>
                  <span className="text13 bold" style={{ color: 'var(--green-dark)' }}>Se descuenta de tu efectivo en {currencyName(currency).toLowerCase()}</span>
                  <span className="small" style={{ color: 'var(--green-mid)' }}>
                    Disponible: {money(wallet.balance, currency, { decimals: 2 })} · se usa el promedio de tus compras de moneda.
                  </span>
                </>
              ) : (
                <span className="small" style={{ color: 'var(--green-mid)' }}>
                  No registraste compras de {currency}. Se usará el tipo de cambio del día.{' '}
                  <Link to={`/v/${data.trip.id}/cambio`}>Registrar compra de moneda</Link>
                </span>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="section">
        <div className="card" style={{ gap: 14 }}>
          <div className="row between">
            <div className="col">
              <span className="text15 bold">Es una seña</span>
              <span className="small muted">Pagaron una parte y queda saldo por pagar</span>
            </div>
            <Switch on={partial} onChange={setPartial} label="Es una seña" />
          </div>
          {partial && (
            <>
              <div className="field">
                <label htmlFor="pagado">Pagado hasta ahora ({currency})</label>
                <input id="pagado" className="input" inputMode="decimal" placeholder="Ej. 100" value={paidText} onChange={(e) => setPaidText(e.target.value)} />
              </div>
              <div className="grid2" style={{ gap: 10 }}>
                <div className="field">
                  <label htmlFor="payee">A quién se le paga el resto</label>
                  <input id="payee" className="input" value={payee} onChange={(e) => setPayee(e.target.value)} placeholder="Ej. Hostel Central" />
                </div>
                <div className="field">
                  <label htmlFor="due">Pagar antes del</label>
                  <input id="due" type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
              </div>
              {amount > 0 && paidNow >= 0 && (
                <div className="card yellow" style={{ padding: '12px 14px', gap: 4 }}>
                  <span className="text14 brown">
                    Falta pagar <strong className="semi">{money(remainingLocal, currency, { decimals: 2 })}</strong>
                    {payee.trim() ? ` a ${payee.trim()}` : ''}
                  </span>
                  <span className="small" style={{ color: 'var(--brown-2)' }}>
                    El total cuenta desde ya{outOfBudget ? '' : ' en el presupuesto'}. A tu presupuesto individual van {money(myPart)}.
                  </span>
                </div>
              )}
              {!partialValid && <span className="error">Lo pagado tiene que ser menor que el total.</span>}
            </>
          )}
        </div>
      </section>

      <section className="section">
        <div className="card">
          <span className="text13 muted" style={{ fontWeight: 500 }}>Categoría</span>
          <div className="chips">
            {CATEGORIES.map((c) => (
              <button key={c.id} type="button" className={`chip${category === c.id ? ' on' : ''}`} onClick={() => setCategory(c.id)}>
                {c.label}
              </button>
            ))}
          </div>
          {outOfBudget && (
            <span className="small amber">
              {category === 'pasajes'
                ? 'Los pasajes no se descuentan del presupuesto. Elige como destino el lugar de llegada.'
                : category === 'alojamiento' && prepaid
                  ? 'Alojamiento reservado antes del viaje: suma al país, pero no se descuenta del presupuesto.'
                  : 'Gasto general del viaje: no se descuenta del presupuesto de ningún destino.'}
            </span>
          )}
        </div>
      </section>

      {isGroup && (
        <section className="section">
          <div className="card" style={{ gap: 14 }}>
            <div className="row between">
              <div className="col">
                <span className="text15 bold">Dividir gasto</span>
                <span className="small muted">A tu presupuesto solo se suma tu parte</span>
              </div>
              <Switch on={split || fund} onChange={(v) => !fund && setSplit(v)} label="Dividir gasto" />
            </div>
            {(split || fund) && (
              <>
                {!fund && <div className="field">
                  <span className="label">¿Quién pagó?</span>
                  <div className="chips">
                    {data.members.map((m) => (
                      <button key={m.user_id} type="button" className={`chip${payer === m.user_id ? ' on' : ''}`} onClick={() => setPayer(m.user_id)}>
                        {m.user_id === uid ? 'Yo' : firstName(m.profile.name)}
                      </button>
                    ))}
                  </div>
                </div>}
                <div className="field">
                  <span className="label">Entre quiénes · partes iguales</span>
                  <div className="row" style={{ gap: 4, flexWrap: 'wrap' }}>
                    {data.members.map((m) => {
                      const on = participants.includes(m.user_id)
                      return (
                        <button key={m.user_id} type="button" className="avatar-toggle" onClick={() => toggleParticipant(m.user_id)} aria-pressed={on}>
                          <Avatar profile={m.profile} me={m.user_id === uid && on} className={on ? 'sel' : 'off'} />
                          {m.user_id === uid ? 'Yo' : firstName(m.profile.name)}
                        </button>
                      )
                    })}
                  </div>
                </div>
                {shares.length > 0 && (
                  <div className="card yellow" style={{ padding: '12px 14px', gap: 4 }}>
                    <span className="text13 brown">Tu parte: <strong className="semi">{money(myPart)}</strong></span>
                    {debtText && <strong className="text14 brown semi">{debtText}</strong>}
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      )}

      <section className="section">
        <div className="field">
          <label htmlFor="nota" style={{ paddingLeft: 4 }}>Descripción</label>
          <input id="nota" className="input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ej. Cena en el centro" />
        </div>
      </section>

      <div className="section mt-lg">
        <button className="btn accent block" onClick={save} disabled={!valid || busy}>
          {busy ? 'Guardando…' : editing ? 'Guardar cambios' : 'Guardar gasto'}
        </button>
      </div>
    </div>
  )
}
