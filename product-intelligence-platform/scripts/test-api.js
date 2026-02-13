const axios = require('axios');

const API_URL = 'http://localhost:3000';

async function test() {
  try {
    // 1. Login
    console.log('Logging in...');
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@alpha.com',
      password: 'demo123'
    });
    
    const token = loginRes.data.data.token;
    console.log('Login successful. Token obtained.');
    
    // 2. Get Revenue
    console.log('Fetching Revenue...');
    const revenueRes = await axios.get(`${API_URL}/v1/analytics/revenue`, {
      params: {
        from: '2026-01-01', // Adjust based on seed data range (current date is Jan 2026, seed --months=3 might be past 3 months? or future? let's check seed logic later if needed)
        // seed-data says "usage patterns... months=3". usually means last 3 months.
        // Current date is Jan 29, 2026. So Oct 2025 - Jan 2026.
        // Let's omit date param to use defaults first, or try matching seed range.
      },
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    console.log('Revenue Data Length:', revenueRes.data.data.length);
    console.log('Sample Data:', revenueRes.data.data.slice(0, 2));
    
  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
  }
}

test();
