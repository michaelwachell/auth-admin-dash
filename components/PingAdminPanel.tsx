'use client'

import { useState, useEffect } from 'react'
import { AlertCircle, Copy, Eye, EyeOff, RefreshCw, Send, Settings, CheckCircle, FileText, Download, Search, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Table, Code } from 'lucide-react'
import { IdmQueryReference } from './IdmQueryReference'
import { SimplePingSearch } from './ping-search/SimplePingSearch'
import { IdmApiService } from '../src/services/idm.service'
import Toast from '../src/components/Toast'
import type { UserSearchParams, UserSearchResponse, ReconciliationJob, ReconciliationListResponse } from '../src/types/idm.types'

interface TokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  scope?: string
}

interface LogEntry {
  payload?: {
    context?: string
    level?: string
    logger?: string
    message?: string
    thread?: string
    timestamp?: string
    transactionId?: string
    mdc?: {
      transactionId?: string
    }
    [key: string]: any
  }
  source?: string
  timestamp?: string
  type?: string
  // Also support direct fields for backward compatibility
  level?: string
  message?: string
  [key: string]: any
}

export default function PingAdminPanel() {
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [tenantUrl, setTenantUrl] = useState('')
  const [tokenEndpoint, setTokenEndpoint] = useState('')
  const [metadataEndpoint, setMetadataEndpoint] = useState('https://auth-alpha-dev-id.nfl.com/am/oauth2/alpha/.well-known/openid-configuration')
  const [scopes, setScopes] = useState('fr:idm:* fr:am:*')
  const [accessToken, setAccessToken] = useState('')
  const [tokenExpiry, setTokenExpiry] = useState<Date | null>(null)
  const [showSecret, setShowSecret] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fetchingMetadata, setFetchingMetadata] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [lastCurl, setLastCurl] = useState('')
  const [copied, setCopied] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'credentials' | 'api-calls'>(() => {
    // Initialize from localStorage if available
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ping_admin_active_tab')
      if (saved === 'credentials' || saved === 'api-calls') {
        return saved as 'credentials' | 'api-calls'
      }
    }
    return 'credentials'
  })
  
  // Log fetching states
  const [logApiKey, setLogApiKey] = useState('')
  const [logApiSecret, setLogApiSecret] = useState('')
  const [showLogSecret, setShowLogSecret] = useState(false)
  const [logSource, setLogSource] = useState('am-core')
  const [logLevel, setLogLevel] = useState('')
  const [beginTime, setBeginTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [logPageSize, setLogPageSize] = useState('50')
  const [logPageCookie, setLogPageCookie] = useState('')
  const [customFilter, setCustomFilter] = useState('')
  const [filterMode, setFilterMode] = useState<'builder' | 'custom'>('builder')
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [fetchingLogs, setFetchingLogs] = useState(false)
  const [logsCurl, setLogsCurl] = useState('')
  const [nextPageCookie, setNextPageCookie] = useState('')
  
  // Client-side log management
  const [clientFilter, setClientFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [logsPerPage, setLogsPerPage] = useState(50)
  const [expandedLogs, setExpandedLogs] = useState<Set<number>>(new Set())
  const [logViewMode, setLogViewMode] = useState<'json' | 'table'>('table')
  
  // Custom endpoint states
  const [nflUserId, setNflUserId] = useState('')
  const [nflUserData, setNflUserData] = useState('')
  const [nflUserMethod, setNflUserMethod] = useState<'GET' | 'PUT' | 'PATCH'>('GET')
  const [schemaFieldName, setSchemaFieldName] = useState('')
  const [customEndpointLoading, setCustomEndpointLoading] = useState(false)
  const [customEndpointResult, setCustomEndpointResult] = useState<any>(null)
  const [customEndpointCurl, setCustomEndpointCurl] = useState('')

  // User search states
  const [searchQueryFilter, setSearchQueryFilter] = useState('true')
  const [searchFields, setSearchFields] = useState('userName,mail,givenName,sn,accountStatus')
  const [searchPageSize, setSearchPageSize] = useState('20')
  const [searchSortKeys, setSearchSortKeys] = useState('')
  const [searchPagedResultsCookie, setSearchPagedResultsCookie] = useState('')
  const [showMetadata, setShowMetadata] = useState(false)

  // Reconciliation endpoint states
  const [reconAction, setReconAction] = useState('reconById')
  const [reconMapping, setReconMapping] = useState('systemGigya__account___managedAlpha_user')
  const [reconId, setReconId] = useState('')
  const [reconRunTargetPhase, setReconRunTargetPhase] = useState(false)

  // Reconciliation management states
  const [reconciliations, setReconciliations] = useState<ReconciliationJob[]>([])
  const [fetchingRecons, setFetchingRecons] = useState(false)
  const [reconError, setReconError] = useState('')
  const [cancellingRecon, setCancellingRecon] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)

  // Helper function to format date for datetime-local input
  const formatDateForInput = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  };

  // Load from storage on mount
  useEffect(() => {
    const storedClientId = localStorage.getItem('ping_admin_client_id')
    const storedToken = sessionStorage.getItem('ping_admin_access_token')
    const storedExpiry = sessionStorage.getItem('ping_admin_token_expiry')
    const storedTenant = localStorage.getItem('ping_admin_tenant_url')
    const storedEndpoint = localStorage.getItem('ping_admin_token_endpoint')
    const storedMetadata = localStorage.getItem('ping_admin_metadata_endpoint')
    const storedLogApiKey = localStorage.getItem('ping_admin_log_api_key')

    if (storedClientId) setClientId(storedClientId)
    if (storedToken) setAccessToken(storedToken)
    if (storedExpiry) setTokenExpiry(new Date(storedExpiry))
    if (storedTenant) setTenantUrl(storedTenant)
    if (storedEndpoint) setTokenEndpoint(storedEndpoint)
    if (storedMetadata) setMetadataEndpoint(storedMetadata)
    if (storedLogApiKey) setLogApiKey(storedLogApiKey)
    
    // Set default time range to last 24 hours
    const now = new Date()
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    setBeginTime(yesterday.toISOString())
    setEndTime(now.toISOString())
  }, [])
  
  // Save active tab when it changes
  useEffect(() => {
    localStorage.setItem('ping_admin_active_tab', activeTab)
  }, [activeTab])

  // Save API key to localStorage when changed
  useEffect(() => {
    if (logApiKey) {
      localStorage.setItem('ping_admin_log_api_key', logApiKey)
    }
  }, [logApiKey])

  useEffect(() => {
    if (tenantUrl) {
      localStorage.setItem('ping_admin_tenant_url', tenantUrl)
    }
  }, [tenantUrl])

  useEffect(() => {
    if (tokenEndpoint) {
      localStorage.setItem('ping_admin_token_endpoint', tokenEndpoint)
      
      // Auto-construct tenant URL from token endpoint
      // Extract the base URL (protocol + hostname) from the token endpoint
      try {
        const url = new URL(tokenEndpoint)
        const baseUrl = `${url.protocol}//${url.hostname}`
        
        // Only auto-set if tenantUrl is empty or was previously auto-detected
        // This prevents overwriting manual entries
        if (!tenantUrl || tenantUrl === 'Not configured') {
          setTenantUrl(baseUrl)
        }
      } catch (e) {
        // If URL parsing fails, try the legacy pattern matching
        const forgeblocksMatch = tokenEndpoint.match(/https:\/\/([^\/]+)\.forgeblocks\.com/)
        const forgerockMatch = tokenEndpoint.match(/https:\/\/([^\/]+)\.id\.forgerock\.io/)
        
        if (forgeblocksMatch) {
          const hostname = forgeblocksMatch[0]
          setTenantUrl(hostname)
        } else if (forgerockMatch) {
          const hostname = forgerockMatch[0]
          setTenantUrl(hostname)
        }
      }
    }
  }, [tokenEndpoint])

  useEffect(() => {
    if (metadataEndpoint) {
      localStorage.setItem('ping_admin_metadata_endpoint', metadataEndpoint)
    }
  }, [metadataEndpoint])

  // Check token expiry
  useEffect(() => {
    if (tokenExpiry) {
      const checkExpiry = setInterval(() => {
        if (new Date() > tokenExpiry) {
          setAccessToken('')
          setTokenExpiry(null)
          sessionStorage.removeItem('ping_admin_access_token')
          sessionStorage.removeItem('ping_admin_token_expiry')
          setError('Token has expired. Please request a new token.')
        }
      }, 1000)
      return () => clearInterval(checkExpiry)
    }
  }, [tokenExpiry])

  const requestToken = async () => {
    if (!clientId || !clientSecret || !tokenEndpoint) {
      setError('Please fill in all required fields')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    const curl = `curl -X POST "${tokenEndpoint}" \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -u "${clientId}:${clientSecret}" \\
  -d "grant_type=client_credentials${scopes ? `&scope=${encodeURIComponent(scopes)}` : ''}"`
    
    setLastCurl(curl)

    try {
      const response = await fetch('/api/ping-admin/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId,
          clientSecret,
          tokenEndpoint,
          scopes
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get token')
      }

      const tokenData = data as TokenResponse
      setAccessToken(tokenData.access_token)
      
      const expiry = new Date(Date.now() + tokenData.expires_in * 1000)
      setTokenExpiry(expiry)
      
      sessionStorage.setItem('ping_admin_access_token', tokenData.access_token)
      sessionStorage.setItem('ping_admin_token_expiry', expiry.toISOString())
      
      setSuccess('Token obtained successfully!')
      
      // Clear client secret from form after successful auth
      setClientSecret('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get token')
    } finally {
      setLoading(false)
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopied(field)
    setTimeout(() => setCopied(null), 2000)
  };

  const clearToken = () => {
    setAccessToken('')
    setTokenExpiry(null)
    sessionStorage.removeItem('ping_admin_access_token')
    sessionStorage.removeItem('ping_admin_token_expiry')
    setSuccess('Token cleared')
  };

  const fetchMetadata = async () => {
    if (!metadataEndpoint) {
      setError('Please provide a metadata endpoint URL')
      return
    }

    setFetchingMetadata(true)
    setError('')
    
    try {
      const response = await fetch('/api/ping-admin/metadata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          metadataEndpoint
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch metadata')
      }

      // Set the token endpoint from metadata
      if (data.token_endpoint) {
        setTokenEndpoint(data.token_endpoint)
        
        // Try to construct tenant URL from the token endpoint
        try {
          const url = new URL(data.token_endpoint)
          const baseUrl = `${url.protocol}//${url.hostname}`
          
          // Only auto-set if tenantUrl is empty or was previously auto-detected
          if (!tenantUrl || tenantUrl === 'Not configured') {
            setTenantUrl(baseUrl)
          }
        } catch (e) {
          // Fallback to pattern matching if URL parsing fails
          const forgeblocksMatch = data.token_endpoint.match(/https:\/\/([^\/]+)\.forgeblocks\.com/)
          const forgerockMatch = data.token_endpoint.match(/https:\/\/([^\/]+)\.id\.forgerock\.io/)
          
          if (forgeblocksMatch) {
            const hostname = forgeblocksMatch[0]
            setTenantUrl(hostname)
          } else if (forgerockMatch) {
            const hostname = forgerockMatch[0]
            setTenantUrl(hostname)
          }
        }
        
        setSuccess('Endpoints discovered from metadata!')
      } else {
        throw new Error('No token_endpoint found in metadata')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch metadata')
    } finally {
      setFetchingMetadata(false)
    }
  };

  const fetchLogs = async () => {
    if (!tenantUrl || !logApiKey || !logApiSecret || !logSource) {
      setError('Please provide tenant URL, API key, API secret, and select a source')
      return
    }

    setFetchingLogs(true)
    setError('')
    
    // Build query parameters based on Ping AIC API spec
    const params = new URLSearchParams()
    
    // Add source as query parameter (per Ping AIC docs)
    params.append('source', logSource)
    
    // Add time filters
    if (beginTime) params.append('beginTime', beginTime)
    if (endTime) params.append('endTime', endTime)
    
    // Use custom filter or build from UI
    if (filterMode === 'custom' && customFilter) {
      params.append('_queryFilter', customFilter)
    } else if (filterMode === 'builder' && logLevel) {
      // Add level filter if specified
      params.append('_queryFilter', `level eq "${logLevel}"`)
    }
    
    // Construct log endpoint from tenant URL
    const logEndpoint = `${tenantUrl}/monitoring/logs`
    
    // Construct URL according to Ping AIC format: /monitoring/logs with source as query param
    const url = `${logEndpoint}${params.toString() ? '?' + params.toString() : ''}`
    
    console.log('Fetching logs from:', url)
    
    // Use x-api-key and x-api-secret headers per Ping AIC documentation
    const curl = `curl -X GET "${url}" \\
  -H "x-api-key: ${logApiKey}" \\
  -H "x-api-secret: ${logApiSecret}" \\
  -H "Accept: application/json"`
    
    setLogsCurl(curl)

    try {
      const response = await fetch('/api/ping-admin/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          logEndpoint: url,
          apiKey: logApiKey,
          apiSecret: logApiSecret
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch logs')
      }

      // Handle paginated response
      setLogs(data.result || data.entries || [])
      setNextPageCookie(data.pagedResultsCookie || '')
      setSuccess('Logs fetched successfully!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch logs')
      setLogs([])
    } finally {
      setFetchingLogs(false)
    }
  };

  const downloadLogs = () => {
    const dataStr = JSON.stringify(logs, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
    
    const exportFileDefaultName = `logs-${new Date().toISOString()}.json`
    
    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
  };

  const isTokenValid = accessToken && tokenExpiry && new Date() < tokenExpiry
  
  // Filter logs client-side
  const filteredLogs = logs.filter(log => {
    if (!clientFilter) return true
    const searchLower = clientFilter.toLowerCase()
    const logString = JSON.stringify(log).toLowerCase()
    return logString.includes(searchLower)
  })
  
  // Paginate filtered logs
  const totalPages = Math.ceil(filteredLogs.length / logsPerPage)
  const startIndex = (currentPage - 1) * logsPerPage
  const endIndex = startIndex + logsPerPage
  const paginatedLogs = filteredLogs.slice(startIndex, endIndex)
  
  // Reset to first page when filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [clientFilter])
  
  const toggleLogExpansion = (index: number) => {
    const newExpanded = new Set(expandedLogs)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedLogs(newExpanded)
  };

  const callNflUserEndpoint = async (method: 'GET' | 'PUT' | 'PATCH') => {
    if (!tenantUrl || !nflUserId || !accessToken) {
      setError('Please provide tenant URL, user ID, and ensure you have a valid token')
      return
    }

    setCustomEndpointLoading(true)
    setError('')
    setCustomEndpointResult(null)
    
    const endpoint = `${tenantUrl}/openidm/endpoint/nfluser/${nflUserId}`
    
    let data = null
    if (method !== 'GET' && nflUserData) {
      try {
        data = JSON.parse(nflUserData)
      } catch (e) {
        setError('Invalid JSON in user data field')
        setCustomEndpointLoading(false)
        return
      }
    }
    
    // Build curl command
    let curl = `curl -X ${method} "${endpoint}" \\
  -H "Authorization: Bearer ${accessToken}" \\
  -H "Accept: application/json"`
    
    if (data) {
      curl += ` \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(data, null, 2)}'`
    }
    
    setCustomEndpointCurl(curl)

    try {
      const response = await fetch('/api/ping-admin/custom-endpoint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint,
          method,
          accessToken,
          data
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to call endpoint')
      }

      setCustomEndpointResult(result)
      setSuccess(`${method} request to NFL User endpoint successful!`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to call endpoint')
    } finally {
      setCustomEndpointLoading(false)
    }
  };

  const callSchemaConfigEndpoint = async () => {
    if (!tenantUrl || !accessToken) {
      setError('Please provide tenant URL and ensure you have a valid token')
      return
    }

    setCustomEndpointLoading(true)
    setError('')
    setCustomEndpointResult(null)

    const endpoint = schemaFieldName
      ? `${tenantUrl}/openidm/endpoint/nflschemaconfig/${schemaFieldName}`
      : `${tenantUrl}/openidm/endpoint/nflschemaconfig`

    // Build curl command
    const curl = `curl -X GET "${endpoint}" \\
  -H "Authorization: Bearer ${accessToken}" \\
  -H "Accept: application/json"`

    setCustomEndpointCurl(curl)

    try {
      const response = await fetch('/api/ping-admin/custom-endpoint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint,
          method: 'GET',
          accessToken
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to call endpoint')
      }

      setCustomEndpointResult(result)
      setSuccess('Schema configuration retrieved successfully!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to call endpoint')
    } finally {
      setCustomEndpointLoading(false)
    }
  };

  const fetchReconciliations = async () => {
    if (!accessToken || !tenantUrl) {
      setReconError('Access token and tenant URL required')
      return
    }

    setFetchingRecons(true)
    setReconError('')

    try {
      const config = {
        baseUrl: tenantUrl,
        accessToken
      }
      const result = await IdmApiService.getReconciliations(config)
      setReconciliations(result.reconciliations || [])

      if (result.reconciliations.length === 0) {
        setReconError('No reconciliations found')
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch reconciliations'
      setReconError(errorMsg)
      setReconciliations([])
    } finally {
      setFetchingRecons(false)
    }
  }

  const handleCancelReconciliation = async (reconId: string) => {
    if (!accessToken || !tenantUrl) {
      setToast({ message: 'Access token required', type: 'error' })
      return
    }

    setCancellingRecon(reconId)

    try {
      const config = {
        baseUrl: tenantUrl,
        accessToken
      }
      await IdmApiService.cancelReconciliation(config, reconId)

      setToast({
        message: `Reconciliation ${reconId} cancelled successfully`,
        type: 'success'
      })

      // Refresh the list after a short delay
      setTimeout(() => {
        fetchReconciliations()
      }, 1000)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to cancel reconciliation'
      setToast({ message: errorMsg, type: 'error' })
    } finally {
      setCancellingRecon(null)
    }
  }

  // Handler for the new PingSearchSection component
  const handlePingSearch = async (params: UserSearchParams): Promise<UserSearchResponse> => {
    if (!tenantUrl || !accessToken) {
      throw new Error('Please provide tenant URL and ensure you have a valid token')
    }

    const response = await fetch('/api/ping-admin/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        accessToken,
        baseUrl: tenantUrl,
        queryFilter: params._queryFilter || params.queryFilter || 'true',
        fields: params._fields || params.fields || undefined,
        pageSize: params._pageSize || params.pageSize || 20,
        sortKeys: params._sortKeys || params.sortKeys || undefined,
        pagedResultsCookie: params._pagedResultsCookie || params.pagedResultsCookie || undefined
      })
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to search users')
    }

    return result
  }

  const callUserSearchEndpoint = async () => {
    if (!tenantUrl || !accessToken) {
      setError('Please provide tenant URL and ensure you have a valid token')
      return
    }

    setCustomEndpointLoading(true)
    setError('')
    setCustomEndpointResult(null)

    // Build fields list with metadata if checkbox is checked
    let fieldsToRequest = searchFields
    if (showMetadata && searchFields) {
      // Add metadata fields if not already present
      const metadataFields = ['_id', '_rev', 'userId']
      const currentFields = searchFields.split(',').map(f => f.trim())
      const fieldsToAdd = metadataFields.filter(f => !currentFields.includes(f))
      if (fieldsToAdd.length > 0) {
        fieldsToRequest = `${fieldsToAdd.join(',')},${searchFields}`
      }
    } else if (showMetadata && !searchFields) {
      // If no fields specified but metadata requested, include common fields plus metadata
      fieldsToRequest = '_id,_rev,userId,userName,mail,givenName,sn,accountStatus'
    }

    try {
      const response = await fetch('/api/ping-admin/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accessToken,
          baseUrl: tenantUrl,
          queryFilter: searchQueryFilter || 'true',
          fields: fieldsToRequest || undefined,
          pageSize: searchPageSize ? parseInt(searchPageSize) : 20,
          sortKeys: searchSortKeys || undefined,
          pagedResultsCookie: searchPagedResultsCookie || undefined
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to search users')
      }

      setCustomEndpointResult(result)

      // Store the pagination cookie if available
      if (result.pagedResultsCookie) {
        setSearchPagedResultsCookie(result.pagedResultsCookie)
      }

      setSuccess(`User search completed! Found ${result.resultCount} results.`)

      // Build curl command for reference
      const endpoint = `${tenantUrl}/openidm/managed/alpha_user`
      const params = new URLSearchParams()
      params.append('_queryFilter', searchQueryFilter || 'true')
      if (fieldsToRequest) params.append('_fields', fieldsToRequest)
      if (searchPageSize) params.append('_pageSize', searchPageSize)
      if (searchSortKeys) params.append('_sortKeys', searchSortKeys)
      if (searchPagedResultsCookie) params.append('_pagedResultsCookie', searchPagedResultsCookie)

      const curl = `curl -X GET "${endpoint}?${params.toString()}" \\
  -H "Authorization: Bearer ${accessToken}" \\
  -H "Accept: application/json" \\
  -H "Accept-API-Version: resource=1.0"`

      setCustomEndpointCurl(curl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search users')
    } finally {
      setCustomEndpointLoading(false)
    }
  };

  const callReconEndpoint = async () => {
    if (!tenantUrl || !accessToken || !reconId) {
      setError('Please provide tenant URL, user ID, and ensure you have a valid token')
      return
    }

    setCustomEndpointLoading(true)
    setError('')
    setCustomEndpointResult(null)

    // Build query parameters with defaults
    const params = new URLSearchParams()
    params.append('_action', reconAction)
    params.append('mapping', reconMapping)
    params.append('id', reconId)

    const endpoint = `${tenantUrl}/openidm/recon?${params.toString()}`

    // Build request body
    const requestBody = {
      runTargetPhase: reconRunTargetPhase
    }

    // Build curl command
    const curl = `curl -X POST "${endpoint}" \\
  -H "accept: */*" \\
  -H "accept-language: en-US,en;q=0.9" \\
  -H "authorization: Bearer ${accessToken}" \\
  -H "cache-control: no-cache" \\
  -H "content-type: application/json" \\
  --data-raw '${JSON.stringify(requestBody)}'`

    setCustomEndpointCurl(curl)

    try {
      const response = await fetch('/api/ping-admin/custom-endpoint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint,
          method: 'POST',
          accessToken,
          data: requestBody
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to call reconciliation endpoint')
      }

      setCustomEndpointResult(result)
      setSuccess('Reconciliation request completed successfully!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to call reconciliation endpoint')
    } finally {
      setCustomEndpointLoading(false)
    }
  };

  return (
    <div className="w-full">
      <div className="bg-gray-800 rounded-lg border border-gray-700">
        <div className="border-b border-gray-700 p-6">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-blue-500" />
            <div>
              <h2 className="text-xl font-semibold text-gray-100">Ping Admin Panel</h2>
              <p className="text-sm text-gray-400 mt-1">Client Credentials Authentication & API Management</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Tab Navigation */}
          <div className="flex gap-2 mb-6 bg-gray-900 rounded-lg p-1 border border-gray-700">
            <button
              onClick={() => setActiveTab('credentials')}
              className={`flex-1 py-3 px-6 text-sm font-medium transition-all rounded-md ${
                activeTab === 'credentials'
                  ? 'bg-gray-800 text-blue-400 border border-gray-600 shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
              }`}
            >
              Credentials
            </button>
            <button
              onClick={() => setActiveTab('api-calls')}
              className={`flex-1 py-3 px-6 text-sm font-medium transition-all rounded-md ${
                activeTab === 'api-calls'
                  ? 'bg-gray-800 text-blue-400 border border-gray-600 shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                API Calls / Logs
              </div>
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'credentials' ? (
            <div className="space-y-4">
              <div>
                <label htmlFor="metadata-endpoint" className="block text-sm font-medium text-gray-200 mb-2">
                  Metadata Endpoint (Optional - for auto-discovery)
                </label>
                <div className="flex gap-2">
                  <input
                    id="metadata-endpoint"
                    type="url"
                    placeholder="https://auth-alpha-dev-id.nfl.com/am/oauth2/alpha/.well-known/openid-configuration"
                    value={metadataEndpoint}
                    onChange={(e) => setMetadataEndpoint(e.target.value)}
                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    onClick={fetchMetadata}
                    disabled={fetchingMetadata || !metadataEndpoint}
                    className={`px-4 py-2 rounded-md text-white font-medium transition-colors flex items-center ${
                      fetchingMetadata || !metadataEndpoint
                        ? 'bg-gray-600 cursor-not-allowed opacity-50'
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {fetchingMetadata ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      'Fetch'
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Provide the .well-known/openid-configuration URL to auto-discover endpoints
                </p>
              </div>

              <div>
                <label htmlFor="token-endpoint" className="block text-sm font-medium text-gray-200 mb-2">
                  Token Endpoint
                </label>
                <input
                  id="token-endpoint"
                  type="url"
                  placeholder="https://auth.pingone.com/.../as/token"
                  value={tokenEndpoint}
                  onChange={(e) => setTokenEndpoint(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="tenant-url" className="block text-sm font-medium text-gray-200 mb-2">
                  Tenant Base URL
                </label>
                <input
                  id="tenant-url"
                  type="url"
                  placeholder="https://auth-alpha-dev-id.nfl.com"
                  value={tenantUrl}
                  onChange={(e) => setTenantUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Base URL for IDM/OpenIDM endpoints (auto-detected from token endpoint or manually set)
                </p>
              </div>

              <div>
                <label htmlFor="client-id" className="block text-sm font-medium text-gray-200 mb-2">
                  Client ID
                </label>
                <input
                  id="client-id"
                  placeholder="Enter client ID"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="client-secret" className="block text-sm font-medium text-gray-200 mb-2">
                  Client Secret
                </label>
                <div className="relative flex items-center">
                  <input
                    id="client-secret"
                    type={showSecret ? 'text' : 'password'}
                    placeholder="Enter client secret"
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-2 text-gray-400 hover:text-gray-200"
                  >
                    {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Secret is stored in memory only and cleared on refresh
                </p>
              </div>

              <div>
                <label htmlFor="scopes" className="block text-sm font-medium text-gray-200 mb-2">
                  Scopes
                </label>
                <input
                  id="scopes"
                  placeholder="fr:idm:* fr:am:*"
                  value={scopes}
                  onChange={(e) => setScopes(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Space-separated list of scopes. Default includes fr:am:* and fr:idm:* wildcards for ForgeRock/Ping AIC access.
                </p>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={requestToken} 
                  disabled={loading || !clientId || !clientSecret || !tokenEndpoint}
                  className={`flex-1 flex items-center justify-center px-4 py-2 rounded-md text-white font-medium transition-colors ${
                    loading || !clientId || !clientSecret || !tokenEndpoint
                      ? 'bg-gray-600 cursor-not-allowed opacity-50'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {loading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Requesting...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Request Token
                    </>
                  )}
                </button>
                {isTokenValid && (
                  <button 
                    onClick={clearToken}
                    className="px-4 py-2 border border-gray-600 rounded-md text-gray-200 hover:bg-gray-700 transition-colors"
                  >
                    Clear Token
                  </button>
                )}
              </div>

              {isTokenValid && (
                <div className="bg-green-900/20 border border-green-800 rounded-md p-4">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-400 mt-0.5" />
                    <div className="text-sm text-green-300">
                      Token valid until {tokenExpiry?.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-900/20 border border-red-800 rounded-md p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-red-400 mt-0.5" />
                    <div className="text-sm text-red-300">{error}</div>
                  </div>
                </div>
              )}

              {success && !isTokenValid && (
                <div className="bg-green-900/20 border border-green-800 rounded-md p-4">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-400 mt-0.5" />
                    <div className="text-sm text-green-300">{success}</div>
                  </div>
                </div>
              )}

              {lastCurl && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-gray-200">cURL Command</label>
                    <button
                      onClick={() => copyToClipboard(lastCurl, 'curl')}
                      className="text-gray-400 hover:text-gray-200 p-1"
                    >
                      {copied === 'curl' ? (
                        <CheckCircle className="h-4 w-4 text-green-400" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <textarea
                    value={lastCurl}
                    readOnly
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-gray-100 font-mono text-xs"
                    rows={5}
                  />
                </div>
              )}

              {accessToken && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-gray-200">Access Token</label>
                    <button
                      onClick={() => copyToClipboard(accessToken, 'token')}
                      className="text-gray-400 hover:text-gray-200 p-1"
                    >
                      {copied === 'token' ? (
                        <CheckCircle className="h-4 w-4 text-green-400" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <textarea
                    value={accessToken}
                    readOnly
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-gray-100 font-mono text-xs"
                    rows={3}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Log Fetching Section */}
              <div>
                <h3 className="text-lg font-medium text-gray-100 mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-400" />
                  Log Retrieval
                </h3>
                
                <div className="space-y-4">
                  {/* API Authentication Section */}
                  <div className="p-4 bg-gray-900 rounded-lg border border-gray-700">
                    <h4 className="text-sm font-medium text-gray-200 mb-3">API Authentication (Required)</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="log-api-key" className="block text-sm font-medium text-gray-200 mb-2">
                          API Key *
                        </label>
                        <input
                          id="log-api-key"
                          type="text"
                          placeholder="Enter API key"
                          value={logApiKey}
                          onChange={(e) => setLogApiKey(e.target.value)}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label htmlFor="log-api-secret" className="block text-sm font-medium text-gray-200 mb-2">
                          API Secret *
                        </label>
                        <div className="relative flex items-center">
                          <input
                            id="log-api-secret"
                            type={showLogSecret ? 'text' : 'password'}
                            placeholder="Enter API secret"
                            value={logApiSecret}
                            onChange={(e) => setLogApiSecret(e.target.value)}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowLogSecret(!showLogSecret)}
                            className="absolute right-2 text-gray-400 hover:text-gray-200"
                          >
                            {showLogSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      Use x-api-key and x-api-secret headers per Ping AIC documentation. API secret is stored in memory only.
                    </p>
                  </div>

                  <div>
                    <label htmlFor="log-source" className="block text-sm font-medium text-gray-200 mb-2">
                      Log Source *
                    </label>
                    <select
                      id="log-source"
                      value={logSource}
                      onChange={(e) => setLogSource(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="am-core">am-core (AM Core)</option>
                      <option value="am-access">am-access (Access Audit)</option>
                      <option value="am-activity">am-activity (Activity Audit)</option>
                      <option value="am-authentication">am-authentication (Authentication Audit)</option>
                      <option value="am-config">am-config (Config Audit)</option>
                      <option value="idm-core">idm-core (IDM Core)</option>
                      <option value="idm-access">idm-access (IDM Access)</option>
                      <option value="idm-activity">idm-activity (IDM Activity)</option>
                      <option value="idm-authentication">idm-authentication (IDM Authentication)</option>
                      <option value="idm-config">idm-config (IDM Config)</option>
                      <option value="idm-sync">idm-sync (IDM Sync)</option>
                    </select>
                  </div>

                  {/* Filter Mode Toggle */}
                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-2">
                      Filter Mode
                    </label>
                    <div className="flex gap-2 bg-gray-900 rounded-lg p-1 border border-gray-700">
                      <button
                        onClick={() => setFilterMode('builder')}
                        className={`flex-1 py-2 px-4 text-sm font-medium transition-all rounded-md ${
                          filterMode === 'builder'
                            ? 'bg-gray-800 text-blue-400 border border-gray-600'
                            : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                        }`}
                      >
                        Filter Builder
                      </button>
                      <button
                        onClick={() => setFilterMode('custom')}
                        className={`flex-1 py-2 px-4 text-sm font-medium transition-all rounded-md ${
                          filterMode === 'custom'
                            ? 'bg-gray-800 text-blue-400 border border-gray-600'
                            : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                        }`}
                      >
                        Custom Query
                      </button>
                    </div>
                  </div>

                  {/* Filter Builder UI */}
                  {filterMode === 'builder' ? (
                    <div className="space-y-4 p-4 bg-gray-900 rounded-lg border border-gray-700">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="log-level" className="block text-sm font-medium text-gray-200 mb-2">
                            Log Level
                          </label>
                          <select
                            id="log-level"
                            value={logLevel}
                            onChange={(e) => setLogLevel(e.target.value)}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="">All Levels</option>
                            <option value="FATAL">FATAL</option>
                            <option value="ERROR">ERROR</option>
                            <option value="WARN">WARN</option>
                            <option value="WARNING">WARNING</option>
                            <option value="INFO">INFO</option>
                            <option value="DEBUG">DEBUG</option>
                            <option value="TRACE">TRACE</option>
                          </select>
                        </div>

                        <div>
                          <label htmlFor="page-size" className="block text-sm font-medium text-gray-200 mb-2">
                            Page Size
                          </label>
                          <input
                            id="page-size"
                            type="number"
                            placeholder="50"
                            value={logPageSize}
                            onChange={(e) => setLogPageSize(e.target.value)}
                            min="1"
                            max="1000"
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="text-sm font-medium text-gray-200">Time Range</label>
                          <button
                            onClick={() => {
                              const now = new Date()
                              const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
                              setBeginTime(yesterday.toISOString())
                              setEndTime(now.toISOString())
                            }}
                            className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
                          >
                            Reset to Last 24 Hours
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="begin-time" className="block text-xs font-medium text-gray-300 mb-1">
                              Begin Time
                            </label>
                            <input
                              id="begin-time"
                              type="datetime-local"
                              value={beginTime ? formatDateForInput(new Date(beginTime)) : ''}
                              onChange={(e) => setBeginTime(e.target.value ? new Date(e.target.value).toISOString() : '')}
                              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>

                          <div>
                            <label htmlFor="end-time" className="block text-xs font-medium text-gray-300 mb-1">
                              End Time
                            </label>
                            <input
                              id="end-time"
                              type="datetime-local"
                              value={endTime ? formatDateForInput(new Date(endTime)) : ''}
                              onChange={(e) => setEndTime(e.target.value ? new Date(e.target.value).toISOString() : '')}
                              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                        </div>
                      </div>

                      {nextPageCookie && (
                        <div>
                          <label htmlFor="page-cookie" className="block text-sm font-medium text-gray-200 mb-2">
                            Page Cookie (for pagination)
                          </label>
                          <div className="flex gap-2">
                            <input
                              id="page-cookie"
                              type="text"
                              value={logPageCookie}
                              onChange={(e) => setLogPageCookie(e.target.value)}
                              placeholder="Use cookie from previous response"
                              className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <button
                              onClick={() => setLogPageCookie(nextPageCookie)}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors text-sm"
                            >
                              Use Next
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4 p-4 bg-gray-900 rounded-lg border border-gray-700">
                      <div>
                        <label htmlFor="custom-filter" className="block text-sm font-medium text-gray-200 mb-2">
                          Custom Query Filter
                        </label>
                        <textarea
                          id="custom-filter"
                          placeholder='e.g., level eq "ERROR" and timestamp ge "2024-01-01T00:00:00Z"'
                          value={customFilter}
                          onChange={(e) => setCustomFilter(e.target.value)}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                          rows={3}
                        />
                        <p className="text-xs text-gray-400 mt-1">
                          Use CREST query filter syntax. Common fields: level, timestamp, message, transactionId. 
                          Note: beginTime/endTime are set separately above.
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="page-size-custom" className="block text-sm font-medium text-gray-200 mb-2">
                            Page Size
                          </label>
                          <input
                            id="page-size-custom"
                            type="number"
                            placeholder="50"
                            value={logPageSize}
                            onChange={(e) => setLogPageSize(e.target.value)}
                            min="1"
                            max="1000"
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        {nextPageCookie && (
                          <div>
                            <label htmlFor="page-cookie-custom" className="block text-sm font-medium text-gray-200 mb-2">
                              Page Cookie
                            </label>
                            <div className="flex gap-2">
                              <input
                                id="page-cookie-custom"
                                type="text"
                                value={logPageCookie}
                                onChange={(e) => setLogPageCookie(e.target.value)}
                                className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 placeholder-gray-400"
                              />
                              <button
                                onClick={() => setLogPageCookie(nextPageCookie)}
                                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs"
                              >
                                Next
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={fetchLogs}
                      disabled={fetchingLogs || !tenantUrl || !logApiKey || !logApiSecret}
                      className={`flex-1 flex items-center justify-center px-4 py-2 rounded-md text-white font-medium transition-colors ${
                        fetchingLogs || !tenantUrl || !logApiKey || !logApiSecret
                          ? 'bg-gray-600 cursor-not-allowed opacity-50'
                          : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                    >
                      {fetchingLogs ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Fetching Logs...
                        </>
                      ) : (
                        <>
                          <FileText className="mr-2 h-4 w-4" />
                          Fetch Logs
                        </>
                      )}
                    </button>
                    
                    {logs.length > 0 && (
                      <button
                        onClick={downloadLogs}
                        className="px-4 py-2 border border-gray-600 rounded-md text-gray-200 hover:bg-gray-700 transition-colors flex items-center"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download JSON
                      </button>
                    )}
                  </div>

                  {logsCurl && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-sm font-medium text-gray-200">cURL Command</label>
                        <button
                          onClick={() => copyToClipboard(logsCurl, 'logs-curl')}
                          className="text-gray-400 hover:text-gray-200 p-1"
                        >
                          {copied === 'logs-curl' ? (
                            <CheckCircle className="h-4 w-4 text-green-400" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      <textarea
                        value={logsCurl}
                        readOnly
                        className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-gray-100 font-mono text-xs"
                        rows={3}
                      />
                    </div>
                  )}

                  {error && (
                    <div className="bg-red-900/20 border border-red-800 rounded-md p-4">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-red-400 mt-0.5" />
                        <div className="text-sm text-red-300">{error}</div>
                      </div>
                    </div>
                  )}

                  {logs.length > 0 && (
                    <div className="space-y-4">
                      {/* Log Display Controls */}
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2 flex-1">
                          <Search className="h-4 w-4 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Search logs..."
                            value={clientFilter}
                            onChange={(e) => setClientFilter(e.target.value)}
                            className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          />
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <label className="text-sm text-gray-400">View:</label>
                          <button
                            onClick={() => setLogViewMode('table')}
                            className={`p-2 rounded ${logViewMode === 'table' ? 'bg-gray-700 text-blue-400' : 'text-gray-400 hover:text-gray-200'}`}
                            title="Table View"
                          >
                            <Table className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setLogViewMode('json')}
                            className={`p-2 rounded ${logViewMode === 'json' ? 'bg-gray-700 text-blue-400' : 'text-gray-400 hover:text-gray-200'}`}
                            title="JSON View"
                          >
                            <Code className="h-4 w-4" />
                          </button>
                        </div>
                        
                        <select
                          value={logsPerPage}
                          onChange={(e) => setLogsPerPage(Number(e.target.value))}
                          className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 text-sm"
                        >
                          <option value={10}>10 per page</option>
                          <option value={25}>25 per page</option>
                          <option value={50}>50 per page</option>
                          <option value={100}>100 per page</option>
                        </select>
                      </div>

                      {/* Stats Bar */}
                      <div className="flex justify-between items-center text-sm text-gray-400">
                        <span>
                          Showing {startIndex + 1}-{Math.min(endIndex, filteredLogs.length)} of {filteredLogs.length} filtered logs
                          {clientFilter && ` (${logs.length} total)`}
                        </span>
                        <span>
                          Page {currentPage} of {totalPages || 1}
                        </span>
                      </div>

                      {/* Log Display */}
                      <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
                        {logViewMode === 'table' ? (
                          <div className="overflow-x-auto">
                            <table className="w-full table-fixed">
                              <colgroup>
                                <col className="w-[180px]" />
                                <col className="w-[100px]" />
                                <col className="w-auto" />
                                <col className="w-[250px]" />
                              </colgroup>
                              <thead className="bg-gray-800 border-b border-gray-700">
                                <tr className="text-xs text-gray-400">
                                  <th className="text-left p-3">Timestamp</th>
                                  <th className="text-left p-3">Level</th>
                                  <th className="text-left p-3">Message / Logger</th>
                                  <th className="text-left p-3">Details</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-700">
                                {paginatedLogs.map((log, index) => {
                                  const globalIndex = startIndex + index
                                  const isExpanded = expandedLogs.has(globalIndex)
                                  
                                  // Extract data from nested payload or use direct fields
                                  const timestamp = log.payload?.timestamp || log.timestamp
                                  const level = log.payload?.level || log.level
                                  const message = log.payload?.message || log.message
                                  const transactionId = log.payload?.transactionId || log.payload?.mdc?.transactionId
                                  const logger = log.payload?.logger
                                  const thread = log.payload?.thread
                                  const source = log.source
                                  
                                  return (
                                    <tr key={globalIndex} className="hover:bg-gray-800/50 transition-colors">
                                      <td className="p-3 text-xs text-gray-300 whitespace-nowrap">
                                        {timestamp ? new Date(timestamp).toLocaleString() : 'N/A'}
                                      </td>
                                      <td className="p-3">
                                        <span className={`text-xs px-2 py-1 rounded-full ${
                                          level === 'ERROR' ? 'bg-red-900/50 text-red-400' :
                                          level === 'WARN' ? 'bg-yellow-900/50 text-yellow-400' :
                                          level === 'INFO' ? 'bg-blue-900/50 text-blue-400' :
                                          level === 'DEBUG' ? 'bg-gray-700 text-gray-400' :
                                          level === 'TRACE' ? 'bg-purple-900/50 text-purple-400' :
                                          'bg-gray-700 text-gray-400'
                                        }`}>
                                          {level || 'N/A'}
                                        </span>
                                      </td>
                                      <td className="p-3 text-xs text-gray-300">
                                        <div className="space-y-1">
                                          <div className="font-medium break-words whitespace-normal leading-relaxed">
                                            {message || 'No message'}
                                          </div>
                                          {logger && (
                                            <div className="text-gray-500 text-[10px] break-all opacity-75 mt-1">
                                              {logger}
                                            </div>
                                          )}
                                        </div>
                                      </td>
                                      <td className="p-3">
                                        <div className="flex items-start gap-2">
                                          <div className="text-[10px] text-gray-500 space-y-1">
                                            {source && <div>Source: {source}</div>}
                                            {transactionId && <div className="truncate max-w-[150px]" title={transactionId}>TxID: {transactionId}</div>}
                                            {thread && <div className="truncate max-w-[150px]" title={thread}>Thread: {thread}</div>}
                                          </div>
                                          <button
                                            onClick={() => toggleLogExpansion(globalIndex)}
                                            className="text-gray-400 hover:text-gray-200 p-1 ml-auto"
                                          >
                                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                          </button>
                                        </div>
                                        {isExpanded && (
                                          <div className="mt-2 p-2 bg-gray-800 rounded text-xs text-gray-300 font-mono overflow-x-auto max-w-full">
                                            <pre className="whitespace-pre-wrap break-words">{JSON.stringify(log, null, 2)}</pre>
                                          </div>
                                        )}
                                      </td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="p-4 max-h-[600px] overflow-y-auto">
                            <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap">
                              {JSON.stringify(paginatedLogs, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>

                      {/* Pagination Controls */}
                      {totalPages > 1 && (
                        <div className="flex justify-center items-center gap-2">
                          <button
                            onClick={() => setCurrentPage(1)}
                            disabled={currentPage === 1}
                            className="p-2 text-gray-400 hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <ChevronLeft className="h-4 w-4" />
                            <ChevronLeft className="h-4 w-4 -ml-2" />
                          </button>
                          <button
                            onClick={() => setCurrentPage(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="p-2 text-gray-400 hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                          
                          <div className="flex gap-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                              let pageNum
                              if (totalPages <= 5) {
                                pageNum = i + 1
                              } else if (currentPage <= 3) {
                                pageNum = i + 1
                              } else if (currentPage >= totalPages - 2) {
                                pageNum = totalPages - 4 + i
                              } else {
                                pageNum = currentPage - 2 + i
                              }
                              
                              return (
                                <button
                                  key={pageNum}
                                  onClick={() => setCurrentPage(pageNum)}
                                  className={`px-3 py-1 rounded ${
                                    currentPage === pageNum
                                      ? 'bg-blue-600 text-white'
                                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                                  }`}
                                >
                                  {pageNum}
                                </button>
                              )
                            })}
                          </div>
                          
                          <button
                            onClick={() => setCurrentPage(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="p-2 text-gray-400 hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setCurrentPage(totalPages)}
                            disabled={currentPage === totalPages}
                            className="p-2 text-gray-400 hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <ChevronRight className="h-4 w-4" />
                            <ChevronRight className="h-4 w-4 -ml-2" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Custom IDM Endpoints Section */}
              <div className="space-y-4 mt-6">
                <h3 className="text-lg font-medium text-gray-100 mb-4 flex items-center gap-2">
                  <Code className="h-5 w-5 text-purple-400" />
                  Custom IDM Endpoints
                </h3>
                
                <div className="space-y-4">
                  {/* NFL User Profile Endpoint */}
                  <div className="p-4 bg-gray-900 rounded-lg border border-gray-700">
                    <h4 className="text-sm font-medium text-gray-200 mb-3">NFL User Profile Endpoint</h4>
                    <p className="text-xs text-gray-400 mb-3">
                      Custom endpoint for reading and updating NFL user profiles with field mapping
                    </p>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-300 mb-1">User ID</label>
                        <input
                          type="text"
                          placeholder="Enter user ID"
                          value={nflUserId}
                          onChange={(e) => setNflUserId(e.target.value)}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-300 mb-1">Method</label>
                        <select
                          value={nflUserMethod}
                          onChange={(e) => setNflUserMethod(e.target.value as 'GET' | 'PUT' | 'PATCH')}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        >
                          <option value="GET">GET - Read Profile</option>
                          <option value="PUT">PUT - Full Update</option>
                          <option value="PATCH">PATCH - Partial Update</option>
                        </select>
                      </div>
                      
                      {nflUserMethod !== 'GET' && (
                        <div>
                          <label className="block text-xs font-medium text-gray-300 mb-1">User Data (JSON)</label>
                          <textarea
                            placeholder='{"favoriteTeam": "SF", "isMilitary": true}'
                            value={nflUserData}
                            onChange={(e) => setNflUserData(e.target.value)}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-mono"
                            rows={3}
                          />
                        </div>
                      )}
                      
                      <button 
                        onClick={() => callNflUserEndpoint(nflUserMethod)}
                        disabled={!nflUserId || !isTokenValid || customEndpointLoading || (nflUserMethod !== 'GET' && !nflUserData)}
                        className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {customEndpointLoading ? 'Loading...' : `Execute ${nflUserMethod} Request`}
                      </button>
                      
                      <div className="text-xs text-gray-500">
                        Endpoint: {tenantUrl}/openidm/endpoint/nfluser/{'{userId}'}
                      </div>
                      
                      {customEndpointResult && (
                        <div className="text-xs text-center text-green-400 animate-pulse">
                          ✓ Response received - scroll down to view
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Schema Configuration Endpoint */}
                  <div className="p-4 bg-gray-900 rounded-lg border border-gray-700">
                    <h4 className="text-sm font-medium text-gray-200 mb-3">Schema Configuration Endpoint</h4>
                    <p className="text-xs text-gray-400 mb-3">
                      Read-only endpoint to retrieve NFL user schema mapping configuration
                    </p>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-300 mb-1">Field Name (Optional)</label>
                        <input
                          type="text"
                          placeholder="Leave empty for full schema"
                          value={schemaFieldName}
                          onChange={(e) => setSchemaFieldName(e.target.value)}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        />
                      </div>

                      <button
                        onClick={callSchemaConfigEndpoint}
                        disabled={!isTokenValid || customEndpointLoading}
                        className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {customEndpointLoading ? 'Loading...' : 'GET Schema Config'}
                      </button>

                      <div className="text-xs text-gray-500">
                        Endpoint: {tenantUrl}/openidm/endpoint/nflschemaconfig/{'{fieldName}'}
                      </div>

                      {customEndpointResult && (
                        <div className="text-xs text-center text-green-400 animate-pulse">
                          ✓ Response received - scroll down to view
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Reconciliation Endpoint */}
                  <div className="p-4 bg-gray-900 rounded-lg border border-gray-700">
                    <h4 className="text-sm font-medium text-gray-200 mb-3">Reconciliation Endpoint</h4>
                    <p className="text-xs text-gray-400 mb-3">
                      Trigger reconciliation for a specific user by ID
                    </p>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-300 mb-1">User ID *</label>
                        <input
                          type="text"
                          placeholder="Enter user ID (e.g., 08c2aa895da240aaa7a1a21ee59177de)"
                          value={reconId}
                          onChange={(e) => setReconId(e.target.value)}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-300 mb-1">Action</label>
                          <input
                            type="text"
                            value={reconAction}
                            onChange={(e) => setReconAction(e.target.value)}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          />
                          <p className="text-[10px] text-gray-500 mt-1">Default: reconById</p>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-300 mb-1 flex items-center gap-2">
                            <span>Run Target Phase</span>
                            <input
                              type="checkbox"
                              checked={reconRunTargetPhase}
                              onChange={(e) => setReconRunTargetPhase(e.target.checked)}
                              className="rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500"
                            />
                          </label>
                          <div className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-gray-400 text-sm">
                            {reconRunTargetPhase ? 'true' : 'false'}
                          </div>
                          <p className="text-[10px] text-gray-500 mt-1">Default: false</p>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-300 mb-1">Mapping</label>
                        <input
                          type="text"
                          value={reconMapping}
                          onChange={(e) => setReconMapping(e.target.value)}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-mono"
                        />
                        <p className="text-[10px] text-gray-500 mt-1">Default: systemGigya__account___managedAlpha_user</p>
                      </div>

                      <button
                        onClick={callReconEndpoint}
                        disabled={!reconId || !isTokenValid || customEndpointLoading}
                        className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {customEndpointLoading ? 'Loading...' : 'POST Reconciliation Request'}
                      </button>

                      <div className="text-xs text-gray-500 break-all">
                        Endpoint: {tenantUrl}/openidm/recon?_action={reconAction}&mapping={reconMapping}&id={reconId || '{userId}'}
                      </div>

                      {customEndpointResult && (
                        <div className="text-xs text-center text-green-400 animate-pulse">
                          ✓ Response received - scroll down to view
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Simplified Ping Search API Section */}
                  <div className="mt-4">
                    <SimplePingSearch
                      environment={tenantUrl || 'Not configured'}
                      accessToken={accessToken}
                      onSearch={handlePingSearch}
                    />
                  </div>

                  {/* Reconciliation Management */}
                  <div className="bg-gray-900 rounded-lg p-6 border border-gray-700 mt-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <RefreshCw className="w-5 h-5" />
                        Reconciliation Management
                      </h3>
                      <button
                        onClick={fetchReconciliations}
                        disabled={!accessToken || !tenantUrl || fetchingRecons}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                      >
                        <RefreshCw className={`w-4 h-4 ${fetchingRecons ? 'animate-spin' : ''}`} />
                        {fetchingRecons ? 'Fetching...' : 'Fetch Reconciliations'}
                      </button>
                    </div>

                    {reconError && (
                      <div className="mb-4 p-3 bg-red-900/20 border border-red-800 rounded-lg flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-red-200">{reconError}</span>
                      </div>
                    )}

                    {reconciliations.length > 0 && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-700">
                              <th className="text-left p-3 font-medium text-gray-400">Reconciliation ID</th>
                              <th className="text-left p-3 font-medium text-gray-400">Mapping</th>
                              <th className="text-left p-3 font-medium text-gray-400">State</th>
                              <th className="text-left p-3 font-medium text-gray-400">Stage</th>
                              <th className="text-left p-3 font-medium text-gray-400">Progress</th>
                              <th className="text-left p-3 font-medium text-gray-400">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reconciliations.map((recon) => (
                              <tr key={recon._id} className="border-b border-gray-800 hover:bg-gray-800/50">
                                <td className="p-3 font-mono text-xs">{recon._id}</td>
                                <td className="p-3">{recon.mapping || 'N/A'}</td>
                                <td className="p-3">
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                                    recon.state === 'ACTIVE' ? 'bg-blue-900/50 text-blue-300' :
                                    recon.state === 'SUCCESS' ? 'bg-green-900/50 text-green-300' :
                                    recon.state === 'CANCELED' ? 'bg-yellow-900/50 text-yellow-300' :
                                    'bg-red-900/50 text-red-300'
                                  }`}>
                                    {recon.state}
                                  </span>
                                </td>
                                <td className="p-3 text-xs">{recon.stageDescription || recon.stage || 'N/A'}</td>
                                <td className="p-3 text-xs">
                                  {recon.progress?.source?.existing ? (
                                    <span>
                                      {recon.progress.source.existing.processed} / {recon.progress.source.existing.total}
                                    </span>
                                  ) : 'N/A'}
                                </td>
                                <td className="p-3">
                                  {recon.state === 'ACTIVE' && (
                                    <button
                                      onClick={() => handleCancelReconciliation(recon._id)}
                                      disabled={cancellingRecon === recon._id}
                                      className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-xs transition-colors"
                                    >
                                      {cancellingRecon === recon._id ? 'Cancelling...' : 'Cancel'}
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {!fetchingRecons && reconciliations.length === 0 && !reconError && (
                      <div className="text-center py-8 text-gray-500">
                        Click "Fetch Reconciliations" to load running jobs
                      </div>
                    )}
                  </div>

                  {/* Custom Endpoint Response Section */}
                  {customEndpointCurl && (
                    <div className="space-y-2 mt-4">
                      <div className="flex justify-between items-center">
                        <label className="text-sm font-medium text-gray-200">cURL Command</label>
                        <button
                          onClick={() => copyToClipboard(customEndpointCurl, 'custom-curl')}
                          className="text-gray-400 hover:text-gray-200 p-1"
                        >
                          {copied === 'custom-curl' ? (
                            <CheckCircle className="h-4 w-4 text-green-400" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      <textarea
                        value={customEndpointCurl}
                        readOnly
                        className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-gray-100 font-mono text-xs"
                        rows={4}
                      />
                    </div>
                  )}
                  
                  {customEndpointResult && (
                    <div className="mt-4 p-4 bg-gray-900 border border-gray-700 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-sm font-medium text-gray-200">Response</label>
                        <button
                          onClick={() => copyToClipboard(JSON.stringify(customEndpointResult, null, 2), 'custom-result')}
                          className="text-gray-400 hover:text-gray-200 p-1"
                        >
                          {copied === 'custom-result' ? (
                            <CheckCircle className="h-4 w-4 text-green-400" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap overflow-x-auto">
                        {JSON.stringify(customEndpointResult, null, 2)}
                      </pre>
                    </div>
                  )}
                  
                  {/* Help Section - At the very bottom */}
                  <div className="bg-yellow-900/20 border border-yellow-800 rounded-md p-4 mt-6">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-yellow-400 mt-0.5" />
                      <div>
                        <div className="text-sm text-yellow-300 mb-2">
                          Finding API Keys & Secrets in Ping AIC Console
                        </div>
                        <ol className="list-decimal list-inside text-xs text-yellow-200 space-y-1">
                          <li>Log into Ping AIC Console</li>
                          <li>Navigate to <strong>Tenant Settings</strong> → <strong>API Credentials</strong></li>
                          <li>Click <strong>"+ New Credential"</strong> or use existing</li>
                          <li>Select appropriate scopes (fr:idm:*, fr:am:*)</li>
                          <li>Copy the API Key and Secret (secret only shown once!)</li>
                          <li>For logs: Ensure "fr:idc:analytics:*" scope is included</li>
                        </ol>
                        <div className="mt-2 text-xs text-yellow-200">
                          <strong>Note:</strong> Store API secrets securely. They cannot be retrieved after creation.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Toast Notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
          duration={5000}
        />
      )}
    </div>
  )
}