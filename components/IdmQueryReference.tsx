'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Info, Book, Copy, CheckCircle } from 'lucide-react'

export const IdmQueryReference = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [copiedExample, setCopiedExample] = useState<string | null>(null)

  const copyExample = (example: string) => {
    navigator.clipboard.writeText(example)
    setCopiedExample(example)
    setTimeout(() => setCopiedExample(null), 2000)
  }

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-800 transition-colors rounded-lg"
      >
        <div className="flex items-center gap-2">
          <Book className="h-4 w-4 text-blue-400" />
          <span className="text-sm font-medium text-gray-200">Query Filter Reference Guide</span>
        </div>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        )}
      </button>

      {isOpen && (
        <div className="px-4 pb-4 space-y-4 border-t border-gray-700 mt-2 pt-4">
          {/* Basic Syntax */}
          <div>
            <h4 className="text-xs font-semibold text-blue-400 mb-2 uppercase tracking-wider">Basic Operators</h4>
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-2 text-xs">
                <div className="col-span-2 text-gray-400">eq</div>
                <div className="col-span-4 text-gray-300">Equals</div>
                <div className="col-span-6 font-mono text-gray-100">field eq "value"</div>
              </div>
              <div className="grid grid-cols-12 gap-2 text-xs">
                <div className="col-span-2 text-gray-400">co</div>
                <div className="col-span-4 text-gray-300">Contains</div>
                <div className="col-span-6 font-mono text-gray-100">field co "partial"</div>
              </div>
              <div className="grid grid-cols-12 gap-2 text-xs">
                <div className="col-span-2 text-gray-400">sw</div>
                <div className="col-span-4 text-gray-300">Starts with</div>
                <div className="col-span-6 font-mono text-gray-100">field sw "prefix"</div>
              </div>
              <div className="grid grid-cols-12 gap-2 text-xs">
                <div className="col-span-2 text-gray-400">gt</div>
                <div className="col-span-4 text-gray-300">Greater than</div>
                <div className="col-span-6 font-mono text-gray-100">field gt 10</div>
              </div>
              <div className="grid grid-cols-12 gap-2 text-xs">
                <div className="col-span-2 text-gray-400">lt</div>
                <div className="col-span-4 text-gray-300">Less than</div>
                <div className="col-span-6 font-mono text-gray-100">field lt 100</div>
              </div>
              <div className="grid grid-cols-12 gap-2 text-xs">
                <div className="col-span-2 text-gray-400">ge</div>
                <div className="col-span-4 text-gray-300">Greater or equal</div>
                <div className="col-span-6 font-mono text-gray-100">field ge 10</div>
              </div>
              <div className="grid grid-cols-12 gap-2 text-xs">
                <div className="col-span-2 text-gray-400">le</div>
                <div className="col-span-4 text-gray-300">Less or equal</div>
                <div className="col-span-6 font-mono text-gray-100">field le 100</div>
              </div>
              <div className="grid grid-cols-12 gap-2 text-xs">
                <div className="col-span-2 text-gray-400">pr</div>
                <div className="col-span-4 text-gray-300">Present (exists)</div>
                <div className="col-span-6 font-mono text-gray-100">field pr</div>
              </div>
            </div>
          </div>

          {/* Logical Operators */}
          <div>
            <h4 className="text-xs font-semibold text-blue-400 mb-2 uppercase tracking-wider">Logical Operators</h4>
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-2 text-xs">
                <div className="col-span-2 text-gray-400">and</div>
                <div className="col-span-4 text-gray-300">Both conditions</div>
                <div className="col-span-6 font-mono text-gray-100">(expr1) and (expr2)</div>
              </div>
              <div className="grid grid-cols-12 gap-2 text-xs">
                <div className="col-span-2 text-gray-400">or</div>
                <div className="col-span-4 text-gray-300">Either condition</div>
                <div className="col-span-6 font-mono text-gray-100">(expr1) or (expr2)</div>
              </div>
              <div className="grid grid-cols-12 gap-2 text-xs">
                <div className="col-span-2 text-gray-400">!</div>
                <div className="col-span-4 text-gray-300">Negation</div>
                <div className="col-span-6 font-mono text-gray-100">!(expression)</div>
              </div>
            </div>
          </div>

          {/* Common Fields */}
          <div>
            <h4 className="text-xs font-semibold text-blue-400 mb-2 uppercase tracking-wider">Common IDM Fields</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-400">• </span>
                <span className="font-mono text-gray-300">mail</span>
                <span className="text-gray-500"> - Email address</span>
              </div>
              <div>
                <span className="text-gray-400">• </span>
                <span className="font-mono text-gray-300">userName</span>
                <span className="text-gray-500"> - Username</span>
              </div>
              <div>
                <span className="text-gray-400">• </span>
                <span className="font-mono text-gray-300">givenName</span>
                <span className="text-gray-500"> - First name</span>
              </div>
              <div>
                <span className="text-gray-400">• </span>
                <span className="font-mono text-gray-300">sn</span>
                <span className="text-gray-500"> - Last name</span>
              </div>
              <div>
                <span className="text-gray-400">• </span>
                <span className="font-mono text-gray-300">accountStatus</span>
                <span className="text-gray-500"> - Status</span>
              </div>
              <div>
                <span className="text-gray-400">• </span>
                <span className="font-mono text-gray-300">_id</span>
                <span className="text-gray-500"> - User ID</span>
              </div>
            </div>
          </div>

          {/* Practical Examples */}
          <div>
            <h4 className="text-xs font-semibold text-blue-400 mb-2 uppercase tracking-wider">Practical Examples</h4>
            <div className="space-y-2">
              {[
                { label: 'All users', query: 'true' },
                { label: 'Find by email', query: 'mail eq "john.doe@nfl.com"' },
                { label: 'Find by username', query: 'userName eq "jdoe123"' },
                { label: 'Find by first name', query: 'givenName eq "John"' },
                { label: 'Find by last name', query: 'sn eq "Doe"' },
                { label: 'Active users only', query: 'accountStatus eq "active"' },
                { label: 'Inactive users', query: 'accountStatus eq "inactive"' },
                { label: 'NFL email addresses', query: 'mail co "@nfl.com"' },
                { label: 'Names starting with J', query: 'givenName sw "J"' },
                { label: 'Users with email', query: 'mail pr' },
                { label: 'Full name search', query: '(givenName eq "John") and (sn eq "Doe")' },
                { label: 'Multiple names', query: '(givenName eq "John") or (givenName eq "Jane")' },
                { label: 'Exclude specific user', query: '!(userName eq "admin")' },
                { label: 'Complex filter', query: '(accountStatus eq "active") and (mail co "@nfl.com") and !(givenName eq "Test")' }
              ].map((example, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-800 rounded">
                  <div className="flex-1">
                    <div className="text-xs text-gray-400">{example.label}</div>
                    <div className="font-mono text-xs text-gray-100 mt-1">{example.query}</div>
                  </div>
                  <button
                    onClick={() => copyExample(example.query)}
                    className="ml-2 p-1 hover:bg-gray-700 rounded transition-colors"
                    title="Copy example"
                  >
                    {copiedExample === example.query ? (
                      <CheckCircle className="h-3 w-3 text-green-400" />
                    ) : (
                      <Copy className="h-3 w-3 text-gray-400" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Tips */}
          <div className="bg-blue-900/20 border border-blue-800/50 rounded p-3">
            <div className="flex items-start gap-2">
              <Info className="h-3 w-3 text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <div className="text-xs text-blue-300 font-medium">Pro Tips:</div>
                <ul className="text-xs text-blue-200 space-y-1">
                  <li>• Always wrap string values in double quotes</li>
                  <li>• Use parentheses with and/or operators</li>
                  <li>• Field names are case-sensitive</li>
                  <li>• Use "true" to return all users</li>
                  <li>• Combine operators for complex queries</li>
                  <li>• The _rev field changes when objects are modified</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Sorting Guide */}
          <div>
            <h4 className="text-xs font-semibold text-blue-400 mb-2 uppercase tracking-wider">Sorting Results</h4>
            <div className="text-xs text-gray-300 space-y-1">
              <div>• Use comma-separated field names</div>
              <div>• Prefix with <span className="font-mono text-gray-100">-</span> for descending order</div>
              <div className="mt-2 space-y-1">
                <div className="font-mono text-gray-100 bg-gray-800 p-2 rounded">sn,givenName</div>
                <div className="text-gray-400">↑ Sort by last name (asc), then first name (asc)</div>
              </div>
              <div className="mt-2 space-y-1">
                <div className="font-mono text-gray-100 bg-gray-800 p-2 rounded">-accountStatus,userName</div>
                <div className="text-gray-400">↑ Sort by status (desc), then username (asc)</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}