import { useEffect, useId, useRef, useState, type ReactNode } from 'react'

export interface Suggestion<T> {
  key: string
  label: string
  detail?: string
  value: T
}

/**
 * Campo de texto con sugerencias que aparecen mientras se escribe.
 * Se puede elegir con el dedo, el mouse o las flechas + Enter.
 */
export function Autocomplete<T>({
  id,
  label,
  value,
  onChange,
  onPick,
  getSuggestions,
  placeholder,
  disabled,
  hint,
  icon,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  onPick: (s: Suggestion<T>) => void
  getSuggestions: (q: string, signal: AbortSignal) => Promise<Suggestion<T>[]> | Suggestion<T>[]
  placeholder?: string
  disabled?: boolean
  hint?: string
  icon?: ReactNode
}) {
  const [items, setItems] = useState<Suggestion<T>[]>([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [loading, setLoading] = useState(false)
  const typed = useRef(false)
  const listId = useId()
  const wrap = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!typed.current) return
    const ctrl = new AbortController()
    const timer = window.setTimeout(async () => {
      setLoading(true)
      const res = await getSuggestions(value, ctrl.signal)
      if (!ctrl.signal.aborted) {
        setItems(res)
        setActive(0)
        setOpen(res.length > 0)
        setLoading(false)
      }
    }, 220)
    return () => {
      ctrl.abort()
      window.clearTimeout(timer)
    }
  }, [value, getSuggestions])

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const pick = (s: Suggestion<T>) => {
    typed.current = false
    setOpen(false)
    onPick(s)
  }

  return (
    <div className="field ac" ref={wrap}>
      <label htmlFor={id}>{label}</label>
      <div className="ac-box">
        {icon && <span className="ac-icon" aria-hidden="true">{icon}</span>}
        <input
          id={id}
          className="input"
          style={icon ? { paddingLeft: 38 } : undefined}
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          onChange={(e) => {
            typed.current = true
            onChange(e.target.value)
          }}
          onFocus={() => items.length > 0 && typed.current && setOpen(true)}
          onKeyDown={(e) => {
            if (!open) return
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setActive((a) => Math.min(a + 1, items.length - 1))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setActive((a) => Math.max(a - 1, 0))
            } else if (e.key === 'Enter') {
              e.preventDefault()
              if (items[active]) pick(items[active])
            } else if (e.key === 'Escape') setOpen(false)
          }}
        />
        {loading && <span className="ac-spin" aria-hidden="true" />}
      </div>
      {open && (
        <ul className="ac-list" id={listId} role="listbox">
          {items.map((s, i) => (
            <li key={s.key} role="option" aria-selected={i === active}>
              <button type="button" className={i === active ? 'on' : ''} onMouseDown={(e) => e.preventDefault()} onClick={() => pick(s)} onMouseEnter={() => setActive(i)}>
                <span className="text15 semi">{s.label}</span>
                {s.detail && <span className="small muted">{s.detail}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
      {hint && <span className="small muted">{hint}</span>}
    </div>
  )
}
