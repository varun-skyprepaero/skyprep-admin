import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from '@/app/App'
import { AppProviders } from '@/app/providers'
import { clearChunkReloadFlag } from '@/lib/lazy-with-retry'
import '@/styles/globals.css'

clearChunkReloadFlag()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
)
