/**
 * Ilustraciones propias de Worldy (SVG, en la paleta verde bosque + amarillo).
 */
const G = '#1F4D3A'
const G2 = '#2F5A47'
const G3 = '#A9C7B4'
const Y = '#F6D776'
const C = '#FBF8F3'
const S = '#EADFC8'

const plane = 'M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z'

/** Decoración del encabezado verde: nubes, sol y avión con su estela */
export function HeroDecor() {
  return (
    <svg className="hero-decor" viewBox="0 0 260 180" aria-hidden="true">
      <circle cx="206" cy="46" r="22" fill={Y} opacity="0.9" />
      <g fill="#fff" opacity="0.1">
        <rect x="120" y="70" width="86" height="22" rx="11" />
        <rect x="138" y="58" width="44" height="22" rx="11" />
        <rect x="40" y="118" width="70" height="18" rx="9" />
        <rect x="54" y="108" width="34" height="18" rx="9" />
      </g>
      <path d="M10 170 C 70 150, 120 110, 186 92" fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="2" strokeDasharray="3 7" strokeLinecap="round" className="trail" />
      <g transform="translate(180 76) rotate(28) scale(1.15)" className="hero-plane">
        <path d={plane} fill={C} />
      </g>
    </svg>
  )
}

/** Escena de bienvenida: colinas, sol, nubes y un avión */
export function WelcomeScene() {
  return (
    <svg viewBox="0 0 320 220" className="welcome-scene" role="img" aria-label="Ilustración de un avión volando sobre colinas">
      <circle cx="232" cy="64" r="34" fill={Y} />
      <g fill="#fff" opacity="0.16">
        <rect x="40" y="52" width="92" height="26" rx="13" />
        <rect x="62" y="38" width="48" height="26" rx="13" />
        <rect x="190" y="104" width="76" height="20" rx="10" />
      </g>
      <path d="M30 160 C 100 110, 170 92, 250 70" fill="none" stroke={C} strokeOpacity="0.55" strokeWidth="2.5" strokeDasharray="4 8" strokeLinecap="round" className="trail" />
      <g transform="translate(236 50) rotate(25) scale(1.6)" className="hero-plane">
        <path d={plane} fill={C} />
      </g>
      <path d="M0 176 C 60 150, 110 150, 170 172 S 270 196, 320 168 V220 H0z" fill={G2} />
      <path d="M0 196 C 70 176, 150 182, 210 200 S 290 214, 320 204 V220 H0z" fill={G3} opacity="0.45" />
      <g transform="translate(96 132)">
        <path d="M14 0C6 0 0 6 0 13c0 10 14 23 14 23s14-13 14-23C28 6 22 0 14 0z" fill={Y} />
        <circle cx="14" cy="13" r="5" fill={G} />
      </g>
    </svg>
  )
}

/** Valija con calcomanías (sin viajes) */
export function SuitcaseArt({ size = 150 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.86} viewBox="0 0 160 138" aria-hidden="true">
      <ellipse cx="80" cy="128" rx="58" ry="7" fill={G} opacity="0.1" />
      <rect x="58" y="10" width="44" height="22" rx="10" fill="none" stroke={G} strokeWidth="7" />
      <rect x="22" y="28" width="116" height="94" rx="16" fill={Y} />
      <rect x="44" y="28" width="9" height="94" fill={G} opacity="0.85" />
      <rect x="107" y="28" width="9" height="94" fill={G} opacity="0.85" />
      <circle cx="80" cy="64" r="15" fill={C} stroke={G} strokeWidth="3" strokeDasharray="3 3" />
      <path d="M73 64h14M80 57v14" stroke={G} strokeWidth="3" strokeLinecap="round" />
      <rect x="62" y="92" width="34" height="14" rx="7" fill={G2} />
      <circle cx="34" cy="126" r="5" fill={G} />
      <circle cx="126" cy="126" r="5" fill={G} />
    </svg>
  )
}

/** Mapa plegado con ruta (ruta vacía) */
export function MapArt({ size = 150 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.8} viewBox="0 0 160 128" aria-hidden="true">
      <ellipse cx="80" cy="120" rx="62" ry="6" fill={G} opacity="0.1" />
      <path d="M14 24 54 12 106 24 146 12 146 104 106 116 54 104 14 116z" fill={C} stroke={G} strokeWidth="3" strokeLinejoin="round" />
      <path d="M54 12v92M106 24v92" stroke={G} strokeWidth="2" opacity="0.25" />
      <path d="M54 12 106 24 106 116 54 104z" fill={S} opacity="0.6" />
      <path d="M30 92 C 50 70, 70 84, 86 62 S 118 44, 128 40" fill="none" stroke={G} strokeWidth="3" strokeDasharray="5 6" strokeLinecap="round" />
      <circle cx="30" cy="92" r="6" fill={G} />
      <g transform="translate(116 14)">
        <path d="M12 0C5 0 0 5 0 12c0 9 12 20 12 20s12-11 12-20C24 5 19 0 12 0z" fill={Y} stroke={G} strokeWidth="2.5" />
        <circle cx="12" cy="12" r="4" fill={G} />
      </g>
    </svg>
  )
}

/** Recibo y moneda (sin gastos) */
export function ReceiptArt({ size = 130 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 140 140" aria-hidden="true">
      <ellipse cx="70" cy="130" rx="50" ry="6" fill={G} opacity="0.1" />
      <path d="M30 12h66v108l-8.25-6-8.25 6-8.25-6-8.25 6-8.25-6-8.25 6-8.25-6L30 120z" fill="#fff" stroke={G} strokeWidth="3" strokeLinejoin="round" />
      <path d="M44 36h38M44 52h38M44 68h24" stroke={G3} strokeWidth="5" strokeLinecap="round" />
      <path d="M44 90h38" stroke={G} strokeWidth="5" strokeLinecap="round" />
      <circle cx="104" cy="96" r="22" fill={Y} stroke={G} strokeWidth="3" />
      <text x="104" y="103" textAnchor="middle" fontSize="20" fontWeight="800" fill={G} fontFamily="DM Sans, sans-serif">$</text>
    </svg>
  )
}

/** Personas con valijas (grupo) */
export function FriendsArt({ size = 160 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.7} viewBox="0 0 170 120" aria-hidden="true">
      <ellipse cx="85" cy="112" rx="70" ry="6" fill={G} opacity="0.1" />
      <circle cx="56" cy="34" r="14" fill={S} stroke={G} strokeWidth="3" />
      <path d="M32 106c0-30 10-46 24-46s24 16 24 46z" fill={G2} />
      <circle cx="112" cy="30" r="14" fill={S} stroke={G} strokeWidth="3" />
      <path d="M88 106c0-32 10-50 24-50s24 18 24 50z" fill={Y} stroke={G} strokeWidth="3" />
      <rect x="138" y="78" width="22" height="30" rx="5" fill={G} />
      <path d="M144 78v-6h10v6" fill="none" stroke={G} strokeWidth="3" />
      <rect x="10" y="84" width="20" height="24" rx="5" fill={Y} stroke={G} strokeWidth="3" />
    </svg>
  )
}

/** Medalla para el resumen */
export function MedalArt({ size = 46 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path d="M15 4h8l-4 14h-8zM33 4h-8l4 14h8z" fill={G2} />
      <circle cx="24" cy="30" r="14" fill={Y} stroke={G} strokeWidth="3" />
      <path d="m18 30 4 4 8-8" fill="none" stroke={G} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Confeti que cae una vez */
export function Confetti() {
  const colors = [Y, C, G3, '#F4B8A0']
  return (
    <div className="confetti" aria-hidden="true">
      {Array.from({ length: 28 }, (_, i) => (
        <span
          key={i}
          style={{
            left: `${(i * 37) % 100}%`,
            background: colors[i % colors.length],
            animationDelay: `${(i % 7) * 0.12}s`,
            animationDuration: `${2.2 + (i % 5) * 0.35}s`,
            transform: `rotate(${i * 29}deg)`,
          }}
        />
      ))}
    </div>
  )
}
