import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { metadataEndpoint } = body

    if (!metadataEndpoint) {
      return NextResponse.json(
        { error: 'Missing metadata endpoint URL' },
        { status: 400 }
      )
    }

    // Fetch the metadata
    const response = await fetch(metadataEndpoint, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { 
          error: data.error_description || data.error || 'Failed to fetch metadata',
          details: data 
        },
        { status: response.status }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Metadata fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch metadata', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}