import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { clientId, clientSecret, tokenEndpoint, scopes } = body

    if (!clientId || !clientSecret || !tokenEndpoint) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    // Create Basic auth header
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
    
    // Prepare form data
    const formData = new URLSearchParams()
    formData.append('grant_type', 'client_credentials')
    if (scopes) {
      formData.append('scope', scopes)
    }

    // Make the token request
    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`,
      },
      body: formData.toString()
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { 
          error: data.error_description || data.error || 'Failed to obtain token',
          details: data 
        },
        { status: response.status }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Token request error:', error)
    return NextResponse.json(
      { error: 'Failed to request token', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}