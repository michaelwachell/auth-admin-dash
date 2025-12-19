import { NextRequest, NextResponse } from 'next/server'

interface SearchRequestBody {
  accessToken: string
  baseUrl: string
  queryFilter?: string
  fields?: string
  pageSize?: number
  sortKeys?: string
  pagedResultsCookie?: string
}

interface UserSearchResult {
  _id: string
  _rev: string
  [key: string]: any // Additional user fields
}

interface SearchResponse {
  result: UserSearchResult[]
  resultCount: number
  pagedResultsCookie?: string | null
  totalPagedResultsPolicy?: 'NONE' | 'ESTIMATE' | 'EXACT'
  totalPagedResults?: number
  remainingPagedResults?: number
}

export async function POST(request: NextRequest) {
  try {
    const body: SearchRequestBody = await request.json()
    const {
      accessToken,
      baseUrl,
      queryFilter = 'true', // Default to get all users
      fields,
      pageSize = 10,
      sortKeys,
      pagedResultsCookie
    } = body

    if (!accessToken || !baseUrl) {
      return NextResponse.json(
        { error: 'Missing required parameters: accessToken and baseUrl are required' },
        { status: 400 }
      )
    }

    // Construct the search endpoint URL
    const searchUrl = new URL('/openidm/managed/alpha_user', baseUrl)

    // Add query parameters
    searchUrl.searchParams.append('_queryFilter', queryFilter)

    if (fields) {
      searchUrl.searchParams.append('_fields', fields)
    }

    if (pageSize) {
      searchUrl.searchParams.append('_pageSize', pageSize.toString())
    }

    if (sortKeys) {
      searchUrl.searchParams.append('_sortKeys', sortKeys)
    }

    if (pagedResultsCookie) {
      searchUrl.searchParams.append('_pagedResultsCookie', pagedResultsCookie)
    }

    // Make the search request
    const response = await fetch(searchUrl.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
        'Accept-API-Version': 'resource=1.0'
      }
    })

    const responseText = await response.text()
    let responseData: SearchResponse

    try {
      responseData = JSON.parse(responseText)
    } catch (e) {
      return NextResponse.json(
        {
          error: 'Invalid response from server',
          details: responseText
        },
        { status: 500 }
      )
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          error: (responseData as any).message || 'Search request failed',
          details: responseData
        },
        { status: response.status }
      )
    }

    return NextResponse.json(responseData)
  } catch (error) {
    console.error('User search error:', error)
    return NextResponse.json(
      {
        error: 'Failed to search users',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Also support GET requests for simple searches
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams

  // Extract parameters from query string
  const accessToken = searchParams.get('accessToken')
  const baseUrl = searchParams.get('baseUrl')
  const queryFilter = searchParams.get('queryFilter') || 'true'
  const fields = searchParams.get('fields') || undefined
  const pageSize = searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!) : undefined
  const sortKeys = searchParams.get('sortKeys') || undefined
  const pagedResultsCookie = searchParams.get('pagedResultsCookie') || undefined

  if (!accessToken || !baseUrl) {
    return NextResponse.json(
      { error: 'Missing required parameters: accessToken and baseUrl are required' },
      { status: 400 }
    )
  }

  // Delegate to POST handler
  const requestBody: SearchRequestBody = {
    accessToken,
    baseUrl,
    queryFilter,
    ...(fields && { fields }),
    ...(pageSize && { pageSize }),
    ...(sortKeys && { sortKeys }),
    ...(pagedResultsCookie && { pagedResultsCookie })
  }

  return POST(new NextRequest(request.url, {
    method: 'POST',
    body: JSON.stringify(requestBody)
  }))
}