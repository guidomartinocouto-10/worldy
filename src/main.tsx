import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { AppProvider } from './app/AppContext'
import { createSupabaseRepo } from './lib/supabaseRepo'
import { createDemoRepo } from './lib/demoRepo'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

// Con las claves de Supabase se usa la base de datos real; sin ellas, el modo demo
const repo = url && key ? createSupabaseRepo(url, key) : createDemoRepo()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider repo={repo}>
      <App />
    </AppProvider>
  </StrictMode>,
)
