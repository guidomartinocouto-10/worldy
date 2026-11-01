import { useApp } from '../app/AppContext'
import type { Trip } from '../lib/types'

export function InviteCard({ trip }: { trip: Trip }) {
  const { toast } = useApp()
  const pretty = trip.invite_code.length === 6 ? `${trip.invite_code.slice(0, 3)} · ${trip.invite_code.slice(3)}` : trip.invite_code
  const text = `Únete a mi viaje "${trip.name}" en Worldy: ${window.location.origin}/unirme/${trip.invite_code} (código ${trip.invite_code})`

  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Worldy', text })
        return
      }
    } catch {
      return
    }
    copy(text)
  }
  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      toast('Copiado')
    } catch {
      toast(value)
    }
  }

  return (
    <div className="card yellow" style={{ padding: 14, gap: 10 }}>
      <div className="row between">
        <span className="small bold" style={{ color: 'var(--brown-2)', letterSpacing: 0.5 }}>
          CÓDIGO DE INVITACIÓN
        </span>
        <span className="amount-md brown" style={{ letterSpacing: 2 }}>
          {pretty}
        </span>
      </div>
      <div className="grid2">
        <button className="btn primary small" onClick={share}>
          Compartir enlace
        </button>
        <button className="btn ghost-yellow small" onClick={() => copy(trip.invite_code)}>
          Copiar código
        </button>
      </div>
    </div>
  )
}
