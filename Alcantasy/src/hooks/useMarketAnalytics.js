/**
 * useMarketAnalytics - Hook para análisis avanzado del mercado
 * 
 * Proporciona:
 * - Top Deals (mejores negocios realizados)
 * - Worst Deals (peores operaciones)
 * - Trending Players (subidas/bajadas de hoy)
 * - Volume analytics (actividad del mercado)
 */

import { useMemo } from 'react'

/**
 * Analiza operaciones para encontrar los mejores y peores negocios
 */
export function useMarketAnalytics(activity = [], market = [], ranking = []) {

    /**
     * Top Deals - Mejores operaciones (ventas con mayor beneficio)
     */
    const topDeals = useMemo(() => {
        if (!activity || activity.length === 0) return []

        // Buscar ventas (types 2 y 33)
        const sales = activity.filter(op =>
            op.activityTypeId === 2 || op.activityTypeId === 33
        )

        // Calcular beneficio estimado (comparar con compras anteriores del mismo jugador)
        const purchases = activity.filter(op =>
            op.activityTypeId === 1 || op.activityTypeId === 31 || op.activityTypeId === 3
        )

        const deals = sales.map(sale => {
            const playerId = sale.player?.id || sale.playerId
            const playerName = sale.player?.nickname || sale.playerName || 'Jugador'
            const saleAmount = sale.amount || 0

            // Buscar compra original
            const purchase = purchases.find(p =>
                (p.player?.id || p.playerId) === playerId &&
                new Date(p.date) < new Date(sale.date)
            )

            const purchaseAmount = purchase?.amount || saleAmount * 0.7 // Estimar si no hay dato
            const profit = saleAmount - purchaseAmount
            const roi = purchaseAmount > 0 ? (profit / purchaseAmount) * 100 : 0

            return {
                playerId,
                playerName,
                managerName: sale.user1?.managerName || sale.managerName || 'Manager',
                purchasePrice: purchaseAmount,
                salePrice: saleAmount,
                profit,
                roi,
                date: sale.date,
                position: sale.player?.positionId
            }
        })
            .filter(d => d.profit > 0)
            .sort((a, b) => b.profit - a.profit)
            .slice(0, 10)

        return deals
    }, [activity])

    /**
     * Worst Deals - Peores operaciones (ventas con mayor pérdida)
     */
    const worstDeals = useMemo(() => {
        if (!activity || activity.length === 0) return []

        const sales = activity.filter(op =>
            op.activityTypeId === 2 || op.activityTypeId === 33
        )

        const purchases = activity.filter(op =>
            op.activityTypeId === 1 || op.activityTypeId === 31 || op.activityTypeId === 3
        )

        const deals = sales.map(sale => {
            const playerId = sale.player?.id || sale.playerId
            const playerName = sale.player?.nickname || sale.playerName || 'Jugador'
            const saleAmount = sale.amount || 0

            const purchase = purchases.find(p =>
                (p.player?.id || p.playerId) === playerId &&
                new Date(p.date) < new Date(sale.date)
            )

            const purchaseAmount = purchase?.amount || saleAmount * 1.3
            const profit = saleAmount - purchaseAmount
            const roi = purchaseAmount > 0 ? (profit / purchaseAmount) * 100 : 0

            return {
                playerId,
                playerName,
                managerName: sale.user1?.managerName || sale.managerName || 'Manager',
                purchasePrice: purchaseAmount,
                salePrice: saleAmount,
                profit,
                roi,
                date: sale.date,
                position: sale.player?.positionId
            }
        })
            .filter(d => d.profit < 0)
            .sort((a, b) => a.profit - b.profit)
            .slice(0, 10)

        return deals
    }, [activity])

    /**
     * Trending Players - Jugadores con mayor cambio de valor
     */
    const trendingPlayers = useMemo(() => {
        if (!market || market.length === 0) return { rising: [], falling: [] }

        const playersWithTrend = market.map(player => {
            const p = player.playerMaster || player
            const currentValue = p.marketValue || 0
            const lastValue = p.lastMarketValue || currentValue
            const change = currentValue - lastValue
            const changePercent = lastValue > 0 ? (change / lastValue) * 100 : 0

            return {
                id: p.id,
                name: p.nickname || p.name,
                team: p.team?.name || '',
                position: p.positionId,
                currentValue,
                change,
                changePercent,
                image: p.images?.transparent?.['256x256']
            }
        }).filter(p => Math.abs(p.change) > 100000) // Solo cambios > 100K

        const rising = playersWithTrend
            .filter(p => p.change > 0)
            .sort((a, b) => b.change - a.change)
            .slice(0, 5)

        const falling = playersWithTrend
            .filter(p => p.change < 0)
            .sort((a, b) => a.change - b.change)
            .slice(0, 5)

        return { rising, falling }
    }, [market])

    /**
     * Market Volume - Volumen de actividad
     */
    const marketVolume = useMemo(() => {
        if (!activity || activity.length === 0) return { total: 0, today: 0, avgPerDay: 0 }

        const today = new Date().toDateString()
        const todayOps = activity.filter(op =>
            new Date(op.date).toDateString() === today
        )

        // Agrupar por día
        const byDay = {}
        activity.forEach(op => {
            const day = new Date(op.date).toDateString()
            byDay[day] = (byDay[day] || 0) + 1
        })

        const days = Object.keys(byDay).length || 1
        const avgPerDay = activity.length / days

        // Volumen monetario
        const totalVolume = activity
            .filter(op => op.activityTypeId === 1 || op.activityTypeId === 31)
            .reduce((sum, op) => sum + (op.amount || 0), 0)

        return {
            total: activity.length,
            today: todayOps.length,
            avgPerDay: Math.round(avgPerDay),
            totalVolume,
            days
        }
    }, [activity])

    /**
     * Manager Rankings
     */
    const managerRankings = useMemo(() => {
        if (!ranking || ranking.length === 0) return { byROI: [], byPatrimony: [], byEfficiency: [] }

        const managers = ranking.map(r => {
            const patrimony = r.teamValue || r.team?.value || 0
            const points = r.points || r.team?.points || 0
            const efficiency = patrimony > 0 ? points / (patrimony / 1000000) : 0

            return {
                id: r.userId || r.team?.manager?.id,
                name: typeof r.manager === 'string' ? r.manager : r.manager?.managerName || 'Manager',
                patrimony,
                points,
                efficiency
            }
        })

        const byPatrimony = [...managers].sort((a, b) => b.patrimony - a.patrimony)
        const byEfficiency = [...managers].sort((a, b) => b.efficiency - a.efficiency)

        return { byPatrimony, byEfficiency }
    }, [ranking])

    return {
        topDeals,
        worstDeals,
        trendingPlayers,
        marketVolume,
        managerRankings
    }
}

export default useMarketAnalytics
