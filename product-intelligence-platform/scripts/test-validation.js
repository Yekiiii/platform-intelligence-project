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
    console.log('Login successful. Token obtained.');
    
    // 2. Get Revenue
    console.log('Fetching Revenue...');
    // Seed data is for last 3 months. Date is Jan 2026.
    const revenueRes = await fetch(`${API_URL}/v1/analytics/revenue?from=2025-10-01&to=2026-02-01`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!revenueRes.ok) {
        throw new Error(`Revenue fetch failed: ${revenueRes.status} ${await revenueRes.text()}`);
    }

    const revenueData = await revenueRes.json();
    console.log('Revenue Data Length:', revenueData.data.length);
    console.log('Sample Data:', revenueData.data.slice(0, 2));
    
  } catch (error) {
    console.error('Error:', error);
  }
}

test();
