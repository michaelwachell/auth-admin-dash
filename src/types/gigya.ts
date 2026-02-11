export interface GigyaConfig {
  apiKey: string
  secretKey: string
  dataCenter: string
  userKey?: string
}

export interface UnlockRequest {
  UID?: string
  regToken?: string
  IP?: string
  ignoreApiQueue?: boolean
  format?: 'json' | 'jsonp' | 'xml'
  callback?: string
  httpStatusCodes?: boolean
  targetEnv?: 'mobile' | 'browser' | 'both'
}

export interface LogoutRequest {
  UID: string
  format?: 'json' | 'jsonp' | 'xml'
  callback?: string
  httpStatusCodes?: boolean
}

export interface SearchRequest {
  query: string
  querySorts?: string
  start?: number
  limit?: number
  cursorId?: string
  fields?: string
  format?: 'json' | 'jsonp' | 'xml'
  callback?: string
  httpStatusCodes?: boolean
}

export interface GigyaResponse {
  statusCode: number
  errorCode?: number
  errorMessage?: string
  statusReason?: string
  callId?: string
  time?: string
  [key: string]: any
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}