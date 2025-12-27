/**
 * Intelligence - Módulo Completo de Inteligencia Competitiva
 * 
 * Página dedicada con:
 * - Espionaje Financiero (saldos rivales)
 * - Valoración Moneyball (gangas/sobrevalorados)
 * - Francotirador de Cláusulas (oportunidades)
 */

import { useState, useEffect, useMemo } from 'react'
import { fantasyAPI } from '../services/api'
import { useAuthStore } from '../stores/authStore'
import toast from 'react-hot-toast'
import {
    Brain, RefreshCw, Target, TrendingUp, TrendingDown, Shield,
    DollarSign, Users, AlertTriangle, ChevronDown, ChevronUp,
    Zap, Eye, Search, Filter
} from 'lucide-react'

// Hooks de inteligencia
import { useRivalSpy } from '../hooks/useRivalSpy'
import { usePlayerValuation, PLAYER_LABELS } from '../hooks/usePlayerValuation'
import { useClauseSniper, CLAUSE_TYPES } from '../hooks/useClauseSniper'
import { useManagerIntelligence, MANAGER_TYPES } from '../hooks/useManagerIntelligence'
import { useMarketAnalytics } from '../hooks/useMarketAnalytics'
import marketTrendsService from '../services/marketTrendsService'

// Firebase service for clause expenses
import { getManagersData, addClauseExpense, getClauseHistory, deleteClauseHistoryEntry } from '../services/firebaseService'

export default function Intelligence() {
    const { user } = useAuthStore()
    const [loading, setLoading] = useState(true)
    const [leagues, setLeagues] = useState([])
    const [selectedLeague, setSelectedLeague] = useState(null)
    const [activeTab, setActiveTab] = useState('overview') // overview, rivals, market, clauses

    // Datos cargados
    const [ranking, setRanking] = useState([])
    const [activity, setActivity] = useState([])
    const [market, setMarket] = useState([])
    const [myTeam, setMyTeam] = useState([])
    const [rivalTeams, setRivalTeams] = useState([])
    const [myBalance, setMyBalance] = useState(0)
    const [marketTrends, setMarketTrends] = useState(new Map())

    // Firebase data for clause expenses
    const [firebaseData, setFirebaseData] = useState({})
    const [clauseInputs, setClauseInputs] = useState({}) // Input values for each manager
    const [clauseDescriptions, setClauseDescriptions] = useState({}) // Description for each addition
    const [historyModal, setHistoryModal] = useState({ open: false, manager: null, history: [] })

    useEffect(() => {
        loadLeagues()
    }, [])

    useEffect(() => {
        if (selectedLeague) {
            loadAllData(selectedLeague.id)
            loadFirebaseData()
        }
    }, [selectedLeague])

    // Load Firebase data
    const loadFirebaseData = async () => {
        try {
            const data = await getManagersData()
            console.log('Firebase data loaded:', data)
            setFirebaseData(data || {})
        } catch (error) {
            console.error('Error loading Firebase data:', error)
        }
    }

    // Handle adding clause expense
    const handleAddClauseExpense = async (managerName) => {
        const inputValue = clauseInputs[managerName]
        if (!inputValue || inputValue <= 0) {
            toast.error('Introduce una cantidad válida')
            return
        }

        // Input is now in full euros (e.g., 8000000 = 8M)
        const amountInEuros = Number(inputValue)
        const description = clauseDescriptions[managerName] || ''
        const success = await addClauseExpense(managerName, amountInEuros, description)

        if (success) {
            const displayAmount = amountInEuros >= 1000000
                ? `${(amountInEuros / 1000000).toFixed(1)}M€`
                : `${amountInEuros.toLocaleString('es-ES')}€`
            toast.success(`Añadido ${displayAmount} a ${managerName}`)
            setClauseInputs(prev => ({ ...prev, [managerName]: '' }))
            setClauseDescriptions(prev => ({ ...prev, [managerName]: '' }))
            loadFirebaseData() // Refresh data
        } else {
            toast.error('Error al actualizar Firebase')
        }
    }

    // Show history modal for a manager
    const showHistory = async (managerName) => {
        const history = await getClauseHistory(managerName)
        setHistoryModal({ open: true, manager: managerName, history })
    }

    // Handle deleting a clause expense entry
    const handleDeleteClauseEntry = async (entryId, amount) => {
        console.log('Starting deletion for:', entryId, amount)
        if (!historyModal.manager) {
            console.error('No manager selected')
            return
        }

        // Removed confirm for debugging
        try {
            const success = await deleteClauseHistoryEntry(historyModal.manager, entryId, Number(amount))
            console.log('Delete result:', success)
            if (success) {
                toast.success('Entrada eliminada')
                // Refresh history and firebase data
                const newHistory = await getClauseHistory(historyModal.manager)
                setHistoryModal(prev => ({ ...prev, history: newHistory }))
                loadFirebaseData()
            } else {
                toast.error('Error al eliminar')
            }
        } catch (error) {
            console.error('Error deleting entry:', error)
            toast.error('Error al eliminar: ' + error.message)
        }
    }

    const loadLeagues = async () => {
        try {
            const data = await fantasyAPI.getLeagues()
            setLeagues(data || [])
            if (data?.length > 0) setSelectedLeague(data[0])
        } catch (err) {
            toast.error('Error al cargar ligas')
            setLoading(false)
        }
    }

    const loadAllData = async (leagueId) => {
        setLoading(true)
        try {
            // Load market trends aggressively
            try {
                await marketTrendsService.initialize()
                setMarketTrends(marketTrendsService.marketValuesCache)
            } catch (e) {
                console.warn('Market trends failed to load', e)
            }

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
            setRanking(parsedRanking)

            // Parse market
            let parsedMarket = []
            if (Array.isArray(marketData)) parsedMarket = marketData
            else if (marketData?.sales) parsedMarket = marketData.sales
            else if (marketData?.data) parsedMarket = marketData.data
            setMarket(parsedMarket)

            // Deep Fetch Activity with Deduplication
            let allActivity = []
            const processedIds = new Set() // Track unique activity IDs

            let page = 0
            let hasMore = true
            const MAX_PAGES = 50

            let currentBatch = activityData

            while (hasMore && page < MAX_PAGES) {
                // Parse current batch
                let parsedBatch = []
                if (Array.isArray(currentBatch)) parsedBatch = currentBatch
                else if (currentBatch?.content) parsedBatch = currentBatch.content

                if (parsedBatch.length === 0) {
                    hasMore = false
                } else {
                    // Add only unique items
                    const newItems = parsedBatch.filter(item => {
                        if (!item.id || item.id === 0) return true // Keep items without ID just in case
                        if (processedIds.has(item.id)) return false
                        processedIds.add(item.id)
                        return true
                    })

                    allActivity = [...allActivity, ...newItems]

                    // Stop if we received fewer items than page size (usually 20 or 50), indicating end
                    if (parsedBatch.length < 10) hasMore = false

                    page++
                    // Fetch next page
                    try {
                        console.log(`Fetching activity page ${page}...`)
                        currentBatch = await fantasyAPI.getLeagueActivity(leagueId, page)
                    } catch (e) {
                        console.warn(`Error fetching activity page ${page}`, e)
                        hasMore = false
                    }
                }
            }

            console.log(`Activity loaded: ${allActivity.length} items`)

            setActivity(allActivity)

            // Cargar mi equipo y equipos rivales
            const myUserId = user?.userId || user?.id
            const myTeamItem = parsedRanking.find(item => {
                const teamUserId = item.userId || item.team?.manager?.id
                return teamUserId?.toString() === myUserId?.toString()
            })

            if (myTeamItem) {
                const teamId = myTeamItem.id || myTeamItem.team?.id
                try {
                    const teamData = await fantasyAPI.getTeamData(leagueId, teamId)
                    setMyTeam(teamData?.players || teamData?.data?.players || [])
                    setMyBalance(teamData?.money || teamData?.data?.money || 0)
                } catch (e) {
                    console.error('Error loading my team:', e)
                }
            }

            // Cargar equipos rivales (primeros 5 para no saturar)
            const rivals = []
            for (const item of parsedRanking.slice(0, 10)) {
                const teamUserId = item.userId || item.team?.manager?.id
                if (teamUserId?.toString() === myUserId?.toString()) continue

                const teamId = item.id || item.team?.id
                try {
                    const teamData = await fantasyAPI.getTeamData(leagueId, teamId)
                    rivals.push({
                        id: teamId,
                        manager: typeof item.manager === 'string' ? item.manager : item.manager?.managerName,
                        players: teamData?.players || teamData?.data?.players || []
                    })
                } catch (e) {
                    // Silently fail for other teams
                }
            }
            setRivalTeams(rivals)

        } catch (err) {
            console.error('Error loading intelligence data:', err)
            toast.error('Error al cargar datos de inteligencia')
        } finally {
            setLoading(false)
        }
    }

    // Hooks de inteligencia
    const myUserId = user?.userId || user?.id
    const { rivalBalances, weakestRivals, strongestRivals, biddingPatterns } = useRivalSpy(activity, ranking, myUserId, firebaseData, marketTrends)
    const { getPlayerLabel, topGangas, topSobrevalorados, topEspeculaciones, rankedByValue } = usePlayerValuation(market)
    const { snipingOpportunities, affordableOpportunities, myRisks, stats: clauseStats } = useClauseSniper(rivalTeams, myTeam, myBalance)
    const { topDeals, worstDeals, trendingPlayers, marketVolume, managerRankings } = useMarketAnalytics(activity, market, ranking)

    const formatMoney = (amount) => {
        if (!amount && amount !== 0) return '-'
        if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M €`
        return new Intl.NumberFormat('es-ES').format(amount) + ' €'
    }

    // Open Squad Detail Modal
    const openSquadDetail = (managerName, managerData) => {
        // Find team in rivalTeams to get players
        const rivalTeam = rivalTeams.find(r => r.manager === managerName)
        if (!rivalTeam) {
            // Try to find in ranking if simpler structure
            const rankingItem = ranking.find(r => (r.manager?.managerName === managerName || r.manager === managerName))
            if (rankingItem) {
                const players = rankingItem.team?.players || rankingItem.players || []
                setHistoryModal({
                    type: 'SQUAD',
                    managerName,
                    players,
                    managerObj: managerData // To access purchasedPlayers map
                })
                return;
            }
            toast.error('No se encontraron jugadores para este manager');
            return;
        }

        setHistoryModal({
            type: 'SQUAD',
            managerName,
            players: rivalTeam.players,
            managerObj: managerData
        })
    }

    const tabs = [
        { id: 'overview', label: 'Resumen', icon: Brain },
        { id: 'rivals', label: 'Espionaje', icon: Eye },
        { id: 'market', label: 'Moneyball', icon: TrendingUp },
        { id: 'clauses', label: 'Cláusulas', icon: Target }
    ]

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
                        <Brain className="text-neon-pink" />
                        Inteligencia Competitiva
                    </h1>
                    <p className="text-gray-400 text-sm mt-1">
                        Análisis avanzado de rivales y mercado
                    </p>
                </div>
                <button
                    onClick={() => selectedLeague && loadAllData(selectedLeague.id)}
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

            {/* Section Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto hide-scrollbar">
                {tabs.map(tab => {
                    const Icon = tab.icon
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === tab.id
                                ? 'bg-neon-pink/20 text-neon-pink border border-neon-pink/50'
                                : 'bg-surface-dark text-gray-400 border border-white/10 hover:text-white'
                                }`}
                        >
                            <Icon size={16} />
                            {tab.label}
                        </button>
                    )
                })}
            </div>

            {/* Content */}
            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Stats Cards */}
                    <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="glass-panel rounded-xl p-4 border-l-4 border-neon-green">
                            <TrendingUp size={20} className="text-neon-green mb-2" />
                            <p className="text-3xl font-bold text-white">{topGangas.length}</p>
                            <p className="text-xs text-gray-500">Gangas detectadas</p>
                        </div>
                        <div className="glass-panel rounded-xl p-4 border-l-4 border-accent-red">
                            <TrendingDown size={20} className="text-accent-red mb-2" />
                            <p className="text-3xl font-bold text-white">{topSobrevalorados.length}</p>
                            <p className="text-xs text-gray-500">Sobrevalorados</p>
                        </div>
                        <div className="glass-panel rounded-xl p-4 border-l-4 border-neon-blue">
                            <DollarSign size={20} className="text-neon-blue mb-2" />
                            <p className="text-3xl font-bold text-white">{marketVolume.today}</p>
                            <p className="text-xs text-gray-500">Operaciones hoy</p>
                        </div>
                        <div className="glass-panel rounded-xl p-4 border-l-4 border-neon-pink">
                            <Zap size={20} className="text-neon-pink mb-2" />
                            <p className="text-3xl font-bold text-white">{topDeals.length}</p>
                            <p className="text-xs text-gray-500">Top negocios</p>
                        </div>
                    </div>

                    {/* Top Deals - Mejores Negocios */}
                    <div className="glass-panel rounded-xl overflow-hidden">
                        <div className="p-4 border-b border-white/10">
                            <h3 className="font-bold text-white flex items-center gap-2">
                                <span className="text-lg">🏆</span> Top Negocios
                            </h3>
                        </div>
                        <div className="divide-y divide-white/5 max-h-64 overflow-y-auto">
                            {topDeals.slice(0, 5).map((deal, idx) => (
                                <div key={deal.playerId || idx} className="p-3 flex items-center gap-3">
                                    <span className="text-sm text-gray-500">{idx + 1}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-white text-sm truncate">{deal.playerName}</p>
                                        <p className="text-xs text-gray-500">{deal.managerName}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-neon-green text-sm">+{formatMoney(deal.profit)}</p>
                                        <p className="text-[10px] text-gray-500">ROI: +{deal.roi?.toFixed(0)}%</p>
                                    </div>
                                </div>
                            ))}
                            {topDeals.length === 0 && (
                                <div className="p-6 text-center text-gray-500 text-sm">Analizando operaciones...</div>
                            )}
                        </div>
                    </div>

                    {/* Worst Deals - Peores Ruinas */}
                    <div className="glass-panel rounded-xl overflow-hidden">
                        <div className="p-4 border-b border-white/10">
                            <h3 className="font-bold text-white flex items-center gap-2">
                                <span className="text-lg">💀</span> Peores Ruinas
                            </h3>
                        </div>
                        <div className="divide-y divide-white/5 max-h-64 overflow-y-auto">
                            {worstDeals.slice(0, 5).map((deal, idx) => (
                                <div key={deal.playerId || idx} className="p-3 flex items-center gap-3">
                                    <span className="text-sm text-gray-500">{idx + 1}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-white text-sm truncate">{deal.playerName}</p>
                                        <p className="text-xs text-gray-500">{deal.managerName}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-accent-red text-sm">{formatMoney(deal.profit)}</p>
                                        <p className="text-[10px] text-gray-500">ROI: {deal.roi?.toFixed(0)}%</p>
                                    </div>
                                </div>
                            ))}
                            {worstDeals.length === 0 && (
                                <div className="p-6 text-center text-gray-500 text-sm">Sin ruinas detectadas</div>
                            )}
                        </div>
                    </div>

                    {/* Trending Players - Tendencias */}
                    <div className="glass-panel rounded-xl overflow-hidden">
                        <div className="p-4 border-b border-white/10">
                            <h3 className="font-bold text-white flex items-center gap-2">
                                <TrendingUp size={18} className="text-neon-pink" />
                                Tendencias de Mercado
                            </h3>
                        </div>
                        <div className="grid grid-cols-2 divide-x divide-white/5">
                            {/* Rising */}
                            <div className="p-2">
                                <p className="text-[10px] uppercase text-neon-green font-bold px-2 py-1">🔺 Subiendo</p>
                                <div className="divide-y divide-white/5">
                                    {trendingPlayers.rising?.slice(0, 3).map((player, idx) => (
                                        <div key={player.id || idx} className="p-2 flex items-center gap-2">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs text-white truncate">{player.name}</p>
                                            </div>
                                            <p className="text-xs font-bold text-neon-green">+{formatMoney(player.change)}</p>
                                        </div>
                                    ))}
                                    {(!trendingPlayers.rising || trendingPlayers.rising.length === 0) && (
                                        <div className="p-3 text-center">
                                            <div className="flex justify-center gap-1 mb-1 opacity-30">
                                                <div className="w-1 h-2 bg-neon-green rounded-sm"></div>
                                                <div className="w-1 h-3 bg-neon-green rounded-sm"></div>
                                                <div className="w-1 h-4 bg-neon-green rounded-sm"></div>
                                            </div>
                                            <p className="text-[10px] text-gray-500">Esperando datos...</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                            {/* Falling */}
                            <div className="p-2">
                                <p className="text-[10px] uppercase text-accent-red font-bold px-2 py-1">🔻 Bajando</p>
                                <div className="divide-y divide-white/5">
                                    {trendingPlayers.falling?.slice(0, 3).map((player, idx) => (
                                        <div key={player.id || idx} className="p-2 flex items-center gap-2">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs text-white truncate">{player.name}</p>
                                            </div>
                                            <p className="text-xs font-bold text-accent-red">{formatMoney(player.change)}</p>
                                        </div>
                                    ))}
                                    {(!trendingPlayers.falling || trendingPlayers.falling.length === 0) && (
                                        <div className="p-3 text-center">
                                            <div className="flex justify-center gap-1 mb-1 opacity-30">
                                                <div className="w-1 h-4 bg-accent-red rounded-sm"></div>
                                                <div className="w-1 h-3 bg-accent-red rounded-sm"></div>
                                                <div className="w-1 h-2 bg-accent-red rounded-sm"></div>
                                            </div>
                                            <p className="text-[10px] text-gray-500">Esperando datos...</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'rivals' && (
                <div className="space-y-6">
                    <div className="glass-panel rounded-xl p-4 border-l-4 border-neon-blue">
                        <h3 className="font-bold text-white mb-1">💡 Espionaje Financiero</h3>
                        <p className="text-sm text-gray-400">
                            Estimamos el saldo de cada rival analizando: Compras, Ventas, Clausulazos y Blindajes.
                            Los saldos son aproximados basados en un saldo inicial de 103M€ (o 100M€ para Alcatamy).
                        </p>
                    </div>

                    <div className="glass-panel rounded-xl overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-surface-accent text-xs uppercase text-gray-500">
                                <tr>
                                    <th className="p-3 text-left">Manager</th>
                                    <th className="p-3 text-center hidden md:table-cell">Tipo</th>
                                    <th className="p-3 text-right">Valor Equipo</th>
                                    <th className="p-3 text-right text-neon-green">Var. Día</th>
                                    <th className="p-3 text-right">Compras</th>
                                    <th className="p-3 text-right">Ventas</th>
                                    <th className="p-3 text-right hidden sm:table-cell">Inv. Cláusulas</th>
                                    <th className="p-3 text-right">Saldo Est.</th>
                                    <th className="p-3 text-center">Añadir</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {rivalBalances.map((rival, idx) => {
                                    const pattern = biddingPatterns.find(p => p.id === rival.id)
                                    return (
                                        <tr key={rival.id || idx} className="hover:bg-white/5 cursor-pointer" onClick={() => openSquadDetail(rival.name, rival)}>
                                            <td className="p-3">
                                                <div className="flex flex-col">
                                                    <p className="font-medium text-white hover:text-neon-blue underline-offset-4 hover:underline">{rival.name}</p>
                                                    <p className="text-[10px] text-gray-500">{rival.teamName}</p>
                                                </div>
                                            </td>
                                            <td className="p-3 text-center hidden md:table-cell">
                                                {(() => {
                                                    // Calculate manager type based on their buying behavior
                                                    const roi = rival.saldoEstimado > 0 ?
                                                        ((rival.saldoEstimado - (rival.initialBalance || 103000000)) / (rival.initialBalance || 103000000)) * 100 : -10
                                                    const overbid = rival.compras > 0 ? 50 : 50
                                                    let type = MANAGER_TYPES.EQUILIBRADO
                                                    if (roi > 20 && rival.ventas > rival.compras * 0.5) type = MANAGER_TYPES.SNIPER
                                                    else if (rival.compras > rival.ventas * 2 && roi < 0) type = MANAGER_TYPES.DERROCHADOR
                                                    else if (rival.ventas > rival.compras && roi < -10) type = MANAGER_TYPES.MANOS_MANTEQUILLA
                                                    return (
                                                        <span className={`text-xs px-2 py-1 rounded-full bg-${type.color}/20 text-${type.color}`} title={type.description}>
                                                            {type.emoji}
                                                        </span>
                                                    )
                                                })()}
                                            </td>
                                            <td className="p-3 text-right font-medium text-white">
                                                {formatMoney(rival.teamValue)}
                                            </td>
                                            <td className="p-3 text-right font-medium">
                                                {rival.dailyValueChange > 0 ? (
                                                    <span className="text-neon-green">+{formatMoney(rival.dailyValueChange)}</span>
                                                ) : rival.dailyValueChange < 0 ? (
                                                    <span className="text-accent-red">{formatMoney(rival.dailyValueChange)}</span>
                                                ) : (
                                                    <span className="text-gray-500">-</span>
                                                )}
                                            </td>
                                            <td className="p-3 text-right font-mono text-accent-red">
                                                -{formatMoney(rival.compras)}
                                            </td>
                                            <td className="p-3 text-right font-mono text-neon-green">
                                                +{formatMoney(rival.ventas)}
                                            </td>
                                            <td className="p-3 text-right font-mono text-orange-400 hidden sm:table-cell">
                                                <button
                                                    onClick={() => showHistory(rival.name)}
                                                    className="hover:underline cursor-pointer"
                                                >
                                                    -{formatMoney(rival.clauseExpensesFirebase || 0)}
                                                </button>
                                            </td>
                                            <td className="p-3 text-right">
                                                <span className="font-bold text-neon-blue">{formatMoney(rival.saldoEstimado)}</span>
                                            </td>
                                            <td className="p-3">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-1">
                                                        <input
                                                            type="number"
                                                            placeholder="8000000"
                                                            value={clauseInputs[rival.name] || ''}
                                                            onChange={(e) => setClauseInputs(prev => ({ ...prev, [rival.name]: e.target.value }))}
                                                            className="w-20 px-2 py-1 text-xs bg-surface-dark border border-white/10 rounded text-white"
                                                        />
                                                        <input
                                                            type="text"
                                                            placeholder="Jugador..."
                                                            value={clauseDescriptions[rival.name] || ''}
                                                            onChange={(e) => setClauseDescriptions(prev => ({ ...prev, [rival.name]: e.target.value }))}
                                                            className="w-24 px-2 py-1 text-xs bg-surface-dark border border-white/10 rounded text-white"
                                                        />
                                                        <button
                                                            onClick={() => handleAddClauseExpense(rival.name)}
                                                            className="px-2 py-1 text-xs bg-orange-500/20 hover:bg-orange-500/40 text-orange-400 rounded transition-colors"
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                    <button
                                                        onClick={() => showHistory(rival.name)}
                                                        className="text-[10px] text-gray-500 hover:text-white transition-colors"
                                                    >
                                                        📜 Ver historial
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Manager Types Legend */}
                    <div className="glass-panel rounded-xl p-3 flex flex-wrap gap-4 text-xs">
                        <span className="text-gray-400">Tipos de Manager:</span>
                        <span className="flex items-center gap-1">
                            <span className="text-purple-500">🎯</span>
                            <span className="text-gray-300">Sniper</span>
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="text-orange-500">💸</span>
                            <span className="text-gray-300">Derrochador</span>
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="text-pink-500">🧈</span>
                            <span className="text-gray-300">Manos de Mantequilla</span>
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="text-blue-500">⚖️</span>
                            <span className="text-gray-300">Equilibrado</span>
                        </span>
                    </div>
                </div>
            )}

            {activeTab === 'market' && (
                <div className="space-y-6">
                    <div className="glass-panel rounded-xl p-4 border-l-4 border-neon-green">
                        <h3 className="font-bold text-white mb-1">💡 Algoritmo Moneyball</h3>
                        <p className="text-sm text-gray-400">
                            Analizamos el ratio Puntos/Precio de cada jugador:
                            🟢 GANGA (alto rendimiento, bajo precio) | 🔴 SOBREVALORADO (bajo rendimiento, alto precio)
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Gangas */}
                        <div className="glass-panel rounded-xl overflow-hidden">
                            <div className="p-4 border-b border-white/10 bg-neon-green/10">
                                <h3 className="font-bold text-white flex items-center gap-2">
                                    🟢 Gangas del Mercado
                                </h3>
                            </div>
                            <div className="divide-y divide-white/5 max-h-96 overflow-y-auto">
                                {rankedByValue.filter(p => p.label?.id === 'ganga').slice(0, 15).map((player, idx) => {
                                    const p = player.playerMaster || player
                                    return (
                                        <div key={p.id || idx} className="p-3 flex items-center gap-3">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-white text-sm truncate">{p.nickname || p.name}</p>
                                                <p className="text-xs text-gray-500">{p.team?.name} • {p.points} pts</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-neon-green text-sm">{formatMoney(p.marketValue)}</p>
                                                <p className="text-[10px] text-neon-green">{player.ratio?.toFixed(1)} pts/M€</p>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Sobrevalorados */}
                        <div className="glass-panel rounded-xl overflow-hidden">
                            <div className="p-4 border-b border-white/10 bg-accent-red/10">
                                <h3 className="font-bold text-white flex items-center gap-2">
                                    🔴 Sobrevalorados
                                </h3>
                            </div>
                            <div className="divide-y divide-white/5 max-h-96 overflow-y-auto">
                                {rankedByValue.filter(p => p.label?.id === 'sobrevalorado').slice(0, 15).map((player, idx) => {
                                    const p = player.playerMaster || player
                                    return (
                                        <div key={p.id || idx} className="p-3 flex items-center gap-3">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-white text-sm truncate">{p.nickname || p.name}</p>
                                                <p className="text-xs text-gray-500">{p.team?.name} • {p.points} pts</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-accent-red text-sm">{formatMoney(p.marketValue)}</p>
                                                <p className="text-[10px] text-accent-red">{player.ratio?.toFixed(1)} pts/M€</p>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'clauses' && (
                <div className="space-y-6">
                    <div className="glass-panel rounded-xl p-4 border-l-4 border-neon-pink">
                        <h3 className="font-bold text-white mb-1">💡 Francotirador de Cláusulas</h3>
                        <p className="text-sm text-gray-400">
                            Detectamos jugadores rivales con cláusulas bajas respecto a su valor de mercado.
                            💎 GANGA = Cláusula menos de 5% superior al valor.
                        </p>
                    </div>

                    {/* Oportunidades asequibles */}
                    <div className="glass-panel rounded-xl overflow-hidden">
                        <div className="p-4 border-b border-white/10">
                            <h3 className="font-bold text-white flex items-center gap-2">
                                <Target size={18} className="text-neon-pink" />
                                Oportunidades Asequibles
                                <span className="text-xs text-gray-500 ml-auto">Tu saldo: {formatMoney(myBalance)}</span>
                            </h3>
                        </div>
                        <div className="divide-y divide-white/5 max-h-96 overflow-y-auto">
                            {affordableOpportunities.map((opp, idx) => (
                                <div key={opp.playerId || idx} className="p-3 flex items-center gap-3">
                                    <span className="text-lg">{opp.type.emoji}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-white text-sm truncate">{opp.playerName}</p>
                                        <p className="text-xs text-gray-500">
                                            De: {opp.ownerName} • +{((opp.ratio - 1) * 100).toFixed(0)}% sobre valor
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-neon-pink text-sm">{formatMoney(opp.buyoutClause)}</p>
                                        <p className="text-[10px] text-gray-500">Valor: {formatMoney(opp.marketValue)}</p>
                                    </div>
                                </div>
                            ))}
                            {affordableOpportunities.length === 0 && (
                                <div className="p-6 text-center text-gray-500 text-sm">
                                    No hay oportunidades asequibles
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Manager Detail View Modal */}
            {historyModal?.type === 'SQUAD' && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="glass-panel rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-surface-dark">
                            <div>
                                <h3 className="font-bold text-white text-lg flex items-center gap-2">
                                    <Users size={20} className="text-neon-blue" />
                                    Plantilla: {historyModal.managerName}
                                </h3>
                                <p className="text-xs text-gray-400 mt-1">
                                    Análisis de rentabilidad y rendimiento de fichajes
                                </p>
                            </div>
                            <button
                                onClick={() => setHistoryModal(null)}
                                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="flex-1 overflow-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-surface-accent text-xs uppercase text-gray-500 sticky top-0 z-10">
                                    <tr>
                                        <th className="p-3 text-left bg-surface-accent">Jugador</th>
                                        <th className="p-3 text-right bg-surface-accent">Valor Mercado</th>
                                        <th className="p-3 text-center bg-surface-accent">Var. Hoy</th>
                                        <th className="p-3 text-right bg-surface-accent">Precio Compra</th>
                                        <th className="p-3 text-right bg-surface-accent">Beneficio</th>
                                        <th className="p-3 text-right bg-surface-accent">Cláusula</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {historyModal.players.map((player, idx) => {
                                        // Calculations
                                        const currentValue = player.marketValue || 0;
                                        // purchasedPlayers is now an Object, not a Map
                                        const purchasedPlayersObj = historyModal.managerObj?.purchasedPlayers || {};
                                        const purchasePrice = purchasedPlayersObj[player.id?.toString()] || 0;
                                        const profit = purchasePrice > 0 ? currentValue - purchasePrice : 0;
                                        const profitPercent = purchasePrice > 0 ? (profit / purchasePrice) * 100 : 0;

                                        // Daily change (from marketTrends)
                                        let dailyChange = 0;
                                        // Try to find daily change from marketTrends map
                                        const pName = player.nickname || player.name || ''
                                        for (const [key, marketData] of marketTrends.entries()) {
                                            if (key.toLowerCase().includes(pName.toLowerCase()) ||
                                                marketData.originalName.toLowerCase() === pName.toLowerCase()) {
                                                dailyChange = marketData.diferencia1 || 0;
                                                break;
                                            }
                                        }

                                        return (
                                            <tr key={player.id || idx} className="hover:bg-white/5">
                                                <td className="p-3">
                                                    <div className="flex items-center gap-3">
                                                        {/* Position dot */}
                                                        <div className={`w-2 h-2 rounded-full ${player.positionId === 1 ? 'bg-yellow-500' :
                                                            player.positionId === 2 ? 'bg-blue-500' :
                                                                player.positionId === 3 ? 'bg-green-500' : 'bg-red-500'
                                                            }`} />
                                                        <div>
                                                            <p className="font-medium text-white">{player.nickname || player.name}</p>
                                                            <p className="text-xs text-gray-500">{player.team?.name}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-3 text-right font-medium text-white">
                                                    {formatMoney(currentValue)}
                                                </td>
                                                <td className="p-3 text-center">
                                                    {dailyChange !== 0 ? (
                                                        <span className={`text-xs font-bold px-2 py-1 rounded bg-black/30 ${dailyChange > 0 ? 'text-neon-green' : 'text-accent-red'}`}>
                                                            {dailyChange > 0 ? '+' : ''}{formatMoney(dailyChange)}
                                                        </span>
                                                    ) : <span className="text-gray-600">-</span>}
                                                </td>
                                                <td className="p-3 text-right text-gray-400 font-mono text-xs">
                                                    {purchasePrice > 0 ? formatMoney(purchasePrice) : <span className="opacity-30">N/A</span>}
                                                </td>
                                                <td className="p-3 text-right font-medium">
                                                    {purchasePrice > 0 ? (
                                                        <div className="flex flex-col items-end">
                                                            <span className={profit >= 0 ? 'text-neon-green' : 'text-accent-red'}>
                                                                {profit > 0 ? '+' : ''}{formatMoney(profit)}
                                                            </span>
                                                            <span className={`text-[10px] ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                                {profit > 0 ? '▲' : '▼'} {Math.abs(profitPercent).toFixed(1)}%
                                                            </span>
                                                        </div>
                                                    ) : <span className="text-gray-600">-</span>}
                                                </td>
                                                <td className="p-3 text-right text-neon-pink font-mono">
                                                    {formatMoney(player.buyoutClause)}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* History Modal (Legacy / Clause History) */}
            {historyModal?.open && !historyModal.type && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="glass-panel rounded-xl max-w-lg w-full max-h-[80vh] overflow-hidden">
                        <div className="p-4 border-b border-white/10 flex justify-between items-center">
                            <h3 className="font-bold text-white flex items-center gap-2">
                                📜 Historial de Cláusulas - {historyModal.manager}
                            </h3>
                            <button
                                onClick={() => setHistoryModal({ open: false, manager: null, history: [] })}
                                className="text-gray-400 hover:text-white transition-colors"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="p-4 max-h-96 overflow-y-auto">
                            {historyModal.history.length === 0 ? (
                                <p className="text-center text-gray-500">Sin historial registrado</p>
                            ) : (
                                <table className="w-full text-sm">
                                    <thead className="text-xs uppercase text-gray-500">
                                        <tr>
                                            <th className="p-2 text-left">Fecha</th>
                                            <th className="p-2 text-left">Detalle</th>
                                            <th className="p-2 text-right">Cantidad</th>
                                            <th className="p-2 text-right">Total</th>
                                            <th className="p-2 w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {historyModal.history.map((entry, idx) => (
                                            <tr key={entry.id || idx} className="hover:bg-white/5 group">
                                                <td className="p-2 text-gray-400">
                                                    {new Date(entry.date).toLocaleDateString('es-ES', {
                                                        day: '2-digit',
                                                        month: 'short'
                                                    })}
                                                </td>
                                                <td className="p-2 text-white">
                                                    {entry.description || 'Subida cláusula'}
                                                </td>
                                                <td className="p-2 text-right text-orange-400 font-mono">
                                                    +{formatMoney(entry.amount)}
                                                </td>
                                                <td className="p-2 text-right text-gray-500 font-mono">
                                                    {formatMoney(entry.totalAfter)}
                                                </td>
                                                <td className="p-2 text-center">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            console.log('Delete clicked:', entry.id, entry.amount)
                                                            handleDeleteClauseEntry(entry.id, entry.amount)
                                                        }}
                                                        className="text-red-400 hover:text-red-300 hover:bg-red-500/20 px-2 py-1 rounded transition-all"
                                                        title="Eliminar"
                                                    >
                                                        🗑️
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                        <div className="p-4 border-t border-white/10 flex justify-between items-center">
                            <span className="text-sm text-gray-400">
                                Total: <span className="text-orange-400 font-bold">{formatMoney(firebaseData[historyModal.manager]?.clauseExpenses || 0)}</span>
                            </span>
                            <button
                                onClick={() => setHistoryModal({ open: false, manager: null, history: [] })}
                                className="px-4 py-2 bg-surface-accent hover:bg-white/10 rounded-lg text-white text-sm transition-colors"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
