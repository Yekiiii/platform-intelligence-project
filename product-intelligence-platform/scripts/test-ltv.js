const API_URL = 'http://localhost:3000';

async function test() {
  try {
    // 1. Login
    console.log('Logging in...');
    const loginRes = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: 'admin@alpha.com',
            password: 'demo123'
        })
    });
    
    if (!loginRes.ok) {
        throw new Error(`Login failed: ${loginRes.status} ${await loginRes.text()}`);
    }

    const loginData = await loginRes.json();
    const token = loginData.data.token;
    
    // 2. Get LTV
    console.log('Fetching LTV...');
    const res = await fetch(`${API_URL}/v1/analytics/ltv?limit=2`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!res.ok) {
        throw new Error(`LTV fetch failed: ${res.status} ${await res.text()}`);
    }

    const data = await res.json();
    console.log('LTV Data Sample:', JSON.stringify(data.data[0], null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  }
}

test();
