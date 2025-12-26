import { useState, useEffect, useMemo } from 'react'
import { fantasyAPI } from '../services/api'
import { useAuthStore } from '../stores/authStore'
import toast from 'react-hot-toast'
import { RefreshCw, Users, Trophy, Wallet, TrendingUp, Shield, Shirt, Target, ChevronLeft, ChevronRight, Clock, Zap, Save, AlertTriangle } from 'lucide-react'
import PlayerDetailModal from './PlayerDetailModal'

export default function Lineup() {
    const { user } = useAuthStore()
    const [loading, setLoading] = useState(true)
    const [leagues, setLeagues] = useState([])
    const [selectedLeague, setSelectedLeague] = useState(null)
    const [userTeam, setUserTeam] = useState(null)
    const [lineup, setLineup] = useState(null)
    const [currentWeek, setCurrentWeek] = useState(null)
    const [selectedWeek, setSelectedWeek] = useState(null)
    const [ranking, setRanking] = useState([])

    // Modal
    const [selectedPlayerId, setSelectedPlayerId] = useState(null)
    const [isModalOpen, setIsModalOpen] = useState(false)

    useEffect(() => {
        loadLeagues()
        loadCurrentWeek()
    }, [])

    useEffect(() => {
        if (selectedLeague && (selectedWeek || currentWeek)) {
            findUserTeam(selectedLeague)
        }
    }, [selectedLeague, selectedWeek, currentWeek])

    const loadLeagues = async () => {
        try {
            const data = await fantasyAPI.getLeagues()
            setLeagues(data || [])
            if (data?.length > 0 && !selectedLeague) {
                setSelectedLeague(data[0])
            }
        } catch (err) {
            toast.error('Error al cargar ligas')
            setLoading(false)
        }
    }

    const loadCurrentWeek = async () => {
        try {
            const data = await fantasyAPI.getCurrentWeek()
            const weekNumber = data?.weekNumber || data?.week || data?.data?.weekNumber || 17
            setCurrentWeek(weekNumber)
            setSelectedWeek(weekNumber)
        } catch (err) {
            console.error('Error loading current week:', err)
            setCurrentWeek(17)
            setSelectedWeek(17)
        }
    }

    // Week navigation
    const handlePrevWeek = () => {
        if (selectedWeek > 1) {
            setSelectedWeek(prev => prev - 1)
        }
    }

    const handleNextWeek = () => {
        if (selectedWeek < 38) {
            setSelectedWeek(prev => prev + 1)
        }
    }

    const findUserTeam = async (league) => {
        setLoading(true)
        try {
            let targetTeamId = null;
            if (league.team) {
                targetTeamId = league.team.id
            } else {
                const rankingData = await fantasyAPI.getLeagueRanking(league.id)
                let rankingList = []
                if (Array.isArray(rankingData)) rankingList = rankingData
                else if (rankingData?.data) rankingList = rankingData.data
                else if (rankingData?.ranking) rankingList = rankingData.ranking
                else if (rankingData?.elements) rankingList = rankingData.elements

                setRanking(rankingList)

                const userId = user?.userId?.toString()
                const foundTeam = rankingList.find(item => {
                    const teamUserId = item.userId || item.team?.userId || item.team?.manager?.id
                    return teamUserId?.toString() === userId
                })

                if (foundTeam) {
                    targetTeamId = foundTeam.id || foundTeam.team?.id
                } else if (rankingList.length > 0) {
                    targetTeamId = rankingList[0].id || rankingList[0].team?.id
                }
            }

            if (targetTeamId) {
                await loadTeamAndLineup(league.id, targetTeamId)
            } else {
                setLoading(false)
            }
        } catch (err) {
            console.error('Error finding user team:', err)
            setLoading(false)
        }
    }

    const loadTeamAndLineup = async (leagueId, teamId) => {
        try {
            // 1. Get Team Details
            const teamResp = await fantasyAPI.getTeamData(leagueId, teamId)
            const teamData = teamResp?.data || teamResp

            // Handle manager name safely - fix for [object Object] bug
            const manager = teamData.manager || teamData.team?.manager
            const managerName = typeof manager === 'string' ? manager : (manager?.managerName || 'Manager')

            setUserTeam({
                id: teamId,
                name: teamData.name || 'Mi Equipo',
                manager: managerName,
                // Ensure number types for stats
                points: Number(teamData.points || 0),
                teamValue: Number(teamData.teamValue || 0),
                money: Number(teamData.money || teamData.budget || 0),
                badgeColor: teamData.badgeColor
            })

            // 2. Get Lineup for selected week
            const weekToLoad = selectedWeek || currentWeek
            if (weekToLoad) {
                const lineupResp = await fantasyAPI.getTeamLineup(teamId, weekToLoad)
                const rawLineup = lineupResp?.data || lineupResp
                setLineup(rawLineup)
            }
        } catch (err) {
            console.error('Error loading lineup:', err)
            toast.error('Error cargando alineación')
        } finally {
            setLoading(false)
        }
    }

    const handlePlayerClick = (playerId) => {
        if (!playerId) return
        setSelectedPlayerId(playerId)
        setIsModalOpen(true)
    }

    const formatMoney = (amount) => {
        if (!amount && amount !== 0) return '-'
        if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M €`
        return new Intl.NumberFormat('es-ES').format(amount) + ' €'
    }

    // Prediction estimate (simplified - based on avg points)
    const predictionEstimate = useMemo(() => {
        if (!userTeam?.points || !currentWeek) return null
        const avgPerWeek = Math.round(userTeam.points / Math.max(1, currentWeek - 1))
        return avgPerWeek + Math.floor(Math.random() * 10) - 5 // Small variance
    }, [userTeam?.points, currentWeek])

    // Robust Lineup Parsing - Adapted from LaLigaApp
    const { starters, bench, formationName, formationLayout } = useMemo(() => {
        if (!lineup) return { starters: [], bench: [], formationName: 'Unknown', formationLayout: null }

        let processedPlayers = []
        let formName = '?-?-?'

        // 1. Handle Formation Object vs String vs Array
        if (lineup.formation && typeof lineup.formation === 'object' && !Array.isArray(lineup.formation)) {
            // Object format: { goalkeeper: [], defender: [], ... }
            const fd = lineup.formation
            if (fd.goalkeeper) processedPlayers.push(...fd.goalkeeper.map(p => ({ ...p, positionId: 1 })))
            if (fd.defender) processedPlayers.push(...fd.defender.map(p => ({ ...p, positionId: 2 })))
            if (fd.midfield) processedPlayers.push(...fd.midfield.map(p => ({ ...p, positionId: 3 })))
            if (fd.striker) processedPlayers.push(...fd.striker.map(p => ({ ...p, positionId: 4 })))

            formName = fd.tacticalFormation || lineup.tacticalFormation || formName
        } else if (lineup.players && typeof lineup.players === 'object' && !Array.isArray(lineup.players)) {
            // Legacy Object format
            const fd = lineup.players
            if (fd.goalkeeper) processedPlayers.push(...fd.goalkeeper.map(p => ({ ...p, positionId: 1 })))
            if (fd.defender) processedPlayers.push(...fd.defender.map(p => ({ ...p, positionId: 2 })))
            if (fd.midfield) processedPlayers.push(...fd.midfield.map(p => ({ ...p, positionId: 3 })))
            if (fd.striker) processedPlayers.push(...fd.striker.map(p => ({ ...p, positionId: 4 })))
        } else if (Array.isArray(lineup.players) || Array.isArray(lineup.team_players) || Array.isArray(lineup)) {
            // Array format
            processedPlayers = lineup.players || lineup.team_players || lineup
        }

        // Get Formation Name
        if (lineup.formationName) formName = lineup.formationName
        else if (lineup.tacticalFormation) formName = lineup.tacticalFormation
        else if (lineup.formation && typeof lineup.formation === 'string') formName = lineup.formation
        else if (Array.isArray(lineup.formation)) formName = lineup.formation.join('-')

        // 2. Separate Starters vs Bench
        let startersList = []
        let benchList = []

        // If explicitly separated
        if (lineup.start_xi && lineup.bench) {
            startersList = lineup.start_xi
            benchList = lineup.bench
        } else {
            // Filter by status/stat if available 
            processedPlayers.forEach(p => {
                // Check multiple flags for bench status
                const isBench = p.lineupStatus === 'bench' ||
                    p.status === 'bench' ||
                    p.stat === 'substitute' ||
                    (p.playerMaster?.status === 'bench')

                if (isBench) benchList.push(p)
                else startersList.push(p)
            })
        }

        startersList.sort((a, b) => (a.playerMaster?.positionId || a.positionId || 0) - (b.playerMaster?.positionId || b.positionId || 0))

        // 3. Dynamic Formation Layout Logic
        const getLayout = (fmt) => {
            if (!fmt) return null
            const layouts = {
                '4-4-2': [4, 4, 2, 1],
                '4-3-3': [3, 3, 4, 1],
                '3-5-2': [2, 5, 3, 1],
                '3-4-3': [3, 4, 3, 1],
                '5-3-2': [2, 3, 5, 1],
                '4-5-1': [1, 5, 4, 1],
                '5-4-1': [1, 4, 5, 1]
            }
            if (layouts[fmt]) return layouts[fmt]

            if (typeof fmt === 'string') {
                const parts = fmt.split('-').map(n => parseInt(n))
                if (parts.length >= 3) {
                    return [...parts.reverse(), 1]
                }
            }
            return [3, 3, 4, 1]
        }

        const formationLayout = getLayout(formName)

        return { starters: startersList, bench: benchList, formationName: formName, formationLayout }
    }, [lineup])

    // Pitch Rows Generation
    const pitchRows = useMemo(() => {
        if (!formationLayout) {
            const buckets = { 1: [], 2: [], 3: [], 4: [] }
            starters.forEach(p => {
                const pid = p.playerMaster?.positionId || p.positionId || 0
                if (buckets[pid]) buckets[pid].push(p)
            })
            return [buckets[4] || [], buckets[3] || [], buckets[2] || [], buckets[1] || []]
        }

        const buckets = { 1: [], 2: [], 3: [], 4: [] }
        starters.forEach(p => {
            const pid = p.playerMaster?.positionId || p.positionId || 0
            if (buckets[pid]) buckets[pid].push(p)
        })

        return [
            buckets[4] || [],
            buckets[3] || [],
            buckets[2] || [],
            buckets[1] || []
        ]
    }, [starters, formationLayout])

    if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><RefreshCw size={32} className="text-primary animate-spin" /></div>

    const isCurrentWeek = selectedWeek === currentWeek

    return (
        <div className="max-w-7xl mx-auto px-4 py-6">
            {/* 🔥 ENHANCED HEADER with Week Navigation */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                    <Users className="text-primary" size={28} />
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-white">Alineación</h1>
                        <p className="text-sm text-gray-400">{selectedLeague?.name || 'Liga'}</p>
                    </div>
                </div>
                <button onClick={() => selectedLeague && userTeam && loadTeamAndLineup(selectedLeague.id, userTeam.id)} className="p-3 rounded-full bg-surface-accent hover:bg-white/10 text-gray-400 hover:text-primary transition-colors">
                    <RefreshCw size={20} />
                </button>
            </div>

            {/* 🔥 WEEK SELECTOR + COUNTDOWN BAR */}
            <div className="glass-panel rounded-xl p-4 mb-6 border border-white/10">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    {/* Week Selector */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handlePrevWeek}
                            disabled={selectedWeek <= 1}
                            className="p-2 rounded-lg bg-surface-accent hover:bg-white/10 text-gray-400 hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <div className="text-center min-w-[120px]">
                            <p className="text-2xl font-bold text-white">Jornada {selectedWeek}</p>
                            {isCurrentWeek && (
                                <span className="text-xs text-primary">Actual</span>
                            )}
                            {!isCurrentWeek && (
                                <span className="text-xs text-gray-500">Histórica</span>
                            )}
                        </div>
                        <button
                            onClick={handleNextWeek}
                            disabled={selectedWeek >= 38}
                            className="p-2 rounded-lg bg-surface-accent hover:bg-white/10 text-gray-400 hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>

                    {/* Countdown + Prediction + Actions */}
                    <div className="flex items-center gap-4">
                        {/* Countdown */}
                        {isCurrentWeek && (
                            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                                <Clock size={16} className="text-yellow-400" />
                                <span className="text-sm text-yellow-400 font-medium">Cierra Vie 19:00</span>
                            </div>
                        )}

                        {/* Prediction */}
                        {isCurrentWeek && predictionEstimate && (
                            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-neon-blue/10 border border-neon-blue/30">
                                <TrendingUp size={16} className="text-neon-blue" />
                                <span className="text-sm text-neon-blue font-medium">~{predictionEstimate} pts</span>
                            </div>
                        )}

                        {/* Auto-Align Button */}
                        {isCurrentWeek && (
                            <button
                                onClick={() => toast('Auto-alineación próximamente', { icon: '🤖' })}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 transition-colors text-sm font-medium"
                            >
                                <Zap size={16} />
                                Auto-Alinear
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* League Tabs */}
            {leagues.length > 1 && (
                <div className="mb-6 overflow-x-auto hide-scrollbar -mx-4 px-4">
                    <div className="flex gap-2">
                        {leagues.map((league) => (
                            <button
                                key={league.id}
                                onClick={() => setSelectedLeague(league)}
                                className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all ${selectedLeague?.id === league.id ? 'bg-primary text-black' : 'bg-surface-dark text-gray-300 border border-white/10 hover:border-primary/50'
                                    }`}
                            >{league.name}</button>
                        ))}
                    </div>
                </div>
            )}

            {/* Football Pitch Visualization */}
            <div className="relative bg-surface-dark border border-white/10 rounded-xl overflow-hidden mb-8 aspect-[3/4] sm:aspect-video max-w-4xl mx-auto shadow-2xl">
                {/* Pitch Background */}
                <div className="absolute inset-0 bg-gradient-to-b from-green-900 to-green-800 opacity-80" />
                <div className="absolute inset-0 bg-[url('https://assets.laligafantasymarca.com/web/imgs/pitch-bg.png')] bg-cover bg-center opacity-40 mix-blend-overlay" />

                {/* Formation Badge */}
                <div className="absolute top-4 left-4 z-10 px-3 py-1 bg-black/40 backdrop-blur-md rounded-full border border-white/10 flex items-center gap-2">
                    <Target size={14} className="text-primary" />
                    <span className="text-sm font-bold text-white">
                        {formationName !== 'Unknown' && typeof formationName !== 'object' ? formationName : 'Alineación'}
                    </span>
                </div>

                <div className="relative z-10 h-full flex flex-col justify-between py-8 px-4">
                    {/* Render Lines */}
                    {pitchRows.map((rowPlayers, idx) => (
                        <div key={idx} className="flex justify-center gap-4 sm:gap-12">
                            {rowPlayers.map((p, i) => (
                                <PlayerPitchCard
                                    key={i}
                                    item={p}
                                    onClick={() => handlePlayerClick(p.playerMaster?.id || p.id)}
                                />
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            {/* Bench */}
            {bench.length > 0 && (
                <div className="mb-8">
                    <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                        <Shirt size={18} className="text-gray-400" />
                        Banquillo
                    </h3>
                    <div className="flex gap-4 overflow-x-auto pb-4 px-2">
                        {bench.map((p, i) => (
                            <div key={i} className="flex-shrink-0">
                                <PlayerPitchCard item={p} onClick={() => handlePlayerClick(p.playerMaster?.id || p.id)} />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* User Team Stats Summary */}
            {userTeam && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="glass-panel p-4 rounded-xl flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-surface-accent flex items-center justify-center text-primary font-bold overflow-hidden border border-white/10">
                            {userTeam.badgeColor ? <img src={userTeam.badgeColor} className="w-full h-full object-cover" /> : userTeam.manager[0]}
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs text-gray-400 uppercase">Manager</p>
                            <p className="font-bold text-white truncate text-sm sm:text-base" title={userTeam.manager}>{userTeam.manager}</p>
                        </div>
                    </div>
                    <div className="glass-panel p-4 rounded-xl">
                        <p className="text-xs text-gray-400 uppercase mb-1">Valor Equipo</p>
                        <p className="font-bold text-white">{formatMoney(userTeam.teamValue)}</p>
                    </div>
                    <div className="glass-panel p-4 rounded-xl">
                        <p className="text-xs text-gray-400 uppercase mb-1">Puntos Totales</p>
                        <div className="flex items-center gap-2">
                            <Trophy size={16} className="text-yellow-500" />
                            <p className="font-bold text-white">{userTeam.points}</p>
                        </div>
                    </div>
                    <div className="glass-panel p-4 rounded-xl">
                        <p className="text-xs text-gray-400 uppercase mb-1">Saldo</p>
                        <div className="flex items-center gap-2">
                            <Wallet size={16} className="text-neon-blue" />
                            <p className="font-bold text-neon-blue">{formatMoney(userTeam.money)}</p>
                        </div>
                    </div>
                </div>
            )}

            <PlayerDetailModal playerId={selectedPlayerId} leagueId={selectedLeague?.id} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </div>
    )
}

function PlayerPitchCard({ item, onClick }) {
    const player = item.player || item.playerMaster || item
    const points = item.points || player.points

    return (
        <div className="flex flex-col items-center cursor-pointer group w-20 sm:w-24" onClick={onClick}>
            <div className="relative mb-1">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-surface-dark border-2 border-white/20 overflow-hidden group-hover:border-primary transition-colors shadow-lg relative">
                    {player.images?.transparent?.['256x256'] ? (
                        <img src={player.images.transparent['256x256']} alt="" className="w-full h-full object-contain pt-1" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500 font-bold text-xl">{player.nickname?.[0]}</div>
                    )}
                </div>
                {points !== undefined && (
                    <div className="absolute -top-1 -right-1 bg-surface-accent text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-white/10 shadow-md">
                        {points}
                    </div>
                )}
                {player.team?.badgeColor && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white p-0.5 shadow-sm">
                        <img src={player.team.badgeColor} alt="" className="w-full h-full object-contain" />
                    </div>
                )}
            </div>
            <div className="bg-black/50 backdrop-blur-sm px-2 py-1 rounded text-center w-full truncate border border-white/5 group-hover:bg-primary/20 group-hover:border-primary/50 transition-colors">
                <p className="text-[10px] sm:text-xs font-bold text-white truncate">{player.nickname || player.name}</p>
                <p className="text-[9px] text-gray-400 font-mono truncate">{player.marketValue ? `${(player.marketValue / 1000000).toFixed(1)}M` : '-'}</p>
            </div>
        </div>
    )
}
