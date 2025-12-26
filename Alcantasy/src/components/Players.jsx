import { useState, useEffect, useMemo, useDeferredValue, useCallback, useRef } from 'react'
import { fantasyAPI } from '../services/api'
import { useAuthStore } from '../stores/authStore'
import toast from 'react-hot-toast'
import { RefreshCw, User, Search, TrendingUp, TrendingDown, Star, Filter, Users, Target } from 'lucide-react'
import PlayerDetailModal from './PlayerDetailModal'
import marketTrendsService from '../services/marketTrendsService'
import playerOwnershipService from '../services/playerOwnershipService'

// Format number with dots for display (e.g., 60.000.000)
const formatNumberWithDots = (value) => {
    if (!value) return ''
    const numericValue = value.toString().replace(/\D/g, '')
    return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

const formatMoney = (amount) => {
    if (!amount && amount !== 0) return '-'
    if (amount >= 1000000) {
        return `${(amount / 1000000).toFixed(1)}M €`
    }
    return new Intl.NumberFormat('es-ES').format(amount) + ' €'
}

export default function Players() {
    const { leagueId } = useAuthStore()
    const [loading, setLoading] = useState(true)
    const [players, setPlayers] = useState([])
    const [searchTerm, setSearchTerm] = useState('')
    const deferredSearchTerm = useDeferredValue(searchTerm)
    const [positionFilter, setPositionFilter] = useState('all')
    const [marketStatusFilter, setMarketStatusFilter] = useState('all')
    const [sortBy, setSortBy] = useState('points')

    // Services state
    const [trendsInitialized, setTrendsInitialized] = useState(false)
    const [trendsLoading, setTrendsLoading] = useState(false)
    const [ownershipInitialized, setOwnershipInitialized] = useState(false)

    // Modal
    const [selectedPlayer, setSelectedPlayer] = useState(null)
    const [isModalOpen, setIsModalOpen] = useState(false)

    // Infinite scroll
    const [displayedCount, setDisplayedCount] = useState(50)
    const [isLoadingMore, setIsLoadingMore] = useState(false)
    const observer = useRef()
    const BATCH_SIZE = 50

    // Load players on mount
    useEffect(() => {
        loadPlayers()
    }, [])

    // Initialize services when leagueId is available
    useEffect(() => {
        const initializeServices = async () => {
            if (!leagueId || (trendsInitialized && ownershipInitialized)) return

            setTrendsLoading(true)

            try {
                const [trendsResult, ownershipResult] = await Promise.allSettled([
                    !trendsInitialized ? marketTrendsService.initialize() : Promise.resolve({ fromCache: true }),
                    !ownershipInitialized ? playerOwnershipService.initialize(leagueId) : Promise.resolve({ fromCache: true })
                ])

                if (trendsResult.status === 'fulfilled' && !trendsInitialized) {
                    setTrendsInitialized(true)
                }

                if (ownershipResult.status === 'fulfilled' && !ownershipInitialized) {
                    setOwnershipInitialized(true)
                }
            } catch (error) {
                console.error('Service initialization error:', error)
            } finally {
                setTrendsLoading(false)
            }
        }

        initializeServices()
    }, [leagueId, trendsInitialized, ownershipInitialized])

    const loadPlayers = async () => {
        setLoading(true)
        try {
            const data = await fantasyAPI.getAllPlayers()
            let playersArray = []
            if (Array.isArray(data)) {
                playersArray = data
            } else if (data?.data && Array.isArray(data.data)) {
                playersArray = data.data
            } else if (data?.elements && Array.isArray(data.elements)) {
                playersArray = data.elements
            }
            // Filter out players not in league
            playersArray = playersArray.filter(p =>
                p.playerStatus !== 'out_of_league' &&
                p.playerStatus !== 'OutofLeague' &&
                p.playerStatus !== 'OUT_OF_LEAGUE'
            )
            setPlayers(playersArray)
        } catch (err) {
            toast.error('Error al cargar jugadores')
        } finally {
            setLoading(false)
        }
    }

    const handlePlayerClick = (player) => {
        setSelectedPlayer(player)
        setIsModalOpen(true)
    }

    const closeModal = () => {
        setIsModalOpen(false)
        setSelectedPlayer(null)
    }

    const refreshTrends = async () => {
        setTrendsLoading(true)
        try {
            await marketTrendsService.refresh()
            setTrendsInitialized(true)
            toast.success('Tendencias actualizadas')
        } catch (error) {
            toast.error('Error al actualizar tendencias')
        } finally {
            setTrendsLoading(false)
        }
    }

    // Process players with services data
    const processedPlayers = useMemo(() => {
        return players.map(player => {
            // Get trend data
            let trendData = null
            if (trendsInitialized && marketTrendsService?.marketValuesCache) {
                try {
                    trendData = marketTrendsService.getPlayerMarketTrend(
                        player.nickname || player.name,
                        player.positionId,
                        player.team?.name
                    )
                } catch (error) { }
            }

            // Get ownership data
            let actualOwner = null
            if (ownershipInitialized && playerOwnershipService) {
                try {
                    actualOwner = playerOwnershipService.getPlayerOwner(player.id)
                } catch (error) { }
            }

            return {
                ...player,
                trendData,
                actualOwner
            }
        })
    }, [players, trendsInitialized, ownershipInitialized])

    // Filter and sort
    const allFilteredPlayers = useMemo(() => {
        return processedPlayers.filter(player => {
            // Search filter
            if (deferredSearchTerm) {
                const name = (player.nickname || player.name || '').toLowerCase()
                const team = (player.team?.name || '').toLowerCase()
                if (!name.includes(deferredSearchTerm.toLowerCase()) &&
                    !team.includes(deferredSearchTerm.toLowerCase())) {
                    return false
                }
            }

            // Position filter
            if (positionFilter !== 'all') {
                const filterPos = parseInt(positionFilter, 10)
                if (player.positionId !== filterPos) {
                    return false
                }
            }

            // Market status filter
            if (marketStatusFilter === 'free') {
                return !player.actualOwner
            } else if (marketStatusFilter === 'owned') {
                return !!player.actualOwner
            } else if (marketStatusFilter === 'trending_up') {
                return player.trendData?.isPositive
            } else if (marketStatusFilter === 'trending_down') {
                return player.trendData?.isNegative
            }

            return true
        }).sort((a, b) => {
            switch (sortBy) {
                case 'points':
                    return (b.points || 0) - (a.points || 0)
                case 'value':
                    return (b.marketValue || 0) - (a.marketValue || 0)
                case 'name':
                    return (a.nickname || a.name || '').localeCompare(b.nickname || b.name || '')
                case 'trend':
                    return (b.trendData?.diferencia1 || 0) - (a.trendData?.diferencia1 || 0)
                default:
                    return 0
            }
        })
    }, [processedPlayers, deferredSearchTerm, positionFilter, marketStatusFilter, sortBy])

    // Get displayed players (for infinite scroll)
    const displayedPlayers = useMemo(() => {
        return allFilteredPlayers.slice(0, displayedCount)
    }, [allFilteredPlayers, displayedCount])

    // Reset count when filters change
    useEffect(() => {
        setDisplayedCount(50)
    }, [deferredSearchTerm, positionFilter, marketStatusFilter, sortBy])

    // Load more function
    const loadMorePlayers = useCallback(() => {
        if (isLoadingMore || displayedCount >= allFilteredPlayers.length) return
        setIsLoadingMore(true)
        setTimeout(() => {
            setDisplayedCount(prev => Math.min(prev + BATCH_SIZE, allFilteredPlayers.length))
            setIsLoadingMore(false)
        }, 200)
    }, [isLoadingMore, displayedCount, allFilteredPlayers.length])

    // Intersection Observer for infinite scroll
    const lastPlayerRef = useCallback(node => {
        if (isLoadingMore) return
        if (observer.current) observer.current.disconnect()

        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && displayedCount < allFilteredPlayers.length) {
                loadMorePlayers()
            }
        }, { rootMargin: '100px' })

        if (node) observer.current.observe(node)
    }, [isLoadingMore, displayedCount, allFilteredPlayers.length, loadMorePlayers])

    const getPositionColor = (positionId) => {
        switch (positionId) {
            case 1: return 'bg-yellow-500'
            case 2: return 'bg-blue-500'
            case 3: return 'bg-green-500'
            case 4: return 'bg-red-500'
            default: return 'bg-gray-500'
        }
    }

    const getPositionName = (positionId) => {
        switch (positionId) {
            case 1: return 'POR'
            case 2: return 'DEF'
            case 3: return 'MED'
            case 4: return 'DEL'
            default: return '?'
        }
    }

    const positionCounts = useMemo(() => {
        const counts = { all: players.length, 1: 0, 2: 0, 3: 0, 4: 0 }
        players.forEach(p => {
            const pos = p.positionId
            if (counts[pos] !== undefined) counts[pos]++
        })
        return counts
    }, [players])

    if (loading && players.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <RefreshCw size={32} className="text-primary animate-spin" />
            </div>
        )
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
                        <Users className="text-primary" />
                        Jugadores
                    </h1>
                    <p className="text-gray-400 text-sm mt-1">
                        Mostrando {displayedPlayers.length} de {allFilteredPlayers.length} jugadores
                    </p>
                </div>
                <button
                    onClick={loadPlayers}
                    className="p-3 rounded-full bg-surface-accent hover:bg-white/10 text-gray-400 hover:text-primary transition-colors"
                >
                    <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* Filters Card */}
            <div className="glass-panel rounded-xl p-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    {/* Search */}
                    <div className="lg:col-span-2 relative">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Buscar jugador o equipo..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-surface-dark border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                        />
                    </div>

                    {/* Position Filter */}
                    <select
                        value={positionFilter}
                        onChange={(e) => setPositionFilter(e.target.value)}
                        className="px-4 py-3 bg-surface-dark border border-white/10 rounded-xl text-white focus:border-primary outline-none"
                    >
                        <option value="all">Todas las posiciones</option>
                        <option value="1">🟡 Porteros ({positionCounts[1]})</option>
                        <option value="2">🔵 Defensas ({positionCounts[2]})</option>
                        <option value="3">🟢 Medios ({positionCounts[3]})</option>
                        <option value="4">🔴 Delanteros ({positionCounts[4]})</option>
                    </select>

                    {/* Market Status Filter */}
                    <select
                        value={marketStatusFilter}
                        onChange={(e) => setMarketStatusFilter(e.target.value)}
                        className="px-4 py-3 bg-surface-dark border border-white/10 rounded-xl text-white focus:border-primary outline-none"
                    >
                        <option value="all">Estado del Mercado</option>
                        <option value="free">🟢 Libres</option>
                        <option value="owned">🔵 Con Dueño</option>
                        <option value="trending_up">📈 Subiendo</option>
                        <option value="trending_down">📉 Bajando</option>
                    </select>

                    {/* Sort */}
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="px-4 py-3 bg-surface-dark border border-white/10 rounded-xl text-white focus:border-primary outline-none"
                    >
                        <option value="points">🏆 Puntos</option>
                        <option value="value">💰 Valor</option>
                        <option value="name">📝 Nombre A-Z</option>
                        <option value="trend">📈 Tendencia</option>
                    </select>
                </div>

                {/* Refresh Trends Button */}
                <div className="mt-4 flex justify-end">
                    <button
                        onClick={refreshTrends}
                        disabled={trendsLoading}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-accent hover:bg-white/10 text-gray-400 hover:text-primary transition-colors text-sm"
                    >
                        <RefreshCw size={14} className={trendsLoading ? 'animate-spin' : ''} />
                        {trendsLoading ? 'Actualizando...' : 'Actualizar Tendencias'}
                    </button>
                </div>
            </div>

            {/* Players Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {displayedPlayers.map((player, index) => (
                    <div
                        key={player.id}
                        ref={index === displayedPlayers.length - 1 ? lastPlayerRef : null}
                        className="glass-panel rounded-xl overflow-hidden hover:border-primary/30 transition-all group cursor-pointer"
                        onClick={() => handlePlayerClick(player)}
                    >
                        {/* Player Image */}
                        <div className="relative h-40 bg-gradient-to-br from-surface-accent to-surface-dark">
                            {player.images?.transparent?.['256x256'] && (
                                <img
                                    src={player.images.transparent['256x256']}
                                    alt=""
                                    className="absolute inset-0 w-full h-full object-contain mt-2"
                                    loading="lazy"
                                    onError={(e) => { e.target.style.display = 'none' }}
                                />
                            )}

                            {/* Position Badge */}
                            <span className={`absolute top-2 left-2 px-2 py-1 rounded-lg text-xs font-bold text-white ${getPositionColor(player.positionId)}`}>
                                {getPositionName(player.positionId)}
                            </span>

                            {/* Status Badge */}
                            <span className={`absolute top-2 right-2 px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1 ${player.actualOwner
                                ? 'bg-blue-500/80 text-white'
                                : 'bg-green-500/80 text-white'
                                }`}>
                                <User size={10} />
                                {player.actualOwner ? 'Ocupado' : 'Libre'}
                            </span>
                        </div>

                        {/* Player Info */}
                        <div className="p-4 space-y-3">
                            {/* Name & Team */}
                            <div>
                                <h3 className="font-bold text-white truncate group-hover:text-primary transition-colors">
                                    {player.nickname || player.name}
                                </h3>
                                <div className="flex items-center gap-2 text-sm text-gray-400">
                                    <span>{player.team?.name}</span>
                                    {player.team?.badgeColor && (
                                        <img
                                            src={player.team.badgeColor}
                                            alt=""
                                            className="w-4 h-4 object-contain"
                                            onError={(e) => { e.target.style.display = 'none' }}
                                        />
                                    )}
                                </div>
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                    <p className="text-gray-500">Puntos</p>
                                    <p className="font-bold text-white flex items-center gap-1">
                                        <Star size={12} className="text-neon-blue" />
                                        {player.points || 0}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-gray-500">Valor</p>
                                    <p className="font-bold text-primary">
                                        {player.trendData?.valor
                                            ? formatNumberWithDots(player.trendData.valor) + '€'
                                            : formatMoney(player.marketValue)
                                        }
                                    </p>
                                </div>
                            </div>

                            {/* Trend */}
                            <div className="pt-3 border-t border-white/10">
                                {player.trendData ? (
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-400 flex items-center gap-1">
                                            <TrendingUp size={12} />
                                            Tendencia 24h:
                                        </span>
                                        <div className={`flex items-center gap-1 text-sm font-medium ${player.trendData.isPositive ? 'text-neon-green' :
                                            player.trendData.isNegative ? 'text-accent-red' :
                                                'text-gray-400'
                                            }`}>
                                            {player.trendData.tendencia} {player.trendData.cambioTexto}
                                            {player.trendData.porcentaje !== undefined && Math.abs(player.trendData.porcentaje) > 0 && (
                                                <span className="text-xs">
                                                    ({Math.abs(player.trendData.porcentaje).toFixed(1)}%)
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-400 flex items-center gap-1">
                                            <TrendingUp size={12} />
                                            Tendencia 24h:
                                        </span>
                                        <span className="text-xs text-gray-500">Sin datos</span>
                                    </div>
                                )}
                            </div>

                            {/* Owner */}
                            {player.actualOwner && (
                                <div className="pt-3 border-t border-white/10">
                                    <div className="flex items-center gap-2 text-sm">
                                        <User size={14} className="text-gray-400" />
                                        <span className="text-gray-400">Propietario:</span>
                                    </div>
                                    <p className="text-sm font-medium text-white mt-1 truncate">
                                        {player.actualOwner.ownerName}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Loading more indicator */}
            {isLoadingMore && (
                <div className="flex justify-center py-8">
                    <RefreshCw size={24} className="text-primary animate-spin" />
                    <span className="ml-3 text-gray-400">Cargando más jugadores...</span>
                </div>
            )}

            {/* Load more button (fallback) */}
            {!isLoadingMore && displayedCount < allFilteredPlayers.length && (
                <div className="flex justify-center py-8">
                    <button
                        onClick={loadMorePlayers}
                        className="px-6 py-3 rounded-xl bg-surface-accent hover:bg-white/10 text-gray-300 hover:text-primary transition-colors"
                    >
                        Cargar más jugadores ({allFilteredPlayers.length - displayedCount} restantes)
                    </button>
                </div>
            )}

            {/* End indicator */}
            {displayedCount >= allFilteredPlayers.length && allFilteredPlayers.length > 50 && (
                <div className="flex justify-center py-8">
                    <span className="text-gray-500">Has visto todos los jugadores disponibles</span>
                </div>
            )}

            {/* Empty state */}
            {allFilteredPlayers.length === 0 && !loading && (
                <div className="glass-panel rounded-xl p-12 text-center">
                    <Users size={48} className="text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">
                        No se encontraron jugadores
                    </h3>
                    <p className="text-gray-400">
                        {searchTerm ? 'Intenta ajustar los filtros de búsqueda' : 'Los datos se cargarán cuando estén disponibles'}
                    </p>
                </div>
            )}

            {/* Player Detail Modal */}
            <PlayerDetailModal
                playerId={selectedPlayer?.id}
                leagueId={leagueId}
                isOpen={isModalOpen}
                onClose={closeModal}
            />
        </div>
    )
}
