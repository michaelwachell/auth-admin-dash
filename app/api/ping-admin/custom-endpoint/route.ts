import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      endpoint, 
      method = 'GET', 
      accessToken, 
      data 
    } = body

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
    }

    const options: RequestInit = {
      method,
      headers,
    }

    // Add body for POST/PUT/PATCH requests
    if (data && ['POST', 'PUT', 'PATCH'].includes(method)) {
      options.body = JSON.stringify(data)
    }

    const response = await fetch(endpoint, options)
    
    const responseText = await response.text()
    let responseData
    
    try {
      responseData = JSON.parse(responseText)
    } catch (e) {
      // If not JSON, return as text
      responseData = { message: responseText }
    }

    if (!response.ok) {
      return NextResponse.json(
        { 
          error: responseData.message || responseData.detail || 'Request failed',
          details: responseData 
        },
        { status: response.status }
      )
    }

    return NextResponse.json(responseData)
  } catch (error) {
    console.error('Custom endpoint error:', error)
    return NextResponse.json(
      { error: 'Failed to call custom endpoint' },
      { status: 500 }
    )
  }
}