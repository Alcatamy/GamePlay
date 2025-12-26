import { useState, useCallback } from 'react'
import { useAuthStore } from '../stores/authStore'
import { LogIn, Clipboard, ExternalLink, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Login() {
    const [tokenInput, setTokenInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [showInstructions, setShowInstructions] = useState(false)
    const { login } = useAuthStore()

    // Handle text input change
    const handleInputChange = useCallback((e) => {
        setTokenInput(e.target.value)
    }, [])

    const handleLogin = async () => {
        const trimmedToken = tokenInput.trim()
        if (!trimmedToken) {
            toast.error('Pega tu token JSON primero')
            return
        }

        setIsLoading(true)
        try {
            await login(trimmedToken)
            toast.success('¡Sesión iniciada correctamente!')
        } catch (error) {
            toast.error(`Error: ${error.message}`)
        } finally {
            setIsLoading(false)
        }
    }

    const handlePaste = async () => {
        try {
            const text = await navigator.clipboard.readText()
            if (text) {
                setTokenInput(text)
                toast.success('Token pegado desde el portapapeles')
            }
        } catch (error) {
            toast.error('Pega manualmente el token (Ctrl+V)')
        }
    }

    // Check if token is valid JSON with required fields
    const isValidToken = () => {
        const trimmed = tokenInput.trim()
        if (!trimmed) return false
        if (!trimmed.startsWith('{')) return false
        try {
            const parsed = JSON.parse(trimmed)
            return !!(parsed.access_token || parsed.id_token)
        } catch {
            return trimmed.length > 50 // Allow raw JWT tokens
        }
    }

    const canSubmit = tokenInput.trim().length > 0

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background-dark to-background-dark flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 mb-4 shadow-[0_0_40px_rgba(70,236,19,0.3)]">
                        <span className="text-4xl">⚽</span>
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Alcantasy</h1>
                    <p className="text-gray-400">LaLiga Fantasy Dashboard</p>
                </div>

                {/* Login Card */}
                <div className="glass-panel rounded-2xl p-6 sm:p-8">
                    <div className="space-y-6">
                        {/* Instructions Toggle */}
                        <button
                            type="button"
                            onClick={() => setShowInstructions(!showInstructions)}
                            className="w-full flex items-center justify-between p-3 bg-surface-accent rounded-xl text-sm hover:bg-white/10 transition-colors"
                        >
                            <span className="text-gray-300">📋 ¿Cómo obtener mi token?</span>
                            <span className={`text-primary transition-transform duration-200 ${showInstructions ? 'rotate-180' : ''}`}>▼</span>
                        </button>

                        {/* Instructions */}
                        {showInstructions && (
                            <div className="bg-surface-accent rounded-xl p-4 text-sm space-y-3 border border-primary/20 animate-in fade-in duration-200">
                                <div className="flex gap-3">
                                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-black flex items-center justify-center font-bold text-xs">1</span>
                                    <p className="text-gray-300">Abre <a href="https://miliga.laliga.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">miliga.laliga.com</a> en otra pestaña</p>
                                </div>
                                <div className="flex gap-3">
                                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-black flex items-center justify-center font-bold text-xs">2</span>
                                    <p className="text-gray-300">Pulsa <kbd className="px-2 py-0.5 bg-gray-700 rounded text-xs">F12</kbd> para abrir DevTools</p>
                                </div>
                                <div className="flex gap-3">
                                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-black flex items-center justify-center font-bold text-xs">3</span>
                                    <p className="text-gray-300">Ve a <strong>Network</strong> → <strong>Fetch/XHR</strong></p>
                                </div>
                                <div className="flex gap-3">
                                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-black flex items-center justify-center font-bold text-xs">4</span>
                                    <p className="text-gray-300">Inicia sesión con Google</p>
                                </div>
                                <div className="flex gap-3">
                                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-black flex items-center justify-center font-bold text-xs">5</span>
                                    <p className="text-gray-300">Busca: <code className="px-2 py-0.5 bg-gray-800 rounded text-xs text-primary">token?p=B2C</code></p>
                                </div>
                                <div className="flex gap-3">
                                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-black flex items-center justify-center font-bold text-xs">6</span>
                                    <p className="text-gray-300">Copia el JSON de la pestaña <strong>Response</strong></p>
                                </div>
                            </div>
                        )}

                        {/* Open LaLiga Button */}
                        <a
                            href="https://miliga.laliga.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all"
                        >
                            <ExternalLink size={18} />
                            Abrir LaLiga
                        </a>

                        {/* Token Input */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-sm text-gray-400">Token JSON</label>
                                <button
                                    type="button"
                                    onClick={handlePaste}
                                    className="flex items-center gap-1 text-xs text-primary hover:text-primary-dark transition-colors"
                                >
                                    <Clipboard size={14} />
                                    Pegar
                                </button>
                            </div>
                            <textarea
                                value={tokenInput}
                                onChange={handleInputChange}
                                placeholder='{"access_token": "...", "refresh_token": "..."}'
                                className="w-full h-32 bg-background-dark border border-white/10 rounded-xl p-4 text-sm font-mono text-gray-300 placeholder:text-gray-600 focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none transition-colors"
                            />

                            {/* Validation indicator */}
                            {tokenInput.trim() && (
                                <div className={`flex items-center gap-2 text-xs ${isValidToken() ? 'text-primary' : 'text-yellow-500'}`}>
                                    {isValidToken() ? (
                                        <>
                                            <CheckCircle size={14} />
                                            Token válido detectado
                                        </>
                                    ) : (
                                        <>
                                            <AlertCircle size={14} />
                                            Verifica el formato JSON
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Login Button */}
                        <button
                            type="button"
                            onClick={handleLogin}
                            disabled={isLoading || !canSubmit}
                            className={`w-full flex items-center justify-center gap-2 py-4 font-bold rounded-xl transition-all ${canSubmit && !isLoading
                                    ? 'bg-primary hover:bg-primary-dark text-black shadow-[0_0_20px_rgba(70,236,19,0.3)] hover:shadow-[0_0_30px_rgba(70,236,19,0.5)]'
                                    : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                }`}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 size={20} className="animate-spin" />
                                    Iniciando sesión...
                                </>
                            ) : (
                                <>
                                    <LogIn size={20} />
                                    Iniciar Sesión
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-xs text-gray-500 mt-6">
                    Alcantasy v1.0 • Tu token se guarda solo en tu dispositivo
                </p>
            </div>
        </div>
    )
}
