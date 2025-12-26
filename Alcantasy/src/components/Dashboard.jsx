import { useState, useEffect, useMemo } from 'react'
import { fantasyAPI } from '../services/api'
import { useAuthStore } from '../stores/authStore'
import toast from 'react-hot-toast'
import {
    RefreshCw, Users, Trophy, ShoppingCart, TrendingUp, Wallet,
    Activity, Crown, Medal, ChevronRight, Calendar, Clock, AlertTriangle,
    Target, Zap, ArrowUpRight, ArrowDownRight, DollarSign, BarChart3,
    Shield, LogOut
} from 'lucide-react'

export default function Dashboard() {
    const { user, setLeagueId, updateUser } = useAuthStore()
    const [loading, setLoading] = useState(true)
    const [leagues, setLeagues] = useState([])
    const [selectedLeague, setSelectedLeague] = useState(null)
    const [ranking, setRanking] = useState([])
    const [market, setMarket] = useState([])
    const [currentWeek, setCurrentWeek] = useState(null)
    const [activity, setActivity] = useState([])
    const [myTeamData, setMyTeamData] = useState(null)
    const [myPosition, setMyPosition] = useState(null)

    useEffect(() => {
        loadInitialData()
    }, [])

    useEffect(() => {
        if (selectedLeague) {
            setLeagueId(selectedLeague.id)
            loadLeagueData(selectedLeague.id)
        }
    }, [selectedLeague])

    const loadInitialData = async () => {
        setLoading(true)
        try {
            const [leaguesData, weekData] = await Promise.all([
                fantasyAPI.getLeagues(),
                fantasyAPI.getCurrentWeek()
            ])

            setLeagues(leaguesData || [])
            const weekNumber = weekData?.weekNumber || weekData?.week || weekData?.data?.weekNumber || 17
            setCurrentWeek({ weekNumber })

            if (leaguesData?.length > 0) {
                setSelectedLeague(leaguesData[0])
            }
        } catch (err) {
            console.error('Error loading initial data:', err)
            toast.error('Error al cargar datos')
        } finally {
            setLoading(false)
        }
    }

    const loadLeagueData = async (leagueId) => {
        try {
            const [rankingData, marketData, activityData] = await Promise.all([
                fantasyAPI.getLeagueRanking(leagueId),
                fantasyAPI.getMarket(leagueId),
                fantasyAPI.getLeagueActivity(leagueId, 0).catch(() => [])
            ])

            // Parse ranking
            let parsedRanking = []
            if (Array.isArray(rankingData)) parsedRanking = rankingData
            else if (rankingData?.data) parsedRanking = rankingData.data
            else if (rankingData?.ranking) parsedRanking = rankingData.ranking
            else if (rankingData?.elements) parsedRanking = rankingData.elements
            setRanking(parsedRanking)

            // CRITICAL: Ensure we have the real Game User ID and Manager Name
            // The Auth User only has GUID and Google Name, which might not match the game
            let currentUser = user
            if (!user.id || typeof user.id !== 'number' || !user.managerName) {
                try {
                    const profile = await fantasyAPI.getCurrentUser()
                    if (profile && profile.id) {
                        console.log('Fetched real user profile:', profile.id, profile.managerName)
                        updateUser(profile)
                        currentUser = { ...user, ...profile }
                    }
                } catch (e) {
                    console.warn('Could not fetch user profile:', e)
                }
            }

            // Find my team position using enhanced helper
            const myTeamIndex = findUserInRanking(parsedRanking, currentUser)
            console.log('Found team index:', myTeamIndex)

            if (myTeamIndex >= 0) {
                setMyPosition(myTeamIndex + 1)
                const teamItem = parsedRanking[myTeamIndex]

                // Fetch full team details to get money and exact value
                // Ranking often doesn't have the 'money' field
                const teamId = teamItem.id || teamItem.team?.id
                if (teamId) {
                    try {
                        const teamData = await fantasyAPI.getTeamData(leagueId, teamId)
                        // Merge ranking data with full team data
                        setMyTeamData({
                            ...teamItem,
                            money: teamData.money || teamData.data?.money || 0,
                            teamValue: teamData.teamValue || teamData.data?.teamValue || item.teamValue
                        })
                    } catch (e) {
                        console.error('Error fetching my team details:', e)
                        setMyTeamData(teamItem)
                    }
                } else {
                    setMyTeamData(teamItem)
                }
            } else {
                // Should not happen if user is in the league
                setMyTeamData(null)
            }

            // Parse market
            let parsedMarket = []
            if (Array.isArray(marketData)) parsedMarket = marketData
            else if (marketData?.sales) parsedMarket = marketData.sales
            else if (marketData?.data) parsedMarket = marketData.data
            setMarket(parsedMarket)

            // Parse activity
            let parsedActivity = []
            if (Array.isArray(activityData)) parsedActivity = activityData
            else if (activityData?.content) parsedActivity = activityData.content
            else if (activityData?.data) parsedActivity = activityData.data
            setActivity(parsedActivity.slice(0, 5))

        } catch (err) {
            console.error('Error loading league data:', err)
        }
    }

    // Helper functions
    const getTeamName = (item) => item.name || item.team?.name || 'Equipo'
    const getManagerName = (item) => item.manager || item.team?.manager?.managerName || 'Manager'
    const getTeamPoints = (item) => item.points || item.team?.points || 0
    const getTeamValue = (item) => item.teamValue || item.team?.teamValue || 0
    const getTeamMoney = (item) => item.money || item.team?.money || 0

    // Enhanced matching logic
    const findUserInRanking = (ranking, user) => {
        if (!user || !ranking) return -1

        const pUser = user.id || user.sub || user.oid
        console.log('Searching for user:', pUser, user.name)

        return ranking.findIndex(item => {
            const managerId = item.team?.manager?.id || item.userId || item.team?.manager?.userId
            const managerName = item.manager || item.team?.manager?.managerName || item.team?.manager?.name

            // 1. Match by ID (String comparison)
            if (managerId && pUser && managerId.toString() === pUser.toString()) return true

            // 2. Match by Exact Name (Case insensitive fallback)
            if (user.name && managerName && managerName.toLowerCase() === user.name.toLowerCase()) return true

            return false
        })
    }

    const formatMoney = (amount) => {
        if (!amount && amount !== 0) return '-'
        if (amount >= 1000000) {
            return `${(amount / 1000000).toFixed(1)}M €`
        }
        return new Intl.NumberFormat('es-ES').format(amount) + ' €'
    }

    const getRankIcon = (idx) => {
        if (idx === 0) return <Crown className="w-4 h-4 text-yellow-400" />
        if (idx === 1) return <Medal className="w-4 h-4 text-gray-300" />
        if (idx === 2) return <Medal className="w-4 h-4 text-amber-600" />
        return <span className="text-sm text-gray-500">{idx + 1}</span>
    }

    // Derived stats
    const leader = ranking.length > 0 ? ranking[0] : null
    const leaderPoints = leader ? getTeamPoints(leader) : 0
    const myPoints = myTeamData ? getTeamPoints(myTeamData) : 0
    const pointsToLeader = leaderPoints - myPoints
    const myValue = myTeamData ? getTeamValue(myTeamData) : 0
    const myMoney = myTeamData ? getTeamMoney(myTeamData) : 0

    // My active bids
    const myBids = useMemo(() => {
        return market.filter(item => item.bid?.status === 'pending').slice(0, 3)
    }, [market])

    // Trending players (rising)
    const trendingPlayers = useMemo(() => {
        return market.filter(p => p.playerMaster?.marketValue > 10000000).slice(0, 3)
    }, [market])

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
                        <BarChart3 className="text-primary" />
                        Inicio
                    </h1>
                    <p className="text-gray-400 text-sm mt-1">
                        {currentWeek ? `Jornada ${currentWeek.weekNumber}` : 'Bienvenido'}
                        {selectedLeague && ` · ${selectedLeague.name}`}
                    </p>
                </div>
                <button
                    onClick={loadInitialData}
                    className="p-3 rounded-full bg-surface-accent hover:bg-white/10 text-gray-400 hover:text-primary transition-colors"
                >
                    <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* League Tabs */}
            {leagues.length > 1 && (
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

            {/* 🔥 HERO STATS BAR - NEW! */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {/* My Points */}
                <div className="glass-panel rounded-xl p-4 border-l-4 border-primary">
                    <div className="flex items-center justify-between mb-2">
                        <Trophy size={20} className="text-primary" />
                        <span className="text-xs text-gray-500 uppercase">Mis Puntos</span>
                    </div>
                    <p className="text-3xl font-bold text-white">{myPoints || '-'}</p>
                    {pointsToLeader > 0 && (
                        <p className="text-xs text-accent-red mt-1 flex items-center gap-1">
                            <ArrowDownRight size={12} />
                            -{pointsToLeader} del líder
                        </p>
                    )}
                    {pointsToLeader === 0 && myPosition === 1 && (
                        <p className="text-xs text-neon-green mt-1 flex items-center gap-1">
                            <Crown size={12} />
                            ¡Eres el líder!
                        </p>
                    )}
                </div>

                {/* My Position */}
                <div className="glass-panel rounded-xl p-4 border-l-4 border-neon-blue">
                    <div className="flex items-center justify-between mb-2">
                        <Target size={20} className="text-neon-blue" />
                        <span className="text-xs text-gray-500 uppercase">Posición</span>
                    </div>
                    <p className="text-3xl font-bold text-white">
                        {myPosition ? `${myPosition}º` : '-'}
                        <span className="text-lg text-gray-500">/{ranking.length}</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{selectedLeague?.name || 'Liga'}</p>
                </div>

                {/* My Money */}
                <div className="glass-panel rounded-xl p-4 border-l-4 border-neon-green">
                    <div className="flex items-center justify-between mb-2">
                        <Wallet size={20} className="text-neon-green" />
                        <span className="text-xs text-gray-500 uppercase">Dinero</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{formatMoney(myMoney)}</p>
                    <p className="text-xs text-gray-500 mt-1">Disponible para pujas</p>
                </div>

                {/* My Team Value */}
                <div className="glass-panel rounded-xl p-4 border-l-4 border-neon-pink">
                    <div className="flex items-center justify-between mb-2">
                        <TrendingUp size={20} className="text-neon-pink" />
                        <span className="text-xs text-gray-500 uppercase">Valor Equipo</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{formatMoney(myValue)}</p>
                    <p className="text-xs text-gray-500 mt-1">Patrimonio total</p>
                </div>
            </div>

            {/* 🔥 NEXT MATCHDAY COUNTDOWN - NEW! */}
            <div className="glass-panel rounded-xl p-4 mb-6 bg-gradient-to-r from-primary/10 to-transparent border border-primary/30">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                            <Calendar size={24} className="text-primary" />
                        </div>
                        <div>
                            <h3 className="font-bold text-white">Jornada {currentWeek?.weekNumber || '-'}</h3>
                            <p className="text-sm text-gray-400">Próximo cierre de alineación</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="flex items-center gap-2 text-primary">
                            <Clock size={16} />
                            <span className="font-mono font-bold text-lg">Viernes 19:00</span>
                        </div>
                        <button className="text-xs text-gray-400 hover:text-primary flex items-center gap-1 mt-1 ml-auto">
                            Revisar alineación <ChevronRight size={12} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Column 1: Ranking */}
                <div className="lg:col-span-1">
                    <div className="glass-panel rounded-xl overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b border-white/10">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <Trophy size={18} className="text-primary" />
                                Top 5
                            </h2>
                        </div>
                        {ranking.length > 0 ? (
                            <div className="divide-y divide-white/5">
                                {ranking.slice(0, 5).map((item, idx) => (
                                    <div
                                        key={item.id || idx}
                                        className={`flex items-center gap-3 p-3 transition-all duration-300 ${idx === 0
                                                ? 'bg-gradient-to-r from-yellow-500/20 via-amber-500/10 to-transparent border-l-4 border-yellow-400 shadow-[inset_0_0_20px_rgba(234,179,8,0.15)]'
                                                : myPosition === idx + 1
                                                    ? 'bg-primary/10 border-l-2 border-primary'
                                                    : 'hover:bg-white/5'
                                            }`}
                                    >
                                        <div className="w-6 flex items-center justify-center">
                                            {idx === 0 ? (
                                                <span className="text-yellow-400 animate-pulse">👑</span>
                                            ) : getRankIcon(idx)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`font-medium truncate ${idx === 0 ? 'text-yellow-400 font-bold' : myPosition === idx + 1 ? 'text-primary' : 'text-white'
                                                }`}>
                                                {getManagerName(item)}
                                                {myPosition === idx + 1 && ' (Tú)'}
                                                {idx === 0 && ' ⭐'}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className={`font-bold ${idx === 0 ? 'text-yellow-400' : 'text-primary'}`}>{getTeamPoints(item)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-8 text-center">
                                <Trophy size={32} className="text-gray-600 mx-auto mb-2" />
                                <p className="text-gray-500 text-sm">Sin datos</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Column 2: Widgets */}
                <div className="lg:col-span-1 space-y-6">
                    {/* 🔥 MY BIDS - NEW! */}
                    <div className="glass-panel rounded-xl overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b border-white/10">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <Zap size={18} className="text-neon-pink" />
                                Mis Pujas
                            </h2>
                            <span className="text-xs px-2 py-1 rounded-full bg-neon-pink/20 text-neon-pink">
                                {myBids.length} activas
                            </span>
                        </div>
                        {myBids.length > 0 ? (
                            <div className="divide-y divide-white/5">
                                {myBids.map((item, idx) => {
                                    const player = item.playerMaster
                                    return (
                                        <div key={item.id || idx} className="flex items-center gap-3 p-3">
                                            <div className="w-10 h-10 rounded-full bg-surface-accent flex items-center justify-center overflow-hidden">
                                                {player?.images?.transparent?.['256x256'] ? (
                                                    <img src={player.images.transparent['256x256']} alt="" className="w-8 h-8 object-contain" />
                                                ) : (
                                                    <span className="text-gray-500">{(player?.nickname || '?')[0]}</span>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-white text-sm truncate">{player?.nickname || player?.name}</p>
                                                <p className="text-xs text-gray-500">{player?.team?.name}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-neon-pink text-sm">{formatMoney(item.bid?.money)}</p>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <div className="py-8 text-center">
                                <Zap size={32} className="text-gray-600 mx-auto mb-2" />
                                <p className="text-gray-500 text-sm">No tienes pujas activas</p>
                            </div>
                        )}
                    </div>

                    {/* 🔥 ALERTS - NEW! */}
                    <div className="glass-panel rounded-xl overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b border-white/10">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <AlertTriangle size={18} className="text-accent-red" />
                                Alertas
                            </h2>
                        </div>
                        <div className="p-4 space-y-3">
                            <div className="flex items-start gap-3 text-sm">
                                <Clock size={14} className="text-yellow-400 mt-0.5" />
                                <p className="text-gray-400">
                                    La alineación cierra en <span className="text-yellow-400 font-medium">menos de 24h</span>
                                </p>
                            </div>
                            <div className="flex items-start gap-3 text-sm">
                                <TrendingUp size={14} className="text-neon-green mt-0.5" />
                                <p className="text-gray-400">
                                    <span className="text-neon-green font-medium">{market.length}</span> jugadores en mercado
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Column 3: Activity + Market */}
                <div className="lg:col-span-1 space-y-6">
                    {/* 🔥 RECENT ACTIVITY - NEW! */}
                    <div className="glass-panel rounded-xl overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b border-white/10">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <Activity size={18} className="text-neon-blue" />
                                Actividad
                            </h2>
                        </div>
                        {activity.length > 0 ? (
                            <div className="divide-y divide-white/5">
                                {activity.slice(0, 4).map((item, idx) => {
                                    // Helper to format activity text
                                    const getActivityDetails = (item) => {
                                        const typeId = item.activityTypeId
                                        const amount = item.money || item.amount || 0
                                        const formattedMoney = formatMoney(amount)
                                        const player = item.playerMagari || item.playerMaster || { nickname: 'Jugador' }
                                        const playerName = player.nickname || player.name || 'Jugador'

                                        // Mapeo básico de nombres de managers (puede mejorarse con cache de managers)
                                        const user1 = item.user1Id // Quien realiza la acción
                                        const user2 = item.user2Id // Afectado (si lo hay)

                                        switch (typeId) {
                                            case 1: // Compra a mercado (?)
                                            case 31: // Fichaje de mercado
                                                return {
                                                    icon: <ArrowDownRight className="text-neon-green" size={16} />,
                                                    text: <><span className="text-neon-green">Fichaje:</span> {playerName} por {formattedMoney}</>,
                                                    color: 'bg-neon-green'
                                                }
                                            case 33: // Venta a mercado
                                            case 2:
                                                return {
                                                    icon: <ArrowUpRight className="text-neon-blue" size={16} />,
                                                    text: <><span className="text-neon-blue">Venta:</span> {playerName} por {formattedMoney}</>,
                                                    color: 'bg-neon-blue'
                                                }
                                            case 32: // Clausulazo recibido 
                                            case 3:
                                                return {
                                                    icon: <LogOut className="text-accent-red" size={16} />,
                                                    text: <><span className="text-accent-red">Clausulazo:</span> Han robado a {playerName} por {formattedMoney}</>,
                                                    color: 'bg-accent-red'
                                                }
                                            case 4: // Clausulazo hecho (o inversa, dependiendo de user1/2) 
                                                return {
                                                    icon: <Shield className="text-neon-pink" size={16} />,
                                                    text: <><span className="text-neon-pink">Robo:</span> Clausulazo a {playerName} por {formattedMoney}</>,
                                                    color: 'bg-neon-pink'
                                                }
                                            case 6: // Premio jornada
                                                return {
                                                    icon: <Trophy className="text-yellow-400" size={16} />,
                                                    text: <><span className="text-yellow-400">Premio:</span> {item.title || 'Jornada'} por {formattedMoney}</>,
                                                    color: 'bg-yellow-400'
                                                }
                                            default:
                                                return {
                                                    icon: <Activity className="text-gray-400" size={16} />,
                                                    text: <span>Acción desconocida (ID: {typeId})</span>,
                                                    color: 'bg-gray-400'
                                                }
                                        }
                                    }

                                    const details = getActivityDetails(item)

                                    return (
                                        <div key={item.id || idx} className="p-3 text-sm hover:bg-white/5 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-1.5 rounded-full bg-surface-dark border border-white/5`}>
                                                    {details.icon}
                                                </div>
                                                <div className="text-gray-300 flex-1 text-xs">
                                                    {details.text}
                                                    <p className="text-[10px] text-gray-600 mt-0.5">
                                                        {item.date ? (() => {
                                                            const d = new Date(item.date)
                                                            return isNaN(d.getTime()) ? 'Hace poco' : d.toLocaleDateString('es-ES')
                                                        })() : 'Hace poco'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <div className="py-8 text-center">
                                <Activity size={32} className="text-gray-600 mx-auto mb-2" />
                                <p className="text-gray-500 text-sm">Sin actividad reciente</p>
                            </div>
                        )}
                    </div>

                    {/* MARKET TRENDING */}
                    <div className="glass-panel rounded-xl overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b border-white/10">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <ShoppingCart size={18} className="text-neon-pink" />
                                Mercado
                            </h2>
                            <span className="text-xs text-gray-500">{market.length} jugadores</span>
                        </div>
                        {market.length > 0 ? (
                            <div className="divide-y divide-white/5">
                                {market.slice(0, 4).map((sale, idx) => {
                                    const player = sale.playerMaster || sale
                                    return (
                                        <div key={sale.id || idx} className="flex items-center gap-3 p-3">
                                            <div className="w-10 h-10 rounded-full bg-surface-accent flex items-center justify-center overflow-hidden">
                                                {player.images?.transparent?.['256x256'] ? (
                                                    <img src={player.images.transparent['256x256']} alt="" className="w-8 h-8 object-contain" />
                                                ) : (
                                                    <span className="text-gray-500">{(player.nickname || '?')[0]}</span>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-white text-sm truncate">{player.nickname || player.name}</p>
                                                <p className="text-xs text-gray-500">{player.team?.name}</p>
                                            </div>
                                            <p className="font-bold text-primary text-sm">{formatMoney(sale.price || player.marketValue)}</p>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <div className="py-8 text-center">
                                <ShoppingCart size={32} className="text-gray-600 mx-auto mb-2" />
                                <p className="text-gray-500 text-sm">Sin jugadores en mercado</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
