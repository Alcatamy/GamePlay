import { useState, useEffect } from 'react'
import { fantasyAPI } from '../services/api'
import toast from 'react-hot-toast'
import { RefreshCw, Trophy, Users, TrendingUp, Crown, Medal } from 'lucide-react'

export default function Leagues() {
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
            loadLeagueDetails(selectedLeague.id)
        }
    }, [selectedLeague])

    const loadLeagues = async () => {
        setLoading(true)
        try {
            const data = await fantasyAPI.getLeagues()
            setLeagues(data || [])
            if (data?.length > 0) {
                setSelectedLeague(data[0])
            }
        } catch (err) {
            toast.error('Error al cargar ligas')
        } finally {
            setLoading(false)
        }
    }

    const loadLeagueDetails = async (leagueId) => {
        try {
            const [rankingData, activityData] = await Promise.all([
                fantasyAPI.getLeagueRanking(leagueId),
                fantasyAPI.getLeagueActivity(leagueId, 0).catch(() => ({ activity: [] }))
            ])
            setRanking(rankingData?.ranking || [])
            setActivity(activityData?.activity || [])
        } catch (err) {
            console.error('Error loading league details:', err)
        }
    }

    const formatMoney = (amount) => {
        if (!amount && amount !== 0) return '-'
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'EUR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount)
    }

    const getRankIcon = (idx) => {
        if (idx === 0) return <Crown className="w-5 h-5 text-yellow-400" />
        if (idx === 1) return <Medal className="w-5 h-5 text-gray-300" />
        if (idx === 2) return <Medal className="w-5 h-5 text-amber-600" />
        return <span className="w-5 text-center text-gray-500 font-bold">{idx + 1}</span>
    }

    if (loading) {
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
                        <Trophy className="text-primary" />
                        Mis Ligas
                    </h1>
                    <p className="text-gray-400 text-sm mt-1">{leagues.length} liga{leagues.length !== 1 ? 's' : ''} activa{leagues.length !== 1 ? 's' : ''}</p>
                </div>
                <button
                    onClick={loadLeagues}
                    className="p-3 rounded-full bg-surface-accent hover:bg-white/10 text-gray-400 hover:text-primary transition-colors"
                >
                    <RefreshCw size={20} />
                </button>
            </div>

            {/* League Tabs */}
            <div className="mb-6 overflow-x-auto hide-scrollbar -mx-4 px-4">
                <div className="flex gap-2">
                    {leagues.map((league) => (
                        <button
                            key={league.id}
                            onClick={() => setSelectedLeague(league)}
                            className={`flex-shrink-0 px-4 py-3 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${selectedLeague?.id === league.id
                                    ? 'bg-primary text-black shadow-[0_0_20px_rgba(70,236,19,0.3)]'
                                    : 'bg-surface-dark text-gray-300 border border-white/10 hover:border-primary/50'
                                }`}
                        >
                            <Trophy size={16} />
                            {league.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* League Info */}
            {selectedLeague && (
                <div className="glass-panel rounded-xl p-4 sm:p-6 mb-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-bold text-white">{selectedLeague.name}</h2>
                            <p className="text-gray-400 text-sm">{ranking.length} participantes</p>
                        </div>
                        <div className="flex gap-4 text-center">
                            <div className="bg-surface-accent rounded-lg px-4 py-2">
                                <p className="text-xs text-gray-400">Tipo</p>
                                <p className="font-bold text-white">{selectedLeague.type || 'Privada'}</p>
                            </div>
                            <div className="bg-surface-accent rounded-lg px-4 py-2">
                                <p className="text-xs text-gray-400">Estado</p>
                                <p className="font-bold text-primary">Activa</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Full Ranking */}
            {ranking.length > 0 && (
                <div className="glass-panel rounded-xl overflow-hidden">
                    <div className="p-4 border-b border-white/10">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <Users size={20} className="text-neon-blue" />
                            Clasificación Completa
                        </h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-surface-accent text-xs uppercase text-gray-500">
                                <tr>
                                    <th className="p-3 text-left w-16">Pos</th>
                                    <th className="p-3 text-left">Equipo</th>
                                    <th className="p-3 text-right">Puntos</th>
                                    <th className="p-3 text-right hidden sm:table-cell">Valor Equipo</th>
                                    <th className="p-3 text-right hidden md:table-cell">Saldo</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {ranking.map((team, idx) => (
                                    <tr
                                        key={team.id || idx}
                                        className={`hover:bg-white/5 transition-colors ${idx < 3 ? 'bg-primary/5' : ''}`}
                                    >
                                        <td className="p-3">
                                            <div className="flex items-center justify-center">
                                                {getRankIcon(idx)}
                                            </div>
                                        </td>
                                        <td className="p-3">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${idx === 0 ? 'bg-yellow-400/20 text-yellow-400' :
                                                        idx === 1 ? 'bg-gray-400/20 text-gray-300' :
                                                            idx === 2 ? 'bg-amber-600/20 text-amber-500' :
                                                                'bg-gray-700 text-gray-400'
                                                    }`}>
                                                    {team.team?.name?.[0] || '?'}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-white">{team.team?.name || 'Equipo'}</p>
                                                    <p className="text-xs text-gray-500">{team.team?.manager?.managerName || ''}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-3 text-right">
                                            <span className="font-mono font-bold text-white text-lg">{team.points || 0}</span>
                                        </td>
                                        <td className="p-3 text-right font-mono text-gray-400 hidden sm:table-cell">
                                            {formatMoney(team.team?.teamValue)}
                                        </td>
                                        <td className="p-3 text-right font-mono text-primary hidden md:table-cell">
                                            {formatMoney(team.team?.money)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Activity */}
            {activity.length > 0 && (
                <div className="glass-panel rounded-xl overflow-hidden mt-6">
                    <div className="p-4 border-b border-white/10">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <TrendingUp size={20} className="text-neon-pink" />
                            Actividad Reciente
                        </h2>
                    </div>
                    <div className="divide-y divide-white/5 max-h-[300px] overflow-y-auto">
                        {activity.slice(0, 10).map((item, idx) => (
                            <div key={idx} className="p-4 flex items-center gap-3 hover:bg-white/5">
                                <div className="w-8 h-8 rounded-full bg-surface-accent flex items-center justify-center text-sm">
                                    {item.type === 'BID' ? '💰' : item.type === 'SALE' ? '🔄' : '📊'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-white text-sm truncate">{item.description || item.type}</p>
                                    <p className="text-gray-500 text-xs">{item.date || ''}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
