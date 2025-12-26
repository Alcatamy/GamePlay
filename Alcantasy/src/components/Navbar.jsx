import { useState } from 'react'
import { useAuthStore } from '../stores/authStore'
import {
    Menu, X, LogOut, RefreshCw, Home, Activity, Trophy, ShoppingCart,
    Users, Edit3, Target, Clock, Calendar, User, Shield, BarChart3, Settings, HelpCircle, Brain
} from 'lucide-react'
import toast from 'react-hot-toast'

// Grouped menu structure per UX audit
const menuGroups = [
    {
        id: 'principal',
        label: 'Principal',
        items: [
            { id: 'dashboard', label: 'Inicio', icon: Home },
            { id: 'activity', label: 'Actividad', icon: Activity },
            { id: 'intelligence', label: 'Inteligencia', icon: Brain, isNew: true },
        ]
    },
    {
        id: 'mi_equipo',
        label: 'Mi Equipo',
        items: [
            { id: 'lineup', label: 'Alineación', icon: Edit3 },
            { id: 'statistics', label: 'Estadísticas', icon: BarChart3 },
        ]
    },
    {
        id: 'mercado',
        label: 'Mercado',
        items: [
            { id: 'market', label: 'Mercado', icon: ShoppingCart },
            { id: 'clauses', label: 'Cláusulas', icon: Shield },
            { id: 'players', label: 'Jugadores', icon: User },
        ]
    },
    {
        id: 'competicion',
        label: 'Competición',
        items: [
            { id: 'standings', label: 'Clasificación', icon: Trophy },
            { id: 'matches', label: 'Jornadas', icon: Calendar },
            { id: 'teams', label: 'Equipos Liga', icon: Users },
        ]
    }
]

// Flat list for mobile grid (optimized 4x3)
const mobileItems = [
    { id: 'dashboard', label: 'Inicio', icon: Home },
    { id: 'activity', label: 'Actividad', icon: Activity },
    { id: 'lineup', label: 'Alineación', icon: Edit3 },
    { id: 'statistics', label: 'Stats', icon: BarChart3 },
    { id: 'market', label: 'Mercado', icon: ShoppingCart },
    { id: 'clauses', label: 'Cláusulas', icon: Shield },
    { id: 'players', label: 'Jugadores', icon: User },
    { id: 'standings', label: 'Clasif.', icon: Trophy },
    { id: 'matches', label: 'Jornadas', icon: Calendar },
    { id: 'teams', label: 'Equipos', icon: Users },
]

export default function Navbar({ currentTab, setCurrentTab }) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const { user, logout, refreshToken, isTokenExpired } = useAuthStore()

    const handleLogout = () => {
        logout()
        toast.success('Sesión cerrada')
    }

    const handleRefresh = async () => {
        try {
            await refreshToken()
            toast.success('Token refrescado')
        } catch (error) {
            toast.error('Error al refrescar token')
        }
    }

    return (
        <>
            {/* Desktop Sidebar with Groups */}
            <aside className="hidden lg:flex fixed top-0 left-0 z-50 h-full w-64 flex-col bg-surface-dark border-r border-white/10">
                {/* Logo */}
                <div className="p-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center text-xl shadow-[0_0_15px_rgba(70,236,19,0.3)]">
                            ⚽
                        </div>
                        <div>
                            <h2 className="text-white text-lg font-bold leading-none tracking-tight">ALCANTASY</h2>
                            <span className="text-[10px] text-primary font-medium tracking-widest uppercase">Fantasy Pro</span>
                        </div>
                    </div>
                </div>

                {/* Navigation with Groups */}
                <nav className="flex-1 p-3 overflow-y-auto">
                    {menuGroups.map((group) => (
                        <div key={group.id} className="mb-4">
                            {/* Group Label */}
                            <p className="text-[10px] uppercase tracking-wider text-gray-500 font-medium px-3 mb-2">
                                {group.label}
                            </p>

                            {/* Group Items */}
                            <div className="space-y-1">
                                {group.items.map((item) => {
                                    const Icon = item.icon
                                    const isActive = currentTab === item.id

                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => setCurrentTab(item.id)}
                                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${isActive
                                                ? 'bg-primary text-black shadow-[0_0_15px_rgba(70,236,19,0.3)]'
                                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                                                }`}
                                        >
                                            <Icon size={18} />
                                            <span>{item.label}</span>
                                            {item.isNew && (
                                                <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-neon-pink/20 text-neon-pink font-bold">
                                                    NEW
                                                </span>
                                            )}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

                {/* User Info */}
                {user && (
                    <div className="p-3 border-t border-white/10">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold">
                                {user?.given_name?.[0] || user?.name?.[0] || '?'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">{user?.name || 'Usuario'}</p>
                                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                            </div>
                            <button
                                onClick={handleRefresh}
                                className={`p-2 rounded-lg transition-colors ${isTokenExpired?.()
                                    ? 'text-accent-red hover:bg-accent-red/10'
                                    : 'text-gray-400 hover:bg-white/5'
                                    }`}
                                title="Refrescar token"
                            >
                                <RefreshCw size={16} />
                            </button>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center justify-center gap-2 py-2 text-sm text-accent-red hover:bg-accent-red/10 rounded-lg transition-colors"
                        >
                            <LogOut size={16} />
                            Cerrar sesión
                        </button>
                    </div>
                )}
            </aside>

            {/* Mobile Top Bar */}
            <nav className="lg:hidden sticky top-0 z-50 bg-background-dark/95 backdrop-blur-md border-b border-white/10">
                <div className="flex items-center justify-between px-4 h-14">
                    {/* Logo */}
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center text-base">
                            ⚽
                        </div>
                        <span className="text-white font-bold">ALCANTASY</span>
                    </div>

                    {/* Right Actions */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleRefresh}
                            className={`p-2 rounded-full transition-colors ${isTokenExpired?.()
                                ? 'text-accent-red'
                                : 'text-primary'
                                }`}
                        >
                            <RefreshCw size={18} />
                        </button>
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="p-2 rounded-full text-gray-400"
                        >
                            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu Dropdown - Optimized 4x3 Grid */}
                {mobileMenuOpen && (
                    <div className="absolute top-full left-0 right-0 bg-surface-dark border-b border-white/10 p-4 shadow-xl">
                        <div className="grid grid-cols-4 gap-2">
                            {mobileItems.map((item) => {
                                const Icon = item.icon
                                const isActive = currentTab === item.id

                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => {
                                            setCurrentTab(item.id)
                                            setMobileMenuOpen(false)
                                        }}
                                        className={`flex flex-col items-center gap-1 p-2.5 rounded-xl text-[10px] font-medium transition-all ${isActive
                                            ? 'bg-primary/20 text-primary border border-primary/50'
                                            : 'bg-surface-accent text-gray-300 border border-white/5'
                                            }`}
                                    >
                                        <Icon size={18} />
                                        <span className="truncate w-full text-center">{item.label}</span>
                                    </button>
                                )
                            })}
                        </div>

                        {/* User section */}
                        <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                                    {user?.given_name?.[0] || '?'}
                                </div>
                                <span className="text-sm text-white truncate max-w-[150px]">{user?.name || 'Usuario'}</span>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="text-accent-red text-sm flex items-center gap-1"
                            >
                                <LogOut size={14} />
                                Salir
                            </button>
                        </div>
                    </div>
                )}
            </nav>
        </>
    )
}
