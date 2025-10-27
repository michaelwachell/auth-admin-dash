import { useState } from 'react'
import { Unlock, Loader2, AlertCircle, ChevronDown, ChevronUp, Info } from 'lucide-react'
import { UnlockRequest } from '@/types/gigya'

interface UnlockFormProps {
  onSubmit: (data: UnlockRequest) => Promise<void>
  loading: boolean
}

const UnlockForm = ({ onSubmit, loading }: UnlockFormProps) => {
  const [formData, setFormData] = useState<UnlockRequest>({
    UID: '',
    regToken: '',
    IP: '',
    ignoreApiQueue: false,
    httpStatusCodes: false,
    targetEnv: undefined
  })
  const [errors, setErrors] = useState<Partial<Record<keyof UnlockRequest, string>>>({})
  const [showAdvanced, setShowAdvanced] = useState(false)

  const handleChange = (field: keyof UnlockRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate - at least one of UID, regToken, or IP is required
    const newErrors: Partial<Record<keyof UnlockRequest, string>> = {}
    if (!formData.UID?.trim() && !formData.regToken?.trim() && !formData.IP?.trim()) {
      newErrors.UID = 'At least one of UID, Registration Token, or IP is required'
      newErrors.regToken = 'At least one of UID, Registration Token, or IP is required'
      newErrors.IP = 'At least one of UID, Registration Token, or IP is required'
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    // Clean up empty fields before sending
    const cleanedData = Object.entries(formData).reduce((acc, [key, value]) => {
      if (value !== '' && value !== undefined && value !== false) {
        acc[key as keyof UnlockRequest] = value
      }
      return acc
    }, {} as UnlockRequest)

    await onSubmit(cleanedData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Primary Parameters */}
      <div className="space-y-4">
        <div className="bg-blue-900/10 border border-blue-800/50 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-400 mt-0.5" />
            <p className="text-xs text-blue-300">
              Provide at least one: User ID (UID), Registration Token, or IP Address (in Advanced Options).
            </p>
          </div>
        </div>

        <div>
          <label htmlFor="uid" className="block text-sm font-medium text-gray-200 mb-2">
            User ID (UID)
          </label>
          <input
            id="uid"
            type="text"
            value={formData.UID}
            onChange={e => handleChange('UID', e.target.value)}
            className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
              errors.UID ? 'border-red-500' : 'border-gray-700'
            }`}
            placeholder="Enter the user's UID"
            disabled={loading}
          />
          {errors.UID && (
            <div className="mt-1 flex items-center gap-1 text-red-400 text-sm">
              <AlertCircle className="w-3 h-3" />
              <span>{errors.UID}</span>
            </div>
          )}
        </div>

        <div>
          <label htmlFor="regToken" className="block text-sm font-medium text-gray-200 mb-2">
            Registration Token
          </label>
          <input
            id="regToken"
            type="text"
            value={formData.regToken}
            onChange={e => handleChange('regToken', e.target.value)}
            className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
              errors.regToken ? 'border-red-500' : 'border-gray-700'
            }`}
            placeholder="Enter the registration token"
            disabled={loading}
          />
          {errors.regToken && (
            <div className="mt-1 flex items-center gap-1 text-red-400 text-sm">
              <AlertCircle className="w-3 h-3" />
              <span>{errors.regToken}</span>
            </div>
          )}
        </div>
      </div>

      {/* Advanced Options */}
      <div className="border-t border-gray-700 pt-4">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
        >
          {showAdvanced ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
          Advanced Options
        </button>

        {showAdvanced && (
          <div className="mt-4 space-y-4">
            <div>
              <label htmlFor="ip" className="block text-sm font-medium text-gray-200 mb-2">
                IP Address
              </label>
              <input
                id="ip"
                type="text"
                value={formData.IP}
                onChange={e => handleChange('IP', e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="e.g., 192.168.1.1"
                disabled={loading}
              />
              <p className="mt-1 text-xs text-gray-500">
                Unlock the account for a specific IP address that may have been blocked
              </p>
            </div>

            <div>
              <label htmlFor="targetEnv" className="block text-sm font-medium text-gray-200 mb-2">
                Target Environment
              </label>
              <select
                id="targetEnv"
                value={formData.targetEnv || ''}
                onChange={e => handleChange('targetEnv', e.target.value || undefined)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                disabled={loading}
              >
                <option value="">Default</option>
                <option value="mobile">Mobile</option>
                <option value="browser">Browser</option>
                <option value="both">Both</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Specifies which environment to unlock the account for
              </p>
            </div>

            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.ignoreApiQueue || false}
                  onChange={e => handleChange('ignoreApiQueue', e.target.checked)}
                  className="w-4 h-4 bg-gray-800 border border-gray-700 rounded text-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 focus:ring-offset-gray-900"
                  disabled={loading}
                />
                <span className="text-sm text-gray-200">Ignore API Queue</span>
              </label>
              <p className="ml-6 mt-1 text-xs text-gray-500">
                Process this request immediately without queuing
              </p>
            </div>

            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.httpStatusCodes || false}
                  onChange={e => handleChange('httpStatusCodes', e.target.checked)}
                  className="w-4 h-4 bg-gray-800 border border-gray-700 rounded text-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 focus:ring-offset-gray-900"
                  disabled={loading}
                />
                <span className="text-sm text-gray-200">HTTP Status Codes</span>
              </label>
              <p className="ml-6 mt-1 text-xs text-gray-500">
                Return HTTP status codes in the response
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-4">
        <div className="text-xs text-gray-500">
          This will unlock the user's account in the RBA system
        </div>
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Unlocking...</span>
            </>
          ) : (
            <>
              <Unlock className="w-4 h-4" />
              <span>Unlock Account</span>
            </>
          )}
        </button>
      </div>
    </form>
  )
}

export default UnlockForm