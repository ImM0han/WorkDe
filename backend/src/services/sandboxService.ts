import crypto from 'crypto';

let cachedToken: string | null = null;
let tokenExpiresAt: number = 0;

/**
 * Retrieves a cached or fresh access token from sandbox.co.in
 */
async function getAccessToken(): Promise<string> {
  const apiKey = process.env.SANDBOX_API_KEY;
  const apiSecret = process.env.SANDBOX_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error('Sandbox API credentials not configured in environment.');
  }

  // If token is cached and valid for at least 5 more minutes
  if (cachedToken && Date.now() < tokenExpiresAt - 300 * 1000) {
    return cachedToken;
  }

  try {
    const response = await fetch('https://api.sandbox.co.in/authenticate', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'x-api-secret': apiSecret,
        'x-api-version': '1.0',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Sandbox Auth Failed (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as { access_token: string; expires_in?: number };
    cachedToken = data.access_token;
    const expiresIn = data.expires_in || 3600;
    tokenExpiresAt = Date.now() + expiresIn * 1000;
    
    console.log('[Sandbox Service] Successfully authenticated and acquired access token.');
    return cachedToken;
  } catch (error: any) {
    console.error('[Sandbox Service] Error authenticating with Sandbox API:', error.message);
    throw error;
  }
}

/**
 * Initiates Aadhaar OTP KYC by sending an OTP to the user's Aadhaar-linked mobile number
 * @param aadhaarNumber 12-digit Aadhaar number
 * @returns client_id for OTP verification
 */
export async function sendAadhaarOtp(aadhaarNumber: string): Promise<{ clientId: string; isMock: boolean; mockOtp?: string }> {
  const apiKey = process.env.SANDBOX_API_KEY;
  const apiSecret = process.env.SANDBOX_API_SECRET;

  // Fallback to simulation if credentials are not provided
  if (!apiKey || !apiSecret) {
    console.warn('[Sandbox Service] Sandbox API credentials not configured. Simulating Aadhaar OTP.');
    const mockClientId = `mock_client_${crypto.randomUUID()}`;
    const mockOtp = Math.floor(100000 + Math.random() * 900000).toString();
    return {
      clientId: mockClientId,
      isMock: true,
      mockOtp
    };
  }

  const token = await getAccessToken();

  const response = await fetch('https://api.sandbox.co.in/kyc/aadhaar/okyc/otp', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-api-key': apiKey,
      'x-api-version': '1.0',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ aadhaar_number: aadhaarNumber })
  });

  const resJson = (await response.json()) as any;
  if (!response.ok || resJson.code !== 200) {
    throw new Error(resJson.message || `Sandbox OTP request failed: ${response.statusText}`);
  }

  return {
    clientId: resJson.data.client_id,
    isMock: false
  };
}

export interface AadhaarVerificationData {
  fullName: string;
  dob: string; // YYYY-MM-DD
  gender: string;
  address: any;
  isMock: boolean;
}

/**
 * Verifies the Aadhaar OTP against Sandbox API
 * @param clientId The client_id returned during initiation
 * @param otp The 6-digit OTP entered by the user
 */
export async function verifyAadhaarOtp(clientId: string, otp: string): Promise<AadhaarVerificationData> {
  const apiKey = process.env.SANDBOX_API_KEY;
  const apiSecret = process.env.SANDBOX_API_SECRET;

  // Fallback if credentials are not provided
  if (!apiKey || !apiSecret || clientId.startsWith('mock_client_')) {
    console.warn('[Sandbox Service] Sandbox API credentials not configured or using simulated client. Simulating Aadhaar verification.');
    
    // Accept any 6 digit code for mock verification
    if (!/^\d{6}$/.test(otp)) {
      throw new Error('Invalid OTP format. Must be 6 digits.');
    }

    return {
      fullName: 'TEST AADHAAR USER',
      dob: '1995-08-15',
      gender: 'M',
      address: {
        house: '123',
        street: 'Mock Street',
        landmark: 'Near Central Park',
        loc: 'Sector 5',
        po: 'Mock Post Office',
        subdist: 'Mock Sub-District',
        dist: 'Mock District',
        state: 'Delhi',
        pc: '110001',
        country: 'India'
      },
      isMock: true
    };
  }

  const token = await getAccessToken();

  const response = await fetch('https://api.sandbox.co.in/kyc/aadhaar/okyc/otp/verify', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-api-key': apiKey,
      'x-api-version': '1.0',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ client_id: clientId, otp })
  });

  const resJson = (await response.json()) as any;
  if (!response.ok || resJson.code !== 200) {
    throw new Error(resJson.message || `Sandbox OTP verification failed: ${response.statusText}`);
  }

  // The fields returned by Sandbox API okyc verify response
  const kycData = resJson.data || {};
  return {
    fullName: kycData.full_name || kycData.name || 'N/A',
    dob: kycData.dob || '1990-01-01',
    gender: kycData.gender || 'M',
    address: kycData.address || {},
    isMock: false
  };
}
