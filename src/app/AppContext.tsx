import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Repo } from '../lib/repo'
import type { Profile, TripData } from '../lib/types'
import { fetchRates, loadCachedRates, type FxState } from '../lib/fx'
import { getStatus, subscribeStatus } from '../lib/offline'

interface AppCtx {
  repo: Repo
  uid: string | null
  profile: Profile | null
  fx: FxState
  ready: boolean
  refreshProfile: () => Promise<void>
  toast: (msg: string) => void
}

const Ctx = createContext<AppCtx | null>(null)

export function AppProvider({ repo, children }: { repo: Repo; children: ReactNode }) {
  const [uid, setUid] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [fx, setFx] = useState<FxState>(() => loadCachedRates())
  const [toastMsg, setToastMsg] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    repo.currentUserId().then((id) => {
      if (!alive) return
      setUid(id)
      setReady(true)
    })
    const off = repo.onAuthChange((id) => setUid(id))
    fetchRates().then((s) => alive && setFx(s))
    return () => {
      alive = false
      off()
    }
  }, [repo])

  const refreshProfile = useCallback(async () => {
    if (!uid) {
      setProfile(null)
      return
    }
    setProfile(await repo.getProfile(uid))
  }, [repo, uid])

  useEffect(() => {
    refreshProfile()
  }, [refreshProfile])

  const toast = useCallback((msg: string) => {
    setToastMsg(msg)
    window.setTimeout(() => setToastMsg((m) => (m === msg ? null : m)), 2800)
  }, [])

  const value = useMemo(() => ({ repo, uid, profile, fx, ready, refreshProfile, toast }), [repo, uid, profile, fx, ready, refreshProfile, toast])

  return (
    <Ctx.Provider value={value}>
      {children}
      {toastMsg && (
        <div className="toast" role="status">
          <span style={{ width: 22, height: 22, borderRadius: 11, background: 'var(--yellow)', color: 'var(--ink)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, flexShrink: 0 }} aria-hidden="true">✓</span>
          {toastMsg}
        </div>
      )}
    </Ctx.Provider>
  )
}

export function useApp(): AppCtx {
  const c = useContext(Ctx)
  if (!c) throw new Error('AppProvider faltante')
  return c
}

/** Carga los datos de un viaje y permite recargarlos tras un cambio */
export function useTrip(tripId: string | undefined) {
  const { repo } = useApp()
  const [data, setData] = useState<TripData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!tripId) return
    try {
      setData(await repo.loadTrip(tripId))
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar el viaje')
    }
  }, [repo, tripId])

  useEffect(() => {
    setData(null)
    reload()
  }, [reload])

  // Cuando se terminan de subir gastos guardados sin conexión, se recargan los datos
  useEffect(() => {
    let prev = getStatus().pending
    return subscribeStatus((s) => {
      if (s.pending < prev && s.online) reload()
      prev = s.pending
    })
  }, [reload])

  return { data, error, reload }
}
