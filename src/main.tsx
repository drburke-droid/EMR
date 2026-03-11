import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initNlpEngine } from './utils/nlpEngine'

// Initialize NLP association engine (async, non-blocking)
initNlpEngine().catch(console.error);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
