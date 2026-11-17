import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import './i18n'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary'
import queryClient from './lib/queryClient'
import { ThemeProvider } from './context/ThemeContext'
import { IconContext } from './components/ui/icons'
import { checkProductionConfig } from './config'

checkProductionConfig()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ErrorBoundary>
            <IconContext.Provider value={{ weight: 'regular' }}>
              <App />
            </IconContext.Provider>
          </ErrorBoundary>
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
)
