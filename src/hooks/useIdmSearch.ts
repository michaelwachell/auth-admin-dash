/**
 * React hook for IDM user search functionality
 */

import { useState, useCallback, useEffect } from 'react'
import { IdmApiService } from '../services/idm.service'
import type {
  IdmApiConfig,
  UserSearchParams,
  UserSearchResponse,
  IdmUser
} from '../types/idm.types'

interface UseIdmSearchOptions {
  /**
   * IDM API configuration (baseUrl and accessToken)
   */
  config: IdmApiConfig

  /**
   * Initial search parameters
   */
  initialParams?: UserSearchParams

  /**
   * Whether to automatically search on mount
   */
  autoSearch?: boolean

  /**
   * Whether to include metadata in responses
   */
  includeMetadata?: boolean

  /**
   * Callback when search completes successfully
   */
  onSuccess?: (data: UserSearchResponse) => void

  /**
   * Callback when search fails
   */
  onError?: (error: Error) => void
}

interface UseIdmSearchResult {
  /**
   * Search results
   */
  data: UserSearchResponse | null

  /**
   * All users from accumulated pages
   */
  allUsers: IdmUser[]

  /**
   * Whether a search is in progress
   */
  loading: boolean

  /**
   * Error from last search
   */
  error: Error | null

  /**
   * Current search parameters
   */
  params: UserSearchParams

  /**
   * Whether there are more pages to load
   */
  hasMore: boolean

  /**
   * Current page number (for display)
   */
  currentPage: number

  /**
   * Execute a search with given parameters
   */
  search: (params?: UserSearchParams) => Promise<void>

  /**
   * Load the next page of results
   */
  loadNextPage: () => Promise<void>

  /**
   * Reset search state
   */
  reset: () => void

  /**
   * Update search parameters
   */
  setParams: (params: UserSearchParams) => void
}

/**
 * Hook for searching IDM users
 */
export const useIdmSearch = (options: UseIdmSearchOptions): UseIdmSearchResult => {
  const { config, initialParams = {}, autoSearch = false, includeMetadata = false, onSuccess, onError } = options

  const [data, setData] = useState<UserSearchResponse | null>(null)
  const [allUsers, setAllUsers] = useState<IdmUser[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [params, setParams] = useState<UserSearchParams>(initialParams)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)

  /**
   * Execute search
   */
  const search = useCallback(async (searchParams?: UserSearchParams) => {
    const finalParams = {
      ...(searchParams || params),
      ...(includeMetadata && { _includeMetadata: true, _queryId: 'query-all-ids' })
    }

    setLoading(true)
    setError(null)

    try {
      const response = await IdmApiService.searchUsers(config, finalParams)

      setData(response)
      setAllUsers(response.result)
      setCurrentPage(1)
      setHasMore(!!response.pagedResultsCookie)

      if (searchParams) {
        setParams(searchParams)
      }

      onSuccess?.(response)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Search failed')
      setError(error)
      onError?.(error)
    } finally {
      setLoading(false)
    }
  }, [config, params, includeMetadata, onSuccess, onError])

  /**
   * Load next page
   */
  const loadNextPage = useCallback(async () => {
    if (!data?.pagedResultsCookie || loading) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await IdmApiService.searchUsers(config, {
        ...params,
        pagedResultsCookie: data.pagedResultsCookie,
        ...(includeMetadata && { _includeMetadata: true, _queryId: 'query-all-ids' })
      })

      setData(response)
      setAllUsers(prev => [...prev, ...response.result])
      setCurrentPage(prev => prev + 1)
      setHasMore(!!response.pagedResultsCookie)

      onSuccess?.(response)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load next page')
      setError(error)
      onError?.(error)
    } finally {
      setLoading(false)
    }
  }, [config, data, params, loading, includeMetadata, onSuccess, onError])

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    setData(null)
    setAllUsers([])
    setError(null)
    setCurrentPage(1)
    setHasMore(false)
    setParams(initialParams)
  }, [initialParams])

  /**
   * Auto-search on mount if enabled
   */
  useEffect(() => {
    if (autoSearch && !data) {
      search()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    data,
    allUsers,
    loading,
    error,
    params,
    hasMore,
    currentPage,
    search,
    loadNextPage,
    reset,
    setParams
  }
}

/**
 * Hook for searching users with pagination UI support
 */
export const useIdmSearchWithPagination = (
  config: IdmApiConfig,
  pageSize: number = 20
) => {
  const [currentFilter, setCurrentFilter] = useState<string>('true')
  const [currentFields, setCurrentFields] = useState<string>('')
  const [currentSort, setCurrentSort] = useState<string>('')

  const {
    data,
    allUsers,
    loading,
    error,
    hasMore,
    currentPage,
    search,
    loadNextPage,
    reset
  } = useIdmSearch({
    config,
    initialParams: {
      queryFilter: currentFilter,
      pageSize,
      ...(currentFields && { fields: currentFields }),
      ...(currentSort && { sortKeys: currentSort })
    }
  })

  /**
   * Update filter and search
   */
  const updateFilter = useCallback(async (filter: string) => {
    setCurrentFilter(filter)
    await search({
      queryFilter: filter,
      pageSize,
      ...(currentFields && { fields: currentFields }),
      ...(currentSort && { sortKeys: currentSort })
    })
  }, [search, pageSize, currentFields, currentSort])

  /**
   * Update fields and search
   */
  const updateFields = useCallback(async (fields: string) => {
    setCurrentFields(fields)
    await search({
      queryFilter: currentFilter,
      pageSize,
      fields,
      ...(currentSort && { sortKeys: currentSort })
    })
  }, [search, currentFilter, pageSize, currentSort])

  /**
   * Update sort and search
   */
  const updateSort = useCallback(async (sortKeys: string) => {
    setCurrentSort(sortKeys)
    await search({
      queryFilter: currentFilter,
      pageSize,
      ...(currentFields && { fields: currentFields }),
      sortKeys
    })
  }, [search, currentFilter, pageSize, currentFields])

  return {
    // Data
    users: allUsers,
    totalResults: data?.totalPagedResults,
    resultCount: allUsers.length,

    // Pagination
    currentPage,
    hasMore,
    loadNextPage,

    // Filters
    currentFilter,
    currentFields,
    currentSort,
    updateFilter,
    updateFields,
    updateSort,

    // State
    loading,
    error,

    // Actions
    reset,
    refresh: () => search()
  }
}