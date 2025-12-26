import { useState, useEffect, useMemo } from 'react'
import { fantasyAPI } from '../services/api'
import toast from 'react-hot-toast'
import { RefreshCw, Activity as ActivityIcon, ArrowUpRight, ArrowDownRight, Repeat, Gift, Clock, Shield, DollarSign, Filter, Calendar, TrendingUp, TrendingDown } from 'lucide-react'

export default function Activity() {
    const [loading, setLoading] = useState(true)
    const [leagues, setLeagues] = useState([])
    const [selectedLeague, setSelectedLeague] = useState(null)
    const [activity, setActivity] = useState([])
    const [ranking, setRanking] = useState([])
    const [players, setPlayers] = useState([])
    const [page, setPage] = useState(0)
    const [hasMore, setHasMore] = useState(true)
    const [filterType, setFilterType] = useState('all')

    // Build caches for manager and player names
    const managersCache = useMemo(() => {
        const cache = new Map()
        ranking.forEach(item => {
            const userId = item.userId || item.team?.userId || item.team?.manager?.id
            if (userId) {
                // Handle manager as object or string
                let managerName = 'Manager'
                if (typeof item.manager === 'string') managerName = item.manager
                else if (item.manager?.managerName) managerName = item.manager.managerName
                else if (item.team?.manager?.managerName) managerName = item.team.manager.managerName

                cache.set(userId.toString(), {
                    managerName,
                    teamName: item.name || item.team?.name || 'Equipo'
                })
            }
        })
        return cache
    }, [ranking])

    const playersCache = useMemo(() => {
        const cache = new Map()
        players.forEach(player => {
            if (player.id) {
                cache.set(player.id.toString(), {
                    nickname: player.nickname || player.name || 'Jugador',
                    team: player.team?.name || '',
                    positionId: player.positionId,
                    marketValue: player.marketValue || 0
                })
            }
        })
        return cache
    }, [players])

    useEffect(() => {
        loadLeagues()
        loadPlayers()
    }, [])

    useEffect(() => {
        if (selectedLeague) {
            setPage(0)
            setActivity([])
            loadRanking(selectedLeague.id)
            loadActivity(selectedLeague.id, 0)
        }
    }, [selectedLeague])

    const loadLeagues = async () => {
        try {
            const data = await fantasyAPI.getLeagues()
            setLeagues(data || [])
            if (data?.length > 0) {
                setSelectedLeague(data[0])
            }
        } catch (err) {
            toast.error('Error al cargar ligas')
            setLoading(false)
        }
    }

    const loadRanking = async (leagueId) => {
        try {
            const data = await fantasyAPI.getLeagueRanking(leagueId)
            let rankingData = []
            if (Array.isArray(data)) rankingData = data
            else if (data?.data) rankingData = data.data
            else if (data?.ranking) rankingData = data.ranking
            else if (data?.elements) rankingData = data.elements
            setRanking(rankingData)
        } catch (err) {
            console.error('Error loading ranking:', err)
        }
    }

    const loadPlayers = async () => {
        try {
            const data = await fantasyAPI.getAllPlayers()
            setPlayers(data || [])
        } catch (err) {
            console.error('Error loading players:', err)
        }
    }

    const loadActivity = async (leagueId, pageNum = 0) => {
        setLoading(true)
        try {
            const data = await fantasyAPI.getLeagueActivity(leagueId, pageNum)
            let newActivity = []
            if (Array.isArray(data)) newActivity = data
            else if (data?.activity) newActivity = data.activity
            else if (data?.data) newActivity = data.data
            else if (data?.elements) newActivity = data.elements

            if (pageNum === 0) {
                setActivity(newActivity)
            } else {
                setActivity(prev => [...prev, ...newActivity])
            }

            setHasMore(newActivity.length >= 20)
        } catch (err) {
            console.error('Error loading activity:', err)
        } finally {
            setLoading(false)
        }
    }

    const loadMore = () => {
        if (selectedLeague && hasMore && !loading) {
            const nextPage = page + 1
            setPage(nextPage)
            loadActivity(selectedLeague.id, nextPage)
        }
    }

    const formatMoney = (amount) => {
        if (!amount && amount !== 0) return '-'
        if (amount >= 1000000) {
            return `${(amount / 1000000).toFixed(1)}M €`
        }
        return new Intl.NumberFormat('es-ES').format(amount) + ' €'
    }

    // Get activity type based on activityTypeId (matching LaLigaApp)
    const getActivityType = (item) => {
        const activityTypeId = item.activityTypeId
        switch (activityTypeId) {
            case 1: return 'compra'
            case 4: return 'blindaje'
            case 6: return 'reward'
            case 7: return 'incorrect'
            case 31: return 'fichaje'
            case 32: return 'clausula'
            case 33: return 'venta'
            default: return 'movimiento'
        }
    }

    // Get activity text
    const getActivityText = (item) => {
        const activityTypeId = item.activityTypeId
        switch (activityTypeId) {
            case 1: return 'compró a'
            case 4: return 'blindó a'
            case 6: return 'ha ganado por jornada'
            case 7: return 'no ha puntuado (alineación incorrecta)'
            case 31: return 'fichó a'
            case 32: return 'clausuló a'
            case 33: return 'vendió a'
            default: return 'realizó una acción con'
        }
    }

    const getActivityIcon = (item) => {
        const type = getActivityType(item)
        switch (type) {
            case 'compra':
            case 'fichaje':
                return <ArrowDownRight className="text-neon-green" size={18} />
            case 'venta':
                return <ArrowUpRight className="text-neon-blue" size={18} />
            case 'clausula':
                return <Shield className="text-neon-pink" size={18} />
            case 'blindaje':
                return <Shield className="text-purple-400" size={18} />
            case 'reward':
                return <Gift className="text-yellow-400" size={18} />
            default:
                return <DollarSign className="text-gray-400" size={18} />
        }
    }

    const getActivityColor = (item) => {
        const type = getActivityType(item)
        switch (type) {
            case 'compra':
            case 'fichaje':
                return 'border-l-neon-green'
            case 'venta':
                return 'border-l-neon-blue'
            case 'clausula':
                return 'border-l-neon-pink'
            case 'blindaje':
                return 'border-l-purple-400'
            case 'reward':
                return 'border-l-yellow-400'
            default:
                return 'border-l-gray-500'
        }
    }

    // Get user name from item - handle manager as object
    const getUserName = (item) => {
        if (item.user1Name) return item.user1Name
        if (item.user1Id && managersCache.has(item.user1Id.toString())) {
            return managersCache.get(item.user1Id.toString()).managerName
        }
        return 'Usuario'
    }

    // Get player name and market value from item  
    const getPlayerInfo = (item) => {
        if (item.playerMasterId && playersCache.has(item.playerMasterId.toString())) {
            const player = playersCache.get(item.playerMasterId.toString())
            return {
                name: player.nickname,
                marketValue: player.marketValue
            }
        }
        return {
            name: item.playerName || null,
            marketValue: 0
        }
    }

    // Calculate profit/loss vs market value
    const calculateProfit = (item, marketValue) => {
        const type = getActivityType(item)
        const amount = item.amount || 0

        if (!marketValue || marketValue === 0) return null
        if (!['venta', 'compra', 'fichaje', 'clausula'].includes(type)) return null

        // For sales: profit = sale price - market value (positive = sold above market)
        // For purchases: profit = market value - purchase price (positive = bought below market)
        if (type === 'venta') {
            return amount - marketValue
        } else {
            return marketValue - amount
        }
    }

    // Format relative date 
    const formatRelativeDate = (dateStr) => {
        if (!dateStr) return null
        try {
            const date = new Date(dateStr)
            if (isNaN(date.getTime())) return null

            const now = new Date()
            const diffMs = now - date
            const diffMins = Math.floor(diffMs / 60000)
            const diffHours = Math.floor(diffMs / 3600000)
            const diffDays = Math.floor(diffMs / 86400000)

            if (diffMins < 1) return 'ahora'
            if (diffMins < 60) return `hace ${diffMins}m`
            if (diffHours < 24) return `hace ${diffHours}h`
            if (diffDays < 7) return `hace ${diffDays}d`
            if (diffDays < 30) return `hace ${Math.floor(diffDays / 7)}sem`

            return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
        } catch {
            return null
        }
    }

    // Format full date for display
    const formatFullDate = (dateStr) => {
        if (!dateStr) return null
        try {
            const date = new Date(dateStr)
            if (isNaN(date.getTime())) return null

            return date.toLocaleDateString('es-ES', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
            })
        } catch {
            return null
        }
    }

    // Get date from multiple possible fields
    const getActivityDate = (item) => {
        return item.date || item.createdDate || item.timestamp || item.createdAt || null
    }

    // Filter activity by type
    const filteredActivity = useMemo(() => {
        if (filterType === 'all') return activity
        return activity.filter(item => {
            const type = getActivityType(item)
            if (filterType === 'transfers') return ['compra', 'fichaje', 'venta', 'clausula'].includes(type)
            if (filterType === 'rewards') return type === 'reward'
            if (filterType === 'shields') return type === 'blindaje'
            return true
        })
    }, [activity, filterType])

    return (
        <div className="max-w-7xl mx-auto px-4 py-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
                        <ActivityIcon className="text-primary" />
                        Actividad
                    </h1>
                    <p className="text-gray-400 text-sm mt-1">Historial de movimientos</p>
                </div>
                <button
                    onClick={() => {
                        setPage(0)
                        setActivity([])
                        if (selectedLeague) loadActivity(selectedLeague.id, 0)
                    }}
                    className="p-3 rounded-full bg-surface-accent hover:bg-white/10 text-gray-400 hover:text-primary transition-colors"
                >
                    <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* League Tabs */}
            {leagues.length > 0 && (
                <div className="mb-6 overflow-x-auto hide-scrollbar -mx-4 px-4">
                    <div className="flex gap-2">
                        {leagues.map((league) => (
                            <button
                                key={league.id}
                                onClick={() => setSelectedLeague(league)}
                                className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all ${selectedLeague?.id === league.id
                                        ? 'bg-primary text-black'
                                        : 'bg-surface-dark text-gray-300 border border-white/10 hover:border-primary/50'
                                    }`}
                            >
                                {league.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="flex gap-2 mb-4 overflow-x-auto hide-scrollbar -mx-4 px-4">
                {[
                    { id: 'all', label: 'Todos', icon: null },
                    { id: 'transfers', label: 'Fichajes', icon: <Repeat size={14} /> },
                    { id: 'rewards', label: 'Premios', icon: <Gift size={14} /> },
                    { id: 'shields', label: 'Blindajes', icon: <Shield size={14} /> }
                ].map(filter => (
                    <button
                        key={filter.id}
                        onClick={() => setFilterType(filter.id)}
                        className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${filterType === filter.id
                                ? 'bg-primary/20 text-primary border border-primary/50'
                                : 'bg-surface-dark text-gray-400 border border-white/10 hover:text-white'
                            }`}
                    >
                        {filter.icon}
                        {filter.label}
                    </button>
                ))}
            </div>

            {/* Activity List */}
            <div className="glass-panel rounded-xl overflow-hidden">
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-white">Movimientos Recientes</h2>
                    <span className="text-xs text-gray-500">{filteredActivity.length} movimientos</span>
                </div>

                {loading && activity.length === 0 ? (
                    <div className="flex items-center justify-center py-12">
                        <RefreshCw size={24} className="text-primary animate-spin" />
                    </div>
                ) : filteredActivity.length > 0 ? (
                    <div className="divide-y divide-white/5">
                        {filteredActivity.map((item, idx) => {
                            const userName = getUserName(item)
                            const playerInfo = getPlayerInfo(item)
                            const activityText = getActivityText(item)
                            const isReward = item.activityTypeId === 6
                            const dateStr = getActivityDate(item)
                            const relativeDate = formatRelativeDate(dateStr)
                            const fullDate = formatFullDate(dateStr)

                            // Calculate profit/loss
                            const profit = calculateProfit(item, playerInfo.marketValue)
                            const hasProfit = profit !== null && profit !== 0

                            return (
                                <div
                                    key={item.id || idx}
                                    className={`p-4 flex items-start gap-3 hover:bg-white/5 transition-colors border-l-2 ${getActivityColor(item)}`}
                                >
                                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-surface-accent flex items-center justify-center">
                                        {getActivityIcon(item)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white text-sm">
                                            <span className="font-medium text-primary">{userName}</span>
                                            {' '}
                                            <span className="text-gray-400">{activityText}</span>
                                            {playerInfo.name && !isReward && (
                                                <>
                                                    {' '}
                                                    <span className="font-medium text-white">{playerInfo.name}</span>
                                                </>
                                            )}
                                        </p>

                                        {/* Amount and Profit/Loss */}
                                        <div className="flex flex-wrap items-center gap-3 mt-1">
                                            {item.amount > 0 && (
                                                <span className="text-neon-green font-bold">{formatMoney(item.amount)}</span>
                                            )}

                                            {/* Profit/Loss indicator */}
                                            {hasProfit && (
                                                <span className={`flex items-center gap-1 text-sm font-medium ${profit > 0 ? 'text-neon-green' : 'text-accent-red'}`}>
                                                    {profit > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                                    {profit > 0 ? '+' : ''}{formatMoney(profit)}
                                                    <span className="text-xs text-gray-500 ml-1">vs mercado</span>
                                                </span>
                                            )}
                                        </div>

                                        {/* Date display - full date below */}
                                        {fullDate && (
                                            <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                                                <Calendar size={12} />
                                                {fullDate}
                                            </p>
                                        )}
                                    </div>

                                    {/* Relative date on the right */}
                                    <div className="flex-shrink-0 text-right">
                                        {relativeDate && (
                                            <div className="flex items-center gap-1 text-xs text-gray-500" title={fullDate || ''}>
                                                <Clock size={12} />
                                                {relativeDate}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <div className="py-12 text-center">
                        <ActivityIcon size={48} className="text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-400">No hay actividad reciente</p>
                    </div>
                )}

                {/* Load More */}
                {hasMore && activity.length > 0 && (
                    <div className="p-4 border-t border-white/10">
                        <button
                            onClick={loadMore}
                            disabled={loading}
                            className="w-full py-3 bg-surface-accent hover:bg-white/10 text-gray-300 rounded-xl font-medium transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Cargando...' : 'Cargar más'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
