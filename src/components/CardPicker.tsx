import { useState } from 'react'
import { useApp } from '../app/AppContext'
import { Sheet, Switch } from './ui'
import type { Card, TripData } from '../lib/types'

/** Elegir con qué tarjeta se pagó; permite agregar una tarjeta nueva en el momento */
export function CardPicker({
  data,
  value,
  onChange,
  onCreated,
  label = 'Tarjeta',
}: {
  data: TripData
  value: string | null
  onChange: (id: string | null, card: Card | null) => void
  onCreated: (card: Card) => void
  label?: string
}) {
  const { repo, uid, toast } = useApp()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [group, setGroup] = useState(!data.cards.some((c) => c.kind === 'group') && data.members.length > 1)
  const isGroup = data.members.length > 1
  const mine = data.cards.filter((c) => c.kind === 'personal' && c.owner_id === uid)
  const groupCards = data.cards.filter((c) => c.kind === 'group')

  const create = async () => {
    if (!name.trim()) return
    try {
      const card = await repo.addCard({ name: name.trim(), kind: group ? 'group' : 'personal', trip_id: group ? data.trip.id : null })
      setOpen(false)
      setName('')
      onCreated(card)
      onChange(card.id, card)
      toast('Tarjeta guardada')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'No se pudo guardar la tarjeta')
    }
  }

  const chip = (c: Card) => (
    <button key={c.id} type="button" className={`chip${value === c.id ? ' on' : ''}`} onClick={() => onChange(value === c.id ? null : c.id, value === c.id ? null : c)}>
      {c.kind === 'group' ? '◎ ' : ''}
      {c.name}
    </button>
  )

  return (
    <div className="field">
      <span className="label">{label}</span>
      <div className="chips">
        {groupCards.map(chip)}
        {mine.map(chip)}
        <button type="button" className="chip" style={{ borderStyle: 'dashed', color: 'var(--green)', fontWeight: 700 }} onClick={() => setOpen(true)}>
          + Agregar tarjeta
        </button>
      </div>
      {open && (
        <Sheet title="Nueva tarjeta" onClose={() => setOpen(false)}>
          <div className="card" style={{ gap: 14 }}>
            <div className="field">
              <label htmlFor="card-name">Nombre</label>
              <input id="card-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder={group ? 'Ej. Fondo común' : 'Ej. Visa Itaú'} autoFocus />
            </div>
            {isGroup && (
              <div className="row between">
                <div className="col">
                  <span className="text15 bold">Tarjeta del fondo común</span>
                  <span className="small muted">La ven todos los del viaje. Lo que se paga con ella sale del fondo, no de una persona.</span>
                </div>
                <Switch on={group} onChange={setGroup} label="Tarjeta del fondo común" />
              </div>
            )}
          </div>
          <span className="small muted">Solo se guarda el nombre que elijas, nunca los números de la tarjeta.</span>
          <button className="btn primary block" onClick={create} disabled={!name.trim()}>
            Guardar tarjeta
          </button>
        </Sheet>
      )}
    </div>
  )
}
