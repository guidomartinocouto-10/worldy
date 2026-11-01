import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useApp, useTrip } from '../app/AppContext'
import { ErrorPage, Loading } from '../components/ui'
import { IconClose } from '../components/Icons'
import { allCurrencies, currencyName, toUSD } from '../lib/fx'
import { money, num, parseAmount, round2, symbol } from '../lib/format'
import { todayISO } from '../lib/dates'
import { myRoute, wallets } from '../lib/calc'
import { destinationForDate } from './AddExpense'
import type { TripData } from '../lib/types'

const PLACES = ['Casa de cambio', 'Cajero automático', 'Banco', 'Antes de viajar']

export default function BuyCurrency() {
  const { tripId } = useParams()
  const { data, error } = useTrip(tripId)
  const { uid } = useApp()
  if (error) return <ErrorPage message={error} />
  if (!data || !uid) return <Loading />
  return <BuyForm data={data} uid={uid} />
}

function BuyForm({ data, uid }: { data: TripData; uid: string }) {
  const { repo, fx, toast } = useApp()
  const nav = useNavigate()
  const currencies = useMemo(() => allCurrencies(fx.rates), [fx.rates])
  const destId = destinationForDate(data, uid, todayISO())
  const dest = myRoute(data, uid).find((d) => d.id === destId)
  const [paidCur, setPaidCur] = useState('USD')
  const [paidText, setPaidText] = useState('')
  const [recvCur, setRecvCur] = useState(dest && dest.currency !== 'USD' ? dest.currency : 'EUR')
  const [recvText, setRecvText] = useState('')
  const [place, setPlace] = useState(PLACES[0])
  const [date, setDate] = useState(todayISO())
  const [busy, setBusy] = useState(false)

  const paid = parseAmount(paidText)
  const recv = parseAmount(recvText)
  const paidUsd = paid > 0 ? (paidCur === 'USD' ? paid : toUSD(paid, paidCur, fx.rates)) : NaN
  const myRate = paid > 0 && recv > 0 ? paidUsd / recv : NaN // USD por unidad recibida
  const official = toUSD(1, recvCur, fx.rates)
  const diffPct = Number.isFinite(myRate) && official > 0 ? (myRate / official - 1) * 100 : NaN
  const diffUsd = Number.isFinite(myRate) ? (myRate - official) * recv : NaN
  const wallet = wallets(data.purchases, data.expenses, uid).find((w) => w.currency === recvCur)
  const valid = paid > 0 && recv > 0 && recvCur !== paidCur

  const save = async () => {
    if (!valid) return
    setBusy(true)
    try {
      await repo.addPurchase({
        trip_id: data.trip.id,
        paid_amount: round2(paid),
        paid_currency: paidCur,
        paid_usd: round2(paidUsd),
        received_amount: round2(recv),
        currency: recvCur,
        place,
        bought_on: date,
      })
      toast('Compra de moneda registrada')
      nav(`/v/${data.trip.id}`)
    } catch (e) {
      toast(e instanceof Error ? e.message : 'No se pudo guardar')
      setBusy(false)
    }
  }

  return (
    <div className="app no-nav">
      <header className="topbar">
        <Link to={`/v/${data.trip.id}`} className="icon-btn light" aria-label="Cerrar">
          <IconClose />
        </Link>
        <span className="topbar-title">Nuevo movimiento</span>
        <span className="spacer44" />
      </header>

      <div className="section" style={{ marginTop: 8 }}>
        <div className="seg green">
          <Link to={`/v/${data.trip.id}/gasto`}>Gasto</Link>
          <Link to={`/v/${data.trip.id}/cambio`} className="on">Compra de moneda</Link>
        </div>
      </div>

      <section className="section">
        <div className="card" style={{ gap: 6 }}>
          <label htmlFor="entregado" className="text13 muted" style={{ fontWeight: 500 }}>Entregaste</label>
          <div className="big-input">
            <select aria-label="Moneda entregada" className="input cur-select" value={paidCur} onChange={(e) => setPaidCur(e.target.value)}>
              {currencies.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <input id="entregado" inputMode="decimal" placeholder="0,00" value={paidText} onChange={(e) => setPaidText(e.target.value)} autoFocus />
          </div>
          <div className="row" style={{ margin: '6px 0' }}>
            <div className="grow" style={{ height: 1, background: 'var(--line)' }} />
            <span className="ico" style={{ width: 36, height: 36, borderRadius: 18, background: 'var(--yellow)', color: 'var(--brown)' }} aria-hidden="true">↓</span>
            <div className="grow" style={{ height: 1, background: 'var(--line)' }} />
          </div>
          <label htmlFor="recibido" className="text13 muted" style={{ fontWeight: 500 }}>Recibiste</label>
          <div className="big-input">
            <select aria-label="Moneda recibida" className="input cur-select" value={recvCur} onChange={(e) => setRecvCur(e.target.value)}>
              {currencies.map((c) => <option key={c} value={c}>{c} {symbol(c) !== c ? symbol(c) : ''}</option>)}
            </select>
            <input id="recibido" inputMode="decimal" placeholder="0,00" value={recvText} onChange={(e) => setRecvText(e.target.value)} />
          </div>
          <span className="small muted">{currencyName(recvCur)}</span>
        </div>
      </section>

      {Number.isFinite(myRate) && (
        <section className="section">
          <div className="card" style={{ gap: 10 }}>
            <div className="row between baseline">
              <span className="text13 muted">Tu tipo de cambio</span>
              <strong className="text15 semi">1 {recvCur} = US$ {num(myRate)}</strong>
            </div>
            <div className="row between baseline">
              <span className="text13 muted">Cambio oficial de hoy</span>
              <span className="text14 ink2">1 {recvCur} = US$ {num(official)}</span>
            </div>
            {Math.abs(diffPct) >= 0.1 && (
              <div className="card yellow" style={{ padding: '10px 12px' }}>
                <span className="text13 brown">
                  {diffPct > 0 ? (
                    <>Pagaste un <strong>{num(diffPct)} %</strong> más que el cambio oficial ({money(diffUsd)})</>
                  ) : (
                    <>Conseguiste un cambio <strong>{num(-diffPct)} %</strong> mejor que el oficial</>
                  )}
                </span>
              </div>
            )}
          </div>
        </section>
      )}

      <section className="section">
        <div className="card">
          <span className="text13 muted" style={{ fontWeight: 500 }}>¿Dónde la compraste?</span>
          <div className="chips">
            {PLACES.map((p) => (
              <button key={p} type="button" className={`chip${place === p ? ' on' : ''}`} onClick={() => setPlace(p)}>{p}</button>
            ))}
          </div>
          <div className="field">
            <label htmlFor="c-date">Fecha</label>
            <input id="c-date" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
      </section>

      <section className="section">
        <div className="card green" style={{ gap: 8 }}>
          <div className="row between baseline">
            <span className="text14 bold" style={{ color: 'var(--green-dark)' }}>Tu efectivo en {recvCur}</span>
            <strong className="amount-md" style={{ color: 'var(--green-dark)' }}>
              {money((wallet?.balance ?? 0) + (recv > 0 ? recv : 0), recvCur, { decimals: 2 })}
            </strong>
          </div>
          <span className="small" style={{ color: 'var(--green-mid)', lineHeight: 1.45 }}>
            Una compra de moneda no es un gasto: el dinero pasa a tu efectivo. Cada gasto en efectivo se descuenta de aquí y se convierte a dólares con el promedio de tus compras.
          </span>
        </div>
      </section>

      <div className="section mt-lg">
        <button className="btn accent block" onClick={save} disabled={!valid || busy}>
          {busy ? 'Guardando…' : 'Registrar compra'}
        </button>
      </div>
    </div>
  )
}
