import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { endpoint, method = 'GET', accessToken } = body

    if (!endpoint || !accessToken) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    const headers: HeadersInit = {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Accept-API-Version': 'resource=1.0'
    }

    const options: RequestInit = {
      method,
      headers,
    }

    const response = await fetch(endpoint, options)
    const responseText = await response.text()
    let responseData

    try {
      responseData = JSON.parse(responseText)
    } catch (e) {
      responseData = { message: responseText }
    }

    if (!response.ok) {
      console.error('Reconciliation API error:', {
        status: response.status,
        statusText: response.statusText,
        endpoint,
        responseData
      })
      return NextResponse.json(
        {
          error: responseData.message || responseData.detail || 'Request failed',
          details: responseData,
          status: response.status
        },
        { status: response.status }
      )
    }

    return NextResponse.json(responseData)
  } catch (error) {
    console.error('Reconciliation endpoint error:', error)
    return NextResponse.json(
      { error: 'Failed to call reconciliation endpoint' },
      { status: 500 }
    )
  }
}
