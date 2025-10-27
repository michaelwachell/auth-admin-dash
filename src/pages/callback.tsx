import { useEffect, useState } from 'react';
import { Copy, CheckCircle } from 'lucide-react';

export default function Callback() {
  const [currentUrl, setCurrentUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCurrentUrl(window.location.href);
  }, []);

  const copyUrl = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-8 max-w-2xl w-full">
        <h1 className="text-2xl font-bold text-gray-100 mb-4">OAuth Callback Received</h1>
        
        <div className="bg-blue-900/20 border border-blue-700 rounded-md p-4 mb-6">
          <p className="text-blue-300 mb-2">
            ✅ Authorization successful! Copy the URL below and paste it back in the main window.
          </p>
          <p className="text-sm text-gray-400">
            This page exists to capture the OAuth redirect. Copy the full URL from the address bar and return to the main tab.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Current URL (copy this):
            </label>
            <div className="bg-gray-900 p-3 rounded-md font-mono text-xs text-gray-300 break-all">
              {currentUrl}
            </div>
          </div>

          <button
            onClick={copyUrl}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center gap-2 font-medium"
          >
            {copied ? (
              <>
                <CheckCircle className="w-5 h-5" />
                Copied to Clipboard!
              </>
            ) : (
              <>
                <Copy className="w-5 h-5" />
                Copy Full URL
              </>
            )}
          </button>

          <div className="text-center text-sm text-gray-400">
            <p>After copying, you can close this window and return to the main application.</p>
          </div>
        </div>
      </div>
    </div>
  );
}