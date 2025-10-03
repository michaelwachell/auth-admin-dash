import axios from 'axios'
import { GigyaConfig, GigyaResponse } from '@/types/gigya'

export class GigyaClient {
  private config: GigyaConfig

  constructor(config: GigyaConfig) {
    this.config = config
  }

  async callApi(endpoint: string, params: Record<string, any> = {}): Promise<GigyaResponse> {
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

    try {
      const response = await axios.post(url, formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      })

      return response.data
    } catch (error: any) {
      if (error.response?.data) {
        return error.response.data
      }
      throw error
    }
  }

  async unlockAccount(params: Record<string, any>): Promise<GigyaResponse> {
    return this.callApi('accounts.rba.unlock', params)
  }
}