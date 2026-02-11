/**
 * Types for IDM (Identity Management) API integration
 * Based on NFL Partner Server-to-Server Integration API
 */

// ============== User Management Types ==============

/**
 * User search result from IDM API
 */
export interface IdmUser {
  _id: string
  _rev: string
  userId?: string
  userName?: string
  mail?: string
  givenName?: string
  sn?: string // surname/last name
  accountStatus?: string
  [key: string]: any // Additional dynamic fields
}

/**
 * Response from user search endpoint
 */
export interface UserSearchResponse {
  result: IdmUser[]
  resultCount: number
  pagedResultsCookie?: string | null
  totalPagedResultsPolicy?: 'NONE' | 'ESTIMATE' | 'EXACT'
  totalPagedResults?: number
  remainingPagedResults?: number
}

/**
 * Parameters for searching users
 */
export interface UserSearchParams {
  /**
   * LDAP-style filter expression
   * Examples:
   * - 'mail eq "user@nfl.com"' - Search by email
   * - 'givenName eq "John"' - Search by first name
   * - '(givenName eq "John") and (sn eq "Doe")' - Combined search
   * - 'true' - Get all users
   */
  queryFilter?: string
  _queryFilter?: string // Alternative naming convention

  /**
   * Comma-separated list of fields to return
   * Example: 'userName,mail,givenName,sn,accountStatus'
   */
  fields?: string
  _fields?: string // Alternative naming convention

  /**
   * Number of results per page (1-100)
   * @default 10
   */
  pageSize?: number
  _pageSize?: number // Alternative naming convention

  /**
   * Comma-separated list of fields to sort by
   * Prefix with '-' for descending order
   * Example: '-sn,givenName'
   */
  sortKeys?: string
  _sortKeys?: string // Alternative naming convention

  /**
   * Pagination token from previous response
   */
  pagedResultsCookie?: string
  _pagedResultsCookie?: string // Alternative naming convention

  /**
   * Query ID for specific query types (e.g., 'query-all-ids')
   */
  _queryId?: string

  /**
   * Include metadata in response
   */
  _includeMetadata?: boolean
}

// ============== Schema Types ==============

/**
 * Schema field configuration
 */
export interface SchemaField {
  canonical: string
  idm_field: string
  oidc_claim?: string | null
  required: boolean
  indexed: boolean
  pii: boolean
}

/**
 * Schema configuration response
 */
export interface SchemaConfigResponse {
  version: number
  totalAttributes: number
  attributes: SchemaField[]
  metadata: {
    requiredFieldsCount: number
    piiFieldsCount: number
    indexedFieldsCount: number
  }
}

// ============== Authentication Types ==============

/**
 * OAuth token response
 */
export interface TokenResponse {
  access_token: string
  scope: string
  token_type: 'Bearer'
  expires_in: number
}

/**
 * Parameters for token request
 */
export interface TokenRequestParams {
  clientId: string
  clientSecret: string
  tokenEndpoint: string
  scopes?: string
}

// ============== Common Types ==============

/**
 * Standard error response
 */
export interface IdmError {
  code?: number
  error?: string
  message?: string
  detail?: string
  details?: any
}

/**
 * API Request configuration
 */
export interface IdmApiConfig {
  baseUrl: string
  accessToken: string
}

// ============== Query Filter Helpers ==============

/**
 * Query filter operators
 */
export enum QueryOperator {
  EQUALS = 'eq',
  CONTAINS = 'co',
  STARTS_WITH = 'sw',
  GREATER_THAN = 'gt',
  LESS_THAN = 'lt',
  PRESENT = 'pr'
}

/**
 * Helper type for building query filters
 */
export interface QueryFilter {
  field: string
  operator: QueryOperator
  value?: string | number | boolean
}

/**
 * Helper functions for building query filters
 */
export const QueryFilterBuilder = {
  /**
   * Build an equality filter
   */
  equals: (field: string, value: string): string =>
    `${field} eq "${value}"`,

  /**
   * Build a contains filter
   */
  contains: (field: string, value: string): string =>
    `${field} co "${value}"`,

  /**
   * Build a starts with filter
   */
  startsWith: (field: string, value: string): string =>
    `${field} sw "${value}"`,

  /**
   * Build a field present filter
   */
  present: (field: string): string =>
    `${field} pr`,

  /**
   * Combine filters with AND
   */
  and: (...filters: string[]): string =>
    filters.map(f => `(${f})`).join(' and '),

  /**
   * Combine filters with OR
   */
  or: (...filters: string[]): string =>
    filters.map(f => `(${f})`).join(' or '),

  /**
   * Negate a filter
   */
  not: (filter: string): string =>
    `!(${filter})`
}

// ============== User Profile Types ==============

/**
 * User profile update request
 */
export interface UserProfileUpdate {
  email?: string
  firstName?: string
  lastName?: string
  isMilitary?: boolean
  hideOddsInfo?: boolean
  showScores?: boolean
  birthYear?: number
  [key: string]: any
}

/**
 * JSON Patch operation for partial updates
 */
export interface PatchOperation {
  operation: 'replace' | 'add' | 'remove'
  field: string
  value?: any
}

/**
 * Response from profile update operations
 */
export interface ProfileUpdateResponse {
  success: boolean
  message: string
  userId: string
  fieldsUpdated: number
  unmappedFields: string[]
}

// ============== Enhanced Search Types ==============

/**
 * Saved query for quick access
 */
export interface SavedQuery {
  id: string
  name: string
  query: string
  fields?: string
  description?: string
  createdAt: Date
}

/**
 * Query template for common searches
 */
export interface QueryTemplate {
  name: string
  query: string
  description: string
  category?: string
}


/**
 * Search history item
 */
export interface SearchHistoryItem {
  id: string
  query: string
  timestamp: Date
  resultCount: number
  fields?: string
}

/**
 * Bulk operation request
 */
export interface BulkOperationRequest {
  userIds: string[]
  operation: 'export' | 'update' | 'delete'
  options?: {
    format?: 'csv' | 'json'
    fields?: string[]
    updates?: UserProfileUpdate
  }
}

/**
 * Export configuration
 */
export interface ExportConfig {
  format: 'csv' | 'json'
  fields: string[]
  includeHeaders?: boolean
  dateFormat?: string
}

// ============== Reconciliation Types ==============

/**
 * Reconciliation job status
 */
export interface ReconciliationJob {
  _id: string
  mapping: string
  state: 'ACTIVE' | 'CANCELED' | 'SUCCESS' | 'FAILED'
  stage?: string
  stageDescription?: string
  progress?: {
    source?: {
      existing?: {
        processed: number
        total: number
      }
    }
    target?: {
      created?: number
      updated?: number
      deleted?: number
    }
  }
  started?: string
  ended?: string
  duration?: string
}

/**
 * Response from reconciliation list endpoint
 */
export interface ReconciliationListResponse {
  reconciliations: ReconciliationJob[]
}

/**
 * Response from reconciliation cancel operation
 */
export interface ReconciliationCancelResponse {
  _id: string
  state: string
  ended: string
  duration: string
}