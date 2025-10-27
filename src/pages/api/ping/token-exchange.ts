import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { tokenEndpoint, params } = req.body;

  if (!tokenEndpoint || !params) {
    return res.status(400).json({ error: 'Token endpoint and parameters are required' });
  }

  try {
    const response = await axios.post(tokenEndpoint, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      timeout: 10000,
    });

    return res.status(200).json(response.data);
  } catch (error: any) {
    console.error('Error exchanging token:', error.response?.data || error);
    
    if (error.response?.data) {
      // Pass through the OAuth error response
      return res.status(200).json(error.response.data);
    } else if (error.response) {
      return res.status(error.response.status).json({ 
        error: `Token exchange failed: ${error.response.statusText}`,
      });
    } else if (error.request) {
      return res.status(500).json({ 
        error: 'No response from token endpoint',
      });
    } else {
      return res.status(500).json({ 
        error: error.message || 'Failed to exchange token',
      });
    }
  }
}