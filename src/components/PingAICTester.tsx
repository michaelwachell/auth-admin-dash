import { useState, useEffect } from 'react';
import { ChevronRight, Copy, CheckCircle, AlertCircle, RefreshCw, Terminal } from 'lucide-react';

interface OIDCConfig {
  metadataUrl: string;
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  scope: string;
  responseType: 'token' | 'code';
  usePKCE: boolean;
  includePing: boolean;
}

interface OIDCMetadata {
  authorization_endpoint?: string;
  token_endpoint?: string;
  jwks_uri?: string;
  issuer?: string;
  scopes_supported?: string[];
}

interface TokenResponse {
  access_token?: string;
  id_token?: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
  error_description?: string;
}

export default function PingAICTester() {
  const [config, setConfig] = useState<OIDCConfig>({
    metadataUrl: '',
    clientId: '',
    clientSecret: '',
    redirectUri: '',
    scope: 'openid profile email',
    responseType: 'code',
    usePKCE: true,
    includePing: false,
  });

  const [metadata, setMetadata] = useState<OIDCMetadata | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenResponse, setTokenResponse] = useState<TokenResponse | null>(null);
  const [pkceChallenge, setPkceChallenge] = useState<string>('');
  const [pkceVerifier, setPkceVerifier] = useState<string>('');
  const [state, setState] = useState<string>('');
  const [copied, setCopied] = useState<string | null>(null);
  const [pastedUrl, setPastedUrl] = useState<string>('');
  const [showTokenExchange, setShowTokenExchange] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [tokenExpiry, setTokenExpiry] = useState<Date | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [storedRefreshToken, setStoredRefreshToken] = useState<string | null>(null);
  const [authorizationUrl, setAuthorizationUrl] = useState<string>('');

  // Load config from localStorage on mount
  useEffect(() => {
    // Set the default redirect URI based on window.location
    setConfig(prev => ({
      ...prev,
      redirectUri: `${window.location.origin}/callback`
    }));

    const savedConfig = localStorage.getItem('ping_oidc_config');
    const savedMetadata = localStorage.getItem('ping_oidc_metadata');
    const savedRefreshToken = localStorage.getItem('ping_refresh_token');

    if (savedRefreshToken) {
      setStoredRefreshToken(savedRefreshToken);
    }

    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setConfig(parsed);
      } catch (e) {
        console.error('Failed to parse saved config:', e);
      }
    }
    
    if (savedMetadata) {
      try {
        const parsed = JSON.parse(savedMetadata);
        setMetadata(parsed);
      } catch (e) {
        console.error('Failed to parse saved metadata:', e);
      }
    }
  }, []);

  // Save config to localStorage when it changes
  useEffect(() => {
    if (config.metadataUrl || config.clientId) {
      localStorage.setItem('ping_oidc_config', JSON.stringify(config));
    }
  }, [config]);

  // Save metadata to localStorage when it changes
  useEffect(() => {
    if (metadata) {
      localStorage.setItem('ping_oidc_metadata', JSON.stringify(metadata));
    }
  }, [metadata]);

  // Update token expiry countdown
  useEffect(() => {
    if (!tokenExpiry) return;

    const updateTimer = () => {
      const now = new Date();
      const diff = tokenExpiry.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeRemaining('Expired');
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeRemaining(`${minutes}m ${seconds}s`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [tokenExpiry]);

  const exchangeCodeForToken = async (
    code: string,
    meta: OIDCMetadata,
    conf: OIDCConfig,
    verifier: string | null
  ) => {
    if (!meta.token_endpoint) {
      setError('No token endpoint found in metadata');
      return;
    }

    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: conf.redirectUri,
        client_id: conf.clientId,
      });

      // When using Ping, client_secret is sent via Basic Auth header instead of body
      if (conf.clientSecret && !conf.includePing) {
        params.append('client_secret', conf.clientSecret);
      }
      
      if (verifier && conf.usePKCE) {
        params.append('code_verifier', verifier);
        console.log('Including PKCE verifier in token exchange');
      }
      
      console.log('Token exchange params:', params.toString());
      
      // Try to exchange code for token
      const response = await fetch('/api/ping/token-exchange', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tokenEndpoint: meta.token_endpoint,
          params: params.toString(),
          clientId: conf.clientId,
          clientSecret: conf.clientSecret || undefined,
          includePing: conf.includePing,
        }),
      });
      
      const data = await response.json();
      
      if (data.error) {
        console.error('Token exchange error:', data);
        const errorValue = typeof data.error === 'object' ? JSON.stringify(data.error, null, 2) : data.error;
        let errorMsg = `Token Exchange Error: ${errorValue}`;
        if (data.error_description) {
          errorMsg += ` - ${data.error_description}`;
        }
        if (errorValue === 'invalid_grant') {
          errorMsg += '\n\nNote: Authorization codes can only be used once. If you already tried this code, start a new auth flow.';
        }
        if (data._debug) {
          errorMsg += `\n\n--- Debug Info ---\nURL: ${data._debug.url}\nBody: ${data._debug.bodyParams}\nBasic Auth: ${data._debug.hasBasicAuth}\nPing flag: ${data._debug.includePing}\nUpstream status: ${data._debug.upstreamStatus}`;
        }
        setError(errorMsg);
      } else {
        setTokenResponse(data);
        // Store refresh token if present
        if (data.refresh_token) {
          localStorage.setItem('ping_refresh_token', data.refresh_token);
          setStoredRefreshToken(data.refresh_token);
        }
        // Set token expiry time
        if (data.expires_in) {
          const expiry = new Date(Date.now() + data.expires_in * 1000);
          setTokenExpiry(expiry);
        }
        // Clear session storage on success
        localStorage.removeItem('ping_oidc_state');
        localStorage.removeItem('ping_pkce_verifier');
      }
    } catch (err) {
      setError(`Failed to exchange code: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetadata = async () => {
    if (!config.metadataUrl) {
      setError('Please enter a metadata URL');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/ping/metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metadataUrl: config.metadataUrl }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch metadata: ${response.statusText}`);
      }
      
      const data = await response.json();
      setMetadata(data);
    } catch (err) {
      setError(`Failed to fetch metadata: ${err}`);
      setMetadata(null);
    } finally {
      setLoading(false);
    }
  };

  const generatePKCE = async () => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const verifier = btoa(String.fromCharCode.apply(null, Array.from(array)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    
    // Generate challenge
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
    const challenge = btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(hash))))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    
    setPkceVerifier(verifier);
    setPkceChallenge(challenge);
    
    return { verifier, challenge };
  };

  const generateState = () => {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode.apply(null, Array.from(array)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  };

  const buildAuthorizationUrl = async (): Promise<{
    url: string;
    verifier?: string;
    stateValue: string;
  } | null> => {
    if (!metadata?.authorization_endpoint || !config.clientId) return null;

    const authUrl = new URL(metadata.authorization_endpoint);
    const stateValue = generateState();

    authUrl.searchParams.append('client_id', config.clientId);
    authUrl.searchParams.append('redirect_uri', config.redirectUri);
    authUrl.searchParams.append('scope', config.scope);
    authUrl.searchParams.append('state', stateValue);

    let verifier: string | undefined;

    if (config.responseType === 'token') {
      authUrl.searchParams.append('response_type', 'token id_token');
      authUrl.searchParams.append('nonce', generateState());
    } else {
      authUrl.searchParams.append('response_type', 'code');

      if (config.usePKCE) {
        const pkce = await generatePKCE();
        verifier = pkce.verifier;
        authUrl.searchParams.append('code_challenge', pkce.challenge);
        authUrl.searchParams.append('code_challenge_method', 'S256');
      }
    }

    let urlString = authUrl.toString();

    if (config.includePing) {
      const separator = urlString.includes('?') ? '&' : '?';
      urlString += `${separator}ping`;
    }

    return { url: urlString, verifier, stateValue };
  };

  // Eagerly generate authorization URL for curl preview
  useEffect(() => {
    if (!metadata?.authorization_endpoint || !config.clientId) {
      setAuthorizationUrl('');
      return;
    }

    let cancelled = false;

    const generate = async () => {
      const result = await buildAuthorizationUrl();
      if (cancelled || !result) return;

      setAuthorizationUrl(result.url);
      setState(result.stateValue);
      localStorage.setItem('ping_oidc_state', result.stateValue);
      if (result.verifier) {
        setPkceVerifier(result.verifier);
        localStorage.setItem('ping_pkce_verifier', result.verifier);
      } else {
        localStorage.removeItem('ping_pkce_verifier');
      }
    };

    generate();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    metadata?.authorization_endpoint,
    config.clientId,
    config.redirectUri,
    config.scope,
    config.responseType,
    config.usePKCE,
    config.includePing,
  ]);

  const startAuthFlow = async () => {
    if (!metadata?.authorization_endpoint) {
      setError('No authorization endpoint found. Please fetch metadata first.');
      return;
    }

    if (!config.clientId) {
      setError('Please enter a Client ID');
      return;
    }

    if (!authorizationUrl) {
      setError('Authorization URL not ready. Please verify configuration.');
      return;
    }

    // Store state and config for validation after redirect
    localStorage.setItem('ping_oidc_state', state);
    localStorage.setItem('ping_oidc_metadata', JSON.stringify(metadata));
    localStorage.setItem('ping_oidc_config', JSON.stringify(config));

    if (config.usePKCE && config.responseType === 'code' && pkceVerifier) {
      localStorage.setItem('ping_pkce_verifier', pkceVerifier);
    }

    // Open the pre-built authorization URL
    window.open(authorizationUrl, 'ping_auth', 'width=600,height=700');

    // Show the token exchange panel
    setShowTokenExchange(true);
    setError(null);
  };

  const handlePastedUrl = async () => {
    if (!pastedUrl) {
      setError('Please paste a redirect URL');
      return;
    }

    try {
      const url = new URL(pastedUrl);
      const params = new URLSearchParams(url.search);
      const hashParams = new URLSearchParams(url.hash.substring(1));
      
      // Check for implicit flow tokens in hash
      if (hashParams.get('access_token')) {
        setTokenResponse({
          access_token: hashParams.get('access_token') || undefined,
          id_token: hashParams.get('id_token') || undefined,
          token_type: hashParams.get('token_type') || undefined,
          expires_in: hashParams.get('expires_in') ? parseInt(hashParams.get('expires_in')!) : undefined,
          scope: hashParams.get('scope') || undefined,
        });
        setShowTokenExchange(false);
        setPastedUrl('');
      }
      // Check for authorization code
      else if (params.get('code')) {
        const code = params.get('code');
        const returnedState = params.get('state');
        
        // Retrieve stored values
        const storedState = localStorage.getItem('ping_oidc_state');
        const storedVerifier = localStorage.getItem('ping_pkce_verifier');
        
        console.log('Processing auth code:', code);
        console.log('State check:', { returned: returnedState, stored: storedState });
        console.log('PKCE verifier present:', !!storedVerifier);
        
        if (returnedState && storedState && returnedState !== storedState) {
          setError('State mismatch - possible CSRF attack');
          return;
        }
        
        // Exchange code for token
        await exchangeCodeForToken(code!, metadata!, config, storedVerifier);
        setShowTokenExchange(false);
        setPastedUrl('');
      }
      // Check for errors
      else if (params.get('error')) {
        setError(`OAuth Error: ${params.get('error')} - ${params.get('error_description')}`);
      } else {
        setError('No authorization code or token found in the URL');
      }
    } catch (err) {
      setError(`Invalid URL: ${err}`);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  const parseJWT = (token: string) => {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      return payload;
    } catch {
      return null;
    }
  };

  const refreshAccessToken = async () => {
    const refreshToken = tokenResponse?.refresh_token || storedRefreshToken;

    if (!refreshToken) {
      setError('No refresh token available');
      return;
    }

    if (!metadata?.token_endpoint) {
      setError('No token endpoint found in metadata');
      return;
    }

    setRefreshing(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: config.clientId,
      });

      // When using Ping, client_secret is sent via Basic Auth header instead of body
      if (config.clientSecret && !config.includePing) {
        params.append('client_secret', config.clientSecret);
      }

      const response = await fetch('/api/ping/token-exchange', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tokenEndpoint: metadata.token_endpoint,
          params: params.toString(),
          clientId: config.clientId,
          clientSecret: config.clientSecret || undefined,
          includePing: config.includePing,
        }),
      });

      const data = await response.json();

      if (data.error) {
        console.error('Refresh token error:', data);
        setError(`Refresh Error: ${data.error} - ${data.error_description || ''}`);
      } else {
        setTokenResponse(data);
        // Update stored refresh token if a new one was provided
        if (data.refresh_token) {
          localStorage.setItem('ping_refresh_token', data.refresh_token);
          setStoredRefreshToken(data.refresh_token);
        }
        // Update token expiry time
        if (data.expires_in) {
          const expiry = new Date(Date.now() + data.expires_in * 1000);
          setTokenExpiry(expiry);
        }
      }
    } catch (err) {
      setError(`Failed to refresh token: ${err}`);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Token Exchange Panel - always visible when metadata is loaded */}
      {metadata?.token_endpoint && (
        <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4 text-blue-400">Token Exchange</h2>
          <p className="text-sm text-gray-300 mb-4">
            Paste the full redirect URL containing the authorization code to exchange it for an access token:
          </p>
          <div className="space-y-3">
            <textarea
              value={pastedUrl}
              onChange={(e) => setPastedUrl(e.target.value)}
              placeholder="Paste the full redirect URL here (e.g., https://staging-id.nfl.com/account?code=w1zcbSifN...&client_id=5gUWX8z2...)"
              className="w-full h-24 px-3 py-2 bg-gray-900 border border-gray-600 text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
            />
            <div className="flex gap-2">
              <button
                onClick={handlePastedUrl}
                disabled={!pastedUrl}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Exchange for Token
              </button>
              <button
                onClick={() => setPastedUrl('')}
                disabled={!pastedUrl}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Configuration Section */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-100">Ping AIC Configuration</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Metadata URL (.well-known/openid-configuration)
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={config.metadataUrl}
                onChange={(e) => setConfig({ ...config, metadataUrl: e.target.value })}
                placeholder="https://auth.pingone.com/[env-id]/as/.well-known/openid-configuration"
                className="flex-1 px-3 py-2 bg-gray-900 border border-gray-600 text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={fetchMetadata}
                disabled={loading || !config.metadataUrl}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                Fetch
              </button>
            </div>
          </div>
          
          {metadata && (
            <div className="bg-green-900/20 border border-green-700 rounded-md p-3">
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Metadata loaded successfully</span>
              </div>
              <div className="mt-2 text-xs text-gray-400">
                <div>Issuer: {metadata.issuer}</div>
                <div className="truncate">Auth: {metadata.authorization_endpoint}</div>
                <div className="truncate">Token: {metadata.token_endpoint}</div>
              </div>
            </div>
          )}
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Client ID
                </label>
                <input
                  type="text"
                  value={config.clientId}
                  onChange={(e) => setConfig({ ...config, clientId: e.target.value })}
                  placeholder="your-client-id"
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Client Secret (optional)
                </label>
                <input
                  type="password"
                  value={config.clientSecret}
                  onChange={(e) => setConfig({ ...config, clientSecret: e.target.value })}
                  placeholder="client-secret (if required)"
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Redirect URI
              </label>
              <input
                type="url"
                value={config.redirectUri}
                onChange={(e) => setConfig({ ...config, redirectUri: e.target.value })}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-600 text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Scope
            </label>
            <input
              type="text"
              value={config.scope}
              onChange={(e) => setConfig({ ...config, scope: e.target.value })}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-600 text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex items-center gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Flow Type
              </label>
              <select
                value={config.responseType}
                onChange={(e) => setConfig({ ...config, responseType: e.target.value as 'token' | 'code' })}
                className="px-3 py-2 bg-gray-900 border border-gray-600 text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="code">Authorization Code</option>
                <option value="token">Implicit</option>
              </select>
            </div>
            
            {config.responseType === 'code' && (
              <div className="flex items-center gap-2 mt-6">
                <input
                  type="checkbox"
                  id="pkce"
                  checked={config.usePKCE}
                  onChange={(e) => setConfig({ ...config, usePKCE: e.target.checked })}
                  className="w-4 h-4 text-blue-600 bg-gray-900 border-gray-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="pkce" className="text-sm font-medium text-gray-300">
                  Use PKCE
                </label>
              </div>
            )}

            <div className="flex items-center gap-2 mt-6">
              <input
                type="checkbox"
                id="includePing"
                checked={config.includePing}
                onChange={(e) => setConfig({ ...config, includePing: e.target.checked })}
                className="w-4 h-4 text-blue-600 bg-gray-900 border-gray-600 rounded focus:ring-blue-500"
              />
              <label htmlFor="includePing" className="text-sm font-medium text-gray-300">
                Include ping parameter
              </label>
            </div>
          </div>
        </div>

        {/* Authorization Request Curl Preview */}
        {authorizationUrl && (
          <div className="mt-6 rounded-lg border border-blue-700 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-blue-900/30 border-b border-blue-700">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium text-blue-300">Authorization Request Preview</span>
              </div>
              <button
                onClick={() => copyToClipboard(`curl "${authorizationUrl}"`, 'curl_preview')}
                className="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-sm"
              >
                {copied === 'curl_preview' ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy curl
                  </>
                )}
              </button>
            </div>
            <div className="p-4 bg-gray-900">
              <pre className="text-xs text-blue-200 font-mono whitespace-pre-wrap break-all">
                <code>curl &quot;{authorizationUrl}&quot;</code>
              </pre>
            </div>
          </div>
        )}

        <button
          onClick={startAuthFlow}
          disabled={!metadata || !config.clientId}
          className="mt-6 px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          Start Authorization Flow
        </button>
      </div>
      
      {/* Error Display */}
      {error && (
        <div className="bg-red-900/20 border border-red-700 rounded-md p-4">
          <div className="flex items-center gap-2 text-red-400">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">Error</span>
          </div>
          <p className="mt-1 text-sm text-red-300 whitespace-pre-line">{error}</p>
        </div>
      )}
      
      {/* Token Response - Always Visible */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-100">
          {tokenResponse ? 'Access Token Received!' : 'Access Token'}
        </h2>
        
        {tokenResponse && tokenResponse.access_token ? (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-gray-300">Access Token</h3>
              <button
                onClick={() => copyToClipboard(tokenResponse.access_token!, 'access_token')}
                className="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-sm"
              >
                {copied === 'access_token' ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy
                  </>
                )}
              </button>
            </div>
            <div className="bg-gray-900 p-3 rounded-md font-mono text-xs break-all text-gray-300">
              {tokenResponse.access_token}
            </div>
            
            {parseJWT(tokenResponse.access_token) && (
              <div className="mt-3">
                <h4 className="text-sm font-medium text-gray-400 mb-1">Decoded Payload</h4>
                <pre className="bg-gray-900 p-3 rounded-md text-xs overflow-auto text-gray-300">
                  {JSON.stringify(parseJWT(tokenResponse.access_token), null, 2)}
                </pre>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p className="mb-2">No access token yet</p>
            <p className="text-sm">Complete the authorization flow to receive your token</p>
          </div>
        )}
        
        {tokenResponse && tokenResponse.id_token && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-gray-300">ID Token</h3>
              <button
                onClick={() => copyToClipboard(tokenResponse.id_token!, 'id_token')}
                className="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-sm"
              >
                {copied === 'id_token' ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy
                  </>
                )}
              </button>
            </div>
            <div className="bg-gray-900 p-3 rounded-md font-mono text-xs break-all text-gray-300">
              {tokenResponse.id_token}
            </div>
            
            {parseJWT(tokenResponse.id_token) && (
              <div className="mt-3">
                <h4 className="text-sm font-medium text-gray-400 mb-1">Decoded Payload</h4>
                <pre className="bg-gray-900 p-3 rounded-md text-xs overflow-auto text-gray-300">
                  {JSON.stringify(parseJWT(tokenResponse.id_token), null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
        
        {(tokenResponse?.refresh_token || storedRefreshToken) && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-gray-300">Refresh Token</h3>
              <button
                onClick={() => copyToClipboard(tokenResponse?.refresh_token || storedRefreshToken || '', 'refresh_token')}
                className="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-sm"
              >
                {copied === 'refresh_token' ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy
                  </>
                )}
              </button>
            </div>
            <div className="bg-gray-900 p-3 rounded-md font-mono text-xs break-all text-gray-300">
              {tokenResponse?.refresh_token || storedRefreshToken}
            </div>
          </div>
        )}
        
        {tokenResponse && (
          <>
            <div className="text-sm text-gray-400">
              <div>Token Type: {tokenResponse.token_type}</div>
              <div className="flex items-center gap-2">
                <span>Expires In:</span>
                {timeRemaining && (
                  <span className={`font-mono ${timeRemaining === 'Expired' ? 'text-red-400' : timeRemaining.startsWith('0m') ? 'text-yellow-400' : 'text-green-400'}`}>
                    {timeRemaining}
                  </span>
                )}
                {tokenResponse.expires_in && !timeRemaining && (
                  <span>{tokenResponse.expires_in} seconds</span>
                )}
              </div>
              <div>Scope: {tokenResponse.scope}</div>
              {(tokenResponse.refresh_token || storedRefreshToken) && (
                <div className="text-green-400">✓ Refresh token available</div>
              )}
            </div>
            
            <div className="flex gap-2 mt-4">
              {(tokenResponse.refresh_token || storedRefreshToken) && (
                <button
                  onClick={refreshAccessToken}
                  disabled={refreshing}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {refreshing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Refreshing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      Refresh Token
                    </>
                  )}
                </button>
              )}
              <button
                onClick={() => {
                  setTokenResponse(null);
                  setError(null);
                  setTokenExpiry(null);
                  setTimeRemaining('');
                  localStorage.removeItem('ping_refresh_token');
                  setStoredRefreshToken(null);
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Clear & Test Again
              </button>
            </div>
          </>
        )}
      </div>

      {/* Clear All Session Data */}
      <div className="flex justify-end">
        <button
          onClick={() => {
            localStorage.removeItem('ping_oidc_config');
            localStorage.removeItem('ping_oidc_metadata');
            localStorage.removeItem('ping_oidc_state');
            localStorage.removeItem('ping_pkce_verifier');
            localStorage.removeItem('ping_refresh_token');
            setTokenResponse(null);
            setStoredRefreshToken(null);
            setMetadata(null);
            setError(null);
            setTokenExpiry(null);
            setTimeRemaining('');
            setPastedUrl('');
            setAuthorizationUrl('');
            setPkceVerifier('');
            setPkceChallenge('');
            setState('');
            setConfig({
              metadataUrl: '',
              clientId: '',
              clientSecret: '',
              redirectUri: `${window.location.origin}/callback`,
              scope: 'openid profile email',
              responseType: 'code',
              usePKCE: true,
              includePing: false,
            });
          }}
          className="px-3 py-1.5 text-xs text-red-400 border border-red-800 rounded-md hover:bg-red-900/30"
        >
          Clear All Session Data
        </button>
      </div>
    </div>
  );
}