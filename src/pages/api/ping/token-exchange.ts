import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { tokenEndpoint, params, includePing, clientId, clientSecret } = req.body;

  if (!tokenEndpoint || !params) {
    return res.status(400).json({ error: 'Token endpoint and parameters are required' });
  }

  // Append ping flag to token endpoint URL when enabled
  let url = tokenEndpoint;
  if (includePing) {
    const separator = url.includes('?') ? '&' : '?';
    url += `${separator}ping=true`;
  }

  // Use Basic Auth for client credentials when using Ping (matches be-accounts behavior)
  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Accept': 'application/json',
  };

  if (includePing && clientId && clientSecret) {
    headers['Authorization'] = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;
  }

  // Build debug info for troubleshooting
  const debugInfo = {
    url,
    bodyParams: params,
    hasBasicAuth: !!headers['Authorization'],
    includePing: !!includePing,
  };

  console.log('Token exchange request:', debugInfo);

  try {
    const response = await axios.post(url, params, {
      headers,
      timeout: 10000,
    });

    return res.status(200).json(response.data);
  } catch (error: any) {
    console.error('Error exchanging token:', error.response?.data || error);

    // Include upstream response details and our request debug info
    const upstreamData = error.response?.data;
    const upstreamStatus = error.response?.status;

    return res.status(200).json({
      error: upstreamData || error.message || 'Failed to exchange token',
      error_description: upstreamData?.error_description,
      _debug: {
        ...debugInfo,
        upstreamStatus,
        upstreamBody: upstreamData,
      },
    });
  }
}