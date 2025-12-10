import type { NextApiRequest, NextApiResponse } from 'next'
import { GigyaClient } from '@/lib/gigya'
import { ApiResponse, GigyaResponse } from '@/types/gigya'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<GigyaResponse>>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    })
  }

  const { query, querySorts, start, limit, fields, ...additionalParams } = req.body

  if (!query) {
    return res.status(400).json({
      success: false,
      error: 'Query is required'
    })
  }

  try {
    const client = new GigyaClient({
      apiKey: process.env.GIGYA_API_KEY!,
      secretKey: process.env.GIGYA_SECRET_KEY!,
      dataCenter: process.env.GIGYA_DATA_CENTER!,
      userKey: process.env.GIGYA_USER_KEY
    })

    const params = {
      query,
      ...(querySorts && { querySorts }),
      ...(start !== undefined && { start }),
      ...(limit !== undefined && { limit }),
      ...(fields && { fields }),
      ...additionalParams
    }

    const response = await client.search(params)

    if (response.statusCode === 200) {
      return res.status(200).json({
        success: true,
        data: response
      })
    } else {
      return res.status(response.statusCode || 400).json({
        success: false,
        data: response,
        error: response.errorMessage || 'Search failed'
      })
    }
  } catch (error: any) {
    console.error('Gigya search error:', error)
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    })
  }
}