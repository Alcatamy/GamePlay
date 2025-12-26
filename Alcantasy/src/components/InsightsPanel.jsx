/**
 * InsightsPanel - Panel de Inteligencia Competitiva
 * 
 * Widget resumen para el Dashboard que muestra:
 * - Top 3 Gangas del mercado
 * - Top 3 Riesgos en mi plantilla
 * - Rival más débil financieramente
 */

import { useMemo } from 'react'
import {
    Brain, TrendingUp, TrendingDown, Target, Shield,
    AlertTriangle, DollarSign, Users, ChevronRight, Zap
} from 'lucide-react'
import { PLAYER_LABELS } from '../hooks/usePlayerValuation'
import { CLAUSE_TYPES } from '../hooks/useClauseSniper'

export default function InsightsPanel({
    topGangas = [],
    myRisks = [],
    weakestRivals = [],
    stats = {},
    onNavigate = () => { }
}) {
    const formatMoney = (amount) => {
        if (!amount && amount !== 0) return '-'
        if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M €`
        return new Intl.NumberFormat('es-ES').format(amount) + ' €'
    }

    return (
        <div className="glass-panel rounded-xl overflow-hidden border border-white/10">
            {/* Header */}
            <div className="p-4 border-b border-white/10 bg-gradient-to-r from-neon-pink/10 to-transparent">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Brain size={20} className="text-neon-pink" />
                        Inteligencia Competitiva
                    </h2>
                    <button
                        onClick={() => onNavigate('intelligence')}
                        className="text-xs text-gray-400 hover:text-primary flex items-center gap-1"
                    >
                        Ver todo <ChevronRight size={14} />
                    </button>
                </div>
            </div>

            <div className="p-4 space-y-4">
                {/* Stats rápidos */}
                <div className="grid grid-cols-3 gap-2">
                    <div className="bg-surface-accent rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-neon-green">{topGangas.length}</p>
                        <p className="text-[10px] text-gray-500 uppercase">Gangas</p>
                    </div>
                    <div className="bg-surface-accent rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-accent-red">{myRisks.length}</p>
                        <p className="text-[10px] text-gray-500 uppercase">Riesgos</p>
                    </div>
                    <div className="bg-surface-accent rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-neon-blue">{stats.affordableCount || 0}</p>
                        <p className="text-[10px] text-gray-500 uppercase">Clausulazos</p>
                    </div>
                </div>

                {/* Top Gangas */}
                {topGangas.length > 0 && (
                    <div>
                        <h3 className="text-xs font-bold text-gray-400 uppercase mb-2 flex items-center gap-1">
                            <TrendingUp size={12} className="text-neon-green" />
                            Top Gangas del Mercado
                        </h3>
                        <div className="space-y-2">
                            {topGangas.slice(0, 3).map((player, idx) => {
                                const p = player.playerMaster || player
                                return (
                                    <div
                                        key={p.id || idx}
                                        className="flex items-center gap-3 p-2 bg-surface-accent rounded-lg hover:bg-white/5 cursor-pointer"
                                    >
                                        <span className="text-lg">{PLAYER_LABELS.GANGA.emoji}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-white truncate">
                                                {p.nickname || p.name}
                                            </p>
                                            <p className="text-xs text-gray-500">{p.team?.name}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-neon-green">
                                                {formatMoney(p.marketValue)}
                                            </p>
                                            <p className="text-[10px] text-gray-500">
                                                {player.ratio?.toFixed(1)} pts/M€
                                            </p>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* Riesgos Propios */}
                {myRisks.length > 0 && (
                    <div>
                        <h3 className="text-xs font-bold text-gray-400 uppercase mb-2 flex items-center gap-1">
                            <AlertTriangle size={12} className="text-accent-red" />
                            Alerta: Cláusulas Peligrosas
                        </h3>
                        <div className="space-y-2">
                            {myRisks.slice(0, 3).map((risk, idx) => (
                                <div
                                    key={risk.playerId || idx}
                                    className="flex items-center gap-3 p-2 bg-accent-red/10 border border-accent-red/30 rounded-lg"
                                >
                                    <span className="text-lg">{risk.type.emoji}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-white truncate">
                                            {risk.playerName}
                                        </p>
                                        <p className="text-[10px] text-accent-red">
                                            Cláusula solo {((risk.ratio - 1) * 100).toFixed(0)}% sobre valor
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-accent-red">
                                            {formatMoney(risk.buyoutClause)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Rival más débil */}
                {weakestRivals.length > 0 && (
                    <div>
                        <h3 className="text-xs font-bold text-gray-400 uppercase mb-2 flex items-center gap-1">
                            <Target size={12} className="text-neon-blue" />
                            Rival Más Débil
                        </h3>
                        <div className="p-3 bg-neon-blue/10 border border-neon-blue/30 rounded-lg">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-bold text-white">{weakestRivals[0].name}</p>
                                    <p className="text-xs text-gray-400">Saldo estimado bajo</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-bold text-neon-blue">
                                        ~{formatMoney(weakestRivals[0].saldoEstimado)}
                                    </p>
                                    <p className="text-[10px] text-gray-500">estimado</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Sin datos */}
                {topGangas.length === 0 && myRisks.length === 0 && (
                    <div className="text-center py-6">
                        <Brain size={32} className="text-gray-600 mx-auto mb-2" />
                        <p className="text-gray-500 text-sm">Analizando datos...</p>
                    </div>
                )}
            </div>
        </div>
    )
}
