import { useState, useEffect, useMemo } from 'react'
import { fantasyAPI } from '../services/api'
import { useAuthStore } from '../stores/authStore'
import toast from 'react-hot-toast'
import { RefreshCw, ShoppingCart, Search, Filter, TrendingUp, TrendingDown, Clock, User, Star, Target, Shield, Gavel } from 'lucide-react'
import PlayerDetailModal from './PlayerDetailModal'
import BidModal from './BidModal'


export default function Market() {
    const { user } = useAuthStore()
    const [loading, setLoading] = useState(true)
    const [leagues, setLeagues] = useState([])
    const [selectedLeague, setSelectedLeague] = useState(null)
    const [market, setMarket] = useState([])
    const [ranking, setRanking] = useState([])
    const [searchTerm, setSearchTerm] = useState('')
    const [positionFilter, setPositionFilter] = useState('all')
    const [statusFilter, setStatusFilter] = useState('all') // all, myBids, clauses, free
    const [sortBy, setSortBy] = useState('price-desc')

    // Modal state
    const [selectedPlayerId, setSelectedPlayerId] = useState(null)
    const [isModalOpen, setIsModalOpen] = useState(false)

    // Bid Modal State
    const [bidPlayer, setBidPlayer] = useState(null)
    const [isBidModalOpen, setIsBidModalOpen] = useState(false)

    // Build owners cache from ranking - handle manager as object
    const ownersCache = useMemo(() => {
        const cache = new Map()
        ranking.forEach(item => {
            const teamId = item.id || item.team?.id
            const userId = item.userId || item.team?.userId
            if (teamId || userId) {
                // manager could be string or object {id, managerName, avatar}
                let managerName = 'Manager'
                const manager = item.manager || item.team?.manager
                if (typeof manager === 'string') managerName = manager
                else if (manager?.managerName) managerName = manager.managerName

                // Also get team badge/image if available
                const teamBadge = item.images?.badge || item.team?.badge || item.badge || null

                const ownerData = { name: managerName, badge: teamBadge, teamName: item.name || item.team?.name }

                if (teamId) cache.set(teamId.toString(), ownerData)
                if (userId) cache.set(userId.toString(), ownerData)
            }
        })
        return cache
    }, [ranking])

    useEffect(() => {
        loadLeagues()
    }, [])

    useEffect(() => {
        if (selectedLeague) {
            loadMarket(selectedLeague.id)
            loadRanking(selectedLeague.id)
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

    const loadMarket = async (leagueId) => {
        setLoading(true)
        try {
            const data = await fantasyAPI.getMarket(leagueId)
            let marketData = []
            if (Array.isArray(data)) marketData = data
            else if (data?.sales) marketData = data.sales
            else if (data?.data) marketData = data.data
            else if (data?.elements) marketData = data.elements
            setMarket(marketData)
        } catch (err) {
            toast.error('Error al cargar mercado')
        } finally {
            setLoading(false)
        }
    }

    const formatMoney = (amount) => {
        if (!amount && amount !== 0) return '-'
        if (amount >= 1000000) {
            return `${(amount / 1000000).toFixed(1)}M €`
        }
        return new Intl.NumberFormat('es-ES').format(amount) + ' €'
    }

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
            case 1: return 'Portero'
            case 2: return 'Defensa'
            case 3: return 'Centrocampista'
            case 4: return 'Delantero'
            default: return 'Jugador'
        }
    }

    const getTimeRemaining = (expirationDate) => {
        if (!expirationDate) return null
        const now = new Date()
        const expDate = new Date(expirationDate)
        const diffMs = expDate - now

        if (diffMs <= 0) return 'Expirado'

        const hours = Math.floor(diffMs / (1000 * 60 * 60))
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

        if (hours > 24) return `${Math.floor(hours / 24)}d`
        if (hours > 0) return `${hours}h`
        return `${minutes}m`
    }

    // Get seller/owner info
    const getOwnerInfo = (item) => {
        // Try to get owner name directly
        let name = item.sellerTeamName || item.seller || item.ownerName

        // Try from cache
        const teamId = item.teamId || item.sellerTeamId
        const userId = item.userId || item.sellerId
        let badge = null
        let teamName = null

        if (teamId && ownersCache.has(teamId.toString())) {
            const data = ownersCache.get(teamId.toString())
            name = data.name
            badge = data.badge
            teamName = data.teamName
        } else if (userId && ownersCache.has(userId.toString())) {
            const data = ownersCache.get(userId.toString())
            name = data.name
            badge = data.badge
            teamName = data.teamName
        }

        // Check if it's a clause 
        const isClause = item.discr === 'marketPlayerTeam' || (!item.price && item.buyoutClause)

        return {
            name: name || (isClause ? 'Cláusula' : 'Mercado'),
            badge,
            teamName,
            isClause
        }
    }

    const handlePlayerClick = (playerId) => {
        setSelectedPlayerId(playerId)
        setIsModalOpen(true)
    }

    const handleBidClick = (e, item) => {
        e.stopPropagation()
        setBidPlayer(item)
        setIsBidModalOpen(true)
    }

    // Filter and sort
    const filteredMarket = useMemo(() => {
        return market
            .filter(item => {
                const player = item.playerMaster || item
                if (positionFilter !== 'all' && player.positionId !== parseInt(positionFilter)) return false

                // Status filter
                if (statusFilter === 'myBids' && !item.bid) return false
                if (statusFilter === 'clauses' && !item.buyoutClause) return false
                if (statusFilter === 'free' && item.buyoutClause) return false

                if (searchTerm) {
                    const search = searchTerm.toLowerCase()
                    const name = (player.nickname || player.name || '').toLowerCase()
                    const team = (player.team?.name || '').toLowerCase()
                    const owner = (getOwnerInfo(item).name || '').toLowerCase()
                    return name.includes(search) || team.includes(search) || owner.includes(search)
                }
                return true
            })
            .sort((a, b) => {
                const priceA = a.price || a.playerMaster?.marketValue || 0
                const priceB = b.price || b.playerMaster?.marketValue || 0
                const bidsA = a.bids || 0
                const bidsB = b.bids || 0
                const pointsA = a.playerMaster?.points || 0
                const pointsB = b.playerMaster?.points || 0
                const expA = a.expirationDate ? new Date(a.expirationDate).getTime() : Infinity
                const expB = b.expirationDate ? new Date(b.expirationDate).getTime() : Infinity

                switch (sortBy) {
                    case 'price-desc': return priceB - priceA
                    case 'price-asc': return priceA - priceB
                    case 'bids-desc': return bidsB - bidsA
                    case 'points-desc': return pointsB - pointsA
                    case 'expires-soon': return expA - expB
                    default: return 0
                }
            })
    }, [market, searchTerm, positionFilter, statusFilter, sortBy, ownersCache])

    const positionCounts = useMemo(() => {
        const counts = { 1: 0, 2: 0, 3: 0, 4: 0 }
        market.forEach(item => {
            const player = item.playerMaster || item
            if (counts[player.positionId] !== undefined) counts[player.positionId]++
        })
        return counts
    }, [market])

    return (
        <div className="max-w-7xl mx-auto px-4 py-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
                        <ShoppingCart className="text-primary" />
                        Mercado
                    </h1>
                    <p className="text-gray-400 text-sm mt-1">{market.length} jugadores en venta</p>
                </div>
                <button
                    onClick={() => selectedLeague && loadMarket(selectedLeague.id)}
                    className="p-3 rounded-full bg-surface-accent hover:bg-white/10 text-gray-400 hover:text-primary transition-colors"
                >
                    <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* League Tabs & Filters (Same as before) ... */}
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

            <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Buscar jugador..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-surface-dark border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-3 bg-surface-dark border border-white/10 rounded-xl text-white focus:border-primary outline-none"
                >
                    <option value="all">📋 Todos</option>
                    <option value="myBids">🎯 Mis Pujas</option>
                    <option value="clauses">🛡️ Cláusulas</option>
                    <option value="free">🏷️ Mercado Libre</option>
                </select>
                <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-4 py-3 bg-surface-dark border border-white/10 rounded-xl text-white focus:border-primary outline-none"
                >
                    <option value="price-desc">💰 Mayor precio</option>
                    <option value="price-asc">💰 Menor precio</option>
                    <option value="bids-desc">🔥 Más pujas</option>
                    <option value="points-desc">⭐ Más puntos</option>
                    <option value="expires-soon">⏰ Cierra Pronto</option>
                </select>
            </div>

            {/* Position Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto hide-scrollbar -mx-4 px-4">
                <button
                    onClick={() => setPositionFilter('all')}
                    className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all ${positionFilter === 'all'
                        ? 'bg-primary/20 text-primary border border-primary/50'
                        : 'bg-surface-dark text-gray-400 border border-white/10 hover:text-white'
                        }`}
                >
                    Todos ({market.length})
                </button>
                {[
                    { id: 1, name: 'POR', color: 'yellow' },
                    { id: 2, name: 'DEF', color: 'blue' },
                    { id: 3, name: 'MED', color: 'green' },
                    { id: 4, name: 'DEL', color: 'red' }
                ].map(pos => (
                    <button
                        key={pos.id}
                        onClick={() => setPositionFilter(String(pos.id))}
                        className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${positionFilter === String(pos.id)
                            ? `bg-${pos.color}-500/20 text-${pos.color}-400 border border-${pos.color}-500/50`
                            : 'bg-surface-dark text-gray-400 border border-white/10 hover:text-white'
                            }`}
                    >
                        <span className={`w-6 h-6 rounded-full ${getPositionColor(pos.id)} flex items-center justify-center text-[10px] font-bold text-white`}>
                            {pos.name}
                        </span>
                        <span>{positionCounts[pos.id]}</span>
                    </button>
                ))}
            </div>

            {/* Market Grid - Enhanced Layout */}
            {loading ? (
                <div className="flex items-center justify-center min-h-[40vh]">
                    <RefreshCw size={32} className="text-primary animate-spin" />
                </div>
            ) : filteredMarket.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredMarket.map((item) => {
                        const player = item.playerMaster || item
                        const actualPrice = item.price || player.marketValue
                        const marketValue = player.marketValue
                        const points = player.points || 0
                        const ownerInfo = getOwnerInfo(item)

                        // Fake trend calculation relative to value (since specific logic isn't available)
                        // In future this would come from lastMarketValue
                        const lastValue = player.lastMarketValue || marketValue
                        const trend = marketValue - lastValue
                        const trendPercent = lastValue > 0 ? (trend / lastValue) * 100 : 0
                        const isPositive = trend >= 0

                        return (
                            <div
                                key={item.id || player.id}
                                className={`glass-panel rounded-xl overflow-hidden hover:border-primary/50 transition-all cursor-pointer group flex flex-col`}
                                onClick={() => handlePlayerClick(player.id)}
                            >
                                {/* Top Badges */}
                                <div className="p-3 flex justify-between items-start pb-0">
                                    <div className={`px-2 py-1 rounded-md ${getPositionColor(player.positionId)} text-[10px] font-bold uppercase text-white shadow-sm`}>
                                        {getPositionName(player.positionId)}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {item.expirationDate && (
                                            <div className="px-2 py-1 rounded-md bg-surface-dark border border-white/5 text-[10px] font-bold text-gray-400 flex items-center gap-1">
                                                <Clock size={10} />
                                                {getTimeRemaining(item.expirationDate)}
                                            </div>
                                        )}
                                        {item.bids > 0 && (
                                            <div className="px-2 py-1 rounded-md bg-neon-pink/10 border border-neon-pink/30 text-[10px] font-bold text-neon-pink flex items-center gap-1">
                                                <Gavel size={10} />
                                                {item.bids}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Main Content */}
                                <div className="p-4 flex gap-4">
                                    {/* Player Image */}
                                    <div className="relative flex-shrink-0">
                                        <div className="w-16 h-16 rounded-full bg-surface-accent flex items-center justify-center overflow-hidden border-2 border-surface-light">
                                            {player.images?.transparent?.['256x256'] ? (
                                                <img
                                                    src={player.images.transparent['256x256']}
                                                    alt=""
                                                    className="w-14 h-14 object-contain"
                                                    onError={(e) => { e.target.style.display = 'none' }}
                                                />
                                            ) : (
                                                <span className="text-2xl font-bold text-gray-500">{(player.nickname || player.name || '?')[0]}</span>
                                            )}
                                        </div>
                                        {player.team?.badgeColor && (
                                            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white p-0.5 shadow-md">
                                                <img src={player.team.badgeColor} alt="" className="w-full h-full object-contain" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Player Details */}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-lg font-bold text-white truncate group-hover:text-primary transition-colors">
                                            {player.nickname || player.name}
                                        </h3>
                                        <p className="text-sm text-gray-400 truncate mb-2">{player.team?.name}</p>

                                        {/* Owner Info */}
                                        <div className="flex items-center gap-2 text-xs">
                                            {ownerInfo.isClause ? (
                                                <div className="flex items-center gap-1 text-neon-pink">
                                                    <Shield size={12} />
                                                    <span className="font-medium">Cláusula</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1 text-gray-400">
                                                    <User size={12} />
                                                    <span className="truncate max-w-[100px]">{ownerInfo.name}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Stats Grid */}
                                <div className="px-4 py-3 bg-white/5 grid grid-cols-2 gap-px bg-gradient-to-r from-transparent via-white/10 to-transparent">
                                    <div className="pr-4 border-r border-white/5">
                                        <p className="text-[10px] text-gray-500 uppercase mb-0.5">Precio Venta</p>
                                        <p className="text-lg font-bold text-primary">{formatMoney(actualPrice)}</p>
                                    </div>
                                    <div className="pl-4">
                                        <p className="text-[10px] text-gray-500 uppercase mb-0.5">Puntos</p>
                                        <div className="flex items-center gap-1 text-lg font-bold text-white">
                                            {points} <Star size={12} className="text-yellow-400 fill-yellow-400" />
                                        </div>
                                    </div>
                                </div>

                                {/* Info Footer */}
                                <div className="px-4 py-3 grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-[10px] text-gray-500 uppercase mb-0.5">Valor Mercado</p>
                                        <p className="text-sm font-bold text-gray-300">{formatMoney(marketValue)}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-500 uppercase mb-0.5">Tendencia 24h</p>
                                        <div className={`flex items-center gap-1 text-sm font-bold ${isPositive ? 'text-neon-green' : 'text-accent-red'}`}>
                                            {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                            <span>
                                                {trend !== 0 ? formatMoney(Math.abs(trend)) : 'Min'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Button */}
                                <div className="p-3 border-t border-white/10">
                                    <button
                                        onClick={(e) => handleBidClick(e, item)}
                                        className="w-full py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-sm font-bold uppercase transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Gavel size={16} />
                                        Pujar
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            ) : (
                <div className="glass-panel rounded-xl p-8 text-center">
                    <ShoppingCart size={48} className="text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">No se encontraron jugadores</p>
                </div>
            )}

            {/* Player Detail Modal */}
            <PlayerDetailModal
                playerId={selectedPlayerId}
                leagueId={selectedLeague?.id}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />

            <BidModal
                player={bidPlayer}
                isOpen={isBidModalOpen}
                onClose={() => setIsBidModalOpen(false)}
                leagueId={selectedLeague?.id}
                onBidSuccess={() => selectedLeague && loadMarket(selectedLeague.id)}
            />
        </div>
    )
}
