import { useEffect, useState } from 'react';
import { analytics } from '../services/api';
import KPICard from '../components/KPICard';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';

export default function Dashboard() {
  const [dauData, setDauData] = useState([]);
  const [revenueData, setRevenueData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch Jan 2026 data - org_id comes from JWT now
        const [dauRes, revRes] = await Promise.all([
          analytics.getDAU({ from: '2026-01-01', to: '2026-04-01' }),
          analytics.getRevenue({ from: '2026-01-01', to: '2026-04-01' })
        ]);

        setDauData(dauRes.data.data || []);
        setRevenueData(revRes.data.data || []);
      } catch (err) {
        console.error("Failed to fetch dashboard data", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div className="p-4">Loading stats...</div>;

  // Calculate KPIs
  const lastDau = dauData.length > 0 ? dauData[dauData.length - 1].active_users : 0;
  const lastRev = revenueData.length > 0 ? revenueData[revenueData.length - 1].revenue : 0;
  
  // Total Revenue (Sum)
  const totalRevenue = revenueData.reduce((acc, curr) => acc + parseFloat(curr.revenue), 0);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold leading-tight text-gray-900">Dashboard Overview</h1>
      
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <KPICard title="Daily Active Users" value={lastDau} change="Latest" changeType="positive" />
        <KPICard title="Total Revenue (Jan)" value={`$${totalRevenue.toLocaleString()}`} change="Jan '26" changeType="positive" />
        <KPICard title="Latest Daily Revenue" value={`$${parseFloat(lastRev).toLocaleString()}`} change="Latest" changeType="neutral" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="bg-white p-6 shadow rounded-lg">
          <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">DAU Trend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dauData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={(date) => new Date(date).getDate()} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="active_users" stroke="#4F46E5" name="Active Users" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 shadow rounded-lg">
          <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Revenue Trend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={(date) => new Date(date).getDate()} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="revenue" fill="#10B981" name="Revenue ($)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
