import { useState, useEffect, useMemo } from 'react'
import { fantasyAPI } from '../services/api'
import toast from 'react-hot-toast'
import {
    RefreshCw, BarChart3, TrendingUp, TrendingDown, DollarSign,
    PieChart, ArrowUpRight, ArrowDownRight, Users, Activity,
    Wallet, Target, Coins
} from 'lucide-react'

export default function Statistics() {
    const [loading, setLoading] = useState(true)
    const [leagues, setLeagues] = useState([])
    const [selectedLeague, setSelectedLeague] = useState(null)
    const [ranking, setRanking] = useState([])
    const [activity, setActivity] = useState([])

    useEffect(() => {
        loadLeagues()
    }, [])

    useEffect(() => {
        if (selectedLeague) {
            loadData(selectedLeague.id)
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

    const loadData = async (leagueId) => {
        setLoading(true)
        try {
            const [rankingData, activityData] = await Promise.all([
                fantasyAPI.getLeagueRanking(leagueId),
                fantasyAPI.getLeagueActivity(leagueId, 0)
            ])

            // Parse ranking
            let parsedRanking = []
            if (Array.isArray(rankingData)) parsedRanking = rankingData
            else if (rankingData?.data) parsedRanking = rankingData.data
            else if (rankingData?.ranking) parsedRanking = rankingData.ranking
            else if (rankingData?.elements) parsedRanking = rankingData.elements
            setRanking(parsedRanking)

            // Parse activity
            let parsedActivity = []
            if (Array.isArray(activityData)) parsedActivity = activityData
            else if (activityData?.activity) parsedActivity = activityData.activity
            else if (activityData?.data) parsedActivity = activityData.data
            else if (activityData?.elements) parsedActivity = activityData.elements
            setActivity(parsedActivity)
        } catch (err) {
            console.error('Error loading data:', err)
        } finally {
            setLoading(false)
        }
    }

    const formatMoney = (amount) => {
        if (!amount && amount !== 0) return '-'
        if (amount >= 1000000) {
            return `${(amount / 1000000).toFixed(2)}M €`
        }
        return new Intl.NumberFormat('es-ES').format(amount) + ' €'
    }

    // Helper functions matching LaLigaApp structure
    const getTeamName = (item) => item.name || item.team?.name || 'Equipo'
    const getManagerName = (item) => item.manager || item.team?.manager?.managerName || 'Manager'
    const getTeamPoints = (item) => item.points || item.team?.points || 0
    const getTeamValue = (item) => item.teamValue || item.team?.teamValue || 0
    const getTeamMoney = (item) => item.money || item.team?.money || 0
    const getTeamId = (item) => item.id || item.team?.id

    // Calculate statistics
    const stats = useMemo(() => {
        const INITIAL_BUDGET = 100000000 // 100M €

        // Calculate team stats
        const teamStats = ranking.map(item => {
            const teamValue = getTeamValue(item)
            const money = getTeamMoney(item)
            const patrimony = teamValue + money
            const points = getTeamPoints(item)

            // Calculate estimated ROI
            const roi = ((patrimony - INITIAL_BUDGET) / INITIAL_BUDGET) * 100

            return {
                id: getTeamId(item),
                name: getTeamName(item),
                manager: getManagerName(item),
                points,
                teamValue,
                money,
                patrimony,
                roi
            }
        })

        // Sort by ROI
        const sortedByRoi = [...teamStats].sort((a, b) => b.roi - a.roi)

        // Sort by patrimony
        const sortedByPatrimony = [...teamStats].sort((a, b) => b.patrimony - a.patrimony)

        // League totals
        const totalPatrimony = teamStats.reduce((sum, t) => sum + t.patrimony, 0)
        const avgPatrimony = teamStats.length > 0 ? totalPatrimony / teamStats.length : 0
        const totalTeamValue = teamStats.reduce((sum, t) => sum + t.teamValue, 0)
        const avgRoi = teamStats.length > 0 ? teamStats.reduce((sum, t) => sum + t.roi, 0) / teamStats.length : 0

        // Activity analysis by activityTypeId
        const buys = activity.filter(a => a.activityTypeId === 1 || a.activityTypeId === 31)
        const sells = activity.filter(a => a.activityTypeId === 33)
        const clauses = activity.filter(a => a.activityTypeId === 32)
        const totalBuyVolume = buys.reduce((sum, a) => sum + (a.amount || 0), 0)
        const totalSellVolume = sells.reduce((sum, a) => sum + (a.amount || 0), 0)

        return {
            teamStats,
            sortedByRoi,
            sortedByPatrimony,
            totalPatrimony,
            avgPatrimony,
            totalTeamValue,
            avgRoi,
            buyCount: buys.length,
            sellCount: sells.length,
            clauseCount: clauses.length,
            totalBuyVolume,
            totalSellVolume,
            marketVolume: totalBuyVolume + totalSellVolume,
            activityCount: activity.length
        }
    }, [ranking, activity])

    if (loading && ranking.length === 0) {
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
                        <BarChart3 className="text-primary" />
                        Estadísticas
                        <span className="text-xs px-2 py-1 bg-neon-pink/20 text-neon-pink rounded-full font-medium">NEW</span>
                    </h1>
                    <p className="text-gray-400 text-sm mt-1">Métricas de mercado & ROI</p>
                </div>
                <button
                    onClick={() => selectedLeague && loadData(selectedLeague.id)}
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

            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="glass-panel rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Wallet size={16} className="text-primary" />
                        <span className="text-xs text-gray-500 uppercase">Patrimonio Total</span>
                    </div>
                    <p className="text-xl font-bold text-white">{formatMoney(stats.totalPatrimony)}</p>
                    <p className="text-xs text-gray-500 mt-1">Media: {formatMoney(stats.avgPatrimony)}</p>
                </div>

                <div className="glass-panel rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp size={16} className="text-neon-green" />
                        <span className="text-xs text-gray-500 uppercase">ROI Medio</span>
                    </div>
                    <p className={`text-xl font-bold ${stats.avgRoi >= 0 ? 'text-neon-green' : 'text-accent-red'}`}>
                        {stats.avgRoi >= 0 ? '+' : ''}{stats.avgRoi.toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Sobre 100M€ inicial</p>
                </div>

                <div className="glass-panel rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Activity size={16} className="text-neon-pink" />
                        <span className="text-xs text-gray-500 uppercase">Volumen Mercado</span>
                    </div>
                    <p className="text-xl font-bold text-white">{formatMoney(stats.marketVolume)}</p>
                    <p className="text-xs text-gray-500 mt-1">{stats.activityCount} movimientos</p>
                </div>

                <div className="glass-panel rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Users size={16} className="text-neon-blue" />
                        <span className="text-xs text-gray-500 uppercase">Equipos</span>
                    </div>
                    <p className="text-xl font-bold text-white">{ranking.length}</p>
                    <p className="text-xs text-gray-500 mt-1">Compitiendo</p>
                </div>
            </div>

            {/* Activity Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Buy/Sell Balance */}
                <div className="glass-panel rounded-xl p-4">
                    <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                        <PieChart size={18} className="text-primary" />
                        Balance de Mercado
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-neon-green/10 rounded-xl p-4 border border-neon-green/30">
                            <ArrowDownRight size={20} className="text-neon-green mb-2" />
                            <p className="text-2xl font-bold text-white">{stats.buyCount}</p>
                            <p className="text-sm text-gray-400">Compras</p>
                            <p className="text-xs text-neon-green mt-1">{formatMoney(stats.totalBuyVolume)}</p>
                        </div>
                        <div className="bg-neon-blue/10 rounded-xl p-4 border border-neon-blue/30">
                            <ArrowUpRight size={20} className="text-neon-blue mb-2" />
                            <p className="text-2xl font-bold text-white">{stats.sellCount}</p>
                            <p className="text-sm text-gray-400">Ventas</p>
                            <p className="text-xs text-neon-blue mt-1">{formatMoney(stats.totalSellVolume)}</p>
                        </div>
                    </div>
                </div>

                {/* Top by ROI */}
                <div className="glass-panel rounded-xl p-4">
                    <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                        <TrendingUp size={18} className="text-neon-green" />
                        Top ROI (Return on Investment)
                    </h3>
                    {stats.sortedByRoi.length > 0 ? (
                        <div className="space-y-3">
                            {stats.sortedByRoi.slice(0, 5).map((team, idx) => (
                                <div key={team.id || idx} className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${idx === 0 ? 'bg-yellow-400/20 text-yellow-400' :
                                            idx === 1 ? 'bg-gray-400/20 text-gray-300' :
                                                idx === 2 ? 'bg-amber-600/20 text-amber-500' :
                                                    'bg-gray-700 text-gray-400'
                                        }`}>
                                        {idx + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-white truncate">{team.manager}</p>
                                        <p className="text-xs text-gray-500">{team.name}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className={`font-bold ${team.roi >= 0 ? 'text-neon-green' : 'text-accent-red'}`}>
                                            {team.roi >= 0 ? '+' : ''}{team.roi.toFixed(1)}%
                                        </p>
                                        <p className="text-xs text-gray-500">{formatMoney(team.patrimony)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500 text-sm text-center py-4">No hay datos</p>
                    )}
                </div>
            </div>

            {/* Full ROI Table */}
            {stats.sortedByRoi.length > 0 && (
                <div className="glass-panel rounded-xl overflow-hidden">
                    <div className="p-4 border-b border-white/10">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <Coins size={20} className="text-primary" />
                            Análisis Financiero Completo
                        </h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-surface-accent text-xs uppercase text-gray-500">
                                <tr>
                                    <th className="p-3 text-left">#</th>
                                    <th className="p-3 text-left">Manager</th>
                                    <th className="p-3 text-right">Puntos</th>
                                    <th className="p-3 text-right">Valor</th>
                                    <th className="p-3 text-right">Saldo</th>
                                    <th className="p-3 text-right">Patrimonio</th>
                                    <th className="p-3 text-right">ROI</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {stats.sortedByRoi.map((team, idx) => (
                                    <tr key={team.id || idx} className="hover:bg-white/5 transition-colors">
                                        <td className="p-3 text-gray-500">{idx + 1}</td>
                                        <td className="p-3">
                                            <p className="font-medium text-white">{team.manager}</p>
                                            <p className="text-xs text-gray-500">{team.name}</p>
                                        </td>
                                        <td className="p-3 text-right font-bold text-white">{team.points}</td>
                                        <td className="p-3 text-right font-mono text-gray-400">{formatMoney(team.teamValue)}</td>
                                        <td className="p-3 text-right font-mono text-neon-blue">{formatMoney(team.money)}</td>
                                        <td className="p-3 text-right font-mono font-bold text-primary">{formatMoney(team.patrimony)}</td>
                                        <td className="p-3 text-right">
                                            <span className={`font-bold ${team.roi >= 0 ? 'text-neon-green' : 'text-accent-red'}`}>
                                                {team.roi >= 0 ? '+' : ''}{team.roi.toFixed(1)}%
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Info Footer */}
            <div className="mt-6 glass-panel rounded-xl p-4 border-l-4 border-l-primary">
                <h3 className="font-bold text-white mb-2">📊 Cómo interpretar los datos</h3>
                <ul className="text-sm text-gray-400 space-y-1">
                    <li>• <strong className="text-white">Patrimonio</strong> = Valor Equipo + Saldo disponible</li>
                    <li>• <strong className="text-white">ROI</strong> = (Patrimonio - 100M€) / 100M€ × 100</li>
                    <li>• <strong className="text-neon-green">ROI positivo</strong> = Has generado valor sobre el presupuesto inicial</li>
                    <li>• <strong className="text-accent-red">ROI negativo</strong> = Has perdido valor respecto al inicio</li>
                </ul>
            </div>
        </div>
    )
}
