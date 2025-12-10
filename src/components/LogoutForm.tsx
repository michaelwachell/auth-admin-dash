import { useState } from 'react'
import { LogOut, Loader2, AlertCircle } from 'lucide-react'
import { LogoutRequest } from '@/types/gigya'

interface LogoutFormProps {
  onSubmit: (data: LogoutRequest) => Promise<void>
  loading: boolean
}

const LogoutForm = ({ onSubmit, loading }: LogoutFormProps) => {
  const [formData, setFormData] = useState<LogoutRequest>({
    UID: ''
  })
  const [errors, setErrors] = useState<Partial<Record<keyof LogoutRequest, string>>>({})

  const handleChange = (field: keyof LogoutRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const newErrors: Partial<Record<keyof LogoutRequest, string>> = {}
    if (!formData.UID?.trim()) {
      newErrors.UID = 'User ID is required for logout'
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    await onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="bg-yellow-900/10 border border-yellow-800/50 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5" />
            <p className="text-xs text-yellow-300">
              This will log out the user from all active sessions globally across all devices and applications.
            </p>
          </div>
        </div>

        <div>
          <label htmlFor="logout-uid" className="block text-sm font-medium text-gray-200 mb-2">
            User ID (UID) <span className="text-red-400">*</span>
          </label>
          <input
            id="logout-uid"
            type="text"
            value={formData.UID}
            onChange={e => handleChange('UID', e.target.value)}
            className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors ${
              errors.UID ? 'border-red-500' : 'border-gray-700'
            }`}
            placeholder="Enter the user's UID to logout"
            disabled={loading}
          />
          {errors.UID && (
            <div className="mt-1 flex items-center gap-1 text-red-400 text-sm">
              <AlertCircle className="w-3 h-3" />
              <span>{errors.UID}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between pt-4">
        <div className="text-xs text-gray-500">
          Global logout will terminate all user sessions
        </div>
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Logging out...</span>
            </>
          ) : (
            <>
              <LogOut className="w-4 h-4" />
              <span>Logout User</span>
            </>
          )}
        </button>
      </div>
    </form>
  )
}

export default LogoutForm