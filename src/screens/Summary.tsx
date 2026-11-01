import { Link, useParams } from 'react-router-dom'
import { useApp, useTrip } from '../app/AppContext'
import { Bar, ErrorPage, HeroAmount, Loading } from '../components/ui'
import { IconBack, IconCheck } from '../components/Icons'
import { byCategory, destStats, isPrepaid, myShare, totals } from '../lib/calc'
import { categoryLabel, type TripData } from '../lib/types'
import { money0, num } from '../lib/format'
import { fromUSD } from '../lib/fx'
import { dateRange, nights, todayISO } from '../lib/dates'

export default function Summary() {
  const { tripId } = useParams()
  const { uid, fx, profile } = useApp()
  const { data, error } = useTrip(tripId)
  if (error) return <ErrorPage message={error} />
  if (!data || !uid) return <Loading />

  const equiv = profile?.equiv_currency ?? 'UYU'
  const ended = todayISO() > data.trip.end_date
  const tt = totals(data, uid)
  const stats = destStats(data, uid)
  const cats = byCategory(data, uid)
  const countries = tt.total - tt.pasajes
  const lodging = cats.find((c) => c.category === 'alojamiento')?.usd ?? 0
  const lodgingTrip = lodging - tt.lodgingPrepaid
  const maxCat = Math.max(...cats.map((c) => c.usd), 1)
  const diff = tt.estimated - tt.total
  const pct = (v: number) => (tt.total > 0 ? Math.round((v / tt.total) * 100) : 0)

  return (
    <div className="app no-nav">
      <header className="hero">
        <div className="hero-top">
          <Link to={`/v/${data.trip.id}`} className="icon-btn" aria-label="Volver"><IconBack /></Link>
          <button className="icon-btn" aria-label="Descargar planilla" onClick={() => exportCsv(data, uid)} style={{ width: 'auto', padding: '0 14px', fontSize: 13, fontWeight: 700 }}>
            Exportar
          </button>
        </div>
        <span className="tag yellow" style={{ alignSelf: 'flex-start', marginTop: 14 }}>
          {ended ? 'VIAJE FINALIZADO' : 'RESUMEN HASTA HOY'}
        </span>
        <h1 className="hero-title" style={{ fontSize: 30, marginTop: 6 }}>{data.trip.name}</h1>
        <p className="hero-sub" style={{ margin: 0 }}>
          {dateRange(data.trip.start_date, data.trip.end_date)} · {nights(data.trip.start_date, data.trip.end_date)} noches · {stats.length} destinos
        </p>
        <div className="col" style={{ marginTop: 18, gap: 4 }}>
          <span className="text13" style={{ color: 'var(--green-muted)' }}>Tu costo total del viaje</span>
          <HeroAmount value={tt.total} size={48} />
          <span className="text14" style={{ color: 'var(--green-muted)' }}>
            ≈ {money0(fromUSD(tt.total, equiv, fx.rates), equiv)} · tus gastos personales
          </span>
        </div>
      </header>

      {ended && tt.estimated > 0 && (
        <section className="section">
          <div className="card green" style={{ flexDirection: 'row', alignItems: 'center', padding: '14px 16px' }}>
            <div className="ico" style={{ background: 'var(--green)', color: '#fff' }}><IconCheck /></div>
            <div className="col">
              <strong className="text15" style={{ color: 'var(--green-dark)' }}>
                {Math.abs(diff) < 1 ? 'Justo lo planeado' : diff > 0 ? `${money0(diff)} por debajo de lo planeado` : `${money0(-diff)} por encima de lo planeado`}
              </strong>
              <span className="text13" style={{ color: 'var(--green-mid)' }}>
                Estimado {money0(tt.estimated)} · Real {money0(tt.total)}
              </span>
            </div>
          </div>
        </section>
      )}

      <section className="section mt-lg">
        <div className="card">
          <h2 className="h2" style={{ fontSize: 19 }}>En qué se fue</h2>
          <div className="stack-bar">
            <div style={{ width: `${pct(tt.pasajes)}%`, background: 'var(--yellow)' }} />
            <div style={{ width: `${100 - pct(tt.pasajes)}%`, background: 'var(--green)' }} />
          </div>
          <div className="row text14">
            <span className="legend-dot" style={{ background: 'var(--yellow)' }} />
            <span className="grow">Pasajes entre países</span>
            <span className="muted">{pct(tt.pasajes)} %</span>
            <strong className="semi" style={{ width: 84, textAlign: 'right' }}>{money0(tt.pasajes)}</strong>
          </div>
          <div className="row text14">
            <span className="legend-dot" style={{ background: 'var(--green)' }} />
            <span className="grow">Países (alojamiento incluido)</span>
            <span className="muted">{100 - pct(tt.pasajes)} %</span>
            <strong className="semi" style={{ width: 84, textAlign: 'right' }}>{money0(countries)}</strong>
          </div>
          <span className="small muted" style={{ paddingLeft: 24 }}>
            Alojamiento {money0(lodging)} · Resto de gastos {money0(countries - lodging)}
          </span>
        </div>
      </section>

      <section className="section">
        <div className="card">
          <div className="row between baseline">
            <h2 className="h2" style={{ fontSize: 19 }}>Por categoría</h2>
            <span className="text13 muted">sin pasajes</span>
          </div>
          {cats.map((c) => (
            <div key={c.category} className="col" style={{ gap: 4 }}>
              <div className="row between text14">
                <span>{categoryLabel(c.category)}</span>
                <strong className="semi">{money0(c.usd)}</strong>
              </div>
              <Bar pct={c.usd / maxCat} thin />
              {c.category === 'alojamiento' && tt.lodgingPrepaid > 0 && lodgingTrip > 0.5 && (
                <span className="small muted">
                  Reservado antes {money0(tt.lodgingPrepaid)} · pagado en el viaje {money0(lodgingTrip)}
                </span>
              )}
            </div>
          ))}
          {cats.length === 0 && <span className="text14 muted">Todavía no hay gastos.</span>}
        </div>
      </section>

      <section className="section">
        <div className="card" style={{ gap: 4 }}>
          <div className="row between baseline" style={{ marginBottom: 6 }}>
            <h2 className="h2" style={{ fontSize: 19 }}>Por destino</h2>
            <span className="text13 muted">alojamiento + en destino</span>
          </div>
          {stats.map((s) => {
            const over = s.spent - s.budget
            return (
              <div key={s.dest.id} className="list-item" style={{ padding: '10px 0' }}>
                <div className="col grow">
                  <span className="text15 bold">{s.dest.city}</span>
                  <span className={`small ${over > 0.5 ? 'amber' : 'muted'}`}>
                    {s.lodgingPrepaid > 0 ? `Aloj. ${num(s.lodgingPrepaid, 0)} · ` : ''}En destino {num(s.spent, 0)} de {num(s.budget, 0)}
                    {over > 0.5 ? ` · +${num(over, 0)}` : ''}
                  </span>
                </div>
                <strong className="text15 semi">{money0(s.total)}</strong>
              </div>
            )
          })}
        </div>
      </section>

      <div className="section mt-lg">
        <Link to={`/v/${data.trip.id}/grupo`} className="btn primary block">Ver cuentas del grupo</Link>
      </div>
    </div>
  )
}

function exportCsv(data: TripData, uid: string) {
  const dest = (id: string | null) => data.destinations.find((d) => d.id === id)?.city ?? 'General'
  const rows = [
    ['Fecha', 'Destino', 'Categoría', 'Descripción', 'Monto', 'Moneda', 'Total USD', 'Tu parte USD', 'Forma de pago', 'Antes del viaje'],
    ...data.expenses
      .filter((e) => myShare(e, uid) > 0)
      .sort((a, b) => (a.spent_on < b.spent_on ? -1 : 1))
      .map((e) => [
        e.spent_on,
        dest(e.destination_id),
        categoryLabel(e.category),
        e.description,
        String(e.amount).replace('.', ','),
        e.currency,
        String(e.amount_usd).replace('.', ','),
        String(myShare(e, uid)).replace('.', ','),
        e.method === 'cash' ? 'Efectivo' : 'Tarjeta',
        isPrepaid(e, data.trip) ? 'Sí' : 'No',
      ]),
  ]
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${data.trip.name.replace(/[^\w\- ]+/g, '')} - gastos.csv`
  a.click()
  URL.revokeObjectURL(url)
}
