export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, success, errorMessage } = req.body;
    
    // Get client IP address from Vercel headers
    const ip = req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    // Format the log entry
    const timestamp = new Date().toISOString();
    const statusText = success ? 'SUCCESSFUL' : 'FAILED';
    
    const logMessage = `[ADMIN LOGIN ATTEMPT] ${timestamp} | IP: ${ip} | Email: ${email || 'none'} | Status: ${statusText} | Error: ${errorMessage || 'none'}`;
    
    // Log to Vercel Runtime Logs (this will show up in the Vercel Dashboard)
    if (success) {
      console.log(logMessage);
    } else {
      console.warn(logMessage);
    }
    
    // Return success response
    return res.status(200).json({ success: true });
    
  } catch (error) {
    console.error('Error in login logger:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
