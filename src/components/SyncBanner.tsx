import { useEffect, useState } from 'react'
import { getStatus, subscribeStatus, type SyncStatus } from '../lib/offline'

export function useSyncStatus(): SyncStatus {
  const [s, setS] = useState(getStatus)
  useEffect(() => subscribeStatus(setS), [])
  return s
}

const hhmm = (t: number) => new Date(t).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })

/** Aviso fijo arriba cuando no hay conexión o hay gastos esperando subir */
export function SyncBanner() {
  const s = useSyncStatus()
  if (s.online && s.pending === 0) return null
  const items = s.pending === 1 ? '1 movimiento' : `${s.pending} movimientos`
  let text: string
  if (!s.online) {
    text = s.pending > 0 ? `Sin conexión · ${items} ${s.pending === 1 ? 'guardado' : 'guardados'} en el celular, se ${s.pending === 1 ? 'sube' : 'suben'} al volver la señal` : `Sin conexión · ${s.cachedAt ? `datos guardados a las ${hhmm(s.cachedAt)}` : 'puedes seguir cargando gastos'}`
  } else {
    text = s.syncing ? `Subiendo ${items}…` : `${items} ${s.pending === 1 ? 'pendiente' : 'pendientes'} de subir`
  }
  return (
    <div className={`sync-banner${s.online ? ' syncing' : ''}`} role="status">
      <span className="sync-dot" aria-hidden="true" />
      {text}
    </div>
  )
}
