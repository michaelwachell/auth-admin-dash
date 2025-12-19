'use client';

import React, { useState, useCallback } from 'react';
import { Button, Input, Label, Checkbox, Card, CardContent, CardHeader, CardTitle, Alert, AlertDescription } from '../ui';
import { Search, Copy, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { IdmQueryReference } from '../IdmQueryReference';
import type { UserSearchParams, UserSearchResponse } from '../../src/types/idm.types';

interface SimplePingSearchProps {
  environment: string;
  accessToken: string;
  onSearch: (params: UserSearchParams) => Promise<UserSearchResponse>;
}

export const SimplePingSearch: React.FC<SimplePingSearchProps> = ({
  environment,
  accessToken,
  onSearch
}) => {
  const [query, setQuery] = useState('true');
  const [fields, setFields] = useState('userName,givenName,sn,mail,accountStatus');
  const [pageSize, setPageSize] = useState('20');
  const [includeMetadata, setIncludeMetadata] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<UserSearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isQueryRefOpen, setIsQueryRefOpen] = useState(false);
  const [curlCommand, setCurlCommand] = useState<string | null>(null);

  const executeSearch = useCallback(async () => {
    if (!accessToken) {
      setError('Access token required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Add metadata fields if checkbox is enabled and they're not already in the fields list
      let finalFields = fields;
      if (includeMetadata && fields) {
        const metadataFields = ['_meta/lastChanged', '_meta/created', '_meta/createDate', '_meta/lastModified', '_meta/modifyDate'];
        const currentFields = fields.split(',').map(f => f.trim());
        const fieldsToAdd = metadataFields.filter(f => !currentFields.includes(f));
        if (fieldsToAdd.length > 0) {
          finalFields = `${fieldsToAdd.join(',')},${fields}`;
        }
      } else if (includeMetadata && !fields) {
        finalFields = '_meta/lastChanged,_meta/created,_meta/createDate,_meta/lastModified,_meta/modifyDate,userName,mail,givenName,sn,accountStatus';
      }

      const params: UserSearchParams = {
        _queryFilter: query || 'true',
        _fields: finalFields,
        _pageSize: parseInt(pageSize)
      };

      // Generate curl command for developers
      const baseUrl = environment.includes('http') ? environment : `https://${environment}`;
      const endpoint = `${baseUrl}/openidm/managed/alpha_user`;
      const queryParams = new URLSearchParams();
      queryParams.append('_queryFilter', query || 'true');
      if (finalFields) queryParams.append('_fields', finalFields);
      queryParams.append('_pageSize', pageSize);

      const curl = `curl -X GET "${endpoint}?${queryParams.toString()}" \\
  -H "Authorization: Bearer ${accessToken}" \\
  -H "Accept: application/json" \\
  -H "Accept-API-Version: resource=1.0"`;

      setCurlCommand(curl);

      const response = await onSearch(params);
      setSearchResults(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, query, fields, pageSize, includeMetadata, onSearch, environment]);

  const copyResults = useCallback(() => {
    if (searchResults) {
      navigator.clipboard.writeText(JSON.stringify(searchResults, null, 2));
    }
  }, [searchResults]);

  const copyCurl = useCallback(() => {
    if (curlCommand) {
      navigator.clipboard.writeText(curlCommand);
    }
  }, [curlCommand]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Ping Search API
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Query Input */}
        <div className="space-y-2">
          <Label htmlFor="query">Query Filter</Label>
          <Input
            id="query"
            placeholder="true (all users) or mail co '@nfl.com'"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && executeSearch()}
            className="font-mono"
          />
        </div>

        {/* Fields Input */}
        <div className="space-y-2">
          <Label htmlFor="fields">Fields to Return</Label>
          <Input
            id="fields"
            placeholder="Comma-separated field names"
            value={fields}
            onChange={(e) => setFields(e.target.value)}
          />
        </div>

        {/* Page Size */}
        <div className="space-y-2">
          <Label htmlFor="pageSize">Page Size</Label>
          <Input
            id="pageSize"
            type="number"
            min="1"
            max="1000"
            value={pageSize}
            onChange={(e) => setPageSize(e.target.value)}
          />
        </div>

        {/* Metadata Checkbox */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="includeMetadata"
            checked={includeMetadata}
            onCheckedChange={(checked) => setIncludeMetadata(checked as boolean)}
          />
          <Label htmlFor="includeMetadata" className="text-sm">
            Include timestamp metadata (lastChanged, created, etc.) in response
          </Label>
        </div>

        {/* Execute Button */}
        <Button
          onClick={executeSearch}
          disabled={isLoading || !accessToken}
          className="w-full"
        >
          {isLoading ? 'Searching...' : 'Execute Search'}
        </Button>

        {/* Curl Command Display */}
        {curlCommand && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-sm">cURL Command</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={copyCurl}
              >
                <Copy className="h-4 w-4 mr-1" />
                Copy
              </Button>
            </div>
            <pre className="text-xs bg-gray-900 p-3 rounded border border-gray-700 overflow-x-auto">
              {curlCommand}
            </pre>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Query Reference & Examples (Collapsible) */}
        <div className="border rounded-lg">
          <Button
            variant="ghost"
            className="w-full p-3 flex justify-between items-center"
            onClick={() => setIsQueryRefOpen(!isQueryRefOpen)}
          >
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              <span>Query Language Reference</span>
            </div>
            {isQueryRefOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>

          {isQueryRefOpen && (
            <div className="p-3 border-t space-y-3">
              {/* Basic Examples */}
              <div>
                <p className="text-xs font-semibold mb-2 text-gray-400">Common Queries</p>
                <div className="text-xs space-y-1">
                  <code className="block p-2 bg-muted rounded">
                    true - All users
                  </code>
                  <code className="block p-2 bg-muted rounded">
                    mail eq "user@example.com" - Exact email
                  </code>
                  <code className="block p-2 bg-muted rounded">
                    mail co "@nfl.com" - Contains @nfl.com
                  </code>
                  <code className="block p-2 bg-muted rounded">
                    userName sw "john" - Starts with john
                  </code>
                  <code className="block p-2 bg-muted rounded">
                    accountStatus eq "active" - Active users
                  </code>
                </div>
              </div>

              {/* Operators */}
              <div>
                <p className="text-xs font-semibold mb-2 text-gray-400">Operators</p>
                <div className="text-xs space-y-1">
                  <div className="flex justify-between p-1">
                    <span className="font-mono">eq</span>
                    <span className="text-gray-500">equals</span>
                  </div>
                  <div className="flex justify-between p-1">
                    <span className="font-mono">co</span>
                    <span className="text-gray-500">contains</span>
                  </div>
                  <div className="flex justify-between p-1">
                    <span className="font-mono">sw</span>
                    <span className="text-gray-500">starts with</span>
                  </div>
                  <div className="flex justify-between p-1">
                    <span className="font-mono">pr</span>
                    <span className="text-gray-500">present (exists)</span>
                  </div>
                  <div className="flex justify-between p-1">
                    <span className="font-mono">gt/ge</span>
                    <span className="text-gray-500">greater than/equal</span>
                  </div>
                  <div className="flex justify-between p-1">
                    <span className="font-mono">lt/le</span>
                    <span className="text-gray-500">less than/equal</span>
                  </div>
                </div>
              </div>

              {/* Metadata Queries */}
              <div>
                <p className="text-xs font-semibold mb-2 text-gray-400">Timestamp Metadata Queries</p>
                <div className="text-xs space-y-1">
                  <code className="block p-2 bg-muted rounded">
                    _meta/lastChanged ge "2024-01-01T00:00:00Z" - Modified after date
                  </code>
                  <code className="block p-2 bg-muted rounded">
                    _meta/created le "2024-12-31T23:59:59Z" - Created before date
                  </code>
                  <code className="block p-2 bg-muted rounded">
                    _meta/lastModified ge "2024-12-01T00:00:00Z" - Recent changes
                  </code>
                  <code className="block p-2 bg-muted rounded">
                    (_meta/lastChanged ge "2024-12-01") and (accountStatus eq "active")
                  </code>
                  <div className="p-2 bg-yellow-900/20 border border-yellow-800/50 rounded text-yellow-200">
                    <strong>Note:</strong> Enable "Include timestamp metadata" checkbox to add _meta/lastChanged, _meta/created, and other timestamp fields to results. Use ISO 8601 date format for queries.
                  </div>
                </div>
              </div>

              {/* Field Presence Queries */}
              <div>
                <p className="text-xs font-semibold mb-2 text-gray-400">Field Presence Checks</p>
                <div className="text-xs space-y-1">
                  <code className="block p-2 bg-muted rounded">
                    telephoneNumber pr - Has phone number
                  </code>
                  <code className="block p-2 bg-muted rounded">
                    mail pr - Has email address
                  </code>
                  <code className="block p-2 bg-muted rounded">
                    !(givenName pr) - Missing first name
                  </code>
                </div>
              </div>

              {/* Complex Examples */}
              <div>
                <p className="text-xs font-semibold mb-2 text-gray-400">Complex Queries</p>
                <div className="text-xs space-y-1">
                  <code className="block p-2 bg-muted rounded">
                    (mail co "@nfl.com") and (accountStatus eq "active")
                  </code>
                  <code className="block p-2 bg-muted rounded">
                    (givenName eq "John") or (givenName eq "Jane")
                  </code>
                  <code className="block p-2 bg-muted rounded">
                    !(emailVerified eq "true") - Not verified
                  </code>
                </div>
              </div>

              {/* Time-based Query Examples */}
              <div>
                <p className="text-xs font-semibold mb-2 text-gray-400">Time-based Queries (with Metadata)</p>
                <div className="text-xs space-y-1">
                  <code className="block p-2 bg-muted rounded">
                    _meta/lastChanged ge "2024-12-19T00:00:00Z" - Today's changes
                  </code>
                  <code className="block p-2 bg-muted rounded">
                    _meta/created ge "2024-12-01" and _meta/created le "2024-12-31" - This month
                  </code>
                  <code className="block p-2 bg-muted rounded">
                    _meta/lastModified ge "2024-12-18T00:00:00Z" - Last 24 hours
                  </code>
                  <code className="block p-2 bg-muted rounded">
                    (accountStatus eq "inactive") and (_meta/lastChanged le "2024-01-01")
                  </code>
                  <div className="text-gray-500 text-[10px] mt-1">
                    Tip: Dates can be ISO 8601 format with or without time. Use Z for UTC.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* JSON Results */}
        {searchResults && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label>Results ({searchResults.resultCount} items)</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={copyResults}
              >
                <Copy className="h-4 w-4 mr-1" />
                Copy
              </Button>
            </div>
            <div className="max-h-96 overflow-auto">
              <pre className="text-xs bg-gray-900 p-3 rounded border border-gray-700">
                {JSON.stringify(searchResults, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};