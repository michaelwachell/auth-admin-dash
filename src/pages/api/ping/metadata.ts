import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { metadataUrl } = req.body;

  if (!metadataUrl) {
    return res.status(400).json({ error: 'Metadata URL is required' });
  }

  try {
    const response = await axios.get(metadataUrl, {
      headers: {
        'Accept': 'application/json',
      },
      timeout: 10000,
    });

    return res.status(200).json(response.data);
  } catch (error: any) {
    console.error('Error fetching OIDC metadata:', error);
    
    if (error.response) {
      return res.status(error.response.status).json({ 
        error: `Failed to fetch metadata: ${error.response.statusText}`,
        details: error.response.data,
      });
    } else if (error.request) {
      return res.status(500).json({ 
        error: 'No response from metadata endpoint',
      });
    } else {
      return res.status(500).json({ 
        error: error.message || 'Failed to fetch metadata',
      });
    }
  }
}