import { useState } from 'react'
import { Search, Info } from 'lucide-react'

interface SearchFormProps {
  onSubmit: (data: any) => void
  loading: boolean
}

const SearchForm: React.FC<SearchFormProps> = ({ onSubmit, loading }) => {
  const [query, setQuery] = useState('')
  const [querySorts, setQuerySorts] = useState('')
  const [start, setStart] = useState('0')
  const [limit, setLimit] = useState('100')
  const [fields, setFields] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const data: any = {
      query: query.trim()
    }
    
    if (querySorts.trim()) data.querySorts = querySorts.trim()
    if (start && start !== '0') data.start = parseInt(start)
    if (limit && limit !== '100') data.limit = parseInt(limit)
    if (fields.trim()) data.fields = fields.trim()
    
    onSubmit(data)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Query Input */}
      <div>
        <label htmlFor="query" className="block text-sm font-medium text-gray-300 mb-2">
          Search Query <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          id="query"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          placeholder='e.g., email="user@example.com"'
          required
          disabled={loading}
        />
        <p className="mt-2 text-xs text-gray-400">
          Use Gigya query syntax (field operator value). Examples: email="user@example.com", lastLogin&gt;"2024-01-01"
        </p>
      </div>

      {/* Advanced Options Toggle */}
      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
      >
        {showAdvanced ? '▼' : '▶'} Advanced Options
      </button>

      {/* Advanced Options */}
      {showAdvanced && (
        <div className="space-y-4 p-4 bg-gray-700/50 rounded-md">
          {/* Sort */}
          <div>
            <label htmlFor="querySorts" className="block text-sm font-medium text-gray-300 mb-2">
              Sort By
            </label>
            <input
              type="text"
              id="querySorts"
              value={querySorts}
              onChange={(e) => setQuerySorts(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="e.g., lastLogin DESC, email ASC"
              disabled={loading}
            />
          </div>

          {/* Pagination */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="start" className="block text-sm font-medium text-gray-300 mb-2">
                Start Index
              </label>
              <input
                type="number"
                id="start"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                min="0"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="limit" className="block text-sm font-medium text-gray-300 mb-2">
                Limit
              </label>
              <input
                type="number"
                id="limit"
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                min="1"
                max="10000"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                disabled={loading}
              />
            </div>
          </div>

          {/* Fields */}
          <div>
            <label htmlFor="fields" className="block text-sm font-medium text-gray-300 mb-2">
              Fields to Return
            </label>
            <input
              type="text"
              id="fields"
              value={fields}
              onChange={(e) => setFields(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="e.g., UID,email,profile.firstName,profile.lastName"
              disabled={loading}
            />
            <p className="mt-1 text-xs text-gray-400">
              Comma-separated list of fields. Leave empty to return all fields.
            </p>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-900/20 border border-blue-800 rounded-md p-3">
        <div className="flex gap-2">
          <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-blue-300 space-y-1">
            <p>Common query examples:</p>
            <ul className="list-disc list-inside space-y-0.5 ml-2">
              <li>Find by email: <code className="bg-gray-800 px-1 rounded">email="user@example.com"</code></li>
              <li>Find by UID: <code className="bg-gray-800 px-1 rounded">UID="123456"</code></li>
              <li>Find by first name: <code className="bg-gray-800 px-1 rounded">profile.firstName="John"</code></li>
              <li>Recent logins: <code className="bg-gray-800 px-1 rounded">lastLogin&gt;"2024-01-01"</code></li>
              <li>Locked accounts: <code className="bg-gray-800 px-1 rounded">isLockedOut=true</code></li>
              <li>Contains search: <code className="bg-gray-800 px-1 rounded">email contains "gmail"</code></li>
            </ul>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading || !query.trim()}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            Searching...
          </>
        ) : (
          <>
            <Search className="w-4 h-4" />
            Search Accounts
          </>
        )}
      </button>
    </form>
  )
}

export default SearchForm