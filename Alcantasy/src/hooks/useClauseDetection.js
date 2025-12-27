/**
 * useClauseDetection - Hook for automatic clause tracking
 * 
 * Compares current player clause values with stored snapshots
 * to detect manual clause investments by managers.
 */

import { useState, useEffect, useCallback } from 'react'
import {
    getLastClauseSnapshot,
    saveClauseSnapshot,
    detectClauseChanges,
    processClauseChanges
} from '../services/firebaseService'

/**
 * Hook to detect clause changes across all teams
 * @param {Array} allPlayers - Array of all players with clause data
 * @param {boolean} autoProcess - Whether to auto-register detected changes
 * @returns {Object} Detection state and functions
 */
export function useClauseDetection(allPlayers = [], autoProcess = false) {
    const [lastSnapshot, setLastSnapshot] = useState(null)
    const [detectedChanges, setDetectedChanges] = useState([])
    const [isProcessing, setIsProcessing] = useState(false)
    const [hasProcessed, setHasProcessed] = useState(false)
    const [snapshotDate, setSnapshotDate] = useState(null)

    // Load last snapshot on mount
    useEffect(() => {
        async function loadSnapshot() {
            const snapshot = await getLastClauseSnapshot()
            if (snapshot) {
                setLastSnapshot(snapshot.data)
                setSnapshotDate(snapshot.date)
                console.log(`Loaded clause snapshot from ${snapshot.date}`)
            }
        }
        loadSnapshot()
    }, [])

    // Detect changes when players data changes
    useEffect(() => {
        if (!lastSnapshot || !allPlayers.length) return

        const changes = detectClauseChanges(lastSnapshot, allPlayers)
        setDetectedChanges(changes)

        if (changes.length > 0) {
            console.log(`Detected ${changes.length} clause changes:`, changes)
        }
    }, [lastSnapshot, allPlayers])

    // Auto-process changes if enabled
    useEffect(() => {
        if (autoProcess && detectedChanges.length > 0 && !hasProcessed) {
            processChanges()
        }
    }, [autoProcess, detectedChanges, hasProcessed])

    // Process detected changes and save to Firebase
    const processChanges = useCallback(async () => {
        if (isProcessing || detectedChanges.length === 0) return 0

        setIsProcessing(true)
        try {
            const count = await processClauseChanges(detectedChanges)
            setHasProcessed(true)
            return count
        } finally {
            setIsProcessing(false)
        }
    }, [detectedChanges, isProcessing])

    // Save current snapshot
    const saveSnapshot = useCallback(async () => {
        if (!allPlayers.length) return false
        return await saveClauseSnapshot(allPlayers)
    }, [allPlayers])

    // Get investment summary per manager
    const investmentsByManager = detectedChanges.reduce((acc, change) => {
        const name = change.managerName || 'Unknown'
        if (!acc[name]) acc[name] = { total: 0, players: [] }
        acc[name].total += change.investment
        acc[name].players.push(change)
        return acc
    }, {})

    return {
        // State
        lastSnapshot,
        snapshotDate,
        detectedChanges,
        investmentsByManager,
        isProcessing,
        hasProcessed,

        // Actions
        processChanges,
        saveSnapshot,

        // Summary
        totalDetectedInvestment: detectedChanges.reduce((sum, c) => sum + c.investment, 0),
        changesCount: detectedChanges.length
    }
}

export default useClauseDetection
