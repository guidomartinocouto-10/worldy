import { useState } from 'react'
import { useApp } from '../app/AppContext'

export default function Login() {
  const { repo } = useApp()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const go = async () => {
    setBusy(true)
    setError(null)
    try {
      await repo.signInWithGoogle()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo iniciar sesión')
      setBusy(false)
    }
  }

  return (
    <div className="center-page" style={{ background: 'var(--green)', color: '#fff' }}>
      <span className="brand" style={{ fontSize: 40 }}>
        Worldy
      </span>
      <p className="text15" style={{ color: 'var(--green-muted)', maxWidth: 300, margin: 0 }}>
        Controla tus gastos de viaje por destino, con presupuesto, alertas y cuentas claras con tu grupo.
      </p>
      <button className="btn accent" style={{ width: 280, marginTop: 24 }} onClick={go} disabled={busy}>
        {repo.mode === 'demo' ? 'Entrar al modo demo' : 'Continuar con Google'}
      </button>
      {repo.mode === 'demo' && (
        <p className="small" style={{ color: 'var(--green-muted)', maxWidth: 300 }}>
          La app todavía no está conectada a la base de datos. Los datos del modo demo se guardan solo en este dispositivo.
        </p>
      )}
      {error && <p className="small" style={{ color: 'var(--yellow)' }}>{error}</p>}
    </div>
  )
}
