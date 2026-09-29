import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { removeLegacyLocalState } from './services/storageService.js'

const root = createRoot(document.getElementById('root'))
try {
  removeLegacyLocalState()
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
} catch {
  root.render(<main className="login-screen"><p role="alert">No se han podido eliminar las copias antiguas del navegador. Permite el acceso al almacenamiento y recarga la página.</p></main>)
}
