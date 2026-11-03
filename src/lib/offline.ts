/**
 * Modo sin conexión: copia de los datos en el celular, cola de movimientos
 * pendientes de subir y estado de sincronización para mostrar avisos.
 */
import type { Expense, Purchase } from './types'

const PREFIX = 'worldy.offline.'

export type QueuedItem = { kind: 'expense'; expense: Expense } | { kind: 'purchase'; purchase: Purchase }

export interface SyncStatus {
  online: boolean
  pending: number
  syncing: boolean
  cachedAt: number | null // cuándo se guardaron los datos que se están mostrando (si vienen de la copia)
}

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    /* almacenamiento lleno o no disponible */
  }
}

// ---------- Copia de datos ----------
export function saveCache<T>(key: string, value: T) {
  write(`cache.${key}`, { at: Date.now(), value })
}
export function readCache<T>(key: string): { at: number; value: T } | null {
  return read<{ at: number; value: T }>(`cache.${key}`)
}

// ---------- Usuario recordado ----------
export const rememberUid = (uid: string | null) => write('uid', uid)
export const recalledUid = () => read<string>('uid')

// ---------- Cola de pendientes ----------
export function getQueue(): QueuedItem[] {
  return read<QueuedItem[]>('queue') ?? []
}
export function setQueue(q: QueuedItem[]) {
  write('queue', q)
  setStatus({ pending: q.length })
}
export function enqueue(item: QueuedItem) {
  setQueue([...getQueue(), item])
}
export function removeFromQueue(id: string): boolean {
  const q = getQueue()
  const next = q.filter((i) => (i.kind === 'expense' ? i.expense.id : i.purchase.id) !== id)
  if (next.length === q.length) return false
  setQueue(next)
  return true
}

// ---------- Estado ----------
let status: SyncStatus = {
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  pending: getQueue().length,
  syncing: false,
  cachedAt: null,
}
const listeners = new Set<(s: SyncStatus) => void>()

export function getStatus(): SyncStatus {
  return status
}
export function setStatus(patch: Partial<SyncStatus>) {
  status = { ...status, ...patch }
  listeners.forEach((l) => l(status))
}
export function subscribeStatus(cb: (s: SyncStatus) => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => setStatus({ online: true }))
  window.addEventListener('offline', () => setStatus({ online: false }))
}

/** ¿El error se debe a falta de conexión? */
export function isNetworkError(e: unknown): boolean {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true
  const msg = e instanceof Error ? e.message : String(e)
  return /failed to fetch|networkerror|network request failed|load failed|fetch failed|err_internet|timeout/i.test(msg)
}

export const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
      })
