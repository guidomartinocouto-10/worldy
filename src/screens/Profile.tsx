import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../app/AppContext'
import { Avatar } from '../components/ui'
import { IconBack } from '../components/Icons'
import { allCurrencies, currencyName } from '../lib/fx'
import { resetDemo } from '../lib/demoRepo'

export default function Profile() {
  const { repo, profile, refreshProfile, fx, toast } = useApp()
  const [name, setName] = useState(profile?.name ?? '')
  const [equiv, setEquiv] = useState(profile?.equiv_currency ?? 'UYU')
  const currencies = useMemo(() => allCurrencies(fx.rates), [fx.rates])

  const save = async () => {
    try {
      await repo.updateProfile({ name: name.trim() || 'Viajero', equiv_currency: equiv })
      await refreshProfile()
      toast('Perfil actualizado')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'No se pudo guardar')
    }
  }

  return (
    <div className="app no-nav">
      <header className="topbar">
        <Link to="/" className="icon-btn light" aria-label="Volver"><IconBack /></Link>
        <span className="topbar-title">Mi perfil</span>
        <span className="spacer44" />
      </header>

      <div className="section">
        <div className="card" style={{ alignItems: 'center' }}>
          {profile && <Avatar profile={profile} me size={72} />}
        </div>
        <div className="card" style={{ gap: 16 }}>
          <div className="field">
            <label htmlFor="p-name">Nombre</label>
            <input id="p-name" className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="p-equiv">Moneda de equivalencia</label>
            <select id="p-equiv" className="input" value={equiv} onChange={(e) => setEquiv(e.target.value)}>
              {currencies.map((c) => (
                <option key={c} value={c}>{c} · {currencyName(c)}</option>
              ))}
            </select>
            <span className="small muted">Cada monto en dólares se muestra también en esta moneda, con el tipo de cambio del día.</span>
          </div>
          <button className="btn primary block" onClick={save}>Guardar</button>
        </div>
        <div className="card soft">
          <span className="text13 muted">
            Tipo de cambio: {fx.source === 'live' ? 'actualizado hoy' : fx.source === 'cache' ? `guardado del ${fx.date}` : 'aproximado (sin conexión)'}
          </span>
        </div>
        {repo.mode === 'demo' && (
          <button
            className="btn ghost block"
            onClick={() => {
              resetDemo()
              window.location.href = '/'
            }}
          >
            Reiniciar datos de ejemplo
          </button>
        )}
        <button className="btn danger block" onClick={() => repo.signOut()}>
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
