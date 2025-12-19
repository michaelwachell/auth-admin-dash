/**
 * IDM API Service
 * Client-side service for interacting with IDM endpoints
 */

import type {
  IdmApiConfig,
  UserSearchParams,
  UserSearchResponse,
  TokenRequestParams,
  TokenResponse,
  SchemaConfigResponse,
  UserProfileUpdate,
  PatchOperation,
  ProfileUpdateResponse,
  IdmUser,
  IdmError
} from '../types/idm.types'

/**
 * IDM API Service class
 */
export class IdmApiService {
  /**
   * Get an access token using client credentials
   */
  static async getAccessToken(params: TokenRequestParams): Promise<TokenResponse> {
    const response = await fetch('/api/ping-admin/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to get access token')
    }

    return response.json()
  }

  /**
   * Search for users
   */
  static async searchUsers(
    config: IdmApiConfig,
    params: UserSearchParams = {}
  ): Promise<UserSearchResponse> {
    const response = await fetch('/api/ping-admin/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        accessToken: config.accessToken,
        baseUrl: config.baseUrl,
        ...params
      })
    })

    if (!response.ok) {
      const error: IdmError = await response.json()
      throw new Error(error.error || error.message || 'Failed to search users')
    }

    return response.json()
  }

  /**
   * Get user by ID
   */
  static async getUserById(
    config: IdmApiConfig,
    userId: string
  ): Promise<IdmUser> {
    const response = await fetch('/api/ping-admin/custom-endpoint', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        accessToken: config.accessToken,
        endpoint: `${config.baseUrl}/openidm/endpoint/nfluser/${userId}`,
        method: 'GET'
      })
    })

    if (!response.ok) {
      const error: IdmError = await response.json()
      throw new Error(error.error || error.message || 'Failed to get user')
    }

    return response.json()
  }

  /**
   * Update user profile (full update)
   */
  static async updateUserProfile(
    config: IdmApiConfig,
    userId: string,
    updates: UserProfileUpdate
  ): Promise<ProfileUpdateResponse> {
    const response = await fetch('/api/ping-admin/custom-endpoint', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        accessToken: config.accessToken,
        endpoint: `${config.baseUrl}/openidm/endpoint/nfluser/${userId}`,
        method: 'PUT',
        data: updates
      })
    })

    if (!response.ok) {
      const error: IdmError = await response.json()
      throw new Error(error.error || error.message || 'Failed to update user profile')
    }

    return response.json()
  }

  /**
   * Patch user profile (partial update)
   */
  static async patchUserProfile(
    config: IdmApiConfig,
    userId: string,
    operations: PatchOperation[]
  ): Promise<ProfileUpdateResponse> {
    const response = await fetch('/api/ping-admin/custom-endpoint', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        accessToken: config.accessToken,
        endpoint: `${config.baseUrl}/openidm/endpoint/nfluser/${userId}`,
        method: 'PATCH',
        data: operations
      })
    })

    if (!response.ok) {
      const error: IdmError = await response.json()
      throw new Error(error.error || error.message || 'Failed to patch user profile')
    }

    return response.json()
  }

  /**
   * Get schema configuration
   */
  static async getSchemaConfig(config: IdmApiConfig): Promise<SchemaConfigResponse> {
    const response = await fetch('/api/ping-admin/custom-endpoint', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        accessToken: config.accessToken,
        endpoint: `${config.baseUrl}/openidm/endpoint/nflschemaconfig`,
        method: 'GET'
      })
    })

    if (!response.ok) {
      const error: IdmError = await response.json()
      throw new Error(error.error || error.message || 'Failed to get schema config')
    }

    return response.json()
  }

  /**
   * Get field configuration by name
   */
  static async getFieldConfig(
    config: IdmApiConfig,
    fieldName: string
  ): Promise<any> {
    const response = await fetch('/api/ping-admin/custom-endpoint', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        accessToken: config.accessToken,
        endpoint: `${config.baseUrl}/openidm/endpoint/nflschemaconfig/${fieldName}`,
        method: 'GET'
      })
    })

    if (!response.ok) {
      const error: IdmError = await response.json()
      throw new Error(error.error || error.message || 'Failed to get field config')
    }

    return response.json()
  }
}

/**
 * Helper functions for common searches
 */
export const IdmSearchHelpers = {
  /**
   * Search by email
   */
  byEmail: (email: string): UserSearchParams => ({
    queryFilter: `mail eq "${email}"`
  }),

  /**
   * Search by username
   */
  byUsername: (username: string): UserSearchParams => ({
    queryFilter: `userName eq "${username}"`
  }),

  /**
   * Search by first name
   */
  byFirstName: (firstName: string): UserSearchParams => ({
    queryFilter: `givenName eq "${firstName}"`
  }),

  /**
   * Search by last name
   */
  byLastName: (lastName: string): UserSearchParams => ({
    queryFilter: `sn eq "${lastName}"`
  }),

  /**
   * Search by full name
   */
  byFullName: (firstName: string, lastName: string): UserSearchParams => ({
    queryFilter: `(givenName eq "${firstName}") and (sn eq "${lastName}")`
  }),

  /**
   * Search by account status
   */
  byStatus: (status: string): UserSearchParams => ({
    queryFilter: `accountStatus eq "${status}"`
  }),

  /**
   * Get all users (with pagination)
   */
  all: (pageSize: number = 20): UserSearchParams => ({
    queryFilter: 'true',
    pageSize
  })
}