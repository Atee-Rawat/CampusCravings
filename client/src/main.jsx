import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { CartProvider } from './context/CartContext'
import { SocketProvider } from './context/SocketContext'
import './styles/index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <BrowserRouter>
            <AuthProvider>
                <SocketProvider>
                    <CartProvider>
                        <App />
                        <Toaster
                            position="top-center"
                            toastOptions={{
                                duration: 3000,
                                style: {
                                    background: '#1A1A1A',
                                    color: '#FFFFFF',
                                    borderRadius: '12px',
                                    border: '1px solid rgba(255,255,255,0.1)'
                                },
                                success: {
                                    iconTheme: {
                                        primary: '#00E676',
                                        secondary: '#0D0D0D'
                                    }
                                },
                                error: {
                                    iconTheme: {
                                        primary: '#FF5252',
                                        secondary: '#0D0D0D'
                                    }
                                }
                            }}
                        />
                    </CartProvider>
                </SocketProvider>
            </AuthProvider>
        </BrowserRouter>
    </React.StrictMode>
)
