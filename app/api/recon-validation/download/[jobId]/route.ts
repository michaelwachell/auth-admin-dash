import { NextRequest } from 'next/server'

// Access the same global CSV store used by the validate endpoint
declare global {
  var reconCsvStore: Map<string, { csv: string; createdAt: number }> | undefined
}

if (!global.reconCsvStore) {
  global.reconCsvStore = new Map()
}

const csvStore = global.reconCsvStore

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const { jobId } = params

  if (!jobId) {
    return new Response(
      JSON.stringify({ error: 'Missing jobId parameter' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const entry = csvStore.get(jobId)

  if (!entry) {
    return new Response(
      JSON.stringify({ error: 'Job not found or CSV data has expired. Results expire after 1 hour.' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const filename = `recon-validation-${jobId}.csv`

  return new Response(entry.csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-cache'
    }
  })
}
