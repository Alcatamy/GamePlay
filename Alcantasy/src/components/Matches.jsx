import { useState, useEffect, useMemo } from 'react'
import { fantasyAPI } from '../services/api'
import toast from 'react-hot-toast'
import { RefreshCw, Calendar, Clock, Trophy, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'

export default function Matches() {
    const [loading, setLoading] = useState(true)
    const [currentWeek, setCurrentWeek] = useState(null)
    const [matches, setMatches] = useState([])
    const [selectedWeek, setSelectedWeek] = useState(null)

    useEffect(() => {
        loadCurrentWeek()
    }, [])

    useEffect(() => {
        if (selectedWeek) {
            loadMatches(selectedWeek)
        }
    }, [selectedWeek])

    const loadCurrentWeek = async () => {
        try {
            const data = await fantasyAPI.getCurrentWeek()
            const weekNumber = data?.weekNumber || data?.week || data?.data?.weekNumber || data?.data?.week || 17
            setCurrentWeek({ weekNumber })
            setSelectedWeek(weekNumber)
        } catch (err) {
            toast.error('Error al cargar jornada')
            setSelectedWeek(17)
        }
    }

    const loadMatches = async (weekNumber) => {
        setLoading(true)
        try {
            const data = await fantasyAPI.getMatchday(weekNumber)
            let matchesData = []
            if (Array.isArray(data)) matchesData = data
            else if (data?.matches) matchesData = data.matches
            else if (data?.data) matchesData = data.data
            else if (data?.elements) matchesData = data.elements
            setMatches(matchesData)
        } catch (err) {
            console.error('Error loading matches:', err)
            setMatches([])
        } finally {
            setLoading(false)
        }
    }

    const formatMatchDate = (dateStr) => {
        if (!dateStr) return ''
        try {
            const date = new Date(dateStr)
            return date.toLocaleDateString('es-ES', {
                weekday: 'short',
                day: 'numeric',
                month: 'short'
            })
        } catch {
            return dateStr
        }
    }

    const formatMatchTime = (dateStr) => {
        if (!dateStr) return ''
        try {
            const date = new Date(dateStr)
            return date.toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit'
            })
        } catch {
            return ''
        }
    }

    const getHomeTeam = (match) => {
        return match.homeTeam || match.home || match.local || { name: match.homeTeamName || 'Local' }
    }

    const getAwayTeam = (match) => {
        return match.awayTeam || match.away || match.visitor || { name: match.awayTeamName || 'Visitante' }
    }

    const getMatchDate = (match) => {
        return match.date || match.matchDate || match.startDate
    }

    // Find next match for countdown
    const nextMatch = useMemo(() => {
        if (!matches.length) return null
        const now = new Date()
        const upcoming = matches.filter(m => {
            const matchDate = new Date(getMatchDate(m))
            return matchDate > now && m.matchState < 7
        }).sort((a, b) => new Date(getMatchDate(a)) - new Date(getMatchDate(b)))
        return upcoming[0] || null
    }, [matches])

    const getCountdown = (dateStr) => {
        if (!dateStr) return null
        const now = new Date()
        const matchDate = new Date(dateStr)
        const diff = matchDate - now
        if (diff <= 0) return 'Ahora'
        const hours = Math.floor(diff / (1000 * 60 * 60))
        if (hours >= 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`
        return `${hours}h`
    }

    const handlePrevWeek = () => selectedWeek > 1 && setSelectedWeek(selectedWeek - 1)
    const handleNextWeek = () => selectedWeek < 38 && setSelectedWeek(selectedWeek + 1)

    const isCurrentWeek = selectedWeek === currentWeek?.weekNumber

    return (
        <div className="max-w-7xl mx-auto px-4 py-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
                        <Calendar className="text-primary" />
                        Jornadas
                    </h1>
                    <p className="text-gray-400 text-sm mt-1">
                        {currentWeek ? `Jornada actual: ${currentWeek.weekNumber}` : 'Calendario de partidos'}
                    </p>
                </div>
                <button
                    onClick={() => selectedWeek && loadMatches(selectedWeek)}
                    className="p-3 rounded-full bg-surface-accent hover:bg-white/10 text-gray-400 hover:text-primary transition-colors"
                >
                    <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* 🔥 ENHANCED WEEK SELECTOR with arrows */}
            <div className="glass-panel rounded-xl p-4 mb-6 border border-white/10">
                <div className="flex items-center justify-between gap-4">
                    <button onClick={handlePrevWeek} disabled={selectedWeek <= 1}
                        className="p-2 rounded-lg bg-surface-accent hover:bg-white/10 text-gray-400 hover:text-primary disabled:opacity-30 transition-colors">
                        <ChevronLeft size={20} />
                    </button>
                    <div className="text-center flex-1">
                        <p className="text-2xl font-bold text-white">Jornada {selectedWeek}</p>
                        <div className="flex items-center justify-center gap-2 mt-1">
                            {isCurrentWeek && (
                                <span className="text-xs px-2 py-0.5 bg-primary/20 text-primary rounded-full">Actual</span>
                            )}
                            <span className="text-xs text-gray-500">{matches.length} partidos</span>
                        </div>
                    </div>
                    <button onClick={handleNextWeek} disabled={selectedWeek >= 38}
                        className="p-2 rounded-lg bg-surface-accent hover:bg-white/10 text-gray-400 hover:text-primary disabled:opacity-30 transition-colors">
                        <ChevronRight size={20} />
                    </button>
                </div>

                {/* Next Match Countdown */}
                {isCurrentWeek && nextMatch && (
                    <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-center gap-4">
                        <AlertCircle size={16} className="text-yellow-400" />
                        <span className="text-sm text-gray-300">
                            Próximo: <span className="text-white font-medium">{getHomeTeam(nextMatch).name} vs {getAwayTeam(nextMatch).name}</span>
                            <span className="text-yellow-400 ml-2">en {getCountdown(getMatchDate(nextMatch))}</span>
                        </span>
                    </div>
                )}
            </div>

            {/* Quick Week Selector Pills */}
            <div className="mb-6 overflow-x-auto hide-scrollbar -mx-4 px-4">
                <div className="flex gap-2">
                    {Array.from({ length: 38 }, (_, i) => i + 1).map(week => (
                        <button
                            key={week}
                            onClick={() => setSelectedWeek(week)}
                            className={`flex-shrink-0 w-10 h-10 rounded-full text-sm font-medium transition-all ${selectedWeek === week
                                ? 'bg-primary text-black'
                                : week === currentWeek?.weekNumber
                                    ? 'bg-primary/20 text-primary border border-primary'
                                    : 'bg-surface-dark text-gray-400 hover:text-white hover:bg-white/10'
                                }`}
                        >
                            {week}
                        </button>
                    ))}
                </div>
            </div>

            {/* Matches */}
            {loading ? (
                <div className="flex items-center justify-center min-h-[40vh]">
                    <RefreshCw size={32} className="text-primary animate-spin" />
                </div>
            ) : matches.length > 0 ? (
                <div className="space-y-4">
                    {matches.map((match, idx) => {
                        const homeTeam = getHomeTeam(match)
                        const awayTeam = getAwayTeam(match)
                        const matchDate = getMatchDate(match)
                        const hasScore = match.homeScore !== undefined || match.finished

                        return (
                            <div
                                key={match.id || idx}
                                className="glass-panel rounded-xl p-4 hover:border-primary/30 transition-all"
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                        <Calendar size={12} />
                                        <span>{formatMatchDate(matchDate)}</span>
                                        <Clock size={12} className="ml-2" />
                                        <span>{formatMatchTime(matchDate)}</span>
                                    </div>
                                    {match.matchState >= 7 && (
                                        <span className="text-xs text-neon-green font-medium">Finalizado</span>
                                    )}
                                </div>

                                <div className="flex items-center justify-center gap-4">
                                    {/* Home Team */}
                                    <div className="flex-1 flex items-center justify-end gap-3">
                                        <div className="text-right">
                                            <p className="font-bold text-white">{homeTeam.name || homeTeam.shortName || 'Local'}</p>
                                        </div>
                                        <div className="w-10 h-10 rounded-full bg-surface-accent flex items-center justify-center overflow-hidden">
                                            {homeTeam.badge || homeTeam.badgeColor ? (
                                                <img src={homeTeam.badge || homeTeam.badgeColor} alt="" className="w-8 h-8 object-contain" />
                                            ) : (
                                                <span className="text-sm font-bold text-gray-400">{(homeTeam.name || 'L')[0]}</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Score */}
                                    <div className="flex items-center justify-center min-w-[80px]">
                                        {hasScore ? (
                                            <div className="flex items-center gap-2">
                                                <span className="text-2xl font-bold text-white">{match.homeScore ?? '-'}</span>
                                                <span className="text-gray-500">-</span>
                                                <span className="text-2xl font-bold text-white">{match.awayScore ?? '-'}</span>
                                            </div>
                                        ) : (
                                            <span className="text-lg text-gray-500 font-medium">vs</span>
                                        )}
                                    </div>

                                    {/* Away Team */}
                                    <div className="flex-1 flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-surface-accent flex items-center justify-center overflow-hidden">
                                            {awayTeam.badge || awayTeam.badgeColor ? (
                                                <img src={awayTeam.badge || awayTeam.badgeColor} alt="" className="w-8 h-8 object-contain" />
                                            ) : (
                                                <span className="text-sm font-bold text-gray-400">{(awayTeam.name || 'V')[0]}</span>
                                            )}
                                        </div>
                                        <div className="text-left">
                                            <p className="font-bold text-white">{awayTeam.name || awayTeam.shortName || 'Visitante'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            ) : (
                <div className="glass-panel rounded-xl p-8 text-center">
                    <Calendar size={48} className="text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">No hay partidos para esta jornada</p>
                </div>
            )}
        </div>
    )
}
