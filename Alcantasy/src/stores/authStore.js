import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { refreshToken, extractUserFromTokens, calculateTokenExpiration, isTokenExpired } from '../services/authService'

export const useAuthStore = create(
    persist(
        (set, get) => ({
            isAuthenticated: false,
            tokens: null,
            user: null,
            isLoading: false,
            leagueId: null,

            // Set current league
            setLeagueId: (leagueId) => set({ leagueId }),

            // Update user data (e.g. with profile info from API)
            updateUser: (userData) => set((state) => ({ user: { ...state.user, ...userData } })),

            // Login with token JSON (pasted from LaLiga)
            login: async (tokenData) => {
                try {
                    set({ isLoading: true })

                    let tokens
                    if (typeof tokenData === 'string') {
                        // If it's a JSON string, parse it
                        if (tokenData.trim().startsWith('{')) {
                            tokens = JSON.parse(tokenData)
                        } else {
                            // Just an access token
                            tokens = { access_token: tokenData, token_type: 'Bearer' }
                        }
                    } else {
                        tokens = tokenData
                    }

                    // Calculate expiration
                    if (!tokens.expires_on) {
                        tokens.expires_on = calculateTokenExpiration(tokens)
                    }

                    // Extract user info from tokens
                    const user = extractUserFromTokens(tokens)

                    set({
                        isAuthenticated: true,
                        tokens,
                        user,
                        isLoading: false,
                    })

                    return { success: true, user }
                } catch (error) {
                    set({ isLoading: false })
                    throw error
                }
            },

            // Logout
            logout: () => {
                set({
                    isAuthenticated: false,
                    tokens: null,
                    user: null,
                })
            },

            // Refresh token
            refreshToken: async () => {
                const { tokens } = get()
                if (!tokens?.refresh_token) {
                    throw new Error('No refresh token available')
                }

                try {
                    const result = await refreshToken(tokens.refresh_token)

                    const newTokens = {
                        access_token: result.id_token || result.access_token,
                        id_token: result.id_token,
                        refresh_token: result.refresh_token || tokens.refresh_token,
                        token_type: 'Bearer',
                        expires_on: calculateTokenExpiration(result),
                    }

                    const user = extractUserFromTokens(newTokens)

                    set({
                        tokens: newTokens,
                        user,
                    })

                    return newTokens.access_token
                } catch (error) {
                    // If refresh fails, logout
                    get().logout()
                    throw error
                }
            },

            // Get bearer token for API calls
            getBearerToken: () => {
                const { tokens } = get()
                return tokens?.id_token || tokens?.access_token
            },

            // Check if token is expired
            isTokenExpired: () => {
                const { tokens } = get()
                return isTokenExpired(tokens)
            },
        }),
        {
            name: 'alcantasy-auth',
            partialize: (state) => ({
                isAuthenticated: state.isAuthenticated,
                tokens: state.tokens,
                user: state.user,
            }),
        }
    )
)
