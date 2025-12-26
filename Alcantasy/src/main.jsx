import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { Toaster } from 'react-hot-toast'

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <Toaster
            position="top-center"
            toastOptions={{
                duration: 3000,
                style: {
                    background: '#1f291c',
                    color: '#fff',
                    border: '1px solid rgba(70, 236, 19, 0.3)',
                },
                success: {
                    iconTheme: {
                        primary: '#46ec13',
                        secondary: '#0a0a0a',
                    },
                },
                error: {
                    iconTheme: {
                        primary: '#ff3b30',
                        secondary: '#0a0a0a',
                    },
                },
            }}
        />
        <App />
    </React.StrictMode>,
)
