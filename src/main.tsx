import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
// index.css removed — using global.css
import App from './App.tsx'

Sentry.init({
  dsn: 'https://1b3900414ea3187575f16c0414b916ca@o4511206710378496.ingest.de.sentry.io/4511206720077904',
  sendDefaultPii: true,
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
