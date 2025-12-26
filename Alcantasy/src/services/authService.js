/**
 * LaLiga Fantasy Authentication Service
 * Handles OAuth2 token management
 */

const AUTH_CONFIG = {
    CLIENT_ID: "6457fa17-1224-416a-b21a-ee6ce76e9bc0", // Google OAuth client ID
    REFRESH_TOKEN_ENDPOINT: "https://login.laliga.es/laligadspprob2c.onmicrosoft.com/oauth2/v2.0/token?p=B2C_1A_5ULAIP_PARAMETRIZED_SIGNIN",
}

/**
 * Refresh access token using refresh token
 */
export async function refreshToken(refreshTokenValue) {
    const params = new URLSearchParams({
        'grant_type': 'refresh_token',
        'refresh_token': refreshTokenValue,
        'client_id': AUTH_CONFIG.CLIENT_ID,
        'scope': 'openid offline_access'
    })

    const response = await fetch(AUTH_CONFIG.REFRESH_TOKEN_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString()
    })

    if (!response.ok) {
        const errorText = await response.text()
        if (response.status === 400 || response.status === 401) {
            throw new Error('invalid_grant')
        }
        throw new Error(`Token refresh failed: ${response.status} - ${errorText}`)
    }

    const result = await response.json()

    if (!result.id_token) {
        throw new Error('Token refresh failed - no id_token received')
    }

    return result
}

/**
 * Decode JWT token payload
 */
export function decodeJWT(token) {
    if (!token) return null

    try {
        const parts = token.split('.')
        if (parts.length !== 3) return null

        const payload = JSON.parse(atob(parts[1]))
        return payload
    } catch (error) {
        return null
    }
}

/**
 * Extract user information from JWT tokens
 */
export function extractUserFromTokens(tokens) {
    const tokenToUse = tokens.id_token || tokens.access_token

    if (!tokenToUse) {
        return { authenticated: true }
    }

    const payload = decodeJWT(tokenToUse)

    if (!payload) {
        return { authenticated: true }
    }

    return {
        email: payload.email || payload.unique_name,
        name: payload.name || payload.given_name,
        given_name: payload.given_name,
        family_name: payload.family_name,
        sub: payload.sub,
        oid: payload.oid,
        idp: payload.idp,
        exp: payload.exp,
        authenticated: true
    }
}

/**
 * Check if token is expired
 */
export function isTokenExpired(tokens) {
    if (!tokens || !tokens.expires_on) return true

    // Consider token expired if it expires in less than 5 minutes
    const expirationTime = tokens.expires_on * 1000
    const now = Date.now()
    const fiveMinutes = 5 * 60 * 1000

    return (expirationTime - now) < fiveMinutes
}

/**
 * Calculate token expiration time
 */
export function calculateTokenExpiration(tokenResponse) {
    if (tokenResponse.expires_on) {
        return tokenResponse.expires_on
    }

    if (tokenResponse.id_token_expires_in) {
        return Math.floor(Date.now() / 1000) + tokenResponse.id_token_expires_in
    }

    if (tokenResponse.expires_in) {
        return Math.floor(Date.now() / 1000) + tokenResponse.expires_in
    }

    // Default to 24 hours
    return Math.floor(Date.now() / 1000) + 86400
}
