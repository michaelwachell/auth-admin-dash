import axios from 'axios'
import { GigyaConfig, GigyaResponse } from '@/types/gigya'

export class GigyaClient {
  private config: GigyaConfig

  constructor(config: GigyaConfig) {
    this.config = config
  }

  private generateCurlCommand = (url: string, formData: URLSearchParams): string => {
    const dataString = formData.toString()
    return `curl -X POST "${url}" \\\n  -H "Content-Type: application/x-www-form-urlencoded" \\\n  -d "${dataString}"`
  }

  callApi = async (endpoint: string, params: Record<string, any> = {}): Promise<GigyaResponse & { _curlCommand?: string }> => {
    const url = `https://accounts.${this.config.dataCenter}.gigya.com/${endpoint}`

    // Build form data with required authentication parameters
    const formData = new URLSearchParams()

    // Add authentication parameters
    formData.append('apiKey', this.config.apiKey)
    formData.append('secret', this.config.secretKey)

    // Add userKey if available
    if (this.config.userKey) {
      formData.append('userKey', this.config.userKey)
    }

    // Add all other parameters
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        formData.append(key, String(value))
      }
    })

    // Default to JSON format if not specified
    if (!params.format) {
      formData.append('format', 'json')
    }

    // Generate curl command for observability
    const curlCommand = this.generateCurlCommand(url, formData)
    console.log('\n📋 Gigya API Call - Equivalent cURL command:')
    console.log(curlCommand)
    console.log('') // Empty line for readability

    try {
      const { data } = await axios.post(url, formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      })

      // Attach curl command to response for UI display
      return {
        ...data,
        _curlCommand: curlCommand
      }
    } catch (error: any) {
      if (error.response?.data) {
        return {
          ...error.response.data,
          _curlCommand: curlCommand
        }
      }
      throw error
    }
  }

  unlockAccount = async (params: Record<string, any>): Promise<GigyaResponse> => 
    this.callApi('accounts.rba.unlock', params)

  logout = async (params: Record<string, any>): Promise<GigyaResponse> => 
    this.callApi('accounts.logout', params)

  search = async (params: Record<string, any>): Promise<GigyaResponse> => 
    this.callApi('accounts.search', params)
}