import type { Expense, TripData } from '../lib/types'
import { categoryLabel } from '../lib/types'
import { myShare, remainingOf } from '../lib/calc'
import { firstName, money } from '../lib/format'
import { CategoryIcon } from './Icons'

export function ExpenseRow({ e, data, uid, onClick }: { e: Expense; data: TripData; uid: string; onClick?: () => void }) {
  const share = myShare(e, uid)
  const split = e.shares.length > 1
  const ratio = e.amount_usd > 0 ? share / e.amount_usd : 1
  const localShare = e.amount * ratio
  const payer = data.members.find((m) => m.user_id === e.paid_by)?.profile.name ?? 'Otro viajero'
  const details = [categoryLabel(e.category), e.paid_from_fund ? 'Fondo común' : e.method === 'cash' ? 'Efectivo' : 'Tarjeta']
  const rem = remainingOf(e)
  return (
    <button type="button" className="tile" onClick={onClick}>
      <div className={`ico cat-${e.category}`}>
        <CategoryIcon id={e.category} />
      </div>
      <div className="col grow">
        <span className="text15 semi ellipsis">
          {e.description || categoryLabel(e.category)}
          {e.pending && <span className="tag yellow" style={{ marginLeft: 6, fontSize: 10, verticalAlign: 'middle' }}>PENDIENTE</span>}
          {rem.local > 0.004 && <span className="tag yellow" style={{ marginLeft: 6, fontSize: 10, verticalAlign: 'middle' }}>SEÑA</span>}
        </span>
        <span className="small muted ellipsis">
          {details.join(' · ')}
          {rem.local > 0.004 && <span className="amber semi">{` · falta ${money(rem.local, e.currency, { decimals: 2 })}`}</span>}
          {split && !e.paid_from_fund && (
            <>
              {' · '}
              <span className="green-text semi">
                {e.paid_by === uid ? `Dividido ÷${e.shares.length}` : `Pagó ${firstName(payer)}`}
              </span>
            </>
          )}
        </span>
      </div>
      <div className="col" style={{ alignItems: 'flex-end', flexShrink: 0 }}>
        <span className="text15 amount">{money(share)}</span>
        {e.currency !== 'USD' && <span className="small muted">{money(localShare, e.currency, { decimals: 2 })}</span>}
      </div>
    </button>
  )
}
