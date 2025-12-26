/**
 * Firebase Realtime Database Service
 * Connects to mercato-fbdcc-default-rtdb.firebaseio.com
 * Manages manager data: clauseExpenses, initialBudget, teamValue
 */

const FIREBASE_URL = 'https://mercato-fbdcc-default-rtdb.firebaseio.com'

/**
 * Get all manager data from Firebase
 * @returns {Promise<Object>} Manager data keyed by manager name
 */
export async function getManagersData() {
    try {
        const response = await fetch(`${FIREBASE_URL}/fantasy_data/managers.json`)
        if (!response.ok) {
            throw new Error(`Firebase error: ${response.status}`)
        }
        const data = await response.json()
        return data || {}
    } catch (error) {
        console.error('Error fetching Firebase managers data:', error)
        return {}
    }
}

/**
 * Get data for a specific manager
 * @param {string} managerName - Name of the manager
 * @returns {Promise<Object|null>} Manager data or null
 */
export async function getManagerData(managerName) {
    try {
        const encodedName = encodeURIComponent(managerName)
        const response = await fetch(`${FIREBASE_URL}/fantasy_data/managers/${encodedName}.json`)
        if (!response.ok) {
            throw new Error(`Firebase error: ${response.status}`)
        }
        return await response.json()
    } catch (error) {
        console.error(`Error fetching manager ${managerName}:`, error)
        return null
    }
}

/**
 * Update clause expenses for a manager (increment by amount) and log to history
 * @param {string} managerName - Name of the manager
 * @param {number} amountToAdd - Amount to add to clauseExpenses
 * @param {string} description - Optional description of what the expense was for
 * @returns {Promise<boolean>} Success status
 */
export async function addClauseExpense(managerName, amountToAdd, description = '') {
    try {
        // First get current value
        const currentData = await getManagerData(managerName)
        const currentExpenses = currentData?.clauseExpenses || 0
        const newExpenses = currentExpenses + amountToAdd

        const encodedName = encodeURIComponent(managerName)

        // Update total clauseExpenses
        const response = await fetch(
            `${FIREBASE_URL}/fantasy_data/managers/${encodedName}/clauseExpenses.json`,
            {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newExpenses)
            }
        )

        if (!response.ok) {
            throw new Error(`Firebase update error: ${response.status}`)
        }

        // Add to history
        const historyEntry = {
            date: new Date().toISOString(),
            amount: amountToAdd,
            description: description || 'Subida de cláusula',
            totalAfter: newExpenses
        }

        await fetch(
            `${FIREBASE_URL}/fantasy_data/managers/${encodedName}/clauseHistory.json`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(historyEntry)
            }
        )

        console.log(`Updated ${managerName} clauseExpenses: ${currentExpenses} → ${newExpenses}`)
        return true
    } catch (error) {
        console.error(`Error updating clause expenses for ${managerName}:`, error)
        return false
    }
}

/**
 * Get clause expense history for a manager
 * @param {string} managerName - Name of the manager
 * @returns {Promise<Array>} Array of history entries
 */
export async function getClauseHistory(managerName) {
    try {
        const encodedName = encodeURIComponent(managerName)
        const response = await fetch(`${FIREBASE_URL}/fantasy_data/managers/${encodedName}/clauseHistory.json`)
        if (!response.ok) {
            throw new Error(`Firebase error: ${response.status}`)
        }
        const data = await response.json()

        // Convert Firebase object to array and sort by date (newest first)
        if (!data) return []
        const entries = Object.entries(data).map(([id, entry]) => ({ id, ...entry }))
        return entries.sort((a, b) => new Date(b.date) - new Date(a.date))
    } catch (error) {
        console.error(`Error fetching clause history for ${managerName}:`, error)
        return []
    }
}

/**
 * Delete a specific clause history entry and recalculate total
 * @param {string} managerName - Name of the manager
 * @param {string} entryId - Firebase key of the history entry to delete
 * @param {number} amountToRemove - Amount that was in the deleted entry
 * @returns {Promise<boolean>} Success status
 */
export async function deleteClauseHistoryEntry(managerName, entryId, amountToRemove) {
    try {
        const encodedName = encodeURIComponent(managerName)

        // Delete the history entry
        const deleteResponse = await fetch(
            `${FIREBASE_URL}/fantasy_data/managers/${encodedName}/clauseHistory/${entryId}.json`,
            { method: 'DELETE' }
        )

        if (!deleteResponse.ok) {
            throw new Error(`Firebase delete error: ${deleteResponse.status}`)
        }

        // Get current expenses and subtract the deleted amount
        const currentData = await getManagerData(managerName)
        const currentExpenses = currentData?.clauseExpenses || 0
        const newExpenses = Math.max(0, currentExpenses - amountToRemove)

        // Update the total
        await fetch(
            `${FIREBASE_URL}/fantasy_data/managers/${encodedName}/clauseExpenses.json`,
            {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newExpenses)
            }
        )

        console.log(`Deleted entry ${entryId} from ${managerName}, expenses: ${currentExpenses} → ${newExpenses}`)
        return true
    } catch (error) {
        console.error(`Error deleting clause history entry for ${managerName}:`, error)
        return false
    }
}

/**
 * Set clause expenses to a specific value (replace, not increment)
 * @param {string} managerName - Name of the manager
 * @param {number} newValue - New clauseExpenses value
 * @returns {Promise<boolean>} Success status
 */
export async function setClauseExpense(managerName, newValue) {
    try {
        const encodedName = encodeURIComponent(managerName)
        const response = await fetch(
            `${FIREBASE_URL}/fantasy_data/managers/${encodedName}/clauseExpenses.json`,
            {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newValue)
            }
        )

        if (!response.ok) {
            throw new Error(`Firebase update error: ${response.status}`)
        }

        console.log(`Set ${managerName} clauseExpenses to ${newValue}`)
        return true
    } catch (error) {
        console.error(`Error setting clause expenses for ${managerName}:`, error)
        return false
    }
}

/**
 * Update last update timestamp
 * @returns {Promise<boolean>} Success status
 */
export async function updateLastUpdate() {
    try {
        const response = await fetch(
            `${FIREBASE_URL}/fantasy_data/lastUpdate.json`,
            {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(Date.now())
            }
        )
        return response.ok
    } catch (error) {
        console.error('Error updating lastUpdate:', error)
        return false
    }
}

export default {
    getManagersData,
    getManagerData,
    addClauseExpense,
    getClauseHistory,
    deleteClauseHistoryEntry,
    setClauseExpense,
    updateLastUpdate
}
