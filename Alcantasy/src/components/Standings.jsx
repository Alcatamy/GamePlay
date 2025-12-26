import { useState, useEffect, useMemo } from 'react'
import { fantasyAPI } from '../services/api'
import { useAuthStore } from '../stores/authStore'
import toast from 'react-hot-toast'
import { RefreshCw, Trophy, TrendingUp, Wallet, Crown, Medal, Users, Gavel, ArrowUpDown, ArrowDown, ArrowUp } from 'lucide-react'

export default function Standings() {
    const { user } = useAuthStore()
    const [loading, setLoading] = useState(true)
    const [leagues, setLeagues] = useState([])
    const [selectedLeague, setSelectedLeague] = useState(null)
    const [ranking, setRanking] = useState([])
    const [teamDetails, setTeamDetails] = useState({})
    const [sortBy, setSortBy] = useState('points') // points, value, money, patrimony
    const [sortAsc, setSortAsc] = useState(false)

    useEffect(() => {
        loadLeagues()
    }, [])

    useEffect(() => {
        if (selectedLeague) {
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
        }
    }

    const loadRanking = async (leagueId) => {
        setLoading(true)
        try {
            const data = await fantasyAPI.getLeagueRanking(leagueId)
            let rankingData = []
            if (Array.isArray(data)) {
                rankingData = data
            } else if (data?.data && Array.isArray(data.data)) {
                rankingData = data.data
            } else if (data?.ranking && Array.isArray(data.ranking)) {
                rankingData = data.ranking
            } else if (data?.elements && Array.isArray(data.elements)) {
                rankingData = data.elements
            } else if (data && typeof data === 'object') {
                const arrayProp = Object.values(data).find(v => Array.isArray(v))
                if (arrayProp) rankingData = arrayProp
            }
            setRanking(rankingData)

            await loadTeamDetails(leagueId, rankingData)
        } catch (err) {
            toast.error('Error al cargar clasificación')
        } finally {
            setLoading(false)
        }
    }

    const loadTeamDetails = async (leagueId, rankingData) => {
        const details = {}

        // Optimización: Carga paralela con límite de concurrencia simple
        const promises = rankingData.map(async (item) => {
            const teamId = getTeamId(item)
            if (!teamId) return

            try {
                // Fetch team data for money and max bid
                const teamData = await fantasyAPI.getTeamData(leagueId, teamId)
                const rawData = teamData?.data || teamData

                details[teamId] = {
                    money: rawData?.money || rawData?.budget || 0,
                    // Si no viene maxBid, usamos el dinero disponible (algernativo: calcular saldo + 1/4 valor)
                    maxBid: rawData?.maxBid || rawData?.money || 0
                }
            } catch (err) {
                // Silently fail for other teams if not authorized
                details[teamId] = { money: 0, maxBid: 0 }
            }
        })

        await Promise.all(promises)
        setTeamDetails(details)
    }

    const formatMoney = (amount) => {
        if (!amount && amount !== 0) return '-'
        if (amount >= 1000000) {
            return `${(amount / 1000000).toFixed(1)}M €`
        }
        return new Intl.NumberFormat('es-ES').format(amount) + ' €'
    }

    // Helper functions - handle manager as object
    const getTeamName = (item) => item.name || item.team?.name || 'Equipo'

    const getManagerName = (item) => {
        if (!item) return 'Manager'
        // manager could be string or object {id, managerName, avatar}
        if (typeof item.manager === 'string') return item.manager
        if (item.manager?.managerName) return item.manager.managerName
        if (typeof item.team?.manager === 'string') return item.team.manager
        if (item.team?.manager?.managerName) return item.team.manager.managerName
        return 'Manager'
    }

    const getTeamPoints = (item) => item.points || item.team?.points || 0
    const getTeamValue = (item) => item.teamValue || item.team?.teamValue || 0
    const getTeamId = (item) => item.id || item.team?.id

    const getTeamMoney = (item) => {
        const teamId = getTeamId(item)
        return teamDetails[teamId]?.money || item.money || item.team?.money || 0
    }

    const getTeamMaxBid = (item) => {
        const teamId = getTeamId(item)
        return teamDetails[teamId]?.maxBid || 0
    }

    const calculatePatrimony = (item) => {
        const teamValue = getTeamValue(item)
        const money = getTeamMoney(item)
        return teamValue + money
    }

    const getRankIcon = (idx) => {
        if (idx === 0) return <Crown className="w-5 h-5 text-yellow-400" />
        if (idx === 1) return <Medal className="w-5 h-5 text-gray-300" />
        if (idx === 2) return <Medal className="w-5 h-5 text-amber-600" />
        return <span className="w-5 text-center text-gray-500 font-bold text-sm">{idx + 1}</span>
    }

    const getRankBg = (idx) => {
        if (idx === 0) return 'bg-yellow-400/10 border-yellow-400/30'
        if (idx === 1) return 'bg-gray-400/10 border-gray-400/30'
        if (idx === 2) return 'bg-amber-600/10 border-amber-600/30'
        return 'bg-transparent border-transparent'
    }

    const sortedByPatrimony = useMemo(() => {
        return [...ranking].sort((a, b) => calculatePatrimony(b) - calculatePatrimony(a))
    }, [ranking, teamDetails])

    // My team detection
    const myTeamIndex = useMemo(() => {
        const userId = user?.id || user?.sub || user?.oid || user?.userId
        return ranking.findIndex(item => {
            const teamUserId = item.userId || item.team?.manager?.id
            return teamUserId?.toString() === userId?.toString()
        })
    }, [ranking, user])

    // Sortable ranking
    const sortedRanking = useMemo(() => {
        const sorted = [...ranking].sort((a, b) => {
            let aVal, bVal
            switch (sortBy) {
                case 'points': aVal = getTeamPoints(a); bVal = getTeamPoints(b); break
                case 'value': aVal = getTeamValue(a); bVal = getTeamValue(b); break
                case 'money': aVal = getTeamMoney(a); bVal = getTeamMoney(b); break
                case 'patrimony': aVal = calculatePatrimony(a); bVal = calculatePatrimony(b); break
                case 'maxbid': aVal = getTeamMaxBid(a); bVal = getTeamMaxBid(b); break
                default: return 0
            }
            return sortAsc ? aVal - bVal : bVal - aVal
        })
        return sorted
    }, [ranking, sortBy, sortAsc, teamDetails])

    const handleSort = (column) => {
        if (sortBy === column) {
            setSortAsc(!sortAsc)
        } else {
            setSortBy(column)
            setSortAsc(false)
        }
    }

    const SortIcon = ({ column }) => {
        if (sortBy !== column) return <ArrowUpDown size={12} className="text-gray-600 ml-1" />
        return sortAsc ? <ArrowUp size={12} className="text-primary ml-1" /> : <ArrowDown size={12} className="text-primary ml-1" />
    }

    const stats = useMemo(() => {
        if (ranking.length === 0) return { count: 0, leaderPoints: 0, maxPatrimony: 0 }
        const sorted = [...ranking].sort((a, b) => getTeamPoints(b) - getTeamPoints(a))
        return {
            count: ranking.length,
            leaderPoints: sorted[0] ? getTeamPoints(sorted[0]) : 0,
            maxPatrimony: sortedByPatrimony[0] ? calculatePatrimony(sortedByPatrimony[0]) : 0
        }
    }, [ranking, sortedByPatrimony, teamDetails])

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
                        <Trophy className="text-primary" />
                        Clasificación
                    </h1>
                    <p className="text-gray-400 text-sm mt-1">{ranking.length} equipos</p>
                </div>
                <button
                    onClick={() => selectedLeague && loadRanking(selectedLeague.id)}
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

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="glass-panel rounded-xl p-4 text-center">
                    <Users size={20} className="text-neon-blue mx-auto mb-2" />
                    <p className="text-2xl font-bold text-white">{stats.count}</p>
                    <p className="text-xs text-gray-500">Equipos</p>
                </div>
                <div className="glass-panel rounded-xl p-4 text-center">
                    <TrendingUp size={20} className="text-neon-green mx-auto mb-2" />
                    <p className="text-2xl font-bold text-white">{stats.leaderPoints}</p>
                    <p className="text-xs text-gray-500">Líder pts</p>
                </div>
                <div className="glass-panel rounded-xl p-4 text-center">
                    <Wallet size={20} className="text-neon-pink mx-auto mb-2" />
                    <p className="text-lg font-bold text-white">
                        {formatMoney(stats.maxPatrimony)}
                    </p>
                    <p className="text-xs text-gray-500">Mayor patrimo.</p>
                </div>
            </div>

            {/* Full Ranking Table */}
            <div className="glass-panel rounded-xl overflow-hidden">
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-white">Clasificación por Puntos</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-surface-accent text-xs uppercase text-gray-500">
                            <tr>
                                <th className="p-3 text-left w-12">#</th>
                                <th className="p-3 text-left">Equipo</th>
                                <th
                                    className="p-3 text-right cursor-pointer hover:text-primary transition-colors"
                                    onClick={() => handleSort('points')}
                                >
                                    <span className="flex items-center justify-end">
                                        Pts <SortIcon column="points" />
                                    </span>
                                </th>
                                <th className="p-3 text-right">vs Líder</th>
                                <th
                                    className="p-3 text-right hidden sm:table-cell cursor-pointer hover:text-primary transition-colors"
                                    onClick={() => handleSort('value')}
                                >
                                    <span className="flex items-center justify-end">
                                        Valor <SortIcon column="value" />
                                    </span>
                                </th>
                                <th
                                    className="p-3 text-right cursor-pointer hover:text-neon-blue transition-colors"
                                    onClick={() => handleSort('money')}
                                >
                                    <span className="flex items-center justify-end text-neon-blue">
                                        Saldo <SortIcon column="money" />
                                    </span>
                                </th>
                                <th
                                    className="p-3 text-right cursor-pointer hover:text-primary transition-colors"
                                    onClick={() => handleSort('patrimony')}
                                >
                                    <span className="flex items-center justify-end text-primary">
                                        Patrimonio <SortIcon column="patrimony" />
                                    </span>
                                </th>
                                <th
                                    className="p-3 text-right hidden md:table-cell cursor-pointer hover:text-neon-pink transition-colors"
                                    onClick={() => handleSort('maxbid')}
                                >
                                    <span className="text-neon-pink flex items-center justify-end gap-1">
                                        <Gavel size={12} />
                                        Puja Máx <SortIcon column="maxbid" />
                                    </span>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {sortedRanking.map((item, idx) => {
                                const patrimony = calculatePatrimony(item)
                                const money = getTeamMoney(item)
                                const maxBid = getTeamMaxBid(item)
                                const managerName = getManagerName(item)
                                const leaderPoints = stats.leaderPoints
                                const diffVsLeader = getTeamPoints(item) - leaderPoints
                                const originalIndex = ranking.findIndex(t => getTeamId(t) === getTeamId(item))
                                const isMyTeam = originalIndex === myTeamIndex

                                return (
                                    <tr
                                        key={getTeamId(item) || idx}
                                        className={`hover:bg-white/5 transition-colors border-l-2 ${isMyTeam ? 'bg-primary/10 border-l-primary' : getRankBg(originalIndex)}`}
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
                                                    {managerName?.[0] || '?'}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-medium text-white truncate">{managerName}</p>
                                                    <p className="text-xs text-gray-500 truncate">{getTeamName(item)}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-3 text-right">
                                            <span className={`font-mono font-bold text-lg ${isMyTeam ? 'text-primary' : 'text-white'}`}>
                                                {getTeamPoints(item)}
                                                {isMyTeam && ' (Tú)'}
                                            </span>
                                        </td>
                                        <td className="p-3 text-right">
                                            <span className={`font-mono text-sm ${diffVsLeader === 0 ? 'text-neon-green' : 'text-accent-red'}`}>
                                                {diffVsLeader === 0 ? '🏆' : diffVsLeader}
                                            </span>
                                        </td>
                                        <td className="p-3 text-right font-mono text-gray-400 hidden sm:table-cell">
                                            {formatMoney(getTeamValue(item))}
                                        </td>
                                        <td className="p-3 text-right font-mono text-neon-blue font-medium">
                                            {formatMoney(money)}
                                        </td>
                                        <td className="p-3 text-right">
                                            <span className="font-mono font-bold text-primary">
                                                {formatMoney(patrimony)}
                                            </span>
                                        </td>
                                        <td className="p-3 text-right font-mono text-neon-pink hidden md:table-cell">
                                            {maxBid > 0 ? formatMoney(maxBid) : '-'}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Patrimony Ranking */}
            {sortedByPatrimony.length > 0 && (
                <div className="glass-panel rounded-xl overflow-hidden mt-6">
                    <div className="p-4 border-b border-white/10">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <Wallet size={20} className="text-primary" />
                            Ranking por Patrimonio
                            <span className="text-xs font-normal text-gray-500 ml-2">(Valor Equipo + Saldo)</span>
                        </h2>
                    </div>
                    <div className="divide-y divide-white/5">
                        {sortedByPatrimony.slice(0, 5).map((item, idx) => {
                            const patrimony = calculatePatrimony(item)
                            const originalPos = ranking.findIndex(t => getTeamId(t) === getTeamId(item)) + 1
                            const money = getTeamMoney(item)
                            const managerName = getManagerName(item)

                            return (
                                <div key={getTeamId(item) || idx} className="p-4 flex items-center gap-4 hover:bg-white/5">
                                    <div className="flex items-center justify-center w-8">
                                        {getRankIcon(idx)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-white truncate">{managerName}</p>
                                        <p className="text-xs text-gray-500">
                                            #{originalPos} en puntos • {getTeamPoints(item)} pts
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-primary text-lg">{formatMoney(patrimony)}</p>
                                        <p className="text-xs text-gray-500">
                                            {formatMoney(getTeamValue(item))} + <span className="text-neon-blue">{formatMoney(money)}</span>
                                        </p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {ranking.length === 0 && !loading && (
                <div className="glass-panel rounded-xl p-8 text-center">
                    <Trophy size={48} className="text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">No hay datos de clasificación</p>
                </div>
            )}
        </div>
    )
}
