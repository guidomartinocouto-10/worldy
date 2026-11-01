import { useEffect, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { IconClose, IconHome, IconPlus, IconReceipt, IconRoute, IconUsers } from './Icons'
import { initials, num, symbol } from '../lib/format'
import type { Profile } from '../lib/types'

export function BottomNav({ tripId, active }: { tripId: string; active: 'inicio' | 'ruta' | 'gastos' | 'grupo' | null }) {
  const item = (key: typeof active, to: string, label: string, icon: ReactNode) => (
    <Link to={to} className={`nav-item${active === key ? ' on' : ''}`} aria-current={active === key ? 'page' : undefined}>
      {icon}
      {label}
    </Link>
  )
  return (
    <nav className="bottom-nav" aria-label="Navegación del viaje">
      {item('inicio', `/v/${tripId}`, 'Inicio', <IconHome />)}
      {item('ruta', `/v/${tripId}/ruta`, 'Ruta', <IconRoute />)}
      <Link to={`/v/${tripId}/gasto`} className="nav-add" aria-label="Agregar gasto">
        <IconPlus />
      </Link>
      {item('gastos', `/v/${tripId}/gastos`, 'Gastos', <IconReceipt />)}
      {item('grupo', `/v/${tripId}/grupo`, 'Grupo', <IconUsers />)}
    </nav>
  )
}

/** Monto grande con el símbolo pequeño: <sup>US$</sup>1.295 */
export function HeroAmount({ value, currency = 'USD', decimals, size }: { value: number; currency?: string; decimals?: 0 | 2; size?: number }) {
  const d = decimals ?? (Math.abs(value) >= 1000 ? 0 : 2)
  return (
    <span className="amount-hero" style={size ? { fontSize: size } : undefined}>
      <span className="cur">{symbol(currency)}</span>
      {num(value, d)}
    </span>
  )
}

export function Bar({ pct, variant, thin }: { pct: number; variant?: 'warn' | 'over'; thin?: boolean }) {
  const w = Math.max(0, Math.min(pct, 1)) * 100
  return (
    <div className={`bar${thin ? ' thin' : ''}${variant ? ` ${variant}` : ''}`} role="presentation">
      <div style={{ width: `${w}%` }} />
    </div>
  )
}

export function Avatar({ profile, me, className = '', size }: { profile: Pick<Profile, 'name' | 'avatar_url'>; me?: boolean; className?: string; size?: number }) {
  const style = size ? { width: size, height: size, borderRadius: size / 2 } : undefined
  return (
    <span className={`avatar${me ? ' me' : ''} ${className}`} style={style} aria-hidden="true">
      {profile.avatar_url ? <img src={profile.avatar_url} alt="" referrerPolicy="no-referrer" /> : initials(profile.name)}
    </span>
  )
}

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="row between">
          <h2 className="sheet-title">{title}</h2>
          <button className="icon-btn light" onClick={onClose} aria-label="Cerrar">
            <IconClose />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Loading() {
  return (
    <div className="center-page">
      <div className="spinner" aria-label="Cargando" />
    </div>
  )
}

export function ErrorPage({ message }: { message: string }) {
  return (
    <div className="center-page">
      <p className="text15">{message}</p>
      <Link className="btn ghost" to="/">
        Volver a mis viajes
      </Link>
    </div>
  )
}

export function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" className={`switch${on ? ' on' : ''}`} aria-pressed={on} aria-label={label} onClick={() => onChange(!on)}>
      <span />
    </button>
  )
}
