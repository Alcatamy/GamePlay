import { useState, useEffect, useMemo } from 'react'
import { fantasyAPI } from '../services/api'
import toast from 'react-hot-toast'
import { RefreshCw, Shield, TrendingUp, ArrowUpRight, Wallet } from 'lucide-react'

export default function Clauses() {
    const [loading, setLoading] = useState(true)
    const [leagues, setLeagues] = useState([])
    const [selectedLeague, setSelectedLeague] = useState(null)
    const [ranking, setRanking] = useState([])
    const [teamPlayers, setTeamPlayers] = useState({}) // Map of teamId -> players
    const [searchTerm, setSearchTerm] = useState('')
    const [sortBy, setSortBy] = useState('clause-desc')

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
            setLoading(false)
        }
    }

    const loadRanking = async (leagueId) => {
        setLoading(true)
        try {
            const data = await fantasyAPI.getLeagueRanking(leagueId)
            let rankingData = []
            if (Array.isArray(data)) rankingData = data
            else if (data?.data) rankingData = data.data
            else if (data?.ranking) rankingData = data.ranking
            else if (data?.elements) rankingData = data.elements

            setRanking(rankingData)

            // Load players for each team
            const playersMap = {}
            for (const item of rankingData.slice(0, 10)) { // Limit to first 10 teams to avoid rate limiting
                const teamId = item.id || item.team?.id
                if (teamId) {
                    try {
                        const teamData = await fantasyAPI.getTeamData(leagueId, teamId)
                        let players = []
                        if (teamData?.players) players = teamData.players
                        else if (teamData?.data?.players) players = teamData.data.players
                        playersMap[teamId] = players
                    } catch (err) {
                        console.error('Error loading team:', err)
                    }
                }
            }
            setTeamPlayers(playersMap)
        } catch (err) {
            toast.error('Error al cargar datos')
        } finally {
            setLoading(false)
        }
    }

    // Helper functions
    const getManagerName = (item) => item.manager || item.team?.manager?.managerName || 'Manager'
    const getTeamId = (item) => item.id || item.team?.id

    const formatMoney = (amount) => {
        if (!amount && amount !== 0) return '-'
        if (amount >= 1000000) {
            return `${(amount / 1000000).toFixed(2)}M €`
        }
        return new Intl.NumberFormat('es-ES').format(amount) + ' €'
    }

    // Calculate clause increase stats per team
    const teamClauseStats = useMemo(() => {
        const stats = []

        for (const item of ranking) {
            const teamId = getTeamId(item)
            const players = teamPlayers[teamId] || []

            // Calculate total buyout clause value and daily increase
            let totalBuyout = 0
            let dailyIncrease = 0

            for (const p of players) {
                const buyoutClause = p.buyoutClause || 0
                const marketValue = p.playerMaster?.marketValue || 0

                totalBuyout += buyoutClause

                // Clause increase = buyout - market value (what manager invested)
                if (buyoutClause > marketValue) {
                    dailyIncrease += (buyoutClause - marketValue)
                }
            }

            stats.push({
                teamId,
                manager: getManagerName(item),
                playerCount: players.length,
                totalBuyout,
                clauseInvestment: dailyIncrease, // How much they invested in clause increases
            })
        }

        return stats.sort((a, b) => b.clauseInvestment - a.clauseInvestment)
    }, [ranking, teamPlayers])

    // Flatten all players with their buyout clauses
    const allPlayers = useMemo(() => {
        const players = []

        for (const item of ranking) {
            const teamId = getTeamId(item)
            const managerName = getManagerName(item)
            const teamPlayersList = teamPlayers[teamId] || []

            for (const p of teamPlayersList) {
                const player = p.playerMaster || p
                const buyoutClause = p.buyoutClause || 0
                const marketValue = player.marketValue || 0
                const clauseIncrease = buyoutClause > marketValue ? buyoutClause - marketValue : 0

                players.push({
                    id: player.id,
                    name: player.nickname || player.name || 'Jugador',
                    team: player.team?.name || '',
                    positionId: player.positionId,
                    marketValue,
                    buyoutClause,
                    clauseIncrease,
                    owner: managerName,
                    dailyIncrease: Math.round(buyoutClause * 0.0025) // 0.25% daily
                })
            }
        }

        return players
    }, [ranking, teamPlayers])

    // Filter and sort
    const filteredPlayers = allPlayers
        .filter(player => {
            if (searchTerm) {
                return player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    player.owner.toLowerCase().includes(searchTerm.toLowerCase())
            }
            return true
        })
        .sort((a, b) => {
            switch (sortBy) {
                case 'clause-desc': return b.buyoutClause - a.buyoutClause
                case 'clause-asc': return a.buyoutClause - b.buyoutClause
                case 'increase-desc': return b.clauseIncrease - a.clauseIncrease
                case 'daily-desc': return b.dailyIncrease - a.dailyIncrease
                default: return 0
            }
        })
        .slice(0, 50)

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

    // Calculate overall stats
    const stats = useMemo(() => {
        const totalClause = allPlayers.reduce((sum, p) => sum + p.buyoutClause, 0)
        const totalInvestment = allPlayers.reduce((sum, p) => sum + p.clauseIncrease, 0)
        const avgClause = allPlayers.length > 0 ? totalClause / allPlayers.length : 0
        const maxClause = allPlayers.length > 0 ? Math.max(...allPlayers.map(p => p.buyoutClause)) : 0

        return { totalClause, totalInvestment, avgClause, maxClause, count: allPlayers.length }
    }, [allPlayers])

    return (
        <div className="max-w-7xl mx-auto px-4 py-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
                        <Shield className="text-primary" />
                        Cláusulas
                    </h1>
                    <p className="text-gray-400 text-sm mt-1">Análisis de cláusulas por manager</p>
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

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <div className="glass-panel rounded-xl p-4 text-center">
                    <TrendingUp size={18} className="text-neon-green mx-auto mb-2" />
                    <p className="text-lg font-bold text-white">{formatMoney(stats.avgClause)}</p>
                    <p className="text-xs text-gray-500">Cláusula media</p>
                </div>
                <div className="glass-panel rounded-xl p-4 text-center">
                    <ArrowUpRight size={18} className="text-neon-pink mx-auto mb-2" />
                    <p className="text-lg font-bold text-white">{formatMoney(stats.maxClause)}</p>
                    <p className="text-xs text-gray-500">Mayor cláusula</p>
                </div>
                <div className="glass-panel rounded-xl p-4 text-center">
                    <Wallet size={18} className="text-neon-blue mx-auto mb-2" />
                    <p className="text-lg font-bold text-white">{formatMoney(stats.totalInvestment)}</p>
                    <p className="text-xs text-gray-500">Inversión total</p>
                </div>
                <div className="glass-panel rounded-xl p-4 text-center">
                    <Shield size={18} className="text-primary mx-auto mb-2" />
                    <p className="text-lg font-bold text-white">{stats.count}</p>
                    <p className="text-xs text-gray-500">Jugadores</p>
                </div>
            </div>

            {/* Manager Investment Ranking */}
            {teamClauseStats.length > 0 && (
                <div className="glass-panel rounded-xl overflow-hidden mb-6">
                    <div className="p-4 border-b border-white/10">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <Wallet size={18} className="text-neon-blue" />
                            Gastos en Subida de Cláusulas
                            <span className="text-xs font-normal text-gray-500">(Inversión por manager)</span>
                        </h2>
                    </div>
                    <div className="divide-y divide-white/5">
                        {teamClauseStats.filter(t => t.clauseInvestment > 0).slice(0, 10).map((team, idx) => (
                            <div key={team.teamId || idx} className="p-4 flex items-center gap-4 hover:bg-white/5">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${idx === 0 ? 'bg-yellow-400/20 text-yellow-400' :
                                        idx === 1 ? 'bg-gray-400/20 text-gray-300' :
                                            idx === 2 ? 'bg-amber-600/20 text-amber-500' :
                                                'bg-gray-700 text-gray-400'
                                    }`}>
                                    {idx + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-white truncate">{team.manager}</p>
                                    <p className="text-xs text-gray-500">{team.playerCount} jugadores</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-neon-blue">{formatMoney(team.clauseInvestment)}</p>
                                    <p className="text-xs text-gray-500">invertido</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Info Card */}
            <div className="glass-panel rounded-xl p-4 mb-6 border-l-4 border-l-primary">
                <h3 className="font-bold text-white mb-1">💡 Cálculo de Subida Diaria</h3>
                <p className="text-sm text-gray-400">
                    Las cláusulas suben aproximadamente un <span className="text-primary font-bold">0.25%</span> diario.
                    Un jugador de 10M€ sube ~25.000€/día. La "Inversión" muestra cuánto ha gastado cada manager en subir cláusulas.
                </p>
            </div>

            {/* Search and Sort */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="relative flex-1">
                    <input
                        type="text"
                        placeholder="Buscar jugador o manager..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-4 pr-4 py-3 bg-surface-dark border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:border-primary outline-none"
                    />
                </div>
                <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-4 py-3 bg-surface-dark border border-white/10 rounded-xl text-white focus:border-primary outline-none"
                >
                    <option value="clause-desc">Mayor cláusula</option>
                    <option value="clause-asc">Menor cláusula</option>
                    <option value="increase-desc">Mayor inversión</option>
                    <option value="daily-desc">Mayor subida diaria</option>
                </select>
            </div>

            {/* Players Table */}
            {loading ? (
                <div className="flex items-center justify-center min-h-[40vh]">
                    <RefreshCw size={32} className="text-primary animate-spin" />
                </div>
            ) : filteredPlayers.length > 0 ? (
                <div className="glass-panel rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-surface-accent text-xs uppercase text-gray-500">
                            <tr>
                                <th className="p-3 text-left">Jugador</th>
                                <th className="p-3 text-left hidden sm:table-cell">Propietario</th>
                                <th className="p-3 text-right">Cláusula</th>
                                <th className="p-3 text-right hidden sm:table-cell">Inversión</th>
                                <th className="p-3 text-right hidden md:table-cell">Subida/día</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredPlayers.map((player) => (
                                <tr key={player.id} className="hover:bg-white/5 transition-colors">
                                    <td className="p-3">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full ${getPositionColor(player.positionId)} flex items-center justify-center text-[10px] font-bold text-white`}>
                                                {getPositionName(player.positionId)}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-medium text-white truncate">{player.name}</p>
                                                <p className="text-xs text-gray-500 truncate">{player.team}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-3 hidden sm:table-cell">
                                        <span className="text-gray-400">{player.owner}</span>
                                    </td>
                                    <td className="p-3 text-right">
                                        <span className="font-bold text-primary">{formatMoney(player.buyoutClause)}</span>
                                    </td>
                                    <td className="p-3 text-right hidden sm:table-cell">
                                        {player.clauseIncrease > 0 ? (
                                            <span className="text-neon-blue font-medium">+{formatMoney(player.clauseIncrease)}</span>
                                        ) : (
                                            <span className="text-gray-500">-</span>
                                        )}
                                    </td>
                                    <td className="p-3 text-right hidden md:table-cell">
                                        <span className="text-neon-green font-medium flex items-center justify-end gap-1">
                                            <ArrowUpRight size={12} />
                                            {formatMoney(player.dailyIncrease)}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="glass-panel rounded-xl p-8 text-center">
                    <Shield size={48} className="text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">No hay datos de cláusulas</p>
                </div>
            )}

            <p className="text-center text-gray-500 text-sm mt-6">
                Mostrando {filteredPlayers.length} jugadores
            </p>
        </div>
    )
}
