import { lazy, Suspense, useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { useApp } from './app/AppContext'
import { Loading } from './components/ui'
import { SyncBanner } from './components/SyncBanner'
import Login from './screens/Login'
import Trips from './screens/Trips'
import TripHome from './screens/TripHome'

const NewTrip = lazy(() => import('./screens/NewTrip'))
const Route_ = lazy(() => import('./screens/Route'))
const AddExpense = lazy(() => import('./screens/AddExpense'))
const BuyCurrency = lazy(() => import('./screens/BuyCurrency'))
const Expenses = lazy(() => import('./screens/Expenses'))
const Group = lazy(() => import('./screens/Group'))
const Summary = lazy(() => import('./screens/Summary'))
const Profile = lazy(() => import('./screens/Profile'))
const DestinationDetail = lazy(() => import('./screens/DestinationDetail'))

const PENDING_KEY = 'worldy.pendingJoin'

function JoinLink() {
  const { code } = useParams()
  const { repo, toast } = useApp()
  const nav = useNavigate()
  useEffect(() => {
    if (!code) return
    repo
      .joinTrip(code)
      .then((id) => nav(`/v/${id}`, { replace: true }))
      .catch((e) => {
        toast(e instanceof Error ? e.message : 'Código no válido')
        nav('/', { replace: true })
      })
  }, [code, repo, nav, toast])
  return <Loading />
}

export default function App() {
  const { uid, ready, repo } = useApp()
  const [pending] = useState(() => {
    // Si alguien abre un enlace de invitación sin haber iniciado sesión, lo recordamos
    const m = window.location.pathname.match(/^\/unirme\/([A-Za-z0-9]+)/)
    if (m) sessionStorage.setItem(PENDING_KEY, m[1])
    return sessionStorage.getItem(PENDING_KEY)
  })

  if (!ready) return <Loading />
  if (!uid) return <Login />

  if (pending && !window.location.pathname.startsWith('/unirme/')) {
    sessionStorage.removeItem(PENDING_KEY)
    window.history.replaceState(null, '', `/unirme/${pending}`)
  }

  return (
    <BrowserRouter>
      {repo.mode === 'demo' && <div className="demo-banner">Modo demo · los datos se guardan solo en este dispositivo</div>}
      <SyncBanner />
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<Trips />} />
          <Route path="/nuevo" element={<NewTrip />} />
          <Route path="/perfil" element={<Profile />} />
          <Route path="/unirme/:code" element={<JoinLink />} />
          <Route path="/v/:tripId" element={<TripHome />} />
          <Route path="/v/:tripId/ruta" element={<Route_ />} />
          <Route path="/v/:tripId/d/:destId" element={<DestinationDetail />} />
          <Route path="/v/:tripId/gasto" element={<AddExpense />} />
          <Route path="/v/:tripId/cambio" element={<BuyCurrency />} />
          <Route path="/v/:tripId/gastos" element={<Expenses />} />
          <Route path="/v/:tripId/grupo" element={<Group />} />
          <Route path="/v/:tripId/resumen" element={<Summary />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
