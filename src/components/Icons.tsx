import type { ReactNode } from 'react'
type P = { size?: number }
const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
})

export const IconHome = ({ size = 22 }: P) => (
  <svg {...base(size)}><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /></svg>
)
export const IconRoute = ({ size = 22 }: P) => (
  <svg {...base(size)}><circle cx="6" cy="19" r="2.5" /><circle cx="18" cy="5" r="2.5" /><path d="M8.5 19H16a3.5 3.5 0 0 0 0-7H8a3.5 3.5 0 0 1 0-7h7.5" /></svg>
)
export const IconReceipt = ({ size = 22 }: P) => (
  <svg {...base(size)}><path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2z" /><path d="M9 8h6" /><path d="M9 12h6" /></svg>
)
export const IconUsers = ({ size = 22 }: P) => (
  <svg {...base(size)}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7" /><path d="M18 14.5a6.5 6.5 0 0 1 3.5 5.5" /></svg>
)
export const IconPlus = ({ size = 26 }: P) => (
  <svg {...base(size)} strokeWidth={2.6}><path d="M12 5v14" /><path d="M5 12h14" /></svg>
)
export const IconClose = ({ size = 18 }: P) => (
  <svg {...base(size)} strokeWidth={2.2}><path d="M6 6l12 12" /><path d="M18 6 6 18" /></svg>
)
export const IconBack = ({ size = 18 }: P) => (
  <svg {...base(size)} strokeWidth={2.2}><path d="m15 18-6-6 6-6" /></svg>
)
export const IconAlert = ({ size = 22 }: P) => (
  <svg {...base(size)} strokeWidth={2.2}><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>
)
export const IconCheck = ({ size = 20 }: P) => (
  <svg {...base(size)} strokeWidth={2.4}><path d="M20 6 9 17l-5-5" /></svg>
)
export const IconPlane = ({ size = 14 }: P) => (
  <svg {...base(size)}><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" /></svg>
)
export const IconTrain = ({ size = 14 }: P) => (
  <svg {...base(size)}><rect x="4" y="3" width="16" height="14" rx="3" /><path d="M4 11h16" /><path d="M8 21l-2-4" /><path d="M16 21l2-4" /></svg>
)
export const IconSwap = ({ size = 18 }: P) => (
  <svg {...base(size)}><path d="M7 7h12l-3-3" /><path d="M17 17H5l3 3" /></svg>
)
export const IconSearch = ({ size = 18 }: P) => (
  <svg {...base(size)}><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
)
export const IconPin = ({ size = 14 }: P) => (
  <svg {...base(size)}><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></svg>
)
export const IconCalendar = ({ size = 14 }: P) => (
  <svg {...base(size)}><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18" /><path d="M8 3v4" /><path d="M16 3v4" /></svg>
)
export const IconShare = ({ size = 20 }: P) => (
  <svg {...base(size)}><path d="M12 3v12" /><path d="m7 8 5-5 5 5" /><path d="M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" /></svg>
)
export const IconChart = ({ size = 20 }: P) => (
  <svg {...base(size)}><path d="M4 20V10" /><path d="M10 20V4" /><path d="M16 20v-7" /><path d="M22 20H2" /></svg>
)
export const IconTrash = ({ size = 18 }: P) => (
  <svg {...base(size)}><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M6 6l1 14h10l1-14" /></svg>
)
export const IconEdit = ({ size = 16 }: P) => (
  <svg {...base(size)}><path d="M4 20h4L19 9l-4-4L4 16z" /></svg>
)

const CAT_PATHS: Record<string, ReactNode> = {
  comida: (<><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" /><path d="M7 2v20" /><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7" /></>),
  transporte: (<><rect x="4" y="3" width="16" height="14" rx="3" /><path d="M4 11h16" /><path d="M8 21l-2-4" /><path d="M16 21l2-4" /></>),
  alojamiento: (<><path d="M3 20V8" /><path d="M3 14h18v6" /><path d="M21 14v-2a3 3 0 0 0-3-3h-7v5" /><circle cx="7" cy="11" r="2" /></>),
  actividades: (<><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5z" /></>),
  tours: (<><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z" /><path d="M13 5v2" /><path d="M13 17v2" /><path d="M13 11v2" /></>),
  salidas: (<><path d="M8 22h8" /><path d="M12 15v7" /><path d="M5 3h14l-7 12z" /></>),
  compras: (<><path d="M6 7h12l-1 13H7z" /><path d="M9 7a3 3 0 0 1 6 0" /></>),
  seguros: (<><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z" /></>),
  pasajes: (<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />),
  otros: (<><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>),
}

export const CategoryIcon = ({ id, size = 18 }: { id: string; size?: number }) => (
  <svg {...base(size)}>{CAT_PATHS[id] ?? CAT_PATHS.otros}</svg>
)
