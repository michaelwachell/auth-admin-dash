import type { NextApiRequest, NextApiResponse } from 'next'
import { GigyaClient } from '@/lib/gigya'
import { LogoutRequest, ApiResponse, GigyaResponse } from '@/types/gigya'

const handler = async (
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<GigyaResponse>>
) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    })
  }

  const params: LogoutRequest = req.body

  // UID is required for global logout
  if (!params.UID) {
    return res.status(400).json({ 
      success: false, 
      error: 'UID is required for global logout' 
    })
  }

  // Check if environment variables are configured
  const { GIGYA_API_KEY, GIGYA_SECRET_KEY, GIGYA_DATA_CENTER, GIGYA_USER_KEY } = process.env
  
  if (!GIGYA_API_KEY || !GIGYA_SECRET_KEY || !GIGYA_DATA_CENTER) {
    return res.status(500).json({ 
      success: false, 
      error: 'Gigya credentials not configured. Please check your .env file.' 
    })
  }

  try {
    const client = new GigyaClient({
      apiKey: GIGYA_API_KEY,
      secretKey: GIGYA_SECRET_KEY,
      dataCenter: GIGYA_DATA_CENTER,
      userKey: GIGYA_USER_KEY
    })

    const result = await client.logout(params)

    // Check if the request was successful
    const isSuccess = result.statusCode === 200
    
    return res.status(isSuccess ? 200 : 400).json({ 
      success: isSuccess, 
      ...(isSuccess ? { data: result } : { 
        error: result.errorMessage || 'Failed to logout user',
        data: result 
      })
    })
  } catch (error: any) {
    console.error('Error calling Gigya API:', error)
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Internal server error' 
    })
  }
}

export default handler