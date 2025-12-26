/**
 * usePlayerAnalytics - Hook para estadísticas avanzadas de jugadores
 * 
 * Proporciona:
 * - Probabilidad de titularidad
 * - Rendimiento últimas 5 jornadas
 * - Comparativa vs media de posición
 * - Métricas Moneyball (IR, ISR, EPM)
 */

import { useState, useEffect, useMemo } from 'react'
import { fantasyAPI } from '../services/api'

/**
 * Calcula la probabilidad de titularidad basada en minutos jugados
 */
function calculateTitularityProbability(weeklyStats) {
    if (!weeklyStats || weeklyStats.length === 0) {
        return { percentage: 50, label: 'SIN DATOS', color: 'gray-400', confidence: 'BAJA' }
    }

    // Factor 1: Minutos jugados (peso 40%)
    const avgMinutes = weeklyStats.reduce((sum, w) => sum + (w.mins || 0), 0) / weeklyStats.length
    const minutesFactor = Math.min(avgMinutes / 90, 1)

    // Factor 2: Consistencia de titularidades (peso 30%)
    const starterCount = weeklyStats.filter(w => (w.mins || 0) >= 60).length
    const consistencyFactor = starterCount / weeklyStats.length

    // Factor 3: Estado físico inferido (peso 20%)
    let fitnessFactor = 1.0
    const lastMatch = weeklyStats[0]
    if (lastMatch?.mins === 0) fitnessFactor = 0.3
    else if (lastMatch?.mins < 45) fitnessFactor = 0.7

    // Factor 4: Tendencia reciente (peso 10%)
    const recentAvg = weeklyStats.slice(0, 2).reduce((s, w) => s + (w.mins || 0), 0) / 2
    const previousAvg = weeklyStats.slice(2, 4).reduce((s, w) => s + (w.mins || 0), 0) / 2 || 45
    const trendFactor = recentAvg > previousAvg ? 1.0 : recentAvg === previousAvg ? 0.8 : 0.6

    // Cálculo final
    const rawProbability =
        (minutesFactor * 0.40) +
        (consistencyFactor * 0.30) +
        (fitnessFactor * 0.20) +
        (trendFactor * 0.10)

    const percentage = Math.round(rawProbability * 100)
    const confidence = weeklyStats.length >= 5 ? 'ALTA' : weeklyStats.length >= 3 ? 'MEDIA' : 'BAJA'

    return {
        percentage,
        label: percentage >= 80 ? 'TITULAR SEGURO' :
            percentage >= 60 ? 'PROBABLE TITULAR' :
                percentage >= 40 ? 'ROTACIÓN' : 'SUPLENTE',
        color: percentage >= 80 ? 'neon-green' :
            percentage >= 60 ? 'yellow-400' :
                percentage >= 40 ? 'orange-400' : 'accent-red',
        confidence,
        factors: {
            minutes: Math.round(minutesFactor * 100),
            consistency: Math.round(consistencyFactor * 100),
            fitness: Math.round(fitnessFactor * 100),
            trend: Math.round(trendFactor * 100)
        }
    }
}

/**
 * Calcula el Índice de Regularidad (IR)
 * Mide cuán consistente es un jugador en sus puntuaciones
 */
function calculateRegularityIndex(weeklyStats) {
    if (!weeklyStats || weeklyStats.length < 3) {
        return { value: 50, label: 'SIN DATOS' }
    }

    const points = weeklyStats.map(w => w.totalPoints || 0).filter(p => p !== undefined)
    if (points.length === 0) return { value: 50, label: 'SIN DATOS' }

    const mean = points.reduce((a, b) => a + b, 0) / points.length
    if (mean === 0) return { value: 50, label: 'SIN PUNTOS' }

    const variance = points.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / points.length
    const stdDev = Math.sqrt(variance)
    const cv = stdDev / mean

    const regularityIndex = Math.max(0, Math.min(100, 100 - (cv * 100)))

    return {
        value: Math.round(regularityIndex),
        label: regularityIndex > 70 ? 'MUY REGULAR' :
            regularityIndex > 50 ? 'REGULAR' :
                regularityIndex > 30 ? 'IRREGULAR' : 'MUY EXPLOSIVO',
        recommendation: regularityIndex > 60
            ? 'Ideal para base del equipo'
            : 'Usar en jornadas específicas'
    }
}

/**
 * Calcula Eficiencia por Minuto (EPM)
 * Puntos generados por cada 90 minutos jugados
 */
function calculateEfficiencyPerMinute(weeklyStats) {
    if (!weeklyStats || weeklyStats.length === 0) {
        return { value: 0, label: 'SIN DATOS' }
    }

    const totalPoints = weeklyStats.reduce((s, w) => s + (w.totalPoints || 0), 0)
    const totalMinutes = weeklyStats.reduce((s, w) => s + (w.mins || 0), 0)

    if (totalMinutes === 0) return { value: 0, label: 'SIN MINUTOS' }

    const epm = (totalPoints / totalMinutes) * 90

    return {
        value: parseFloat(epm.toFixed(2)),
        label: epm > 8 ? 'SUPER EFICIENTE' :
            epm > 5 ? 'EFICIENTE' :
                epm > 3 ? 'NORMAL' : 'POCO EFICIENTE',
        color: epm > 8 ? 'neon-green' :
            epm > 5 ? 'yellow-400' :
                epm > 3 ? 'gray-400' : 'accent-red'
    }
}

/**
 * Hook principal para analíticas de jugador
 */
export function usePlayerAnalytics(player, weeklyStats = []) {
    const analytics = useMemo(() => {
        if (!player) return null

        // Si no hay stats semanales, intentar extraerlas del jugador
        const stats = weeklyStats.length > 0 ? weeklyStats :
            (player.playerStats || player.weekStats || [])

        // Calcular todas las métricas
        const titularity = calculateTitularityProbability(stats.slice(0, 5))
        const regularityIndex = calculateRegularityIndex(stats)
        const efficiency = calculateEfficiencyPerMinute(stats)

        // Rendimiento reciente (últimas 5 jornadas)
        const recentPerformance = stats.slice(0, 5).map(w => ({
            week: w.weekNumber || w.week,
            points: w.totalPoints || w.points || 0,
            minutes: w.mins || w.minutes || 0,
            goals: w.goals || 0,
            assists: w.assists || 0,
            yellowCards: w.yellowCards || 0,
            redCards: w.redCards || 0
        }))

        // Promedio de puntos
        const avgPoints = recentPerformance.length > 0
            ? recentPerformance.reduce((s, w) => s + w.points, 0) / recentPerformance.length
            : 0

        return {
            titularity,
            regularityIndex,
            efficiency,
            recentPerformance,
            avgPoints: parseFloat(avgPoints.toFixed(1)),
            totalMatches: stats.length,
            hasData: stats.length > 0
        }
    }, [player, weeklyStats])

    return analytics
}

/**
 * Calcula la comparativa de un jugador vs la media de su posición
 */
export function usePositionComparison(player, allPlayers = []) {
    return useMemo(() => {
        if (!player || !allPlayers.length) return null

        const position = player.positionId || player.position
        const samePosition = allPlayers.filter(p =>
            (p.positionId || p.position) === position
        )

        if (samePosition.length === 0) return null

        const avgPoints = samePosition.reduce((s, p) => s + (p.points || 0), 0) / samePosition.length
        const avgValue = samePosition.reduce((s, p) => s + (p.marketValue || 0), 0) / samePosition.length

        const playerPoints = player.points || 0
        const playerValue = player.marketValue || 0

        const pointsRatio = avgPoints > 0 ? playerPoints / avgPoints : 1
        const valueRatio = avgValue > 0 ? playerValue / avgValue : 1

        // Ranking en su posición
        const sortedByPoints = [...samePosition].sort((a, b) => (b.points || 0) - (a.points || 0))
        const rankInPosition = sortedByPoints.findIndex(p => p.id === player.id) + 1

        return {
            position,
            positionCount: samePosition.length,
            avgPoints: parseFloat(avgPoints.toFixed(1)),
            avgValue: Math.round(avgValue),
            playerPoints,
            playerValue,
            pointsRatio: parseFloat(pointsRatio.toFixed(2)),
            valueRatio: parseFloat(valueRatio.toFixed(2)),
            rankInPosition,
            isAboveAverage: pointsRatio > 1,
            label: pointsRatio >= 1.3 ? 'TOP TIER' :
                pointsRatio >= 1.0 ? 'SOBRE MEDIA' :
                    pointsRatio >= 0.7 ? 'EN MEDIA' : 'BAJO MEDIA'
        }
    }, [player, allPlayers])
}

export default {
    usePlayerAnalytics,
    usePositionComparison,
    calculateTitularityProbability,
    calculateRegularityIndex,
    calculateEfficiencyPerMinute
}
