/**
 * useManagerIntelligence - Hook para análisis avanzado de managers
 * 
 * Proporciona:
 * - Overbid Index (índice de sobrepago)
 * - Clasificación de manager
 * - Mapa de necesidades
 * - Patrones de comportamiento
 */

import { useMemo } from 'react'

// Tipos de clasificación de manager
export const MANAGER_TYPES = {
    SNIPER: {
        id: 'SNIPER',
        label: 'Francotirador',
        emoji: '🎯',
        color: 'purple-500',
        description: 'Compra por debajo del mercado con alta precisión'
    },
    DERROCHADOR: {
        id: 'DERROCHADOR',
        label: 'Derrochador',
        emoji: '💸',
        color: 'orange-500',
        description: 'Tiende a sobrepagar sistemáticamente'
    },
    MANOS_MANTEQUILLA: {
        id: 'MANOS_MANTEQUILLA',
        label: 'Manos de Mantequilla',
        emoji: '🧈',
        color: 'pink-500',
        description: 'Vende con pérdidas frecuentemente'
    },
    EQUILIBRADO: {
        id: 'EQUILIBRADO',
        label: 'Equilibrado',
        emoji: '⚖️',
        color: 'blue-500',
        description: 'Estrategia balanceada de compra/venta'
    }
}

/**
 * Calcula el Overbid Index de un manager
 * Rango: 0-100 (0=siempre compra por debajo, 100=siempre sobrepaga)
 */
function calculateOverbidIndex(operations, ranking) {
    // Filtrar solo compras
    const purchases = operations.filter(op =>
        op.activityTypeId === 1 || // COMPRA_MANAGER
        op.activityTypeId === 31 || // FICHAJE_MERCADO
        op.activityTypeId === 3     // CLAUSULA_PAGADA
    )

    if (purchases.length === 0) return { value: 50, label: 'SIN DATOS' }

    let overbidSum = 0
    let validCount = 0

    purchases.forEach(op => {
        const amount = op.amount || 0
        const marketValue = op.playerMarketValue || op.marketValueAtTime || amount

        if (marketValue > 0) {
            const overbidPercent = ((amount - marketValue) / marketValue) * 100
            // Clamp entre -50% y +50%
            overbidSum += Math.max(-50, Math.min(50, overbidPercent))
            validCount++
        }
    })

    if (validCount === 0) return { value: 50, label: 'SIN DATOS' }

    const avgOverbid = overbidSum / validCount
    const normalizedIndex = Math.round(50 + avgOverbid)

    return {
        value: Math.max(0, Math.min(100, normalizedIndex)),
        avgOverbidPercent: parseFloat(avgOverbid.toFixed(1)),
        totalPurchases: purchases.length,
        label: normalizedIndex < 35 ? 'COMPRADOR ASTUTO' :
            normalizedIndex < 55 ? 'EQUILIBRADO' :
                normalizedIndex < 75 ? 'TIENDE A SOBREPAGAR' : 'DERROCHADOR',
        color: normalizedIndex < 35 ? 'neon-green' :
            normalizedIndex < 55 ? 'blue-400' :
                normalizedIndex < 75 ? 'orange-400' : 'accent-red'
    }
}

/**
 * Calcula el ROI (Realizado + Latente) de un manager
 */
function calculateManagerROI(operations, currentPatrimony, initialBudget = 103_000_000) {
    const purchases = operations.filter(op =>
        op.activityTypeId === 1 || op.activityTypeId === 31 || op.activityTypeId === 3
    )
    const sales = operations.filter(op =>
        op.activityTypeId === 2 || op.activityTypeId === 33 || op.activityTypeId === 4
    )

    const totalPurchased = purchases.reduce((s, op) => s + (op.amount || 0), 0)
    const totalSold = sales.reduce((s, op) => s + (op.amount || 0), 0)

    // ROI Realizado (de operaciones cerradas)
    const realizedPL = totalSold - (totalPurchased * (totalSold / Math.max(totalPurchased, 1)))
    const roiRealized = totalPurchased > 0 ? (realizedPL / totalPurchased) * 100 : 0

    // ROI Latente (valor actual vs inversión restante)
    const unrealizedInvestment = totalPurchased - totalSold
    const roiLatent = unrealizedInvestment > 0
        ? ((currentPatrimony - unrealizedInvestment) / unrealizedInvestment) * 100
        : 0

    // ROI Total ponderado
    const roiTotal = (roiRealized * 0.4) + (roiLatent * 0.6)

    return {
        realized: parseFloat(roiRealized.toFixed(1)),
        latent: parseFloat(roiLatent.toFixed(1)),
        total: parseFloat(roiTotal.toFixed(1)),
        label: roiTotal > 30 ? 'EXCELENTE' :
            roiTotal > 10 ? 'BUENO' :
                roiTotal > 0 ? 'POSITIVO' :
                    roiTotal > -20 ? 'NEGATIVO' : 'CRÍTICO',
        color: roiTotal > 30 ? 'neon-green' :
            roiTotal > 10 ? 'green-400' :
                roiTotal > 0 ? 'yellow-400' :
                    roiTotal > -20 ? 'orange-400' : 'accent-red'
    }
}

/**
 * Calcula el Spread de inversión por posición
 */
function calculateSpreadByPosition(operations) {
    const purchases = operations.filter(op =>
        op.activityTypeId === 1 || op.activityTypeId === 31 || op.activityTypeId === 3
    )

    if (purchases.length === 0) {
        return { PT: 25, DF: 25, MC: 25, DL: 25 }
    }

    const byPosition = { 1: 0, 2: 0, 3: 0, 4: 0 } // 1=PT, 2=DF, 3=MC, 4=DL
    let totalInvested = 0

    purchases.forEach(op => {
        const posId = op.playerPositionId || op.positionId || 3
        const amount = op.amount || 0
        byPosition[posId] = (byPosition[posId] || 0) + amount
        totalInvested += amount
    })

    if (totalInvested === 0) {
        return { PT: 25, DF: 25, MC: 25, DL: 25 }
    }

    return {
        PT: Math.round((byPosition[1] / totalInvested) * 100),
        DF: Math.round((byPosition[2] / totalInvested) * 100),
        MC: Math.round((byPosition[3] / totalInvested) * 100),
        DL: Math.round((byPosition[4] / totalInvested) * 100)
    }
}

/**
 * Clasifica al manager según su comportamiento
 */
function classifyManager(overbidIndex, roi, panicSellRate) {
    // SNIPER: ROI alto + Overbid bajo
    if (roi.total > 20 && overbidIndex.value < 35) {
        return MANAGER_TYPES.SNIPER
    }

    // DERROCHADOR: Overbid alto + ROI negativo
    if (overbidIndex.value > 65 && roi.total < 0) {
        return MANAGER_TYPES.DERROCHADOR
    }

    // MANOS DE MANTEQUILLA: Muchas ventas con pérdida
    if (panicSellRate > 50) {
        return MANAGER_TYPES.MANOS_MANTEQUILLA
    }

    return MANAGER_TYPES.EQUILIBRADO
}

/**
 * Calcula el mapa de necesidades del manager
 */
function calculateNeedsMap(teamPlayers = []) {
    const IDEAL = { 1: 2, 2: 5, 3: 5, 4: 4 } // PT, DF, MC, DL
    const byPosition = { 1: [], 2: [], 3: [], 4: [] }

    teamPlayers.forEach(p => {
        const pos = p.positionId || p.position || 3
        if (byPosition[pos]) {
            byPosition[pos].push(p)
        }
    })

    const needs = {}
    const posLabels = { 1: 'PT', 2: 'DF', 3: 'MC', 4: 'DL' }

    for (const posId of [1, 2, 3, 4]) {
        const players = byPosition[posId]
        const count = players.length
        const ideal = IDEAL[posId]
        const ratio = count / ideal

        needs[posLabels[posId]] = {
            count,
            ideal,
            level: ratio >= 0.8 ? 'CUBIERTA' :
                ratio >= 0.5 ? 'REFUERZO_OPCIONAL' : 'NECESIDAD_URGENTE',
            color: ratio >= 0.8 ? 'neon-green' :
                ratio >= 0.5 ? 'yellow-400' : 'accent-red'
        }
    }

    return needs
}

/**
 * Hook principal para inteligencia de manager
 */
export function useManagerIntelligence(manager, operations = [], ranking = [], teamPlayers = []) {
    return useMemo(() => {
        if (!manager) return null

        const patrimony = manager.teamValue || manager.patrimony || 0
        const initialBudget = manager.initialBudget || 103_000_000

        // Calcular métricas
        const overbidIndex = calculateOverbidIndex(operations, ranking)
        const roi = calculateManagerROI(operations, patrimony, initialBudget)
        const spread = calculateSpreadByPosition(operations)
        const needsMap = calculateNeedsMap(teamPlayers)

        // Calcular tasa de ventas con pérdida
        const sales = operations.filter(op => op.activityTypeId === 2 || op.activityTypeId === 33)
        const salesWithLoss = sales.filter(op => (op.profitLoss || 0) < 0).length
        const panicSellRate = sales.length > 0 ? (salesWithLoss / sales.length) * 100 : 0

        // Clasificar manager
        const classification = classifyManager(overbidIndex, roi, panicSellRate)

        return {
            overbidIndex,
            roi,
            spread,
            needsMap,
            classification,
            panicSellRate: parseFloat(panicSellRate.toFixed(1)),
            totalOperations: operations.length,
            patrimony
        }
    }, [manager, operations, ranking, teamPlayers])
}

export default {
    useManagerIntelligence,
    calculateOverbidIndex,
    calculateManagerROI,
    calculateSpreadByPosition,
    MANAGER_TYPES
}
