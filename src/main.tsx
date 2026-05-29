// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { Toaster } from 'sonner'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    <Toaster
      position="top-center"
      toastOptions={{
        style: {
          background: '#1a1a1a',
          border: '1px solid rgba(255,255,255,0.1)',
          color: '#ffffff',
          borderRadius: '16px',
          fontSize: '14px',
          fontWeight: '600',
        },
        success: {
          style: {
            borderColor: 'rgba(16,185,129,0.3)',
          },
          iconTheme: { primary: '#10B981', secondary: '#000' },
        },
        error: {
          style: {
            borderColor: 'rgba(239,68,68,0.3)',
          },
          iconTheme: { primary: '#EF4444', secondary: '#000' },
        },
      }}
      richColors
      expand
      closeButton
    />
  </React.StrictMode>,
)
