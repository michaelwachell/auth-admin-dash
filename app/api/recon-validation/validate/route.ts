import { NextRequest } from 'next/server'

// --- In-memory CSV store (shared with download endpoint via module) ---
// Using a global map so the download route can access it
declare global {
  var reconCsvStore: Map<string, { csv: string; createdAt: number }> | undefined
}

if (!global.reconCsvStore) {
  global.reconCsvStore = new Map()
}

const csvStore = global.reconCsvStore

// --- Semaphore for concurrency control ---

class Semaphore {
  private permits: number
  private waiting: (() => void)[] = []

  constructor(permits: number) {
    this.permits = permits
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--
      return
    }
    await new Promise<void>((resolve) => this.waiting.push(resolve))
  }

  release(): void {
    if (this.waiting.length > 0) {
      const next = this.waiting.shift()!
      next()
    } else {
      this.permits++
    }
  }
}

// --- Gigya getAccountInfo (server-side, env var auth) ---

interface GigyaGetAccountResponse {
  UID?: string
  statusCode?: number
  errorCode?: number
  errorMessage?: string
  callId?: string
  profile?: {
    email?: string
    firstName?: string
    lastName?: string
  }
  isActive?: boolean
  isRegistered?: boolean
  isVerified?: boolean
  created?: string
  lastUpdated?: string
  lastLogin?: string
}

const getGigyaAccount = async (uid: string): Promise<GigyaGetAccountResponse> => {
  const apiKey = process.env.GIGYA_API_KEY
  const secret = process.env.GIGYA_SECRET_KEY
  const dataCenter = process.env.GIGYA_DATA_CENTER
  const userKey = process.env.GIGYA_USER_KEY

  if (!apiKey || !secret || !dataCenter) {
    return {
      errorCode: -1,
      errorMessage: 'Gigya environment variables not configured (GIGYA_API_KEY, GIGYA_SECRET_KEY, GIGYA_DATA_CENTER)',
      statusCode: 500
    }
  }

  const url = `https://accounts.${dataCenter}.gigya.com/accounts.getAccountInfo`
  const formData = new URLSearchParams()
  formData.append('apiKey', apiKey)
  formData.append('secret', secret)
  if (userKey) {
    formData.append('userKey', userKey)
  }
  formData.append('UID', uid)
  formData.append('include', 'profile')
  formData.append('format', 'json')

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData.toString()
  })

  return response.json()
}

// --- Gigya batch search (accounts.search) ---

interface GigyaSearchResult {
  UID: string
  profile?: {
    email?: string
    firstName?: string
    lastName?: string
  }
  isActive?: boolean
  isRegistered?: boolean
  isVerified?: boolean
  created?: string
  lastUpdated?: string
  lastLogin?: string
}

interface GigyaSearchResponse {
  statusCode?: number
  errorCode?: number
  errorMessage?: string
  callId?: string
  results?: GigyaSearchResult[]
  objectsCount?: number
  totalCount?: number
  nextCursorId?: string
}

/**
 * Batch-fetch Gigya accounts using accounts.search with UID IN (...) query.
 * Returns a Map<rawUid, GigyaGetAccountResponse> for O(1) lookups.
 * UIDs not found in search results are returned as missing (caller should
 * fall back to individual getAccountInfo for those — they may be orphaned).
 */
const batchGetGigyaAccounts = async (
  uids: string[]
): Promise<Map<string, GigyaGetAccountResponse>> => {
  const apiKey = process.env.GIGYA_API_KEY
  const secret = process.env.GIGYA_SECRET_KEY
  const dataCenter = process.env.GIGYA_DATA_CENTER
  const userKey = process.env.GIGYA_USER_KEY

  const resultMap = new Map<string, GigyaGetAccountResponse>()

  if (!apiKey || !secret || !dataCenter || uids.length === 0) {
    return resultMap
  }

  // Build SQL-like query: SELECT * FROM accounts WHERE UID IN ("uid1","uid2",...)
  // Gigya search has a query size limit, so chunk into groups
  const CHUNK_SIZE = 50
  for (let i = 0; i < uids.length; i += CHUNK_SIZE) {
    const chunk = uids.slice(i, i + CHUNK_SIZE)
    const uidList = chunk.map((uid) => `"${uid}"`).join(',')
    const query = `SELECT UID, profile, isActive, created, lastUpdated, lastLogin FROM accounts WHERE UID IN (${uidList})`

    const url = `https://accounts.${dataCenter}.gigya.com/accounts.search`
    const formData = new URLSearchParams()
    formData.append('apiKey', apiKey)
    formData.append('secret', secret)
    if (userKey) {
      formData.append('userKey', userKey)
    }
    formData.append('query', query)
    formData.append('format', 'json')

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString()
      })

      const data: GigyaSearchResponse = await response.json()

      if (data.errorCode && data.errorCode !== 0) {
        console.warn(`[Recon Validation] Batch search error (chunk ${i / CHUNK_SIZE}):`, data.errorMessage)
        // Fall back: mark all UIDs in this chunk as needing individual lookup
        continue
      }

      // Map results by UID (lowercase for case-insensitive matching)
      if (data.results) {
        for (const result of data.results) {
          const uid = result.UID
          // Convert search result to match getAccountInfo response shape
          resultMap.set(uid.toLowerCase(), {
            UID: uid,
            errorCode: 0,
            profile: result.profile,
            isActive: result.isActive,
            isRegistered: result.isRegistered,
            isVerified: result.isVerified,
            created: result.created,
            lastUpdated: result.lastUpdated,
            lastLogin: result.lastLogin
          })
        }
      }

      // Handle pagination within batch search (if more results than default limit)
      let cursorId = data.nextCursorId
      while (cursorId) {
        const cursorForm = new URLSearchParams()
        cursorForm.append('apiKey', apiKey)
        cursorForm.append('secret', secret)
        if (userKey) {
          cursorForm.append('userKey', userKey)
        }
        cursorForm.append('cursorId', cursorId)
        cursorForm.append('format', 'json')

        const cursorResponse = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: cursorForm.toString()
        })
        const cursorData: GigyaSearchResponse = await cursorResponse.json()

        if (cursorData.results) {
          for (const result of cursorData.results) {
            resultMap.set(result.UID.toLowerCase(), {
              UID: result.UID,
              errorCode: 0,
              profile: result.profile,
              isActive: result.isActive,
              isRegistered: result.isRegistered,
              isVerified: result.isVerified,
              created: result.created,
              lastUpdated: result.lastUpdated,
              lastLogin: result.lastLogin
            })
          }
        }
        cursorId = cursorData.nextCursorId
      }
    } catch (err: any) {
      console.warn(`[Recon Validation] Batch search failed for chunk ${i / CHUNK_SIZE}:`, err.message)
      // Chunks that fail will be handled by individual fallback
    }
  }

  return resultMap
}

// --- Ping IDM helpers ---

const getPingAccessToken = async (
  tokenEndpoint: string,
  clientId: string,
  clientSecret: string,
  scopes: string
): Promise<{ access_token: string; expires_in: number }> => {
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
  const formData = new URLSearchParams()
  formData.append('grant_type', 'client_credentials')
  if (scopes) {
    formData.append('scope', scopes)
  }

  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${credentials}`
    },
    body: formData.toString()
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Token request failed' }))
    throw new Error(error.error_description || error.error || 'Failed to obtain Ping access token')
  }

  return response.json()
}

interface PingSearchResult {
  _id: string
  _rev?: string
  userName?: string
  mail?: string
  givenName?: string
  sn?: string
  accountStatus?: string
  frIndexedString16?: string
  frIndexedString20?: string
  [key: string]: any
}

interface PingSearchResponse {
  result: PingSearchResult[]
  resultCount: number
  pagedResultsCookie?: string | null
  totalPagedResults?: number
  remainingPagedResults?: number
}

const searchPingUsers = async (
  baseUrl: string,
  accessToken: string,
  queryFilter: string,
  pageSize: number,
  pagedResultsCookie?: string
): Promise<PingSearchResponse> => {
  // Normalize baseUrl - strip trailing slashes and any path
  const normalizedBase = baseUrl.replace(/\/+$/, '')
  const searchUrl = new URL(`${normalizedBase}/openidm/managed/alpha_user`)
  searchUrl.searchParams.append('_queryFilter', queryFilter)
  searchUrl.searchParams.append('_fields', '_id,userName,mail,givenName,sn,accountStatus,frIndexedString16,frIndexedString20')
  searchUrl.searchParams.append('_pageSize', pageSize.toString())

  if (pagedResultsCookie) {
    searchUrl.searchParams.append('_pagedResultsCookie', pagedResultsCookie)
  }

  const fullUrl = searchUrl.toString()
  console.log('[Recon Validation] Ping search URL:', fullUrl)

  const response = await fetch(fullUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
      'Accept-API-Version': 'resource=1.0'
    }
  })

  if (!response.ok) {
    const errorBody = await response.text()
    console.error('[Recon Validation] Ping search error:', response.status, errorBody)
    throw new Error(`Ping search failed (${response.status}): ${errorBody}`)
  }

  const data = await response.json()
  console.log('[Recon Validation] Ping search returned:', data.resultCount, 'users, cookie:', !!data.pagedResultsCookie)
  return data
}

// --- UID conversion (same regex as sync mapping) ---

const convertGigyaUidToUuid = (uid: string): string => {
  if (uid.includes('-')) return uid
  return uid.replace(
    /([0-9a-fA-F]{8})([0-9a-fA-F]{4})([0-9a-fA-F]{4})([0-9a-fA-F]{4})([0-9a-fA-F]{12})/,
    '$1-$2-$3-$4-$5'
  )
}

const stripDashes = (uuid: string): string => uuid.replace(/-/g, '')

// --- Retry with exponential backoff ---

const withRetry = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000,
  label: string = 'operation'
): Promise<T> => {
  let lastError: Error | undefined
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err: any) {
      lastError = err
      if (attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt)
        console.warn(`[Recon Validation] ${label} failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms:`, err.message)
        await new Promise((r) => setTimeout(r, delay))
      }
    }
  }
  throw lastError!
}

// --- CSV escaping ---

const csvEscape = (value: string): string => {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

// --- Validation mismatch interface ---

interface Mismatch {
  id: string
  pingUserId: string
  email: string
  gigyaUid: string
  mismatchType: string
  pingValue: string
  gigyaValue: string
  timestamp: string
  details?: string
}

// --- Main POST handler ---

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      tenantUrl,
      clientId,
      clientSecret,
      tokenEndpoint,
      scopes = 'fr:idm:*',
      startDate,
      concurrency = 30,
      pageSize = 100,
      maxUsers,
      // Resume support
      resumeFromCookie,
      resumeProgress,
      // Spot check support
      spotCheck
    } = body

    if (!tenantUrl || !clientId || !clientSecret || !tokenEndpoint) {
      return new Response(
        JSON.stringify({ error: 'Missing required connection parameters' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Generate job ID
    const jobId = `recon-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    // Clean up old CSV entries (older than 1 hour)
    const oneHourAgo = Date.now() - 3600000
    const keysToDelete: string[] = []
    csvStore.forEach((value, key) => {
      if (value.createdAt < oneHourAgo) {
        keysToDelete.push(key)
      }
    })
    keysToDelete.forEach((key) => csvStore.delete(key))

    // Create SSE stream
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const send = (type: string, data: any) => {
          try {
            const message = `data: ${JSON.stringify({ type, data })}\n\n`
            controller.enqueue(encoder.encode(message))
          } catch {
            // Stream may be closed
          }
        }

        // --- Progress state (resume from checkpoint if provided) ---
        const progress = {
          totalProcessed: resumeProgress?.totalProcessed || 0,
          matches: resumeProgress?.matches || 0,
          mismatches: resumeProgress?.mismatches || 0,
          errors: resumeProgress?.errors || 0,
          isRunning: true,
          startTime: resumeProgress?.startTime || Date.now(),
          lastUpdateTime: Date.now(),
          rate: 0
        }

        // Track most recent Gigya lastUpdated/lastLogin for date-based resume fallback
        let lastProcessedDate: string | undefined = body.resumeLastProcessedDate || undefined

        // --- CSV accumulator ---
        const csvRows: string[] = [
          'PingID,GigyaUID,Email,MismatchType,PingValue,GigyaValue,Timestamp,Details'
        ]

        const semaphore = new Semaphore(concurrency)
        let mismatchCounter = (resumeProgress?.mismatches || 0) + (resumeProgress?.errors || 0)

        try {
          // --- Step 1: Authenticate to Ping ---
          console.log('[Recon Validation] Authenticating to Ping...', { tokenEndpoint, scopes })
          let tokenData = await getPingAccessToken(tokenEndpoint, clientId, clientSecret, scopes)
          let accessToken = tokenData.access_token
          let tokenObtainedAt = Date.now()
          let tokenExpiresIn = tokenData.expires_in
          console.log('[Recon Validation] Token obtained, expires_in:', tokenExpiresIn)

          const isResuming = !!resumeFromCookie
          send('progress', {
            ...progress,
            message: isResuming
              ? `Resuming validation from checkpoint (${progress.totalProcessed} already processed)...`
              : 'Authenticated to Ping. Starting validation...'
          })

          // --- Spot check: build exclude set ---
          const spotCheckExcludeSet = new Set<string>(
            (spotCheck?.excludeUids || []).map((uid: string) => uid.toLowerCase())
          )
          const spotCheckSampleSize = spotCheck?.sampleSize || 0
          const isSpotCheck = !!spotCheck
          const sampledUserIds: string[] = []

          // --- Step 2: Paginate through Ping users ---
          let pagedResultsCookie: string | undefined = resumeFromCookie || undefined
          let hasMore = true
          let prefetchedPage: PingSearchResponse | null = null

          while (hasMore) {
            // Check abort
            if (request.signal.aborted) {
              send('error', { message: 'Validation aborted by user' })
              break
            }

            // Refresh Ping token if near expiry (60s buffer)
            const elapsed = (Date.now() - tokenObtainedAt) / 1000
            if (elapsed > tokenExpiresIn - 60) {
              try {
                tokenData = await withRetry(
                  () => getPingAccessToken(tokenEndpoint, clientId, clientSecret, scopes),
                  2, 2000, 'Token refresh'
                )
                accessToken = tokenData.access_token
                tokenObtainedAt = Date.now()
                tokenExpiresIn = tokenData.expires_in
              } catch (err: any) {
                send('error', { message: 'Failed to refresh Ping token after retries', details: err.message })
                break
              }
            }

            // Use prefetched page if available (pipeline optimization), otherwise fetch
            let searchResponse: PingSearchResponse
            if (prefetchedPage) {
              searchResponse = prefetchedPage
              prefetchedPage = null
              console.log('[Recon Validation] Using prefetched page')
            } else {
              console.log('[Recon Validation] Fetching batch...', { tenantUrl, pageSize, hasCookie: !!pagedResultsCookie })
              try {
                searchResponse = await withRetry(
                  () => searchPingUsers(
                    tenantUrl,
                    accessToken,
                    'true',
                    pageSize,
                    pagedResultsCookie
                  ),
                  3, 2000, 'Ping search'
                )
              } catch (err: any) {
                console.error('[Recon Validation] Search failed after retries:', err.message)
                send('error', { message: 'Ping search failed after retries', details: err.message })
                break
              }
            }

            console.log('[Recon Validation] Search response:', {
              resultCount: searchResponse.resultCount,
              resultLength: searchResponse.result?.length,
              hasMore: !!searchResponse.pagedResultsCookie,
              totalPagedResults: searchResponse.totalPagedResults
            })

            let users = searchResponse.result
            if (!users || users.length === 0) {
              console.log('[Recon Validation] No users returned, ending pagination')
              hasMore = false
              break
            }

            // Update pagination cookie
            pagedResultsCookie = searchResponse.pagedResultsCookie || undefined
            if (!pagedResultsCookie) {
              hasMore = false
            }

            // Spot check: sample users from this page
            if (isSpotCheck) {
              // Filter out previously checked
              const eligible = users.filter(
                (u) => !spotCheckExcludeSet.has(u._id.toLowerCase())
              )
              // Determine how many to sample from this page
              const remaining = spotCheckSampleSize - sampledUserIds.length
              if (remaining <= 0) {
                hasMore = false
                break
              }
              // Reservoir-style: take a proportional random sample
              const sampleCount = Math.min(remaining, Math.max(1, Math.ceil(eligible.length * 0.3)))
              // Shuffle and take first N
              const shuffled = eligible.sort(() => Math.random() - 0.5)
              users = shuffled.slice(0, sampleCount)
              for (const u of users) {
                sampledUserIds.push(u._id)
              }
            }

            // --- Step 3: Batch-fetch Gigya accounts, then validate ---

            // Collect raw UIDs for batch lookup
            const uidMap = new Map<string, PingSearchResult>() // rawUid → pingUser
            const missingUidUsers: PingSearchResult[] = []
            for (const pingUser of users) {
              const rawUid = pingUser.frIndexedString16 || stripDashes(pingUser._id)
              uidMap.set(rawUid.toLowerCase(), pingUser)
              if (!pingUser.frIndexedString16) {
                missingUidUsers.push(pingUser)
              }
            }

            // Batch-fetch all Gigya accounts for this page in one search call
            const allRawUids = Array.from(uidMap.keys())
            console.log(`[Recon Validation] Batch-fetching ${allRawUids.length} Gigya accounts...`)
            let gigyaBatchMap: Map<string, GigyaGetAccountResponse>
            try {
              gigyaBatchMap = await withRetry(
                () => batchGetGigyaAccounts(allRawUids),
                2, 2000, 'Gigya batch search'
              )
              console.log(`[Recon Validation] Batch search returned ${gigyaBatchMap.size} accounts`)
            } catch (err: any) {
              console.warn('[Recon Validation] Batch search failed, falling back to individual lookups:', err.message)
              gigyaBatchMap = new Map()
            }

            // Pipeline: start prefetching next page while we validate current batch
            let nextPagePromise: Promise<PingSearchResponse | null> | undefined
            if (hasMore && pagedResultsCookie) {
              nextPagePromise = withRetry(
                () => searchPingUsers(tenantUrl, accessToken, 'true', pageSize, pagedResultsCookie),
                3, 2000, 'Ping search (prefetch)'
              ).catch((err) => {
                console.warn('[Recon Validation] Prefetch failed, will retry in main loop:', err.message)
                return null
              })
            }

            // Validate each user against batch results
            const validateUser = (pingUser: PingSearchResult, gigyaAccount: GigyaGetAccountResponse | null) => {
              progress.totalProcessed++
              const rawUid = pingUser.frIndexedString16 || stripDashes(pingUser._id)
              const pingEmail = pingUser.userName || pingUser.mail || ''

              // Flag missing UID field
              if (!pingUser.frIndexedString16) {
                mismatchCounter++
                const mismatch: Mismatch = {
                  id: `m-${mismatchCounter}`,
                  pingUserId: pingUser._id,
                  email: pingEmail,
                  gigyaUid: '',
                  mismatchType: 'missing_uid_field',
                  pingValue: 'frIndexedString16: (empty)',
                  gigyaValue: 'N/A',
                  timestamp: new Date().toISOString(),
                  details: 'frIndexedString16 is empty/missing - cannot verify Gigya UID mapping'
                }
                progress.mismatches++
                send('mismatch', mismatch)
                csvRows.push(
                  [pingUser._id, '', pingEmail, 'missing_uid_field', '(empty)', 'N/A', mismatch.timestamp, mismatch.details || '']
                    .map(csvEscape).join(',')
                )
              }

              // No Gigya account found
              if (!gigyaAccount) {
                mismatchCounter++
                const mismatch: Mismatch = {
                  id: `m-${mismatchCounter}`,
                  pingUserId: pingUser._id,
                  email: pingEmail,
                  gigyaUid: rawUid,
                  mismatchType: 'gigya_error',
                  pingValue: pingUser._id,
                  gigyaValue: 'Error: Failed to retrieve Gigya account',
                  timestamp: new Date().toISOString(),
                  details: `Could not retrieve Gigya account for UID ${rawUid}`
                }
                progress.errors++
                send('mismatch', mismatch)
                csvRows.push(
                  [pingUser._id, rawUid, pingEmail, 'gigya_error', pingUser._id, 'retrieval failed', mismatch.timestamp, mismatch.details || '']
                    .map(csvEscape).join(',')
                )
                return
              }

              // Check for Gigya error (account not found)
              if (gigyaAccount.errorCode && gigyaAccount.errorCode !== 0) {
                mismatchCounter++
                const mismatch: Mismatch = {
                  id: `m-${mismatchCounter}`,
                  pingUserId: pingUser._id,
                  email: pingEmail,
                  gigyaUid: rawUid,
                  mismatchType: 'orphaned_ping_user',
                  pingValue: pingUser._id,
                  gigyaValue: `Gigya error ${gigyaAccount.errorCode}: ${gigyaAccount.errorMessage}`,
                  timestamp: new Date().toISOString(),
                  details: `No Gigya account found for UID ${rawUid}. Error: ${gigyaAccount.errorMessage}`
                }
                progress.mismatches++
                send('mismatch', mismatch)
                csvRows.push(
                  [pingUser._id, rawUid, pingEmail, 'orphaned_ping_user', pingUser._id, `${gigyaAccount.errorCode}: ${gigyaAccount.errorMessage}`, mismatch.timestamp, mismatch.details || '']
                    .map(csvEscape).join(',')
                )
                return
              }

              // Track most recent Gigya date for date-based resume fallback
              const gigyaDate = gigyaAccount.lastUpdated || gigyaAccount.lastLogin || gigyaAccount.created
              if (gigyaDate) {
                if (!lastProcessedDate || gigyaDate > lastProcessedDate) {
                  lastProcessedDate = gigyaDate
                }
              }

              // --- Field comparisons ---
              const gigyaUid = gigyaAccount.UID || ''
              const gigyaUuidFormatted = convertGigyaUidToUuid(gigyaUid)
              let userHasMismatch = false

              // 1. UUID mismatch: Ping _id vs UUID-converted Gigya UID
              if (gigyaUuidFormatted.toLowerCase() !== pingUser._id.toLowerCase()) {
                mismatchCounter++
                const mismatch: Mismatch = {
                  id: `m-${mismatchCounter}`,
                  pingUserId: pingUser._id,
                  email: pingEmail,
                  gigyaUid: gigyaUid,
                  mismatchType: 'uuid_mismatch',
                  pingValue: pingUser._id,
                  gigyaValue: gigyaUuidFormatted,
                  timestamp: new Date().toISOString(),
                  details: `Ping _id "${pingUser._id}" does not match UUID-converted Gigya UID "${gigyaUuidFormatted}" (raw: ${gigyaUid})`
                }
                progress.mismatches++
                userHasMismatch = true
                send('mismatch', mismatch)
                csvRows.push(
                  [pingUser._id, gigyaUid, pingEmail, 'uuid_mismatch', pingUser._id, gigyaUuidFormatted, mismatch.timestamp, mismatch.details || '']
                    .map(csvEscape).join(',')
                )
              }

              // 2. Raw UID mismatch: frIndexedString16 vs raw Gigya UID
              if (pingUser.frIndexedString16 && pingUser.frIndexedString16.toLowerCase() !== gigyaUid.toLowerCase()) {
                mismatchCounter++
                const mismatch: Mismatch = {
                  id: `m-${mismatchCounter}`,
                  pingUserId: pingUser._id,
                  email: pingEmail,
                  gigyaUid: gigyaUid,
                  mismatchType: 'raw_uid_mismatch',
                  pingValue: pingUser.frIndexedString16,
                  gigyaValue: gigyaUid,
                  timestamp: new Date().toISOString(),
                  details: `frIndexedString16 "${pingUser.frIndexedString16}" does not match Gigya UID "${gigyaUid}"`
                }
                progress.mismatches++
                userHasMismatch = true
                send('mismatch', mismatch)
                csvRows.push(
                  [pingUser._id, gigyaUid, pingEmail, 'raw_uid_mismatch', pingUser.frIndexedString16, gigyaUid, mismatch.timestamp, mismatch.details || '']
                    .map(csvEscape).join(',')
                )
              }

              // 3. Email mismatch
              const gigyaEmail = gigyaAccount.profile?.email || ''
              if (gigyaEmail && pingEmail) {
                const emailMatches =
                  gigyaEmail.toLowerCase() === (pingUser.userName || '').toLowerCase() ||
                  gigyaEmail.toLowerCase() === (pingUser.mail || '').toLowerCase()
                if (!emailMatches) {
                  mismatchCounter++
                  const mismatch: Mismatch = {
                    id: `m-${mismatchCounter}`,
                    pingUserId: pingUser._id,
                    email: pingEmail,
                    gigyaUid: gigyaUid,
                    mismatchType: 'email_mismatch',
                    pingValue: `userName: ${pingUser.userName}, mail: ${pingUser.mail}`,
                    gigyaValue: gigyaEmail,
                    timestamp: new Date().toISOString(),
                    details: `Ping email fields do not match Gigya profile.email "${gigyaEmail}"`
                  }
                  progress.mismatches++
                  userHasMismatch = true
                  send('mismatch', mismatch)
                  csvRows.push(
                    [pingUser._id, gigyaUid, pingEmail, 'email_mismatch', `userName:${pingUser.userName}|mail:${pingUser.mail}`, gigyaEmail, mismatch.timestamp, mismatch.details || '']
                      .map(csvEscape).join(',')
                  )
                }
              }

              // 4. Account status mismatch
              const expectedStatus = gigyaAccount.isActive ? 'active' : 'inactive'
              if (pingUser.accountStatus && gigyaAccount.isActive !== undefined) {
                if (pingUser.accountStatus.toLowerCase() !== expectedStatus) {
                  mismatchCounter++
                  const mismatch: Mismatch = {
                    id: `m-${mismatchCounter}`,
                    pingUserId: pingUser._id,
                    email: pingEmail,
                    gigyaUid: gigyaUid,
                    mismatchType: 'status_mismatch',
                    pingValue: pingUser.accountStatus,
                    gigyaValue: `isActive: ${gigyaAccount.isActive} (expected: ${expectedStatus})`,
                    timestamp: new Date().toISOString(),
                    details: `Ping accountStatus "${pingUser.accountStatus}" does not match expected "${expectedStatus}" from Gigya isActive=${gigyaAccount.isActive}`
                  }
                  progress.mismatches++
                  userHasMismatch = true
                  send('mismatch', mismatch)
                  csvRows.push(
                    [pingUser._id, gigyaUid, pingEmail, 'status_mismatch', pingUser.accountStatus, expectedStatus, mismatch.timestamp, mismatch.details || '']
                      .map(csvEscape).join(',')
                  )
                }
              }

              // 5. Name mismatch (ignore "unknown" defaults from sync mapping)
              const gigyaFirstName = gigyaAccount.profile?.firstName || ''
              const gigyaLastName = gigyaAccount.profile?.lastName || ''
              const pingFirstName = pingUser.givenName || ''
              const pingLastName = pingUser.sn || ''

              if (gigyaFirstName && pingFirstName) {
                const expectedFirst = gigyaFirstName || 'unknown'
                if (pingFirstName.toLowerCase() !== expectedFirst.toLowerCase() && pingFirstName !== 'unknown') {
                  mismatchCounter++
                  const mismatch: Mismatch = {
                    id: `m-${mismatchCounter}`,
                    pingUserId: pingUser._id,
                    email: pingEmail,
                    gigyaUid: gigyaUid,
                    mismatchType: 'name_mismatch',
                    pingValue: `${pingFirstName} ${pingLastName}`,
                    gigyaValue: `${gigyaFirstName} ${gigyaLastName}`,
                    timestamp: new Date().toISOString(),
                    details: `Name mismatch: Ping "${pingFirstName} ${pingLastName}" vs Gigya "${gigyaFirstName} ${gigyaLastName}"`
                  }
                  progress.mismatches++
                  userHasMismatch = true
                  send('mismatch', mismatch)
                  csvRows.push(
                    [pingUser._id, gigyaUid, pingEmail, 'name_mismatch', `${pingFirstName} ${pingLastName}`, `${gigyaFirstName} ${gigyaLastName}`, mismatch.timestamp, mismatch.details || '']
                      .map(csvEscape).join(',')
                  )
                }
              }

              if (!userHasMismatch) {
                progress.matches++
              }
            }

            // For users not found in batch search, fall back to individual getAccountInfo
            // (these are likely orphaned accounts that don't exist in Gigya)
            const fallbackUids: string[] = []
            for (const rawUid of allRawUids) {
              if (!gigyaBatchMap.has(rawUid)) {
                fallbackUids.push(rawUid)
              }
            }

            if (fallbackUids.length > 0) {
              console.log(`[Recon Validation] ${fallbackUids.length} UIDs not in batch results, doing individual fallback`)
              const fallbackPromises = fallbackUids.map(async (rawUid) => {
                await semaphore.acquire()
                try {
                  const account = await withRetry(
                    () => getGigyaAccount(rawUid),
                    2, 1000, `Gigya getAccountInfo fallback(${rawUid.slice(0, 8)}...)`
                  )
                  gigyaBatchMap.set(rawUid, account)
                } catch (err: any) {
                  // Leave as missing — validateUser will handle null gracefully
                  console.warn(`[Recon Validation] Fallback failed for ${rawUid.slice(0, 8)}...:`, err.message)
                } finally {
                  semaphore.release()
                }
              })
              await Promise.all(fallbackPromises)
            }

            // Now validate all users (synchronous — no API calls, just comparisons)
            for (const pingUser of users) {
              if (maxUsers && progress.totalProcessed >= maxUsers) break
              const rawUid = (pingUser.frIndexedString16 || stripDashes(pingUser._id)).toLowerCase()
              const gigyaAccount = gigyaBatchMap.get(rawUid) || null
              validateUser(pingUser, gigyaAccount)
            }

            // Check maxUsers limit
            if (maxUsers && progress.totalProcessed >= maxUsers) {
              console.log(`[Recon Validation] Reached maxUsers limit (${maxUsers}), stopping`)
              hasMore = false
            }

            // Send progress update after each batch
            const elapsedSec = (Date.now() - progress.startTime) / 1000
            progress.rate = Math.round(progress.totalProcessed / elapsedSec)
            progress.lastUpdateTime = Date.now()
            send('progress', progress)

            // Send checkpoint so client can resume if interrupted
            if (pagedResultsCookie) {
              send('checkpoint', {
                pagedResultsCookie,
                progress: { ...progress },
                lastProcessedDate
              })
            }

            // Use prefetched next page if available (pipeline optimization)
            if (nextPagePromise && hasMore) {
              const prefetched = await nextPagePromise
              if (prefetched) {
                const nextUsers = prefetched.result
                if (!nextUsers || nextUsers.length === 0) {
                  hasMore = false
                } else {
                  // Store prefetched data for next iteration
                  pagedResultsCookie = prefetched.pagedResultsCookie || undefined
                  if (!pagedResultsCookie) hasMore = false
                  // Push prefetched page back — we'll process it next iteration
                  // by skipping the fetch at top of loop
                  prefetchedPage = prefetched
                }
              }
            }
          }

          // --- Step 4: Complete ---
          progress.isRunning = false
          progress.lastUpdateTime = Date.now()

          // Store CSV for download
          csvStore.set(jobId, {
            csv: csvRows.join('\n'),
            createdAt: Date.now()
          })

          send('complete', {
            jobId,
            summary: progress,
            ...(isSpotCheck ? { sampledUserIds } : {})
          })
        } catch (err: any) {
          console.error('[Recon Validation] Fatal error:', err)
          send('error', { message: 'Validation failed', details: err.message || String(err) })
        } finally {
          console.log('[Recon Validation] Stream closing')
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no'
      }
    })
  } catch (error: any) {
    console.error('Recon validation error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to start validation', details: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
