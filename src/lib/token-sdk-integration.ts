/**
 * Token SDK Integration Example
 * This shows how to integrate the OIDC domain config into your token SDK
 * 
 * Usage in your token SDK:
 * 1. Include the isOIDCEnabled function in your minified bundle
 * 2. Call it during SDK initialization
 * 3. Set use_oidc flag based on the result
 */

import { isOIDCEnabled, getOIDCStatus } from './oidc-domain-config';

/**
 * Example Token SDK initialization
 * This would be part of your actual SDK code
 */
class TokenSDK {
  private config: {
    use_oidc: boolean;
    domain: string;
    [key: string]: any;
  };

  constructor() {
    // Determine if OIDC should be enabled for this domain
    const useOIDC = this.shouldUseOIDC();
    
    this.config = {
      use_oidc: useOIDC,
      domain: this.getCurrentDomain(),
      // ... other config
    };
    
    // Log decision in console for debugging (remove in production)
    if (this.isDebugMode()) {
      console.log(`[TokenSDK] Initializing with OIDC: ${useOIDC ? 'ENABLED' : 'DISABLED'} for domain: ${this.config.domain}`);
    }
  }

  /**
   * Determine if OIDC should be used
   * Checks multiple sources in priority order
   */
  private shouldUseOIDC(): boolean {
    // Priority 1: Query parameter override (for testing)
    const forceOIDC = this.getQueryParam('force_oidc');
    if (forceOIDC === 'true') {
      console.log('[TokenSDK] OIDC force-enabled via query param');
      return true;
    }
    if (forceOIDC === 'false') {
      console.log('[TokenSDK] OIDC force-disabled via query param');
      return false;
    }
    
    // Priority 2: Domain-based configuration
    return isOIDCEnabled();
  }

  /**
   * Get current domain with port if applicable
   */
  private getCurrentDomain(): string {
    if (typeof window === 'undefined') return '';
    return window.location.hostname + (window.location.port ? ':' + window.location.port : '');
  }

  /**
   * Get query parameter value
   */
  private getQueryParam(param: string): string | null {
    if (typeof window === 'undefined') return null;
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
  }

  /**
   * Check if in debug mode
   */
  private isDebugMode(): boolean {
    return this.getQueryParam('debug') === 'true' || 
           this.getQueryParam('oidc_debug') === 'true' ||
           (typeof window !== 'undefined' && (
             window.location.hostname === 'localhost' ||
             window.location.hostname === '127.0.0.1'
           ));
  }

  /**
   * Public method to check OIDC status
   */
  public getOIDCStatus() {
    return {
      enabled: this.config.use_oidc,
      domain: this.config.domain,
      config: getOIDCStatus()
    };
  }

  /**
   * Public method to check if OIDC is enabled
   */
  public isOIDCEnabled(): boolean {
    return this.config.use_oidc;
  }
}

/**
 * Minimal version for direct inclusion in minified SDK
 * This is the bare minimum code needed for domain checking
 */
export const getMinimalOIDCCheck = () => {
  return `
// OIDC Domain Configuration - Minimal Version
(function() {
  const OIDC_DOMAINS = {
    exact: [
      'www.nfl.com',
      'stage-www.nfl.com',
      'test-www.nfl.com',
      // Add more domains here as needed
    ],
    patterns: [
      'stage-*.nfl.com',
      'test-*.nfl.com',
      'localhost:*'
    ]
  };
  
  function matchPattern(domain, pattern) {
    const regex = new RegExp('^' + pattern.replace(/\\*/g, '.*') + '$', 'i');
    return regex.test(domain);
  }
  
  window.__isOIDCEnabled = function() {
    const host = window.location.hostname + (window.location.port ? ':' + window.location.port : '');
    
    // Check query param override
    const params = new URLSearchParams(window.location.search);
    if (params.get('force_oidc') === 'true') return true;
    if (params.get('force_oidc') === 'false') return false;
    
    // Check exact matches
    if (OIDC_DOMAINS.exact.includes(host)) return true;
    
    // Check patterns
    return OIDC_DOMAINS.patterns.some(p => matchPattern(host, p));
  };
  
  // Set global flag
  window.__USE_OIDC = window.__isOIDCEnabled();
})();
`;
};

/**
 * Export for testing and usage
 */
export default TokenSDK;