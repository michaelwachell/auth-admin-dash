/**
 * Recon Validation Types
 * Data integrity validation between Ping Identity and Gigya
 */

// --- Mismatch Type Enum ---

export type MismatchType =
  | 'uuid_mismatch'          // Ping _id != UUID-converted Gigya UID
  | 'raw_uid_mismatch'       // frIndexedString16 != raw Gigya UID
  | 'email_mismatch'         // userName/mail != profile.email
  | 'status_mismatch'        // accountStatus != isActive mapping
  | 'name_mismatch'          // givenName/sn != firstName/lastName
  | 'orphaned_ping_user'     // No Gigya account found for this Ping user
  | 'gigya_error'            // Error calling Gigya getAccountInfo
  | 'missing_uid_field'      // frIndexedString16 is empty/missing in Ping

// --- Ping User (fields we pull for validation) ---

export interface ReconPingUser {
  _id: string
  _rev?: string
  userName?: string
  mail?: string
  givenName?: string
  sn?: string
  accountStatus?: string
  frIndexedString16?: string   // Raw Gigya UID
  frIndexedString20?: string   // "true" if UID has dashes, "false" if raw
}

// --- Gigya Account (fields from getAccountInfo) ---

export interface ReconGigyaAccount {
  UID: string
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

// --- Validation Mismatch Record ---

export interface ValidationMismatch {
  id: string
  pingUserId: string
  email: string
  gigyaUid: string
  mismatchType: MismatchType
  pingValue: string
  gigyaValue: string
  timestamp: string
  details?: string
}

// --- Progress Tracking ---

export interface ReconProgress {
  totalProcessed: number
  matches: number
  mismatches: number
  errors: number
  isRunning: boolean
  startTime: number
  lastUpdateTime: number
  rate: number           // users/sec
}

// --- Connection & Run Config ---

export interface ReconConfig {
  tenantUrl: string
  clientId: string
  clientSecret: string
  tokenEndpoint: string
  scopes: string
  startDate: string      // ISO date string
  concurrency: number
  pageSize: number
}

// --- SSE Message Types ---

export interface SSEProgressMessage {
  type: 'progress'
  data: ReconProgress
}

export interface SSEMismatchMessage {
  type: 'mismatch'
  data: ValidationMismatch
}

export interface SSECompleteMessage {
  type: 'complete'
  data: {
    jobId: string
    summary: ReconProgress
    sampledUserIds?: string[]
  }
}

export interface SSEErrorMessage {
  type: 'error'
  data: {
    message: string
    details?: string
  }
}

export type SSEMessage =
  | SSEProgressMessage
  | SSEMismatchMessage
  | SSECompleteMessage
  | SSEErrorMessage
  | SSECheckpointMessage

// --- Ping IDM Search Response (recon-specific subset) ---

export interface ReconPingSearchResponse {
  result: ReconPingUser[]
  resultCount: number
  pagedResultsCookie?: string | null
  totalPagedResultsPolicy?: string
  totalPagedResults?: number
  remainingPagedResults?: number
}

// --- Checkpoint for resume support ---

export interface ReconCheckpoint {
  tenantUrl: string
  pagedResultsCookie: string
  progress: ReconProgress
  timestamp: number
  config: Omit<ReconConfig, 'clientSecret'>
  /** Most recent Gigya lastUpdated/lastLogin seen during the run */
  lastProcessedDate?: string
}

// --- SSE Checkpoint Message ---

export interface SSECheckpointMessage {
  type: 'checkpoint'
  data: {
    pagedResultsCookie: string
    progress: ReconProgress
    /** Most recent Gigya lastUpdated/lastLogin seen in this run */
    lastProcessedDate?: string
  }
}

// --- Spot Check Types ---

export interface SpotCheckConfig {
  sampleSize: number
  excludePreviouslyChecked: boolean
}

export interface SpotCheckHistoryEntry {
  id: string
  timestamp: number
  sampleSize: number
  checkedUids: string[]
  mismatchCount: number
  matchCount: number
}

// --- Run History ---

export interface RunHistoryEntry {
  id: string
  type: 'full' | 'spot_check'
  timestamp: number
  duration: number
  totalProcessed: number
  matches: number
  mismatches: number
  errors: number
  jobId: string
  spotCheckConfig?: SpotCheckConfig
}

// --- Validation Callbacks ---

export interface ReconValidationCallbacks {
  onProgress: (progress: ReconProgress) => void
  onMismatch: (mismatch: ValidationMismatch) => void
  onComplete: (jobId: string, summary: ReconProgress, sampledUserIds?: string[]) => void
  onError: (message: string, details?: string) => void
  onCheckpoint?: (cookie: string, progress: ReconProgress, lastProcessedDate?: string) => void
}
