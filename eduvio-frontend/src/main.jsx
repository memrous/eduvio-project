import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { LucideProvider } from 'lucide-react'
import './index.css'
import './i18n'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary'
import queryClient from './lib/queryClient'
import { ThemeProvider } from './context/ThemeContext'
import { ICON_STROKE_WIDTH } from './components/common/iconScale'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ErrorBoundary>
            {/* Default stroke of every lucide icon (see components/common/Icon) */}
            <LucideProvider strokeWidth={ICON_STROKE_WIDTH}>
              <App />
            </LucideProvider>
          </ErrorBoundary>
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
)
