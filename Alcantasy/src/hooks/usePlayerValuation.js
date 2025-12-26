/**
 * usePlayerValuation - Algoritmo Moneyball de Valoración
 * 
 * Clasifica jugadores según su rendimiento vs precio:
 * 🟢 GANGA - Bajo precio, alto rendimiento
 * 🔴 SOBREVALORADO - Alto precio, bajo rendimiento
 * 💰 ESPECULACIÓN - Subida rápida de valor
 */

import { useMemo } from 'react'

// Constantes de clasificación
const GANGA_THRESHOLD = 1.5      // Ratio pts/precio 50% superior a la media
const SOBREVALORADO_THRESHOLD = 0.6  // Ratio 40% inferior a la media
const ESPECULACION_SUBIDA = 0.15     // Subida de valor > 15%

/**
 * Etiquetas de clasificación
 */
export const PLAYER_LABELS = {
    GANGA: { id: 'ganga', emoji: '🟢', text: 'GANGA', color: 'text-neon-green', bg: 'bg-neon-green/20' },
    SOBREVALORADO: { id: 'sobrevalorado', emoji: '🔴', text: 'SOBREVALORADO', color: 'text-accent-red', bg: 'bg-accent-red/20' },
    ESPECULACION: { id: 'especulacion', emoji: '💰', text: 'ESPECULACIÓN', color: 'text-yellow-400', bg: 'bg-yellow-400/20' },
    EN_FORMA: { id: 'en_forma', emoji: '🔥', text: 'EN FORMA', color: 'text-neon-pink', bg: 'bg-neon-pink/20' },
    EN_BAJA: { id: 'en_baja', emoji: '📉', text: 'EN BAJA', color: 'text-gray-400', bg: 'bg-gray-400/20' },
    NEUTRAL: { id: 'neutral', emoji: '', text: '', color: '', bg: '' }
}

/**
 * Hook para valoración avanzada de jugadores
 * @param {Array} players - Lista de jugadores con stats
 * @param {Object} trendsData - Datos de tendencias del mercado (opcional)
 */
export function usePlayerValuation(players = [], trendsData = null) {

    /**
     * Calcular estadísticas base de todos los jugadores
     */
    const baseStats = useMemo(() => {
        if (!players?.length) return { avgRatio: 0, avgPoints: 0, avgValue: 0 }

        const validPlayers = players.filter(p => {
            const value = p.marketValue || p.playerMaster?.marketValue || 0
            const points = p.points || p.playerMaster?.points || 0
            return value > 0 && points > 0
        })

        if (validPlayers.length === 0) return { avgRatio: 0, avgPoints: 0, avgValue: 0 }

        const totalRatio = validPlayers.reduce((sum, p) => {
            const value = p.marketValue || p.playerMaster?.marketValue || 1
            const points = p.points || p.playerMaster?.points || 0
            return sum + (points / (value / 1000000)) // Puntos por millón
        }, 0)

        const avgPoints = validPlayers.reduce((sum, p) =>
            sum + (p.points || p.playerMaster?.points || 0), 0) / validPlayers.length

        const avgValue = validPlayers.reduce((sum, p) =>
            sum + (p.marketValue || p.playerMaster?.marketValue || 0), 0) / validPlayers.length

        return {
            avgRatio: totalRatio / validPlayers.length,
            avgPoints,
            avgValue,
            count: validPlayers.length
        }
    }, [players])

    /**
     * Calcular momentum de un jugador (rendimiento reciente vs histórico)
     */
    const calculateMomentum = (player) => {
        // Puntos últimos 3 partidos (si disponible)
        const recentPoints = player.lastPoints || player.weekPoints || []
        const last3 = Array.isArray(recentPoints) ? recentPoints.slice(-3) : []

        const avgRecent = last3.length > 0
            ? last3.reduce((sum, p) => sum + (p || 0), 0) / last3.length
            : null

        const avgTotal = player.averagePoints ||
            (player.points && player.gamesPlayed ? player.points / player.gamesPlayed : null)

        if (avgRecent === null || avgTotal === null || avgTotal === 0) {
            return { momentum: 0, trend: 'NEUTRAL' }
        }

        const momentum = (avgRecent - avgTotal) / avgTotal // % de cambio

        let trend = 'NEUTRAL'
        if (momentum > 0.2) trend = 'UP_STRONG'
        else if (momentum > 0.1) trend = 'UP'
        else if (momentum < -0.2) trend = 'DOWN_STRONG'
        else if (momentum < -0.1) trend = 'DOWN'

        return { momentum, trend, avgRecent, avgTotal }
    }

    /**
     * Obtener etiqueta de valoración para un jugador
     */
    const getPlayerLabel = useMemo(() => (player) => {
        if (!player || !baseStats.avgRatio) return PLAYER_LABELS.NEUTRAL

        const value = player.marketValue || player.playerMaster?.marketValue || 0
        const points = player.points || player.playerMaster?.points || 0

        if (value === 0) return PLAYER_LABELS.NEUTRAL

        // Ratio puntos por millón
        const ratio = points / (value / 1000000)
        const ratioVsAvg = ratio / baseStats.avgRatio

        // Datos de tendencia de mercado (subida/bajada de precio)
        const trendData = trendsData?.getPlayerMarketTrend?.(
            player.nickname || player.playerMaster?.nickname,
            player.positionId || player.playerMaster?.positionId,
            player.team?.name || player.playerMaster?.team?.name
        )

        // Calcular momentum
        const { momentum, trend } = calculateMomentum(player)

        // Lógica de clasificación

        // 1. ESPECULACIÓN: Subida rápida de precio
        if (trendData?.diferencia1 && trendData.diferencia1 > value * ESPECULACION_SUBIDA) {
            return PLAYER_LABELS.ESPECULACION
        }

        // 2. GANGA: Alto rendimiento, bajo precio
        if (ratioVsAvg >= GANGA_THRESHOLD && value < baseStats.avgValue) {
            return PLAYER_LABELS.GANGA
        }

        // 3. SOBREVALORADO: Bajo rendimiento, alto precio
        if (ratioVsAvg <= SOBREVALORADO_THRESHOLD && value > baseStats.avgValue) {
            return PLAYER_LABELS.SOBREVALORADO
        }

        // 4. EN FORMA: Momentum positivo fuerte
        if (trend === 'UP_STRONG' || trend === 'UP') {
            return PLAYER_LABELS.EN_FORMA
        }

        // 5. EN BAJA: Momentum negativo fuerte
        if (trend === 'DOWN_STRONG' || trend === 'DOWN') {
            return PLAYER_LABELS.EN_BAJA
        }

        return PLAYER_LABELS.NEUTRAL
    }, [baseStats, trendsData])

    /**
     * Ranking de jugadores por valor (mejor relación calidad/precio)
     */
    const rankedByValue = useMemo(() => {
        return players
            .map(player => {
                const value = player.marketValue || player.playerMaster?.marketValue || 0
                const points = player.points || player.playerMaster?.points || 0
                const ratio = value > 0 ? points / (value / 1000000) : 0
                const label = getPlayerLabel(player)
                const { momentum, trend } = calculateMomentum(player)

                return {
                    ...player,
                    ratio,
                    ratioVsAvg: baseStats.avgRatio > 0 ? ratio / baseStats.avgRatio : 0,
                    label,
                    momentum,
                    trend
                }
            })
            .sort((a, b) => b.ratio - a.ratio)
    }, [players, baseStats, getPlayerLabel])

    /**
     * Obtener top gangas
     */
    const topGangas = useMemo(() => {
        return rankedByValue
            .filter(p => p.label.id === 'ganga')
            .slice(0, 10)
    }, [rankedByValue])

    /**
     * Obtener sobrevalorados
     */
    const topSobrevalorados = useMemo(() => {
        return rankedByValue
            .filter(p => p.label.id === 'sobrevalorado')
            .slice(0, 10)
    }, [rankedByValue])

    /**
     * Obtener especulaciones
     */
    const topEspeculaciones = useMemo(() => {
        return rankedByValue
            .filter(p => p.label.id === 'especulacion')
            .slice(0, 10)
    }, [rankedByValue])

    return {
        getPlayerLabel,
        rankedByValue,
        topGangas,
        topSobrevalorados,
        topEspeculaciones,
        baseStats,
        PLAYER_LABELS
    }
}

export default usePlayerValuation
