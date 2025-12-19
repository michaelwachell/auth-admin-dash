'use client'

import { useState } from 'react'
import { useIdmSearchWithPagination } from '@/hooks/useIdmSearch'
import { QueryFilterBuilder } from '@/types/idm.types'
import type { IdmApiConfig } from '@/types/idm.types'

interface IdmUserSearchProps {
  config: IdmApiConfig
}

/**
 * Example component demonstrating IDM user search functionality
 */
export const IdmUserSearch: React.FC<IdmUserSearchProps> = ({ config }) => {
  const [searchType, setSearchType] = useState<'all' | 'email' | 'name' | 'custom'>('all')
  const [emailSearch, setEmailSearch] = useState('')
  const [firstNameSearch, setFirstNameSearch] = useState('')
  const [lastNameSearch, setLastNameSearch] = useState('')
  const [customFilter, setCustomFilter] = useState('')

  const {
    users,
    totalResults,
    currentPage,
    hasMore,
    loadNextPage,
    loading,
    error,
    updateFilter,
    updateFields,
    updateSort,
    refresh
  } = useIdmSearchWithPagination(config, 20)

  const handleSearch = () => {
    let filter = 'true'

    switch (searchType) {
      case 'email':
        if (emailSearch) {
          filter = QueryFilterBuilder.equals('mail', emailSearch)
        }
        break

      case 'name':
        if (firstNameSearch && lastNameSearch) {
          filter = QueryFilterBuilder.and(
            QueryFilterBuilder.equals('givenName', firstNameSearch),
            QueryFilterBuilder.equals('sn', lastNameSearch)
          )
        } else if (firstNameSearch) {
          filter = QueryFilterBuilder.equals('givenName', firstNameSearch)
        } else if (lastNameSearch) {
          filter = QueryFilterBuilder.equals('sn', lastNameSearch)
        }
        break

      case 'custom':
        if (customFilter) {
          filter = customFilter
        }
        break

      default:
        filter = 'true'
    }

    updateFilter(filter)
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">IDM User Search</h1>

      {/* Search Controls */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="space-y-4">
          {/* Search Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Type
            </label>
            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="all">All Users</option>
              <option value="email">By Email</option>
              <option value="name">By Name</option>
              <option value="custom">Custom Filter</option>
            </select>
          </div>

          {/* Conditional Search Fields */}
          {searchType === 'email' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={emailSearch}
                onChange={(e) => setEmailSearch(e.target.value)}
                placeholder="user@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          )}

          {searchType === 'name' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name
                </label>
                <input
                  type="text"
                  value={firstNameSearch}
                  onChange={(e) => setFirstNameSearch(e.target.value)}
                  placeholder="John"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name
                </label>
                <input
                  type="text"
                  value={lastNameSearch}
                  onChange={(e) => setLastNameSearch(e.target.value)}
                  placeholder="Doe"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </>
          )}

          {searchType === 'custom' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custom Filter (LDAP-style)
              </label>
              <input
                type="text"
                value={customFilter}
                onChange={(e) => setCustomFilter(e.target.value)}
                placeholder='mail co "@nfl.com"'
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
              <p className="text-xs text-gray-500 mt-1">
                Examples: mail eq "user@nfl.com", givenName sw "John", accountStatus eq "active"
              </p>
            </div>
          )}

          {/* Field Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fields to Display (comma-separated)
            </label>
            <input
              type="text"
              placeholder="userName,mail,givenName,sn,accountStatus"
              onChange={(e) => updateFields(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          {/* Sort Options */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sort By (prefix with - for descending)
            </label>
            <input
              type="text"
              placeholder="sn,givenName or -sn,givenName"
              onChange={(e) => updateSort(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          {/* Search Button */}
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          Error: {error.message}
        </div>
      )}

      {/* Results Summary */}
      {users.length > 0 && (
        <div className="bg-gray-50 p-4 rounded-lg mb-4">
          <p className="text-sm text-gray-600">
            Showing {users.length} users
            {totalResults && ` of approximately ${totalResults} total`}
            {currentPage > 1 && ` (Page ${currentPage})`}
          </p>
        </div>
      )}

      {/* Results Table */}
      {users.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Username
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user._id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.userName || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.mail || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.givenName || ''} {user.sn || ''}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.accountStatus === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {user.accountStatus || 'unknown'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Load More Button */}
          {hasMore && (
            <div className="p-4 text-center border-t">
              <button
                onClick={loadNextPage}
                disabled={loading}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* No Results */}
      {!loading && users.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No users found. Try adjusting your search criteria.
        </div>
      )}
    </div>
  )
}