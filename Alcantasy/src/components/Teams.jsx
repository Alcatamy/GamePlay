import { useState, useEffect, useMemo } from 'react'
import { fantasyAPI } from '../services/api'
import toast from 'react-hot-toast'
import { RefreshCw, Users, Trophy, Wallet, TrendingUp, ChevronRight } from 'lucide-react'

export default function Teams() {
    const [loading, setLoading] = useState(true)
    const [leagues, setLeagues] = useState([])
    const [selectedLeague, setSelectedLeague] = useState(null)
    const [teams, setTeams] = useState([])
    const [selectedTeam, setSelectedTeam] = useState(null)
    const [teamPlayers, setTeamPlayers] = useState([])

    useEffect(() => {
        loadLeagues()
    }, [])

    useEffect(() => {
        if (selectedLeague) {
            loadTeams(selectedLeague.id)
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

    const loadTeams = async (leagueId) => {
        setLoading(true)
        try {
            const data = await fantasyAPI.getLeagueRanking(leagueId)
            // Handle different response formats
            let teamsData = []
            if (Array.isArray(data)) teamsData = data
            else if (data?.data) teamsData = data.data
            else if (data?.ranking) teamsData = data.ranking
            else if (data?.elements) teamsData = data.elements
            setTeams(teamsData)
        } catch (err) {
            toast.error('Error al cargar equipos')
        } finally {
            setLoading(false)
        }
    }

    const loadTeamDetails = async (team) => {
        setSelectedTeam(team)
        const teamId = getTeamId(team)
        try {
            const data = await fantasyAPI.getTeamData(selectedLeague.id, teamId)
            let playersData = []
            if (data?.players && Array.isArray(data.players)) {
                playersData = data.players
            } else if (data?.data?.players) {
                playersData = data.data.players
            }
            setTeamPlayers(playersData)
        } catch (err) {
            console.error('Error loading team details:', err)
            setTeamPlayers([])
        }
    }

    // Helper functions matching LaLigaApp structure
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
    const getTeamMoney = (item) => item.money || item.team?.money || 0
    const getTeamId = (item) => item.id || item.team?.id

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
            case 1: return 'POR'
            case 2: return 'DEF'
            case 3: return 'MED'
            case 4: return 'DEL'
            default: return '?'
        }
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
                        <Users className="text-primary" />
                        Equipos
                    </h1>
                    <p className="text-gray-400 text-sm mt-1">{teams.length} equipos Fantasy</p>
                </div>
                <button
                    onClick={() => selectedLeague && loadTeams(selectedLeague.id)}
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Teams List */}
                <div className="glass-panel rounded-xl overflow-hidden">
                    <div className="p-4 border-b border-white/10">
                        <h2 className="text-lg font-bold text-white">Equipos Fantasy</h2>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <RefreshCw size={24} className="text-primary animate-spin" />
                        </div>
                    ) : teams.length > 0 ? (
                        <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto">
                            {teams.map((team, idx) => (
                                <button
                                    key={getTeamId(team) || idx}
                                    onClick={() => loadTeamDetails(team)}
                                    className={`w-full p-4 flex items-center gap-3 hover:bg-white/5 transition-colors text-left ${selectedTeam && getTeamId(selectedTeam) === getTeamId(team)
                                        ? 'bg-primary/10 border-l-2 border-l-primary'
                                        : ''
                                        }`}
                                >
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${idx === 0 ? 'bg-yellow-400/20 text-yellow-400' :
                                        idx === 1 ? 'bg-gray-400/20 text-gray-300' :
                                            idx === 2 ? 'bg-amber-600/20 text-amber-500' :
                                                'bg-gray-700 text-gray-400'
                                        }`}>
                                        {getManagerName(team)?.[0] || '?'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-white truncate">{getManagerName(team)}</p>
                                        <p className="text-xs text-gray-500 truncate">{getTeamName(team)}</p>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <div className="flex items-center gap-1">
                                            <Trophy size={12} className="text-primary" />
                                            <span className="font-bold text-white">{getTeamPoints(team)}</span>
                                        </div>
                                        <p className="text-xs text-gray-500">{formatMoney(getTeamValue(team))}</p>
                                    </div>
                                    <ChevronRight size={16} className="text-gray-500" />
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="py-12 text-center">
                            <Users size={48} className="text-gray-600 mx-auto mb-4" />
                            <p className="text-gray-400">No hay equipos</p>
                        </div>
                    )}
                </div>

                {/* Team Details */}
                <div className="glass-panel rounded-xl overflow-hidden">
                    {selectedTeam ? (
                        <>
                            <div className="p-4 border-b border-white/10">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary text-lg font-bold">
                                        {getManagerName(selectedTeam)?.[0] || '?'}
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-white">{getManagerName(selectedTeam)}</h2>
                                        <p className="text-sm text-gray-400">{getTeamName(selectedTeam)}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Team Stats */}
                            <div className="grid grid-cols-3 gap-3 p-4 border-b border-white/10">
                                <div className="text-center">
                                    <Trophy size={16} className="text-primary mx-auto mb-1" />
                                    <p className="text-xl font-bold text-white">{getTeamPoints(selectedTeam)}</p>
                                    <p className="text-xs text-gray-500">Puntos</p>
                                </div>
                                <div className="text-center">
                                    <TrendingUp size={16} className="text-neon-green mx-auto mb-1" />
                                    <p className="text-sm font-bold text-white">{formatMoney(getTeamValue(selectedTeam))}</p>
                                    <p className="text-xs text-gray-500">Valor</p>
                                </div>
                                <div className="text-center">
                                    <Wallet size={16} className="text-neon-blue mx-auto mb-1" />
                                    <p className="text-sm font-bold text-white">{formatMoney(getTeamMoney(selectedTeam))}</p>
                                    <p className="text-xs text-gray-500">Saldo</p>
                                </div>
                            </div>

                            {/* Team Players */}
                            <div className="p-4">
                                <h3 className="text-sm font-bold text-gray-400 uppercase mb-3">Plantilla ({teamPlayers.length})</h3>
                                {teamPlayers.length > 0 ? (
                                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                                        {teamPlayers.map((p, idx) => {
                                            const player = p.playerMaster || p
                                            return (
                                                <div key={player.id || idx} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5">
                                                    <div className={`w-6 h-6 rounded-full ${getPositionColor(player.positionId)} flex items-center justify-center text-[10px] font-bold text-white`}>
                                                        {getPositionName(player.positionId)}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm text-white truncate">{player.nickname || player.name}</p>
                                                        <p className="text-xs text-gray-500">{player.team?.name}</p>
                                                    </div>
                                                    <p className="text-sm font-medium text-primary">{formatMoney(p.buyoutClause || player.marketValue)}</p>
                                                </div>
                                            )
                                        })}
                                    </div>
                                ) : (
                                    <p className="text-gray-500 text-sm text-center py-4">
                                        Cargando plantilla...
                                    </p>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center justify-center h-full py-20">
                            <div className="text-center">
                                <Users size={48} className="text-gray-600 mx-auto mb-4" />
                                <p className="text-gray-400">Selecciona un equipo</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
