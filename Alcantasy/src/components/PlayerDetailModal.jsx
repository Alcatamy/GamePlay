import { useState, useEffect } from 'react'
import { X, TrendingUp, TrendingDown, Shield, User, Calendar, Activity, Star, Zap, Target, BarChart3 } from 'lucide-react'
import { fantasyAPI } from '../services/api'
import { usePlayerAnalytics } from '../hooks/usePlayerAnalytics'

export default function PlayerDetailModal({ playerId, leagueId, isOpen, onClose }) {
    const [loading, setLoading] = useState(true)
    const [details, setDetails] = useState(null)
    const [stats, setStats] = useState(null)

    useEffect(() => {
        if (isOpen && playerId && leagueId) {
            loadPlayerDetails()
        }
    }, [isOpen, playerId, leagueId])

    const loadPlayerDetails = async () => {
        setLoading(true)
        try {
            const data = await fantasyAPI.getPlayerDetails(playerId, leagueId)
            setDetails(data)
            // Robust stats extraction
            const extractedStats = data?.playerStats || data?.stats || data?.playerMaster?.lastStats || data?.playerMaster?.stats || []
            // Sort by week descending if needed
            setStats(extractedStats.sort((a, b) => (b.weekNumber || 0) - (a.weekNumber || 0)))
        } catch (err) {
            console.error('Error loading player details:', err)
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    const formatMoney = (amount) => {
        if (!amount && amount !== 0) return '-'
        if (amount >= 1000000) {
            return `${(amount / 1000000).toFixed(1)}M €`
        }
        return new Intl.NumberFormat('es-ES').format(amount) + ' €'
    }

    const getPositionName = (id) => {
        switch (id) {
            case 1: return 'Portero'
            case 2: return 'Defensa'
            case 3: return 'Centrocampista'
            case 4: return 'Delantero'
            default: return 'Jugador'
        }
    }

    const getPositionColor = (id) => {
        switch (id) {
            case 1: return 'bg-yellow-500'
            case 2: return 'bg-blue-500'
            case 3: return 'bg-green-500'
            case 4: return 'bg-red-500'
            default: return 'bg-gray-500'
        }
    }

    // Safe accessors
    const player = details?.playerMaster || details?.player || {}
    const team = details?.team || player.team || {}
    const marketValue = player.marketValue || details?.marketValue || 0
    const points = player.points || details?.points || 0

    // Use player analytics hook
    const analytics = usePlayerAnalytics(player, stats)

    // Calculate trend (mock if not available)
    const lastMarketValue = player.lastMarketValue || marketValue // Fallback
    const trend = marketValue - lastMarketValue
    const trendPercent = lastMarketValue > 0 ? (trend / lastMarketValue) * 100 : 0

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn" onClick={onClose}>
            <div className="bg-surface-light border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl animate-scaleIn" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="relative h-32 bg-gradient-to-br from-surface-accent to-surface-dark overflow-hidden">
                    <div className={`absolute top-0 right-0 p-4 opacity-10 text-9xl font-bold text-white`}>
                        {player.nutrition?.dorsal || '#'}
                    </div>
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 rounded-full bg-black/20 text-white hover:bg-white/20 transition-colors z-10"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Player Info (Overlapping Header) */}
                <div className="px-6 relative -mt-16 mb-6">
                    <div className="flex items-end justify-between">
                        <div className="flex items-end gap-4">
                            <div className="relative">
                                <div className="w-24 h-24 rounded-full bg-surface-dark border-4 border-surface-light overflow-hidden flex items-center justify-center">
                                    {player.images?.transparent?.['256x256'] ? (
                                        <img src={player.images.transparent['256x256']} alt="" className="w-20 h-20 object-contain" />
                                    ) : (
                                        <User size={40} className="text-gray-500" />
                                    )}
                                </div>
                                <div className={`absolute bottom-1 right-1 px-2 py-0.5 rounded-md ${getPositionColor(player.positionId)} text-[10px] font-bold text-white shadow-lg`}>
                                    {getPositionName(player.positionId)}
                                </div>
                            </div>
                        </div>
                        {team.badgeColor && (
                            <div className="w-12 h-12 rounded-lg bg-surface-dark p-2 border border-white/5 shadow-lg">
                                <img src={team.badgeColor} alt={team.name} className="w-full h-full object-contain" />
                            </div>
                        )}
                    </div>

                    <div className="mt-3">
                        <h2 className="text-2xl font-bold text-white">{player.nickname || player.name}</h2>
                        <div className="flex items-center gap-2 text-gray-400 text-sm">
                            <span>{team.name}</span>
                            <span>•</span>
                            <div className="flex items-center gap-1 text-neon-blue">
                                <Star size={12} fill="currentColor" />
                                <span className="font-bold">{points} pts</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="px-6 mb-6">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-surface-accent/50 rounded-xl p-3 border border-white/5">
                            <p className="text-xs text-gray-500 mb-1">Valor de Mercado</p>
                            <p className="text-lg font-bold text-primary">{formatMoney(marketValue)}</p>
                            <div className={`flex items-center gap-1 text-xs mt-1 ${trend >= 0 ? 'text-neon-green' : 'text-accent-red'}`}>
                                {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                <span>{formatMoney(Math.abs(trend))} ({Math.abs(trendPercent).toFixed(1)}%)</span>
                            </div>
                        </div>
                        <div className="bg-surface-accent/50 rounded-xl p-3 border border-white/5">
                            <p className="text-xs text-gray-500 mb-1">Media de Puntos</p>
                            <p className="text-lg font-bold text-white">{analytics?.avgPoints || (points / (stats?.length || 1)).toFixed(1)}</p>
                            <div className="flex items-center gap-1 text-xs mt-1 text-gray-400">
                                <Activity size={12} />
                                <span>en {stats?.length || 0} partidos</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Pro Analytics Section */}
                {analytics?.hasData && (
                    <div className="px-6 mb-6">
                        <h3 className="text-sm font-bold text-white uppercase mb-3 flex items-center gap-2">
                            <BarChart3 size={14} className="text-neon-pink" />
                            Análisis Pro
                        </h3>
                        <div className="grid grid-cols-3 gap-2">
                            {/* Titularity Probability */}
                            <div className={`rounded-xl p-3 border border-white/5 bg-gradient-to-br from-${analytics.titularity?.color || 'gray-400'}/10 to-transparent`}>
                                <div className="flex items-center gap-1 mb-1">
                                    <Target size={12} className={`text-${analytics.titularity?.color || 'gray-400'}`} />
                                    <p className="text-[10px] text-gray-400 uppercase">Titularidad</p>
                                </div>
                                <p className={`text-xl font-bold text-${analytics.titularity?.color || 'white'}`}>
                                    {analytics.titularity?.percentage || '?'}%
                                </p>
                                <p className="text-[9px] text-gray-500 mt-0.5">{analytics.titularity?.label}</p>
                            </div>

                            {/* Regularity Index */}
                            <div className="rounded-xl p-3 border border-white/5 bg-surface-accent/30">
                                <div className="flex items-center gap-1 mb-1">
                                    <Activity size={12} className="text-blue-400" />
                                    <p className="text-[10px] text-gray-400 uppercase">Regularidad</p>
                                </div>
                                <p className="text-xl font-bold text-blue-400">
                                    {analytics.regularityIndex?.value || '?'}
                                </p>
                                <p className="text-[9px] text-gray-500 mt-0.5">{analytics.regularityIndex?.label}</p>
                            </div>

                            {/* Efficiency Per Minute */}
                            <div className={`rounded-xl p-3 border border-white/5 bg-gradient-to-br from-${analytics.efficiency?.color || 'gray-400'}/10 to-transparent`}>
                                <div className="flex items-center gap-1 mb-1">
                                    <Zap size={12} className={`text-${analytics.efficiency?.color || 'gray-400'}`} />
                                    <p className="text-[10px] text-gray-400 uppercase">Eficiencia</p>
                                </div>
                                <p className={`text-xl font-bold text-${analytics.efficiency?.color || 'white'}`}>
                                    {analytics.efficiency?.value || '?'}
                                </p>
                                <p className="text-[9px] text-gray-500 mt-0.5">pts/90min</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Last Matches */}
                <div className="px-6 pb-6">
                    <h3 className="text-sm font-bold text-white uppercase mb-3 flex items-center gap-2">
                        <Calendar size={14} className="text-primary" />
                        Últimos Partidos
                    </h3>

                    {loading ? (
                        <div className="space-y-2 animate-pulse">
                            {[1, 2, 3].map(i => <div key={i} className="h-12 bg-white/5 rounded-lg" />)}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {stats && stats.length > 0 ? stats.slice(0, 5).map((match, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-surface-dark/50 border border-white/5">
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs text-gray-500 font-mono">J{match.weekNumber}</span>
                                        <div className="flex flex-col">
                                            <span className="text-sm text-white font-medium">
                                                {match.rivalTeam?.name || 'Rival'}
                                            </span>
                                            <span className="text-xs text-gray-500">
                                                {match.home ? '(C)' : '(F)'} • {match.result || '-'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${(match.totalPoints || 0) >= 10 ? 'bg-neon-green/20 text-neon-green' :
                                        (match.totalPoints || 0) >= 6 ? 'bg-blue-500/20 text-blue-400' :
                                            (match.totalPoints || 0) >= 3 ? 'bg-orange-500/20 text-orange-400' :
                                                'bg-red-500/20 text-red-400'
                                        }`}>
                                        {match.totalPoints || 0}
                                    </div>
                                </div>
                            )) : (
                                <p className="text-gray-500 text-sm text-center py-4">No hay datos de partidos disponibles</p>
                            )}
                        </div>
                    )}
                </div>

            </div>
        </div>
    )
}
