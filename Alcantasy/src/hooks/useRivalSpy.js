/**
 * useRivalSpy - Motor de Espionaje Financiero
 * 
 * Analiza el historial de actividad para estimar saldos de rivales.
 * Fórmula: SaldoEstimado = SaldoInicial + Ventas + Premios - Compras - Clausulazos - Blindajes
 */

import { useMemo } from 'react'

// Constantes del juego
const SALDO_INICIAL_ESTIMADO = 100_000_000 // 100M € - saldo inicial típico
const PREMIO_JORNADA_PROMEDIO = 500_000 // 500k € - premio promedio por jornada ganada

/**
 * Tipos de actividad según la API de LaLiga Fantasy (VERIFIED FROM REAL DATA)
 * Based on analysis of activity feed, these types were found: [33, 1, 31, 4, 12, 7, 6, 3, 2, 9]
 */
const ACTIVITY_TYPE = {
    // Core transaction types
    COMPRA_MANAGER: 1,        // Purchase from another manager (has user2Id = seller)
    VENTA_MANAGER: 2,         // Sale to another manager (you are user1Id = seller)
    CLAUSULA_PAGADA: 3,       // You paid a clause to buy a player
    CLAUSULA_COBRADA: 4,      // You received clause money (someone bought your player)
    BLINDAJE: 5,              // Clause increase (blindaje)
    PREMIO_JORNADA: 6,        // Matchday prize
    RECOMPENSA: 7,            // Daily reward / ad reward
    SUBIDA_CLAUSULA: 9,       // Automatic clause increase (daily)

    // Market transactions (no user2Id - dealing with "the bank")
    FIN_PUJA: 12,             // Possibly auction end / puja result
    FICHAJE_MERCADO: 31,      // Purchase from free market (no seller)
    CLAUSULA_SUFRIDA: 32,     // Your player was clause-sniped (passive notification)
    VENTA_MERCADO: 33,        // Sale to free market (you get money from bank)
}

/**
 * Hook para espiar las finanzas de los rivales
 * @param {Array} activityHistory - Historial completo de actividad de la liga
 * @param {Array} ranking - Ranking de equipos con info de managers (incluye players)
 * @param {string} myUserId - ID del usuario actual (para excluirlo del espionaje)
 * @param {Object} firebaseData - Data from Firebase with clauseExpenses and initialBudget per manager
 * @param {Map} marketValues - Mapa de valores de mercado (trends) para calcular subidas diarias
 */
export function useRivalSpy(activityHistory = [], ranking = [], myUserId = null, firebaseData = {}, marketValues = new Map()) {

    /**
     * Calcular balances estimados de todos los rivales
     */
    const rivalBalances = useMemo(() => {
        if (!activityHistory?.length || !ranking?.length) return []

        // Crear mapa de managers
        const managersMap = new Map()
        ranking.forEach(item => {
            const userId = item.userId || item.team?.manager?.id
            const managerId = item.team?.manager?.id || item.userId
            const managerName = typeof item.manager === 'string'
                ? item.manager
                : item.manager?.managerName || item.team?.manager?.managerName || 'Manager'

            // Extraer jugadores del ranking si están disponibles
            const teamPlayers = item.team?.players || item.players || []

            // Calcular valor de equipo y variación diaria si tenemos datos de mercado
            let teamValue = 0
            let dailyValueChange = 0

            // Usar datos de ranking (más fiables para el valor actual)
            teamValue = item.teamValue || item.team?.teamValue || 0

            // Si el valor es 0, intentar sumar de jugadores
            if (teamValue === 0 && teamPlayers.length > 0) {
                teamPlayers.forEach(p => teamValue += (p.marketValue || 0))
            }

            // Calcular variación diaria sumando tendencias de jugadores
            if (marketValues && marketValues.size > 0 && teamPlayers.length > 0) {
                teamPlayers.forEach(p => {
                    const pName = p.nickname || p.name
                    // Normalización básica para buscar en el mapa (clave compleja: 'nombre|posicion|equipo')
                    // Iteramos o buscamos de forma eficiente?
                    // Dado el tamaño (500 players), iterar está bien o usar helper externo
                    // Aquí hacemos una búsqueda simplificada si el mapa keys son strings

                    // Estrategia: Buscar por nombre en las values del mapa
                    // Optimización: Esto debería hacerse fuera o pasar un mapa normalizado por ID o Nombre
                    // Asumimos que marketValues es el mapa raw de MarketTrendsService

                    // Búsqueda simple por inclusión de nombre
                    for (const [key, marketData] of marketValues.entries()) {
                        if (key.toLowerCase().includes(pName.toLowerCase()) ||
                            marketData.originalName.toLowerCase() === pName.toLowerCase()) {
                            dailyValueChange += (marketData.diferencia1 || 0)
                            break // Encontrado (approx)
                        }
                    }
                })
            }

            if (userId) {
                managersMap.set(userId.toString(), {
                    id: userId,
                    teamId: item.id || item.team?.id,
                    name: managerName,
                    teamName: item.name || item.team?.name,
                    teamValue, // Valor actual del equipo
                    dailyValueChange, // Variación diaria calculada
                    // Inicializar contadores
                    compras: 0,
                    ventas: 0,
                    clausulasPagadas: 0,
                    clausulasCobradas: 0,
                    blindajes: 0,
                    premios: 0,
                    recompensas: 0,
                    operaciones: [],
                    purchasedPlayers: new Map() // Map of playerId -> purchasePrice
                })
            }
        })

        // Procesar historial de actividad
        activityHistory.forEach(activity => {
            // CORRECT FIELD: API uses 'user1Id' for the main actor
            const actorId = activity.user1Id
            if (!actorId) return

            const manager = managersMap.get(actorId.toString())
            if (!manager) return

            const typeId = activity.activityTypeId || activity.type
            // CORRECT FIELD: API uses 'amount' not 'money'
            const amount = activity.amount || 0

            // Helper to get player ID and name from activity (handles different formats)
            const playerInfo = activity.playerMaster || activity.player || {}
            const playerId = playerInfo.id
            const playerName = playerInfo.nickname || playerInfo.name

            // CORRECT FIELD: API uses 'user2Id' for the counterparty (seller in a purchase)
            const sellerId = activity.user2Id
            const seller = sellerId ? managersMap.get(sellerId.toString()) : null

            // LOGIC: Double Entry Bookkeeping based on VERIFIED activity types
            // Key insight: Type 1 = user1Id BOUGHT from user2Id
            //              Type 2 = user1Id SOLD to user2Id (but this might be redundant with Type 1)
            //              Type 31 = user1Id bought from MARKET (no user2Id)
            //              Type 33 = user1Id sold to MARKET (no user2Id)

            switch (typeId) {
                // === PURCHASES ===
                case ACTIVITY_TYPE.COMPRA_MANAGER: // 1 - Bought from another manager
                    // user1Id = BUYER (pays money)
                    manager.compras += amount
                    manager.operaciones.push({ tipo: 'compra', amount, date: activity.createdAt, playerId, playerName })
                    if (playerId) manager.purchasedPlayers.set(playerId.toString(), amount)

                    // user2Id = SELLER (receives money) - Double Entry!
                    if (seller) {
                        seller.ventas += amount
                        seller.operaciones.push({ tipo: 'venta', amount, date: activity.createdAt, playerId, playerName })
                    }
                    break

                case ACTIVITY_TYPE.FICHAJE_MERCADO: // 31 - Bought from free market
                    // user1Id = BUYER (pays money to "the bank", no seller)
                    manager.compras += amount
                    manager.operaciones.push({ tipo: 'compra_mercado', amount, date: activity.createdAt, playerId, playerName })
                    if (playerId) manager.purchasedPlayers.set(playerId.toString(), amount)
                    break

                // === SALES ===
                case ACTIVITY_TYPE.VENTA_MANAGER: // 2 - Sold to another manager
                    // SKIP! This is the "mirror" of Type 1 transaction.
                    // When A buys from B, API creates: Type 1 (A) + Type 2 (B)
                    // Type 1 already credits B via user2Id, so Type 2 would double-count.
                    // Do NOT add to manager.ventas here!
                    break

                case ACTIVITY_TYPE.VENTA_MERCADO: // 33 - Sold to free market
                    // user1Id = SELLER (receives money from "the bank")
                    manager.ventas += amount
                    manager.operaciones.push({ tipo: 'venta_mercado', amount, date: activity.createdAt, playerId, playerName })
                    break

                // === CLAUSES ===
                case ACTIVITY_TYPE.CLAUSULA_PAGADA: // 3 - You paid a clause
                    // user1Id = BUYER (pays clause amount)
                    manager.clausulasPagadas += amount
                    manager.operaciones.push({ tipo: 'clausula_pagada', amount, date: activity.createdAt, playerId, playerName })
                    if (playerId) manager.purchasedPlayers.set(playerId.toString(), amount)

                    // user2Id = VICTIM (receives clause amount) - Double Entry!
                    if (seller) {
                        seller.clausulasCobradas += amount
                        seller.operaciones.push({ tipo: 'clausula_cobrada', amount, date: activity.createdAt, playerId, playerName })
                    }
                    break

                case ACTIVITY_TYPE.CLAUSULA_COBRADA: // 4 - You received clause money
                    // This is the PASSIVE notification for the victim
                    // SKIP to avoid double counting (already handled in Type 3 via user2Id)
                    // manager.clausulasCobradas += amount
                    break

                case ACTIVITY_TYPE.CLAUSULA_SUFRIDA: // 32 - Same as 4, passive notification
                    // SKIP to avoid double counting
                    break

                // === CLAUSE MODIFICATIONS ===
                case ACTIVITY_TYPE.BLINDAJE: // 5 - Manual clause increase
                    manager.blindajes += amount
                    manager.operaciones.push({ tipo: 'blindaje', amount, date: activity.createdAt })
                    break

                case ACTIVITY_TYPE.SUBIDA_CLAUSULA: // 9 - Automatic daily clause increase
                    // This doesn't cost money, it's just clause value increase
                    // SKIP - no financial impact
                    break

                // === REWARDS ===
                case ACTIVITY_TYPE.PREMIO_JORNADA: // 6 - Matchday prize
                    manager.premios += amount || PREMIO_JORNADA_PROMEDIO
                    break

                case ACTIVITY_TYPE.RECOMPENSA: // 7 - Daily/ad reward
                    manager.recompensas += amount || 100000
                    break

                case ACTIVITY_TYPE.FIN_PUJA: // 12 - Auction end
                    // This might be informational only, or it's the actual purchase
                    // Need to investigate if this has money impact
                    // For now, skip to avoid potential double counting with Type 1/31
                    break
            }
        })

        // Calcular saldo estimado para cada manager
        const balances = Array.from(managersMap.values()).map(manager => {
            // Get Firebase data for this manager (by name)
            const fbManager = firebaseData[manager.name] || firebaseData[manager.name?.trim()] || {}

            // Use Firebase initialBudget if available, otherwise use defaults
            let initialBalance = fbManager.initialBudget || 103_000_000

            // Fallback: If no Firebase data, check for Alcatamy exception
            if (!fbManager.initialBudget) {
                const normalizedName = (manager.name || '').toLowerCase().trim()
                if (normalizedName.includes('alcatamy') || normalizedName.includes('sports by')) {
                    initialBalance = 100_000_000
                }
            }

            // Use Firebase clauseExpenses instead of calculated blindajes
            const clauseExpensesFromFirebase = fbManager.clauseExpenses || 0

            const saldoEstimado =
                initialBalance
                + manager.ventas
                + manager.clausulasCobradas
                + manager.premios
                + manager.recompensas
                - manager.compras
                - manager.clausulasPagadas
                - clauseExpensesFromFirebase  // Use Firebase data instead of blindajes

            return {
                ...manager,
                saldoEstimado: saldoEstimado, // Allow negative balance
                initialBalance, // Debug info
                clauseExpensesFirebase: clauseExpensesFromFirebase, // Store for display
                flujoNeto: manager.ventas + manager.clausulasCobradas - manager.compras - manager.clausulasPagadas,
                esRival: manager.id?.toString() !== myUserId?.toString()
            }
        })
            // Filter: Include rivals OR monitoring team (Alcatamy)
            .filter(m => {
                if (m.esRival) return true
                const name = (m.name || '').toLowerCase()
                return name.includes('alcatamy') || name.includes('sports by')
            })
            .sort((a, b) => b.saldoEstimado - a.saldoEstimado)

        return balances
    }, [activityHistory, ranking, myUserId, firebaseData, marketValues])

    /**
     * Verificar si un rival puede permitirse una puja
     */
    const canRivalAfford = useMemo(() => (rivalId, amount) => {
        const rival = rivalBalances.find(r =>
            r.id?.toString() === rivalId?.toString() ||
            r.teamId?.toString() === rivalId?.toString()
        )
        if (!rival) return { canAfford: false, confidence: 0 }

        const canAfford = rival.saldoEstimado >= amount
        // Confianza basada en cantidad de operaciones analizadas
        const confidence = Math.min(1, rival.operaciones.length / 20)

        return {
            canAfford,
            saldoEstimado: rival.saldoEstimado,
            margen: rival.saldoEstimado - amount,
            confidence,
            rivalName: rival.name
        }
    }, [rivalBalances])

    /**
     * Obtener rivales más débiles (menor saldo)
     */
    const weakestRivals = useMemo(() => {
        return [...rivalBalances]
            .sort((a, b) => a.saldoEstimado - b.saldoEstimado)
            .slice(0, 5)
    }, [rivalBalances])

    /**
     * Obtener rivales con más poder de puja
     */
    const strongestRivals = useMemo(() => {
        return rivalBalances.slice(0, 5)
    }, [rivalBalances])

    /**
     * Detectar patrones de puja (rivales agresivos vs conservadores)
     */
    const biddingPatterns = useMemo(() => {
        return rivalBalances.map(rival => {
            const totalOperaciones = rival.operaciones.length
            const comprasRecientes = rival.operaciones
                .filter(o => o.tipo === 'compra')
                .slice(-10)

            const promedioCompra = comprasRecientes.length > 0
                ? comprasRecientes.reduce((sum, o) => sum + o.amount, 0) / comprasRecientes.length
                : 0

            let patron = 'NEUTRAL'
            if (rival.compras > rival.ventas * 1.5) patron = 'AGRESIVO'
            else if (rival.ventas > rival.compras * 1.5) patron = 'VENDEDOR'
            else if (totalOperaciones < 5) patron = 'PASIVO'

            return {
                id: rival.id,
                name: rival.name,
                patron,
                promedioCompra,
                totalOperaciones
            }
        })
    }, [rivalBalances])

    return {
        rivalBalances,
        canRivalAfford,
        weakestRivals,
        strongestRivals,
        biddingPatterns,
        totalRivals: rivalBalances.length
    }
}

export default useRivalSpy
