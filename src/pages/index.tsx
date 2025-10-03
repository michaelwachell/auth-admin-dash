import { useState } from 'react'
import Head from 'next/head'
import { Shield, Lock, Key, Activity } from 'lucide-react'
import UnlockForm from '@/components/UnlockForm'
import ResponseViewer from '@/components/ResponseViewer'
import Toast from '@/components/Toast'
import { UnlockRequest, ApiResponse, GigyaResponse } from '@/types/gigya'

export default function Home() {
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState<GigyaResponse | null>(null)
  const [toast, setToast] = useState<{
    show: boolean
    message: string
    type: 'success' | 'error' | 'info'
  }>({ show: false, message: '', type: 'info' })
  const [requestHistory, setRequestHistory] = useState<Array<{
    timestamp: string
    identifier: string
    identifierType: 'UID' | 'regToken'
    success: boolean
  }>>([])

  const handleUnlock = async (data: UnlockRequest) => {
    setLoading(true)
    setResponse(null)

    try {
      const res = await fetch('/api/gigya/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      const result: ApiResponse<GigyaResponse> = await res.json()

      if (result.success && result.data) {
        setResponse(result.data)
        setToast({
          show: true,
          message: 'Account unlocked successfully!',
          type: 'success'
        })
        
        // Add to history
        setRequestHistory(prev => [{
          timestamp: new Date().toLocaleString(),
          identifier: data.UID || data.regToken || '',
          identifierType: data.UID ? 'UID' : 'regToken',
          success: true
        }, ...prev].slice(0, 5)) // Keep last 5 requests
      } else {
        setResponse(result.data || { error: result.error })
        setToast({
          show: true,
          message: result.error || 'Failed to unlock account',
          type: 'error'
        })
        
        // Add to history
        setRequestHistory(prev => [{
          timestamp: new Date().toLocaleString(),
          identifier: data.UID || data.regToken || '',
          identifierType: data.UID ? 'UID' : 'regToken',
          success: false
        }, ...prev].slice(0, 5))
      }
    } catch (error: any) {
      setToast({
        show: true,
        message: error.message || 'An error occurred',
        type: 'error'
      })
      setResponse({ error: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Head>
        <title>Gigya Admin Dashboard</title>
        <meta name="description" content="Admin interface for Gigya account management" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gray-900">
        {/* Header */}
        <header className="bg-gray-800 border-b border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-20">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-3">
                  <Shield className="w-8 h-8 text-blue-500" />
                  <h1 className="text-xl font-semibold text-gray-100">Gigya Admin Dashboard</h1>
                </div>
                <div className="flex items-center gap-2 ml-11">
                  <Activity className="w-3 h-3 text-green-400" />
                  <code className="text-xs text-gray-400 font-mono bg-gray-900 px-2 py-0.5 rounded">
                    accounts.rba.unlock
                  </code>
                </div>
              </div>
              <div className="text-xs text-gray-500">
                Risk-Based Authentication Management
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Form Card */}
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                <div className="flex items-center gap-2 mb-6">
                  <Lock className="w-5 h-5 text-blue-500" />
                  <h2 className="text-lg font-medium text-gray-100">Unlock User Account</h2>
                </div>
                <UnlockForm onSubmit={handleUnlock} loading={loading} />
              </div>

              {/* Response Viewer */}
              {response && (
                <div className="animate-fade-in">
                  <ResponseViewer 
                    response={response} 
                    title={response.statusCode === 200 ? 'Success Response' : 'Error Response'}
                  />
                </div>
              )}
            </div>

            {/* Right Column - History & Info */}
            <div className="space-y-6">
              {/* API Info Card */}
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Key className="w-5 h-5 text-green-500" />
                  <h3 className="text-sm font-medium text-gray-100">API Configuration</h3>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Data Center:</span>
                    <span className="text-gray-200">{process.env.NEXT_PUBLIC_DATA_CENTER || 'Not configured'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">API Key:</span>
                    <span className="text-gray-200">
                      {process.env.NEXT_PUBLIC_API_KEY ? '••••••••' : 'Not configured'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Environment:</span>
                    <span className="text-gray-200">Production</span>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              {requestHistory.length > 0 && (
                <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                  <h3 className="text-sm font-medium text-gray-100 mb-4">Recent Activity</h3>
                  <div className="space-y-2">
                    {requestHistory.map((item, index) => (
                      <div key={index} className="text-xs space-y-1 pb-2 border-b border-gray-700 last:border-0">
                        <div className="flex justify-between">
                          <span className="text-gray-400">{item.identifierType}:</span>
                          <span className="text-gray-200 font-mono text-[10px] truncate max-w-[150px]" title={item.identifier}>
                            {item.identifier}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Time:</span>
                          <span className="text-gray-200">{item.timestamp}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Status:</span>
                          <span className={item.success ? 'text-green-400' : 'text-red-400'}>
                            {item.success ? 'Success' : 'Failed'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Help Card */}
              <div className="bg-blue-900/20 rounded-lg border border-blue-800 p-4">
                <h3 className="text-sm font-medium text-blue-300 mb-2">Quick Guide</h3>
                <ul className="text-xs text-blue-200 space-y-1">
                  <li>• Enter the user's UID to unlock their account</li>
                  <li>• Optionally provide a reason for audit purposes</li>
                  <li>• The API uses server-to-server authentication</li>
                  <li>• All requests are logged for security</li>
                </ul>
              </div>
            </div>
          </div>
        </main>

        {/* Toast Notification */}
        {toast.show && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast({ ...toast, show: false })}
          />
        )}
      </div>
    </>
  )
}