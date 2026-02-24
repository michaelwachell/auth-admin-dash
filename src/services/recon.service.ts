/**
 * Recon Validation Service
 * Client-side SSE stream handler for validation results
 */

import type {
  ReconConfig,
  ReconValidationCallbacks,
  SSEMessage,
  ReconProgress,
  ValidationMismatch,
  SpotCheckConfig
} from '../types/recon.types'

interface ResumeParams {
  resumeFromCookie: string
  resumeProgress: ReconProgress
}

interface SpotCheckParams {
  sampleSize: number
  excludeUids: string[]
}

export class ReconValidationService {
  private abortController: AbortController | null = null

  /**
   * Start a validation run. Streams results via SSE from the server.
   * Optionally resumes from a checkpoint.
   * Returns an abort function.
   */
  async startValidation(
    config: ReconConfig,
    callbacks: ReconValidationCallbacks,
    resume?: ResumeParams,
    spotCheck?: SpotCheckParams
  ): Promise<() => void> {
    this.abortController = new AbortController()

    try {
      const payload: Record<string, unknown> = { ...config }
      if (resume) {
        payload.resumeFromCookie = resume.resumeFromCookie
        payload.resumeProgress = resume.resumeProgress
      }
      if (spotCheck) {
        payload.spotCheck = spotCheck
        payload.maxUsers = spotCheck.sampleSize
      }

      const response = await fetch('/api/recon-validation/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: this.abortController.signal
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Request failed' }))
        callbacks.onError(error.error || `HTTP ${response.status}`, error.details)
        return () => {}
      }

      if (!response.body) {
        callbacks.onError('No response body - SSE streaming not supported')
        return () => {}
      }

      // Read SSE stream
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let receivedComplete = false

      const processStream = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) {
              // Process any remaining buffer
              if (buffer.trim()) {
                const dataLine = buffer.split('\n').find((line) => line.startsWith('data: '))
                if (dataLine) {
                  try {
                    const parsed: SSEMessage = JSON.parse(dataLine.slice(6))
                    if (parsed.type === 'complete') receivedComplete = true
                    this.handleMessage(parsed, callbacks)
                  } catch {
                    // Skip
                  }
                }
              }
              // If stream ended without a complete event, notify as error
              if (!receivedComplete) {
                console.warn('[ReconService] Stream ended without complete event')
                callbacks.onError('Validation stream ended unexpectedly. Check server logs for details.')
              }
              break
            }

            buffer += decoder.decode(value, { stream: true })

            // Parse SSE messages (format: "data: {...}\n\n")
            const messages = buffer.split('\n\n')
            buffer = messages.pop() || '' // Keep incomplete message in buffer

            for (const message of messages) {
              const dataLine = message
                .split('\n')
                .find((line) => line.startsWith('data: '))

              if (!dataLine) continue

              try {
                const parsed: SSEMessage = JSON.parse(dataLine.slice(6))
                if (parsed.type === 'complete') receivedComplete = true
                if (parsed.type === 'error') receivedComplete = true
                this.handleMessage(parsed, callbacks)
              } catch (parseErr) {
                console.warn('[ReconService] Failed to parse SSE message:', dataLine, parseErr)
              }
            }
          }
        } catch (err: any) {
          if (err.name === 'AbortError') {
            return
          }
          callbacks.onError('Stream reading failed', err.message)
        }
      }

      // Start processing in background (non-blocking)
      processStream()

      // Return abort function
      return () => this.abort()
    } catch (err: any) {
      if (err.name === 'AbortError') return () => {}
      callbacks.onError('Failed to start validation', err.message)
      return () => {}
    }
  }

  /**
   * Dispatch SSE message to appropriate callback
   */
  private handleMessage(message: SSEMessage, callbacks: ReconValidationCallbacks): void {
    switch (message.type) {
      case 'progress':
        callbacks.onProgress(message.data as ReconProgress)
        break
      case 'mismatch':
        callbacks.onMismatch(message.data as ValidationMismatch)
        break
      case 'complete': {
        const completeData = message.data as { jobId: string; summary: ReconProgress; sampledUserIds?: string[] }
        callbacks.onComplete(completeData.jobId, completeData.summary, completeData.sampledUserIds)
        break
      }
      case 'error':
        callbacks.onError(
          (message.data as { message: string; details?: string }).message,
          (message.data as { message: string; details?: string }).details
        )
        break
      case 'checkpoint':
        if (callbacks.onCheckpoint) {
          const cp = message.data as { pagedResultsCookie: string; progress: ReconProgress; lastProcessedDate?: string }
          callbacks.onCheckpoint(cp.pagedResultsCookie, cp.progress, cp.lastProcessedDate)
        }
        break
    }
  }

  /**
   * Abort a running validation
   */
  abort(): void {
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }
  }

  /**
   * Download CSV results for a completed job
   */
  static async downloadCsv(jobId: string): Promise<void> {
    const response = await fetch(`/api/recon-validation/download/${encodeURIComponent(jobId)}`)

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Download failed' }))
      throw new Error(error.error || `Download failed (${response.status})`)
    }

    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `recon-validation-${jobId}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
}
