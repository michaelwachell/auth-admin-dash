'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Settings,
  Play,
  Square,
  Download,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Activity
} from 'lucide-react'
import Toast from '../src/components/Toast'
import { ReconValidationService } from '../src/services/recon.service'
import type {
  ReconConfig,
  ReconProgress,
  ReconCheckpoint,
  ValidationMismatch,
  MismatchType,
  SpotCheckHistoryEntry,
  RunHistoryEntry
} from '../src/types/recon.types'

// --- Mismatch type display config ---

const MISMATCH_COLORS: Record<MismatchType, string> = {
  uuid_mismatch: 'text-red-400 bg-red-900/30',
  raw_uid_mismatch: 'text-red-400 bg-red-900/30',
  email_mismatch: 'text-orange-400 bg-orange-900/30',
  status_mismatch: 'text-yellow-400 bg-yellow-900/30',
  name_mismatch: 'text-yellow-400 bg-yellow-900/30',
  orphaned_ping_user: 'text-purple-400 bg-purple-900/30',
  gigya_error: 'text-gray-400 bg-gray-700/50',
  missing_uid_field: 'text-red-400 bg-red-900/30'
}

const MISMATCH_LABELS: Record<MismatchType, string> = {
  uuid_mismatch: 'UUID Mismatch',
  raw_uid_mismatch: 'Raw UID Mismatch',
  email_mismatch: 'Email Mismatch',
  status_mismatch: 'Status Mismatch',
  name_mismatch: 'Name Mismatch',
  orphaned_ping_user: 'Orphaned in Ping',
  gigya_error: 'Gigya Error',
  missing_uid_field: 'Missing UID Field'
}

// --- localStorage keys ---
const STORAGE_KEY = 'recon_validation_config'
const CHECKPOINT_KEY = 'recon_validation_checkpoint'
const SPOT_CHECK_HISTORY_KEY = 'recon_spot_check_history'
const RUN_HISTORY_KEY = 'recon_run_history'
const MISMATCHES_CACHE_KEY = 'recon_mismatches_current'

const MAX_UI_MISMATCHES = 200
const MAX_RUN_HISTORY = 25
const MAX_SPOT_CHECK_RUNS = 10

type ValidationMode = 'full' | 'spot_check'

export default function ReconValidationPanel() {
  // --- Connection config state ---
  const [tenantUrl, setTenantUrl] = useState('')
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [tokenEndpoint, setTokenEndpoint] = useState('')
  const [scopes, setScopes] = useState('fr:idm:*')
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().split('T')[0]
  })
  const [concurrency, setConcurrency] = useState(30)
  const [pageSize, setPageSize] = useState(100)
  const [showSecret, setShowSecret] = useState(false)
  const [configExpanded, setConfigExpanded] = useState(true)

  // --- Auth state ---
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authenticating, setAuthenticating] = useState(false)

  // --- Validation state ---
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState<ReconProgress | null>(null)
  const [mismatches, setMismatches] = useState<ValidationMismatch[]>([])
  const [completedJobId, setCompletedJobId] = useState<string | null>(null)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [checkpoint, setCheckpoint] = useState<ReconCheckpoint | null>(null)

  // --- Mode & Spot Check state ---
  const [validationMode, setValidationMode] = useState<ValidationMode>('full')
  const [spotCheckSampleSize, setSpotCheckSampleSize] = useState(500)
  const [spotCheckExcludePrevious, setSpotCheckExcludePrevious] = useState(true)
  const [spotCheckHistory, setSpotCheckHistory] = useState<SpotCheckHistoryEntry[]>([])

  // --- Run History state ---
  const [runHistory, setRunHistory] = useState<RunHistoryEntry[]>([])
  const [showRunHistory, setShowRunHistory] = useState(false)

  // --- Cached mismatches state ---
  const [restoredFromCache, setRestoredFromCache] = useState(false)

  // --- UI state ---
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)

  // --- Refs ---
  const serviceRef = useRef<ReconValidationService | null>(null)
  const abortRef = useRef<(() => void) | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // --- Load saved config and checkpoint from localStorage ---
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const config = JSON.parse(saved)
        if (config.tenantUrl) setTenantUrl(config.tenantUrl)
        if (config.clientId) setClientId(config.clientId)
        if (config.tokenEndpoint) setTokenEndpoint(config.tokenEndpoint)
        if (config.scopes) setScopes(config.scopes)
        if (config.concurrency) setConcurrency(config.concurrency)
        if (config.pageSize) setPageSize(config.pageSize)
      }
    } catch {
      // Ignore parse errors
    }
    // Load checkpoint
    try {
      const savedCheckpoint = localStorage.getItem(CHECKPOINT_KEY)
      if (savedCheckpoint) {
        const cp: ReconCheckpoint = JSON.parse(savedCheckpoint)
        const ageHours = (Date.now() - cp.timestamp) / (1000 * 60 * 60)
        if (ageHours < 24) {
          setCheckpoint(cp)
        } else if (cp.lastProcessedDate) {
          setCheckpoint({ ...cp, pagedResultsCookie: '' })
        } else {
          localStorage.removeItem(CHECKPOINT_KEY)
        }
      }
    } catch {
      // Ignore
    }
    // Load spot check history
    try {
      const savedSpotChecks = localStorage.getItem(SPOT_CHECK_HISTORY_KEY)
      if (savedSpotChecks) {
        setSpotCheckHistory(JSON.parse(savedSpotChecks))
      }
    } catch {
      // Ignore
    }
    // Load run history
    try {
      const savedRunHistory = localStorage.getItem(RUN_HISTORY_KEY)
      if (savedRunHistory) {
        setRunHistory(JSON.parse(savedRunHistory))
      }
    } catch {
      // Ignore
    }
    // Load cached mismatches
    try {
      const cached = localStorage.getItem(MISMATCHES_CACHE_KEY)
      if (cached) {
        const data = JSON.parse(cached)
        const ageHours = (Date.now() - data.savedAt) / (1000 * 60 * 60)
        if (ageHours < 24 && data.mismatches?.length > 0) {
          setMismatches(data.mismatches)
          setProgress(data.progress)
          setCompletedJobId(data.jobId || null)
          setRestoredFromCache(true)
        } else {
          localStorage.removeItem(MISMATCHES_CACHE_KEY)
        }
      }
    } catch {
      // Ignore
    }
  }, [])

  // --- Save config to localStorage (excluding secrets) ---
  const saveConfig = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        tenantUrl,
        clientId,
        tokenEndpoint,
        scopes,
        concurrency,
        pageSize
      }))
    } catch {
      // Ignore storage errors
    }
  }, [tenantUrl, clientId, tokenEndpoint, scopes, concurrency, pageSize])

  // --- Save checkpoint to localStorage ---
  const saveCheckpoint = useCallback((cookie: string, prog: ReconProgress, lastProcessedDate?: string) => {
    try {
      const cp: ReconCheckpoint = {
        tenantUrl,
        pagedResultsCookie: cookie,
        progress: prog,
        timestamp: Date.now(),
        config: { tenantUrl, clientId, tokenEndpoint, scopes, startDate, concurrency, pageSize },
        lastProcessedDate
      }
      localStorage.setItem(CHECKPOINT_KEY, JSON.stringify(cp))
      setCheckpoint(cp)
    } catch {
      // Ignore storage errors
    }
  }, [tenantUrl, clientId, tokenEndpoint, scopes, startDate, concurrency, pageSize])

  // --- Clear checkpoint ---
  const clearCheckpoint = useCallback(() => {
    localStorage.removeItem(CHECKPOINT_KEY)
    setCheckpoint(null)
  }, [])

  // --- Save spot check history ---
  const saveSpotCheckRun = useCallback((entry: SpotCheckHistoryEntry) => {
    try {
      const updated = [entry, ...spotCheckHistory].slice(0, MAX_SPOT_CHECK_RUNS)
      setSpotCheckHistory(updated)
      localStorage.setItem(SPOT_CHECK_HISTORY_KEY, JSON.stringify(updated))
    } catch {
      // Ignore storage errors
    }
  }, [spotCheckHistory])

  // --- Get previously checked UIDs ---
  const getPreviouslyCheckedUids = useCallback((): string[] => {
    const uids: string[] = []
    for (const run of spotCheckHistory) {
      uids.push(...run.checkedUids)
    }
    return uids
  }, [spotCheckHistory])

  const totalPreviouslyChecked = spotCheckHistory.reduce((sum, r) => sum + r.checkedUids.length, 0)

  // --- Save run history ---
  const saveRunHistory = useCallback((entry: RunHistoryEntry) => {
    try {
      const updated = [entry, ...runHistory].slice(0, MAX_RUN_HISTORY)
      setRunHistory(updated)
      localStorage.setItem(RUN_HISTORY_KEY, JSON.stringify(updated))
    } catch {
      // Ignore storage errors
    }
  }, [runHistory])

  // --- Save mismatches to cache ---
  const saveMismatchCache = useCallback((jobId: string | null, mismatchList: ValidationMismatch[], prog: ReconProgress | null) => {
    try {
      localStorage.setItem(MISMATCHES_CACHE_KEY, JSON.stringify({
        jobId,
        mismatches: mismatchList,
        progress: prog,
        savedAt: Date.now()
      }))
    } catch {
      // Ignore storage errors
    }
  }, [])

  // --- Clear mismatch cache ---
  const clearMismatchCache = useCallback(() => {
    localStorage.removeItem(MISMATCHES_CACHE_KEY)
    setRestoredFromCache(false)
  }, [])

  // --- Export session state ---
  const handleExportState = useCallback(() => {
    try {
      const state = {
        version: '1.0',
        exportedAt: Date.now(),
        config: { tenantUrl, clientId, tokenEndpoint, scopes, concurrency, pageSize },
        checkpoint: checkpoint ? JSON.parse(localStorage.getItem(CHECKPOINT_KEY) || 'null') : null,
        mismatches: JSON.parse(localStorage.getItem(MISMATCHES_CACHE_KEY) || 'null'),
        spotCheckHistory,
        runHistory
      }
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `recon-session-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setToast({ message: 'Session exported successfully', type: 'success' })
    } catch (err: any) {
      setToast({ message: `Export failed: ${err.message}`, type: 'error' })
    }
  }, [tenantUrl, clientId, tokenEndpoint, scopes, concurrency, pageSize, checkpoint, spotCheckHistory, runHistory])

  // --- Import session state ---
  const handleImportState = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        const state = JSON.parse(text)
        if (state.version !== '1.0') {
          setToast({ message: 'Unsupported session format version', type: 'error' })
          return
        }
        if (state.config) {
          if (state.config.tenantUrl) setTenantUrl(state.config.tenantUrl)
          if (state.config.clientId) setClientId(state.config.clientId)
          if (state.config.tokenEndpoint) setTokenEndpoint(state.config.tokenEndpoint)
          if (state.config.scopes) setScopes(state.config.scopes)
          if (state.config.concurrency) setConcurrency(state.config.concurrency)
          if (state.config.pageSize) setPageSize(state.config.pageSize)
          localStorage.setItem(STORAGE_KEY, JSON.stringify(state.config))
        }
        if (state.checkpoint) {
          localStorage.setItem(CHECKPOINT_KEY, JSON.stringify(state.checkpoint))
          setCheckpoint(state.checkpoint)
        }
        if (state.mismatches) {
          localStorage.setItem(MISMATCHES_CACHE_KEY, JSON.stringify(state.mismatches))
          if (state.mismatches.mismatches?.length) {
            setMismatches(state.mismatches.mismatches)
            setProgress(state.mismatches.progress)
            setCompletedJobId(state.mismatches.jobId || null)
            setRestoredFromCache(true)
          }
        }
        if (state.spotCheckHistory) {
          setSpotCheckHistory(state.spotCheckHistory)
          localStorage.setItem(SPOT_CHECK_HISTORY_KEY, JSON.stringify(state.spotCheckHistory))
        }
        if (state.runHistory) {
          setRunHistory(state.runHistory)
          localStorage.setItem(RUN_HISTORY_KEY, JSON.stringify(state.runHistory))
        }
        setToast({ message: 'Session imported successfully', type: 'success' })
      } catch (err: any) {
        setToast({ message: `Import failed: ${err.message}`, type: 'error' })
      }
    }
    input.click()
  }, [])

  // --- Auto-derive token endpoint from tenant URL ---
  useEffect(() => {
    if (tenantUrl && !tokenEndpoint) {
      try {
        const url = new URL(tenantUrl)
        setTokenEndpoint(`${url.origin}/am/oauth2/access_token`)
      } catch {
        // Invalid URL, user will fill in manually
      }
    }
  }, [tenantUrl, tokenEndpoint])

  // --- Elapsed time timer ---
  useEffect(() => {
    if (isRunning && progress?.startTime) {
      timerRef.current = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - progress.startTime) / 1000))
      }, 1000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isRunning, progress?.startTime])

  // --- Format elapsed time ---
  const formatElapsed = (seconds: number): string => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    if (h > 0) return `${h}h ${m}m ${s}s`
    if (m > 0) return `${m}m ${s}s`
    return `${s}s`
  }

  // --- Authenticate to Ping ---
  const handleAuthenticate = async () => {
    if (!tenantUrl || !clientId || !clientSecret || !tokenEndpoint) {
      setToast({ message: 'Please fill in all connection fields', type: 'error' })
      return
    }

    setAuthenticating(true)
    try {
      const response = await fetch('/api/ping-admin/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          clientSecret,
          tokenEndpoint,
          scopes
        })
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Authentication failed' }))
        setToast({ message: error.error || 'Authentication failed', type: 'error' })
        setIsAuthenticated(false)
        return
      }

      setIsAuthenticated(true)
      setConfigExpanded(false)
      saveConfig()
      setToast({ message: 'Successfully authenticated to Ping tenant', type: 'success' })
    } catch (err: any) {
      setToast({ message: `Authentication error: ${err.message}`, type: 'error' })
      setIsAuthenticated(false)
    } finally {
      setAuthenticating(false)
    }
  }

  // --- Start validation (fresh or resume) ---
  const runValidation = async (resumeFromCheckpoint?: ReconCheckpoint) => {
    if (!isAuthenticated) {
      setToast({ message: 'Please authenticate first', type: 'error' })
      return
    }

    const isResuming = !!resumeFromCheckpoint
    const isSpotCheck = validationMode === 'spot_check' && !isResuming
    const runStartTime = Date.now()

    // Reset UI state
    setMismatches([])
    setCompletedJobId(null)
    setIsRunning(true)
    setExpandedRows(new Set())
    setRestoredFromCache(false)
    clearMismatchCache()

    if (isResuming) {
      const previousElapsed = Math.floor((resumeFromCheckpoint.progress.lastUpdateTime - resumeFromCheckpoint.progress.startTime) / 1000)
      setElapsedTime(previousElapsed)
      setProgress({
        ...resumeFromCheckpoint.progress,
        isRunning: true,
        lastUpdateTime: Date.now()
      })
    } else {
      setElapsedTime(0)
      clearCheckpoint()
      setProgress({
        totalProcessed: 0,
        matches: 0,
        mismatches: 0,
        errors: 0,
        isRunning: true,
        startTime: runStartTime,
        lastUpdateTime: Date.now(),
        rate: 0
      })
    }

    const config: ReconConfig = {
      tenantUrl,
      clientId,
      clientSecret,
      tokenEndpoint,
      scopes,
      startDate,
      concurrency,
      pageSize
    }

    const service = new ReconValidationService()
    serviceRef.current = service

    const resumeParams = isResuming
      ? {
          resumeFromCookie: resumeFromCheckpoint.pagedResultsCookie,
          resumeProgress: resumeFromCheckpoint.progress
        }
      : undefined

    const spotCheckParams = isSpotCheck
      ? {
          sampleSize: spotCheckSampleSize,
          excludeUids: spotCheckExcludePrevious ? getPreviouslyCheckedUids() : []
        }
      : undefined

    // Track accumulated mismatches for caching
    let accumulatedMismatches: ValidationMismatch[] = []
    let saveTimer: ReturnType<typeof setTimeout> | null = null

    const abort = await service.startValidation(config, {
      onProgress: (p) => {
        setProgress(p)
      },
      onMismatch: (m) => {
        accumulatedMismatches = [...accumulatedMismatches, m]
        setMismatches((prev) => {
          if (prev.length >= MAX_UI_MISMATCHES) return prev
          return [...prev, m]
        })
        // Debounced save to localStorage
        if (saveTimer) clearTimeout(saveTimer)
        saveTimer = setTimeout(() => {
          saveMismatchCache(null, accumulatedMismatches.slice(0, MAX_UI_MISMATCHES), null)
        }, 5000)
      },
      onComplete: (jobId, summary, sampledUserIds) => {
        if (saveTimer) clearTimeout(saveTimer)
        setCompletedJobId(jobId)
        setIsRunning(false)
        setProgress(summary)
        clearCheckpoint()

        // Save final mismatches to cache
        saveMismatchCache(jobId, accumulatedMismatches.slice(0, MAX_UI_MISMATCHES), summary)

        // Save run history
        const entry: RunHistoryEntry = {
          id: jobId,
          type: isSpotCheck ? 'spot_check' : 'full',
          timestamp: Date.now(),
          duration: Date.now() - runStartTime,
          totalProcessed: summary.totalProcessed,
          matches: summary.matches,
          mismatches: summary.mismatches,
          errors: summary.errors,
          jobId,
          ...(isSpotCheck ? { spotCheckConfig: { sampleSize: spotCheckSampleSize, excludePreviouslyChecked: spotCheckExcludePrevious } } : {})
        }
        saveRunHistory(entry)

        // Save spot check history with sampled UIDs
        if (isSpotCheck && sampledUserIds) {
          saveSpotCheckRun({
            id: jobId,
            timestamp: Date.now(),
            sampleSize: spotCheckSampleSize,
            checkedUids: sampledUserIds,
            mismatchCount: summary.mismatches,
            matchCount: summary.matches
          })
        }

        const modeLabel = isSpotCheck ? 'Spot check' : 'Validation'
        setToast({
          message: `${modeLabel} complete! ${summary.totalProcessed} users processed, ${summary.mismatches} mismatches found.`,
          type: summary.mismatches > 0 ? 'info' : 'success'
        })
      },
      onError: (message, details) => {
        if (saveTimer) clearTimeout(saveTimer)
        setIsRunning(false)
        // Still save whatever mismatches we got
        if (accumulatedMismatches.length > 0) {
          saveMismatchCache(null, accumulatedMismatches.slice(0, MAX_UI_MISMATCHES), null)
        }
        setToast({ message: `${message}${details ? `: ${details}` : ''}`, type: 'error' })
      },
      onCheckpoint: (cookie, prog, lastDate) => {
        saveCheckpoint(cookie, prog, lastDate)
      }
    }, resumeParams, spotCheckParams)

    abortRef.current = abort
  }

  const handleStartValidation = () => runValidation()
  const handleResumeValidation = () => {
    if (checkpoint) runValidation(checkpoint)
  }

  // Start fresh but auto-set start date from expired checkpoint's lastProcessedDate
  const handleStartFromLastDate = () => {
    if (checkpoint?.lastProcessedDate) {
      // Parse the Gigya date and set startDate to that day
      const dateStr = checkpoint.lastProcessedDate.split('T')[0]
      if (dateStr) setStartDate(dateStr)
      clearCheckpoint()
      setToast({ message: `Start date set to ${dateStr} from previous run. Click "Start Fresh" to begin.`, type: 'info' })
    }
  }

  // Whether the checkpoint has a usable pagination cookie (not expired/empty)
  const checkpointHasCookie = !!(checkpoint?.pagedResultsCookie)
  // Whether the checkpoint only has date fallback (cookie expired)
  const checkpointHasDateOnly = !!(checkpoint && !checkpoint.pagedResultsCookie && checkpoint.lastProcessedDate)

  // --- Abort validation ---
  const handleAbort = () => {
    if (abortRef.current) {
      abortRef.current()
      abortRef.current = null
    }
    setIsRunning(false)
    setToast({ message: 'Validation aborted', type: 'info' })
  }

  // --- Download CSV ---
  const handleDownloadCsv = async () => {
    if (!completedJobId) return
    try {
      await ReconValidationService.downloadCsv(completedJobId)
      setToast({ message: 'CSV downloaded successfully', type: 'success' })
    } catch (err: any) {
      setToast({ message: `Download failed: ${err.message}`, type: 'error' })
    }
  }

  // --- Toggle expanded row ---
  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  return (
    <div className="space-y-6">
      {/* --- Connection Configuration --- */}
      <div className="bg-gray-800 rounded-lg border border-gray-700">
        <button
          onClick={() => setConfigExpanded(!configExpanded)}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-750 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-medium text-gray-100">Ping Tenant Connection</h2>
            {isAuthenticated && (
              <span className="flex items-center gap-1 text-xs text-green-400 bg-green-900/30 px-2 py-0.5 rounded-full">
                <CheckCircle className="w-3 h-3" /> Connected
              </span>
            )}
          </div>
          {configExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {configExpanded && (
          <div className="px-4 pb-4 space-y-4 border-t border-gray-700 pt-4">
            {/* Tenant URL */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Tenant URL</label>
              <input
                type="text"
                value={tenantUrl}
                onChange={(e) => {
                  setTenantUrl(e.target.value)
                  setIsAuthenticated(false)
                }}
                placeholder="https://openam-nfl-use1-dev.id.forgerock.io"
                className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-gray-100 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Client ID & Secret */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Client ID</label>
                <input
                  type="text"
                  value={clientId}
                  onChange={(e) => {
                    setClientId(e.target.value)
                    setIsAuthenticated(false)
                  }}
                  placeholder="Service account client ID"
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-gray-100 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Client Secret</label>
                <div className="relative">
                  <input
                    type={showSecret ? 'text' : 'password'}
                    value={clientSecret}
                    onChange={(e) => {
                      setClientSecret(e.target.value)
                      setIsAuthenticated(false)
                    }}
                    placeholder="Service account client secret"
                    className="w-full px-3 py-2 pr-10 bg-gray-900 border border-gray-600 rounded-md text-gray-100 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                  >
                    {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Token Endpoint & Scopes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Token Endpoint</label>
                <input
                  type="text"
                  value={tokenEndpoint}
                  onChange={(e) => {
                    setTokenEndpoint(e.target.value)
                    setIsAuthenticated(false)
                  }}
                  placeholder="https://.../am/oauth2/access_token"
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-gray-100 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Scopes</label>
                <input
                  type="text"
                  value={scopes}
                  onChange={(e) => setScopes(e.target.value)}
                  placeholder="fr:idm:*"
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-gray-100 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Validation Parameters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Start Date (work backwards to)</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Concurrency: {concurrency}
                </label>
                <input
                  type="range"
                  min="5"
                  max="100"
                  value={concurrency}
                  onChange={(e) => setConcurrency(parseInt(e.target.value))}
                  className="w-full mt-2"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>5</span>
                  <span>100</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Page Size</label>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                  <option value={500}>500</option>
                </select>
              </div>
            </div>

            {/* Authenticate Button */}
            <div className="flex justify-end">
              <button
                onClick={handleAuthenticate}
                disabled={authenticating || !tenantUrl || !clientId || !clientSecret || !tokenEndpoint}
                className="px-6 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {authenticating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Authenticate
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* --- Session Resume Banner --- */}
      {!isRunning && restoredFromCache && mismatches.length > 0 && (
        <div className="bg-blue-900/20 border border-blue-800/50 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <RotateCcw className="w-5 h-5 text-blue-400" />
            <div>
              <p className="text-sm text-blue-300">Previous session restored</p>
              <p className="text-xs text-blue-400/70 mt-0.5">
                {progress?.totalProcessed?.toLocaleString() || 0} users processed, {mismatches.length} mismatches loaded from cache
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {completedJobId && (
              <button
                onClick={handleDownloadCsv}
                className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 transition-colors flex items-center gap-1"
              >
                <Download className="w-3 h-3" /> Download CSV
              </button>
            )}
            <button
              onClick={() => { clearMismatchCache(); setMismatches([]); setProgress(null); setCompletedJobId(null) }}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* --- Controls --- */}
      {isAuthenticated && (
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Activity className="w-5 h-5 text-green-400" />
              <h2 className="text-lg font-medium text-gray-100">Validation Controls</h2>
              {/* Mode selector */}
              <div className="flex bg-gray-900 rounded-md p-0.5">
                <button
                  onClick={() => setValidationMode('full')}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                    validationMode === 'full'
                      ? 'bg-green-600 text-white'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  Full Validation
                </button>
                <button
                  onClick={() => setValidationMode('spot_check')}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                    validationMode === 'spot_check'
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  Spot Check
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {!isRunning ? (
                <>
                  <button
                    onClick={handleStartValidation}
                    className={`px-6 py-2 ${validationMode === 'spot_check' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-green-600 hover:bg-green-700'} text-white rounded-md text-sm font-medium transition-colors flex items-center gap-2`}
                  >
                    <Play className="w-4 h-4" />
                    {validationMode === 'spot_check' ? `Spot Check (${spotCheckSampleSize})` : 'Start Fresh'}
                  </button>
                  {checkpoint && checkpoint.tenantUrl === tenantUrl && checkpointHasCookie && (
                    <button
                      onClick={handleResumeValidation}
                      className="px-6 py-2 bg-amber-600 text-white rounded-md text-sm font-medium hover:bg-amber-700 transition-colors flex items-center gap-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Resume
                    </button>
                  )}
                  {checkpoint && checkpoint.tenantUrl === tenantUrl && checkpointHasDateOnly && (
                    <button
                      onClick={handleStartFromLastDate}
                      className="px-6 py-2 bg-cyan-600 text-white rounded-md text-sm font-medium hover:bg-cyan-700 transition-colors flex items-center gap-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Set Date from Last Run
                    </button>
                  )}
                </>
              ) : (
                <button
                  onClick={handleAbort}
                  className="px-6 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 transition-colors flex items-center gap-2"
                >
                  <Square className="w-4 h-4" />
                  Abort
                </button>
              )}
              {completedJobId && !isRunning && (
                <button
                  onClick={handleDownloadCsv}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download CSV
                </button>
              )}
            </div>
          </div>

          {/* Resume checkpoint info - valid cookie */}
          {checkpoint && checkpoint.tenantUrl === tenantUrl && checkpointHasCookie && !isRunning && !completedJobId && (
            <div className="bg-amber-900/20 border border-amber-800/50 rounded-md px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <RotateCcw className="w-4 h-4 text-amber-400" />
                <div>
                  <p className="text-sm text-amber-300">
                    Previous run checkpoint available
                  </p>
                  <p className="text-xs text-amber-400/70 mt-0.5">
                    {checkpoint.progress.totalProcessed.toLocaleString()} users processed
                    {' | '}
                    {checkpoint.progress.mismatches} mismatches
                    {' | '}
                    Saved {new Date(checkpoint.timestamp).toLocaleString()}
                    {checkpoint.lastProcessedDate && ` | Last user date: ${checkpoint.lastProcessedDate.split('T')[0]}`}
                  </p>
                </div>
              </div>
              <button
                onClick={clearCheckpoint}
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Resume checkpoint info - cookie expired, date fallback available */}
          {checkpoint && checkpoint.tenantUrl === tenantUrl && checkpointHasDateOnly && !isRunning && !completedJobId && (
            <div className="bg-cyan-900/20 border border-cyan-800/50 rounded-md px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-4 h-4 text-cyan-400" />
                <div>
                  <p className="text-sm text-cyan-300">
                    Previous run&apos;s pagination cookie expired
                  </p>
                  <p className="text-xs text-cyan-400/70 mt-0.5">
                    {checkpoint.progress.totalProcessed.toLocaleString()} users were processed
                    {' | '}
                    {checkpoint.progress.mismatches} mismatches
                    {' | '}
                    Last user date: {checkpoint.lastProcessedDate?.split('T')[0] ?? 'unknown'}
                  </p>
                  <p className="text-xs text-cyan-400/50 mt-1">
                    Click &quot;Set Date from Last Run&quot; to auto-set your start date to {checkpoint.lastProcessedDate?.split('T')[0]}, then start a fresh run.
                  </p>
                </div>
              </div>
              <button
                onClick={clearCheckpoint}
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      )}

      {/* --- Spot Check Options (shown when spot check mode selected) --- */}
      {isAuthenticated && validationMode === 'spot_check' && !isRunning && (
        <div className="bg-purple-900/20 border border-purple-800/50 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-medium text-purple-300 flex items-center gap-2">
            Spot Check Configuration
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">
                Sample Size: {spotCheckSampleSize.toLocaleString()}
              </label>
              <input
                type="range"
                min="50"
                max="5000"
                step="50"
                value={spotCheckSampleSize}
                onChange={(e) => setSpotCheckSampleSize(parseInt(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>50</span>
                <span>5,000</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="excludePrevious"
                checked={spotCheckExcludePrevious}
                onChange={(e) => setSpotCheckExcludePrevious(e.target.checked)}
                className="rounded bg-gray-900 border-gray-600 text-purple-500 focus:ring-purple-500"
              />
              <label htmlFor="excludePrevious" className="text-xs text-gray-300">
                Exclude previously checked accounts
              </label>
            </div>
            <div className="text-xs text-gray-500">
              {totalPreviouslyChecked > 0 ? (
                <span>{totalPreviouslyChecked.toLocaleString()} accounts checked across {spotCheckHistory.length} run{spotCheckHistory.length !== 1 ? 's' : ''}</span>
              ) : (
                <span>No previous spot checks</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- Session Management --- */}
      {isAuthenticated && !isRunning && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowRunHistory(!showRunHistory)}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              {showRunHistory ? 'Hide' : 'Show'} Run History ({runHistory.length})
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportState}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              Export Session
            </button>
            <span className="text-gray-700">|</span>
            <button
              onClick={handleImportState}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              Import Session
            </button>
          </div>
        </div>
      )}

      {/* --- Run History --- */}
      {showRunHistory && runHistory.length > 0 && (
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
          <h3 className="text-sm font-medium text-gray-300 mb-3">Run History</h3>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {runHistory.map((run) => (
              <div key={run.id} className="bg-gray-900 rounded p-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded-full ${
                    run.type === 'spot_check' ? 'bg-purple-900/30 text-purple-400' : 'bg-green-900/30 text-green-400'
                  }`}>
                    {run.type === 'spot_check' ? 'Spot Check' : 'Full'}
                  </span>
                  <span className="text-gray-400">
                    {new Date(run.timestamp).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-gray-400">
                  <span>{run.totalProcessed.toLocaleString()} users</span>
                  <span className="text-green-400">{run.matches} matches</span>
                  <span className="text-red-400">{run.mismatches} mismatches</span>
                  <span>{formatElapsed(Math.floor(run.duration / 1000))}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- Progress Dashboard --- */}
      {progress && (
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-300">Validation Progress</h3>
            <span className="text-xs text-gray-500">
              {isRunning ? (
                <span className="flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin" /> Running
                </span>
              ) : completedJobId ? (
                <span className="text-green-400">Complete</span>
              ) : (
                <span className="text-yellow-400">Stopped</span>
              )}
            </span>
          </div>

          {/* Progress Bar */}
          {isRunning && (
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, progress.totalProcessed > 0 ? 100 : 0)}%` }}
              />
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-gray-900 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-gray-100">
                {progress.totalProcessed.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500 mt-1">Processed</div>
            </div>
            <div className="bg-gray-900 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-400">
                {progress.matches.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500 mt-1">Matches</div>
            </div>
            <div className="bg-gray-900 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-red-400">
                {progress.mismatches.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500 mt-1">Mismatches</div>
            </div>
            <div className="bg-gray-900 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-yellow-400">
                {progress.errors.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500 mt-1">Errors</div>
            </div>
            <div className="bg-gray-900 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-blue-400">
                {progress.rate || 0}/s
              </div>
              <div className="text-xs text-gray-500 mt-1">Rate</div>
            </div>
          </div>

          {/* Elapsed Time */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Elapsed: {formatElapsed(elapsedTime)}</span>
            {progress.totalProcessed > 0 && (
              <span>
                Integrity: {((progress.matches / progress.totalProcessed) * 100).toFixed(2)}%
              </span>
            )}
          </div>
        </div>
      )}

      {/* --- Mismatches Table --- */}
      {mismatches.length > 0 && (
        <div className="bg-gray-800 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <h3 className="text-lg font-medium text-gray-100">
                Mismatches ({mismatches.length}{mismatches.length >= MAX_UI_MISMATCHES ? '+' : ''})
              </h3>
            </div>
            {mismatches.length >= MAX_UI_MISMATCHES && (
              <span className="text-xs text-gray-500">
                Showing first {MAX_UI_MISMATCHES} in UI. Full results available in CSV download.
              </span>
            )}
          </div>

          {/* Summary by type */}
          <div className="flex flex-wrap gap-2 px-4 py-3 border-b border-gray-700">
            {Object.entries(
              mismatches.reduce<Record<string, number>>((acc, m) => {
                acc[m.mismatchType] = (acc[m.mismatchType] || 0) + 1
                return acc
              }, {})
            ).map(([type, count]) => (
              <span
                key={type}
                className={`text-xs px-2 py-1 rounded-full ${MISMATCH_COLORS[type as MismatchType]}`}
              >
                {MISMATCH_LABELS[type as MismatchType]}: {count}
              </span>
            ))}
          </div>

          {/* Table */}
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-800 z-10">
                <tr className="text-left text-xs text-gray-400 border-b border-gray-700">
                  <th className="px-4 py-2 w-8">#</th>
                  <th className="px-4 py-2">Ping ID</th>
                  <th className="px-4 py-2">Email</th>
                  <th className="px-4 py-2">Type</th>
                  <th className="px-4 py-2">Ping Value</th>
                  <th className="px-4 py-2">Gigya Value</th>
                </tr>
              </thead>
              <tbody>
                {mismatches.map((m, idx) => (
                  <>
                    <tr
                      key={m.id}
                      onClick={() => toggleRow(m.id)}
                      className="border-b border-gray-700/50 hover:bg-gray-750 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-2 text-xs text-gray-500">{idx + 1}</td>
                      <td className="px-4 py-2 font-mono text-xs text-gray-300 max-w-[180px] truncate" title={m.pingUserId}>
                        {m.pingUserId}
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-300 max-w-[200px] truncate" title={m.email}>
                        {m.email}
                      </td>
                      <td className="px-4 py-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${MISMATCH_COLORS[m.mismatchType]}`}>
                          {MISMATCH_LABELS[m.mismatchType]}
                        </span>
                      </td>
                      <td className="px-4 py-2 font-mono text-xs text-gray-400 max-w-[200px] truncate" title={m.pingValue}>
                        {m.pingValue}
                      </td>
                      <td className="px-4 py-2 font-mono text-xs text-gray-400 max-w-[200px] truncate" title={m.gigyaValue}>
                        {m.gigyaValue}
                      </td>
                    </tr>
                    {expandedRows.has(m.id) && (
                      <tr key={`${m.id}-detail`} className="bg-gray-900/50">
                        <td colSpan={6} className="px-4 py-3">
                          <div className="text-xs space-y-2">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <span className="text-gray-500">Ping ID:</span>
                                <span className="ml-2 font-mono text-gray-300">{m.pingUserId}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Gigya UID:</span>
                                <span className="ml-2 font-mono text-gray-300">{m.gigyaUid || 'N/A'}</span>
                              </div>
                            </div>
                            <div>
                              <span className="text-gray-500">Ping Value:</span>
                              <span className="ml-2 font-mono text-gray-300 break-all">{m.pingValue}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Gigya Value:</span>
                              <span className="ml-2 font-mono text-gray-300 break-all">{m.gigyaValue}</span>
                            </div>
                            {m.details && (
                              <div className="bg-gray-800 rounded p-2 mt-2">
                                <span className="text-gray-500">Details:</span>
                                <p className="text-gray-300 mt-1">{m.details}</p>
                              </div>
                            )}
                            <div className="text-gray-500">
                              Detected: {new Date(m.timestamp).toLocaleString()}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- Empty state --- */}
      {!isAuthenticated && !progress && (
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-8 text-center">
          <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-300 mb-2">Recon Validation</h3>
          <p className="text-sm text-gray-500 max-w-lg mx-auto">
            Validate data integrity between Ping Identity and Gigya. Connect to a Ping tenant above,
            then start a validation run to compare user records across both systems.
          </p>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-2xl mx-auto">
            <div className="bg-gray-900 rounded-lg p-3 text-center">
              <div className={`text-xs px-2 py-0.5 rounded-full ${MISMATCH_COLORS.uuid_mismatch} inline-block`}>UUID</div>
              <p className="text-xs text-gray-500 mt-1">UID format integrity</p>
            </div>
            <div className="bg-gray-900 rounded-lg p-3 text-center">
              <div className={`text-xs px-2 py-0.5 rounded-full ${MISMATCH_COLORS.email_mismatch} inline-block`}>Email</div>
              <p className="text-xs text-gray-500 mt-1">Email correlation</p>
            </div>
            <div className="bg-gray-900 rounded-lg p-3 text-center">
              <div className={`text-xs px-2 py-0.5 rounded-full ${MISMATCH_COLORS.orphaned_ping_user} inline-block`}>Orphans</div>
              <p className="text-xs text-gray-500 mt-1">Missing Gigya accounts</p>
            </div>
            <div className="bg-gray-900 rounded-lg p-3 text-center">
              <div className={`text-xs px-2 py-0.5 rounded-full ${MISMATCH_COLORS.status_mismatch} inline-block`}>Status</div>
              <p className="text-xs text-gray-500 mt-1">Account status sync</p>
            </div>
          </div>
        </div>
      )}

      {/* --- Completed with no mismatches --- */}
      {completedJobId && !isRunning && mismatches.length === 0 && progress && progress.totalProcessed > 0 && (
        <div className="bg-green-900/20 rounded-lg border border-green-800 p-6 text-center">
          <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-green-300">All Clear</h3>
          <p className="text-sm text-green-400/70 mt-1">
            {progress.totalProcessed.toLocaleString()} users validated with no mismatches detected.
          </p>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}
