import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { logEndpoint, apiKey, apiSecret } = body

    if (!logEndpoint || !apiKey || !apiSecret) {
      return NextResponse.json(
        { error: 'Missing required parameters (logEndpoint, apiKey, apiSecret)' },
        { status: 400 }
      )
    }

    console.log('Fetching logs from:', logEndpoint)

    // Make the request to the log endpoint using x-api-key and x-api-secret headers
    const response = await fetch(logEndpoint, {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        'x-api-secret': apiSecret,
        'Accept': 'application/json',
      }
    })

    const contentType = response.headers.get('content-type')
    
    // Check if response is JSON
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text()
      console.error('Non-JSON response received:', text.substring(0, 200))
      return NextResponse.json(
        { 
          error: 'Invalid response format - expected JSON but received HTML/text',
          details: `URL: ${logEndpoint}, Status: ${response.status}`,
          hint: 'Check if the log endpoint URL is correct and the token has proper scopes'
        },
        { status: 500 }
      )
    }

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { 
          error: data.error_description || data.error || 'Failed to fetch logs',
          details: data,
          url: logEndpoint
        },
        { status: response.status }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Log fetch error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch logs', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}