/**
 * Domain-based OIDC Feature Flag Configuration
 * This module determines if OIDC should be enabled based on the current domain
 * Designed to work in CDN-injected environments without access to env vars or Flagsmith
 */

interface DomainConfig {
  /** Exact domain matches */
  exact?: string[];
  /** Pattern matches using wildcards */
  patterns?: string[];
  /** Regex patterns for complex matching */
  regex?: RegExp[];
}

interface OIDCConfig {
  /** Domains where OIDC is enabled */
  enabled: DomainConfig;
  /** Optional: Domains explicitly disabled (overrides enabled) */
  disabled?: DomainConfig;
  /** Optional: Enable debug logging */
  debug?: boolean;
}

/**
 * OIDC Domain Configuration
 * Add new domains here as they're ready for OIDC migration
 */
const OIDC_DOMAIN_CONFIG: OIDCConfig = {
  enabled: {
    exact: [
      // Production domains
      'www.nfl.com',
      
      // Staging/Test environments
      'stage-www.nfl.com',
      'test-www.nfl.com',
      
      // NFL Pro (uncomment when ready)
      // 'pro.nfl.com',
      // 'stage-pro.nfl.com',
      
      // NFL Fantasy (uncomment when ready)
      // 'fantasy.nfl.com',
      // 'stage-fantasy.nfl.com',
      
      // Local development
      'localhost:3000',
      'localhost:3001',
    ],
    
    patterns: [
      // Enable for all staging environments
      'stage-*.nfl.com',
      
      // Enable for all test environments
      'test-*.nfl.com',
      
      // Enable for specific feature branches (uncomment when needed)
      // 'feature-*-www.nfl.com',
      
      // Enable for all local development
      'localhost:*',
      '127.0.0.1:*',
    ],
    
    regex: [
      // Enable for preview deployments
      /^preview-[\w-]+\.nfl\.com$/,
      
      // Enable for PR deployments
      /^pr-\d+-www\.nfl\.com$/,
      
      // Enable for any subdomain of dev.nfl.com
      /^[\w-]+\.dev\.nfl\.com$/,
    ]
  },
  
  disabled: {
    // Optional: Explicitly disable OIDC for certain domains even if they match enabled patterns
    exact: [
      // 'legacy.nfl.com',
    ]
  },
  
  debug: false // Set to true to enable console logging
};

/**
 * Check if a domain matches a pattern with wildcards
 * @param domain - The domain to check
 * @param pattern - Pattern with * wildcards
 */
const matchesPattern = (domain: string, pattern: string): boolean => {
  // Convert wildcard pattern to regex
  const regexPattern = pattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // Escape special regex chars except *
    .replace(/\*/g, '.*'); // Convert * to .*
  
  const regex = new RegExp(`^${regexPattern}$`, 'i');
  return regex.test(domain);
};

/**
 * Check if OIDC should be enabled for the current domain
 * @param hostname - Optional hostname to check (defaults to window.location.hostname)
 * @returns true if OIDC should be enabled
 */
export const isOIDCEnabled = (hostname?: string): boolean => {
  // Get the current hostname
  const currentHost = hostname || (typeof window !== 'undefined' ? window.location.hostname + (window.location.port ? ':' + window.location.port : '') : '');
  
  if (!currentHost) {
    if (OIDC_DOMAIN_CONFIG.debug) {
      console.warn('[OIDC Config] No hostname available, defaulting to disabled');
    }
    return false;
  }
  
  // Check if explicitly disabled
  if (OIDC_DOMAIN_CONFIG.disabled) {
    // Check exact matches
    if (OIDC_DOMAIN_CONFIG.disabled.exact?.includes(currentHost)) {
      if (OIDC_DOMAIN_CONFIG.debug) {
        console.log(`[OIDC Config] Domain "${currentHost}" is explicitly disabled`);
      }
      return false;
    }
    
    // Check pattern matches
    if (OIDC_DOMAIN_CONFIG.disabled.patterns?.some(pattern => matchesPattern(currentHost, pattern))) {
      if (OIDC_DOMAIN_CONFIG.debug) {
        console.log(`[OIDC Config] Domain "${currentHost}" matches disabled pattern`);
      }
      return false;
    }
    
    // Check regex matches
    if (OIDC_DOMAIN_CONFIG.disabled.regex?.some(regex => regex.test(currentHost))) {
      if (OIDC_DOMAIN_CONFIG.debug) {
        console.log(`[OIDC Config] Domain "${currentHost}" matches disabled regex`);
      }
      return false;
    }
  }
  
  // Check if enabled
  // Check exact matches
  if (OIDC_DOMAIN_CONFIG.enabled.exact?.includes(currentHost)) {
    if (OIDC_DOMAIN_CONFIG.debug) {
      console.log(`[OIDC Config] OIDC enabled for domain "${currentHost}" (exact match)`);
    }
    return true;
  }
  
  // Check pattern matches
  if (OIDC_DOMAIN_CONFIG.enabled.patterns?.some(pattern => matchesPattern(currentHost, pattern))) {
    if (OIDC_DOMAIN_CONFIG.debug) {
      console.log(`[OIDC Config] OIDC enabled for domain "${currentHost}" (pattern match)`);
    }
    return true;
  }
  
  // Check regex matches
  if (OIDC_DOMAIN_CONFIG.enabled.regex?.some(regex => regex.test(currentHost))) {
    if (OIDC_DOMAIN_CONFIG.debug) {
      console.log(`[OIDC Config] OIDC enabled for domain "${currentHost}" (regex match)`);
    }
    return true;
  }
  
  if (OIDC_DOMAIN_CONFIG.debug) {
    console.log(`[OIDC Config] OIDC disabled for domain "${currentHost}" (no matches)`);
  }
  
  return false;
};

/**
 * Get OIDC configuration status for debugging
 * @returns Configuration details
 */
export const getOIDCStatus = () => {
  const hostname = typeof window !== 'undefined' ? window.location.hostname + (window.location.port ? ':' + window.location.port : '') : 'unknown';
  const enabled = isOIDCEnabled();
  
  return {
    currentDomain: hostname,
    oidcEnabled: enabled,
    config: OIDC_DOMAIN_CONFIG,
    timestamp: new Date().toISOString()
  };
};

/**
 * Enable debug logging
 */
export const enableOIDCDebug = () => {
  OIDC_DOMAIN_CONFIG.debug = true;
  console.log('[OIDC Config] Debug mode enabled', getOIDCStatus());
};

/**
 * Disable debug logging
 */
export const disableOIDCDebug = () => {
  OIDC_DOMAIN_CONFIG.debug = false;
};

// Auto-initialize and log status in development
if (typeof window !== 'undefined') {
  // Check for debug query param
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('oidc_debug') === 'true') {
    enableOIDCDebug();
  }
  
  // Log initial status in development environments
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    console.log('[OIDC Config] Initial status:', getOIDCStatus());
  }
}

// Export for use in token SDK
export default {
  isOIDCEnabled,
  getOIDCStatus,
  enableOIDCDebug,
  disableOIDCDebug
};