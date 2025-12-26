/**
 * useClauseSniper - Francotirador de Cláusulas
 * 
 * Identifica oportunidades de arbitraje en cláusulas:
 * - Jugadores con cláusula apenas superior al valor de mercado
 * - Alertas sobre propios jugadores con cláusulas peligrosamente bajas
 */

import { useMemo } from 'react'

// Umbrales de análisis
const OPORTUNIDAD_MARGEN_MAX = 0.15  // Cláusula máximo 15% superior al valor
const RIESGO_MARGEN_MIN = 0.10       // Cláusula solo 10% superior = RIESGO
const GANGA_CLAUSULA_THRESHOLD = 0.05 // Cláusula solo 5% superior = GANGA ABSOLUTA

/**
 * Tipos de oportunidad
 */
export const CLAUSE_TYPES = {
    GANGA_ABSOLUTA: {
        id: 'ganga_absoluta',
        emoji: '💎',
        text: 'GANGA ABSOLUTA',
        color: 'text-neon-green',
        bg: 'bg-neon-green/20',
        description: 'Cláusula casi igual al valor de mercado'
    },
    OPORTUNIDAD: {
        id: 'oportunidad',
        emoji: '🎯',
        text: 'OPORTUNIDAD',
        color: 'text-neon-blue',
        bg: 'bg-neon-blue/20',
        description: 'Buen ratio cláusula/valor'
    },
    RIESGO_PROPIO: {
        id: 'riesgo_propio',
        emoji: '⚠️',
        text: 'RIESGO',
        color: 'text-yellow-400',
        bg: 'bg-yellow-400/20',
        description: 'Tu jugador tiene cláusula peligrosa'
    },
    PELIGRO: {
        id: 'peligro',
        emoji: '🚨',
        text: 'PELIGRO',
        color: 'text-accent-red',
        bg: 'bg-accent-red/20',
        description: 'Cláusula muy baja, te lo pueden quitar'
    }
}

/**
 * Hook para identificar oportunidades de clausulazo
 * @param {Array} rivalTeams - Plantillas de equipos rivales con sus jugadores
 * @param {Array} myTeam - Plantilla propia
 * @param {number} myBalance - Mi saldo disponible
 */
export function useClauseSniper(rivalTeams = [], myTeam = [], myBalance = 0) {

    /**
     * Analizar jugadores rivales para oportunidades de clausulazo
     */
    const snipingOpportunities = useMemo(() => {
        const opportunities = []

        rivalTeams.forEach(team => {
            const players = team.players || []
            const ownerName = team.manager || team.managerName || 'Rival'

            players.forEach(p => {
                const player = p.playerMaster || p
                const buyoutClause = p.buyoutClause || 0
                const marketValue = player.marketValue || 0

                if (buyoutClause === 0 || marketValue === 0) return

                // Calcular ratio cláusula/valor
                const ratio = buyoutClause / marketValue
                const margen = ratio - 1 // Cuánto más caro es la cláusula que el valor

                // Solo interesa si la cláusula no es mucho mayor al valor
                if (margen > OPORTUNIDAD_MARGEN_MAX) return

                // Clasificar oportunidad
                let type = CLAUSE_TYPES.OPORTUNIDAD
                if (margen <= GANGA_CLAUSULA_THRESHOLD) {
                    type = CLAUSE_TYPES.GANGA_ABSOLUTA
                }

                // Verificar si puedo permitírmelo
                const canAfford = myBalance >= buyoutClause
                const affordMargin = myBalance - buyoutClause

                opportunities.push({
                    playerId: player.id,
                    playerName: player.nickname || player.name,
                    team: player.team?.name,
                    positionId: player.positionId,
                    ownerName,
                    ownerTeamId: team.id,
                    buyoutClause,
                    marketValue,
                    ratio,
                    margen,
                    type,
                    canAfford,
                    affordMargin,
                    // Puntuación: menor margen = mejor oportunidad
                    score: (1 - margen) * (player.points || 0),
                    points: player.points || 0
                })
            })
        })

        // Ordenar por score (mejores oportunidades primero)
        return opportunities.sort((a, b) => b.score - a.score)
    }, [rivalTeams, myBalance])

    /**
     * Analizar riesgos en mi propia plantilla
     */
    const myRisks = useMemo(() => {
        const risks = []

        myTeam.forEach(p => {
            const player = p.playerMaster || p
            const buyoutClause = p.buyoutClause || 0
            const marketValue = player.marketValue || 0

            if (buyoutClause === 0 || marketValue === 0) return

            // Calcular ratio cláusula/valor
            const ratio = buyoutClause / marketValue
            const margen = ratio - 1

            // Clasificar riesgo
            let type = null
            let severity = 0

            if (margen <= GANGA_CLAUSULA_THRESHOLD) {
                type = CLAUSE_TYPES.PELIGRO
                severity = 3
            } else if (margen <= RIESGO_MARGEN_MIN) {
                type = CLAUSE_TYPES.RIESGO_PROPIO
                severity = 2
            } else if (margen <= OPORTUNIDAD_MARGEN_MAX) {
                type = CLAUSE_TYPES.RIESGO_PROPIO
                severity = 1
            }

            if (type) {
                risks.push({
                    playerId: player.id,
                    playerName: player.nickname || player.name,
                    team: player.team?.name,
                    positionId: player.positionId,
                    buyoutClause,
                    marketValue,
                    ratio,
                    margen,
                    type,
                    severity,
                    // Coste para blindar (subir cláusula al doble del valor)
                    blindajeSugerido: Math.max(0, marketValue * 2 - buyoutClause),
                    points: player.points || 0
                })
            }
        })

        // Ordenar por severidad
        return risks.sort((a, b) => b.severity - a.severity)
    }, [myTeam])

    /**
     * Top oportunidades que puedo pagar
     */
    const affordableOpportunities = useMemo(() => {
        return snipingOpportunities
            .filter(o => o.canAfford)
            .slice(0, 10)
    }, [snipingOpportunities])

    /**
     * Resumen de stats
     */
    const stats = useMemo(() => ({
        totalOpportunities: snipingOpportunities.length,
        affordableCount: snipingOpportunities.filter(o => o.canAfford).length,
        gangasAbsolutas: snipingOpportunities.filter(o => o.type.id === 'ganga_absoluta').length,
        myRisksCount: myRisks.length,
        criticalRisks: myRisks.filter(r => r.severity >= 2).length
    }), [snipingOpportunities, myRisks])

    /**
     * Obtener cláusula recomendada para un jugador propio
     */
    const getRecommendedClause = useMemo(() => (player) => {
        const marketValue = player.marketValue || player.playerMaster?.marketValue || 0
        const points = player.points || player.playerMaster?.points || 0

        // Fórmula: Valor base + multiplicador por rendimiento
        const performanceMultiplier = points > 100 ? 2.5 : points > 50 ? 2.0 : 1.5
        const recommended = Math.round(marketValue * performanceMultiplier)

        return {
            recommended,
            minSafe: Math.round(marketValue * 1.3), // Mínimo 30% sobre valor
            maxRecommended: Math.round(marketValue * 3), // Máximo 3x
            currentClause: player.buyoutClause || 0
        }
    }, [])

    return {
        snipingOpportunities,
        affordableOpportunities,
        myRisks,
        stats,
        getRecommendedClause,
        CLAUSE_TYPES
    }
}

export default useClauseSniper
