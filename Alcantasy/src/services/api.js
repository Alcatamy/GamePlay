/**
 * LaLiga Fantasy API Service
 * Handles all API calls to LaLiga Fantasy
 */
import { useAuthStore } from '../stores/authStore'
import toast from 'react-hot-toast'

// API base URL - uses Vite proxy in development
const API_BASE_URL = '/api'

class ApiClient {
    async request(url, options = {}) {
        const authStore = useAuthStore.getState()
        const token = authStore.getBearerToken()

        // Check if token is expired and refresh if needed
        if (authStore.isAuthenticated && authStore.isTokenExpired()) {
            if (authStore.tokens?.refresh_token) {
                try {
                    await authStore.refreshToken()
                } catch (error) {
                    console.error('Token refresh failed:', error)
                }
            }
        }

        const headers = {
            'Content-Type': 'application/json',
            'x-lang': 'es',
            ...options.headers,
        }

        if (token) {
            headers.Authorization = `Bearer ${token}`
        }

        try {
            const response = await fetch(`${API_BASE_URL}${url}`, {
                ...options,
                headers,
            })

            if (!response.ok) {
                if (response.status === 401) {
                    // Token expired, try to refresh
                    if (authStore.tokens?.refresh_token && !options._retried) {
                        try {
                            await authStore.refreshToken()
                            // Retry the request
                            return this.request(url, { ...options, _retried: true })
                        } catch (refreshError) {
                            authStore.logout()
                            toast.error('Sesión expirada. Por favor, inicia sesión de nuevo.')
                            throw new Error('Session expired')
                        }
                    }
                }

                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.message || `HTTP error ${response.status}`)
            }

            const contentType = response.headers.get('content-type')
            if (contentType?.includes('application/json')) {
                return await response.json()
            }
            return await response.text()
        } catch (error) {
            if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
                toast.error('Error de conexión. Verifica tu red.')
            }
            throw error
        }
    }

    get(url, options = {}) {
        return this.request(url, { ...options, method: 'GET' })
    }

    post(url, data, options = {}) {
        return this.request(url, {
            ...options,
            method: 'POST',
            body: JSON.stringify(data)
        })
    }

    put(url, data, options = {}) {
        return this.request(url, {
            ...options,
            method: 'PUT',
            body: JSON.stringify(data)
        })
    }

    delete(url, options = {}) {
        return this.request(url, { ...options, method: 'DELETE' })
    }
}

const api = new ApiClient()

// API Endpoints
export const fantasyAPI = {
    // User
    getCurrentUser: () => api.get('/v4/user/me?x-lang=es'),

    // Leagues
    getLeagues: () => api.get('/v4/leagues?x-lang=es'),
    getLeagueRanking: (leagueId) => api.get(`/v4/leagues/${leagueId}/ranking?x-lang=es`),
    getLeagueActivity: (leagueId, index = 0) => api.get(`/v5/leagues/${leagueId}/activity/${index}?x-lang=es`),

    // Teams
    getTeamData: (leagueId, teamId) => api.get(`/v4/leagues/${leagueId}/teams/${teamId}?x-lang=es`),
    getTeamLineup: (teamId, week) => api.get(`/v4/teams/${teamId}/lineup/week/${week}?x-lang=es`),
    getTeamMoney: (teamId) => api.get(`/v3/teams/${teamId}/money?x-lang=es`),

    // Market
    getMarket: (leagueId) => api.get(`/v3/league/${leagueId}/market?x-lang=es`),

    // Players
    getAllPlayers: () => api.get('/v4/players?x-lang=es'),
    getPlayerDetails: (playerId, leagueId) => api.get(`/v4/player/${playerId}/league/${leagueId}?x-lang=es`),

    // Calendar
    getMatchday: (weekNumber) => api.get(`/v3/calendar?weekNumber=${weekNumber}&x-lang=es`),
    getCurrentWeek: () => api.get('/v3/week/current?x-lang=es'),

    // Market Operations
    makeBid: (leagueId, marketId, amount) =>
        api.post(`/v3/league/${leagueId}/market/${marketId}/bid?x-lang=es`, { money: amount }),

    cancelBid: (leagueId, marketId, bidId) =>
        api.delete(`/v3/league/${leagueId}/market/${marketId}/bid/${bidId}/cancel?x-lang=es`),

    modifyBid: (leagueId, marketId, bidId, newAmount) =>
        api.put(`/v3/league/${leagueId}/market/${marketId}/bid/${bidId}?x-lang=es`, { money: newAmount }),

    getPlayerOffer: (leagueId, playerTeamId) =>
        api.get(`/v3/league/${leagueId}/player/${playerTeamId}/offers?x-lang=es`),

    sellPlayer: (leagueId, playerId, price) =>
        api.post(`/v3/league/${leagueId}/market/sell?x-lang=es`, { playerId, salePrice: price }),
}

export default api
