import { useState } from 'react'
import { Copy, Check, ChevronDown, ChevronUp, Terminal, Database } from 'lucide-react'

interface ResponseViewerProps {
  response: any
  title?: string
}

const ResponseViewer = ({ response, title = 'Response' }: ResponseViewerProps) => {
  const [copied, setCopied] = useState(false)
  const [curlCopied, setCurlCopied] = useState(false)
  const [cursorCopied, setCursorCopied] = useState(false)
  const [expanded, setExpanded] = useState(true)

  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(response, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const copyCurl = () => {
    if (response._curlCommand) {
      navigator.clipboard.writeText(response._curlCommand)
      setCurlCopied(true)
      setTimeout(() => setCurlCopied(false), 2000)
    }
  }

  const copyCursor = () => {
    if (response.nextCursorId) {
      navigator.clipboard.writeText(response.nextCursorId)
      setCursorCopied(true)
      setTimeout(() => setCursorCopied(false), 2000)
    }
  }

  if (!response) return null

  const hasCurl = response._curlCommand
  const hasCursor = response.nextCursorId

  return (
    <div className="space-y-4">
      {/* cURL Command Section */}
      {hasCurl && (
        <div className="bg-gray-800 rounded-lg border border-blue-700">
          <div className="flex items-center justify-between px-4 py-3 border-b border-blue-700 bg-blue-900/20">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-medium text-blue-300">cURL Command</h3>
            </div>
            <button
              onClick={copyCurl}
              className="p-1.5 rounded hover:bg-blue-800/30 transition-colors"
              title="Copy cURL command"
            >
              {curlCopied ? (
                <Check className="w-4 h-4 text-green-400" />
              ) : (
                <Copy className="w-4 h-4 text-blue-400" />
              )}
            </button>
          </div>
          <div className="p-4 overflow-auto">
            <pre className="text-xs text-blue-200 font-mono whitespace-pre-wrap break-all">
              <code>{response._curlCommand}</code>
            </pre>
          </div>
        </div>
      )}

      {/* Cursor Section */}
      {hasCursor && (
        <div className="bg-gray-800 rounded-lg border border-green-700">
          <div className="flex items-center justify-between px-4 py-3 border-b border-green-700 bg-green-900/20">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-green-400" />
              <h3 className="text-sm font-medium text-green-300">Next Cursor ID</h3>
            </div>
            <button
              onClick={copyCursor}
              className="p-1.5 rounded hover:bg-green-800/30 transition-colors"
              title="Copy cursor ID"
            >
              {cursorCopied ? (
                <Check className="w-4 h-4 text-green-400" />
              ) : (
                <Copy className="w-4 h-4 text-green-400" />
              )}
            </button>
          </div>
          <div className="p-4 overflow-auto">
            <pre className="text-xs text-green-200 font-mono break-all">
              <code>{response.nextCursorId}</code>
            </pre>
          </div>
        </div>
      )}

      {/* Main Response Section */}
      <div className="bg-gray-800 rounded-lg border border-gray-700">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <h3 className="text-sm font-medium text-gray-200">{title}</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={copyToClipboard}
              className="p-1.5 rounded hover:bg-gray-700 transition-colors"
              title="Copy to clipboard"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-400" />
              ) : (
                <Copy className="w-4 h-4 text-gray-400" />
              )}
            </button>
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 rounded hover:bg-gray-700 transition-colors"
            >
              {expanded ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </button>
          </div>
        </div>

        {expanded && (
          <div className="p-4 overflow-auto max-h-96">
            <pre className="text-xs text-gray-300">
              <code>{JSON.stringify(response, null, 2)}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}

export default ResponseViewer