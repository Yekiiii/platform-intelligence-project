import { useEffect, useState } from 'react';
import { analytics } from '../services/api';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table"
import { Pagination } from "../components/ui/pagination"

export default function LTVLeaderboard() {
  const [users, setUsers] = useState([]);
  const [limit, setLimit] = useState(10);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    const fetchLTV = async () => {
      setLoading(true);
      try {
        const res = await analytics.getLTV({ limit, offset });
        const data = res.data.data || [];
        setUsers(data);
        // Backend heuristic for pagination availability
        setHasMore(data.length === limit); 
      } catch (err) {
        console.error("Failed to fetch LTV", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLTV();
  }, [limit, offset]);

  // Reset offset if limit changes
  const handleLimitChange = (e) => {
    setLimit(Number(e.target.value));
    setOffset(0);
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">LTV Leaderboard</h1>
          <p className="mt-2 text-sm text-gray-500">Top customers by lifetime value.</p>
        </div>
        
        <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Rows per page</label>
            <select 
            value={limit}
            onChange={handleLimitChange}
            className="block w-24 pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md"
            >
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
            </select>
        </div>
      </div>

      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Rank</TableHead>
              <TableHead>User ID</TableHead>
              <TableHead>Total Revenue</TableHead>
              <TableHead className="text-right">Last Active</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
               <TableRow>
                 <TableCell colSpan={4} className="h-24 text-center">
                   <div className="flex justify-center items-center space-x-2">
                       <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></span>
                       <span>Loading data...</span>
                   </div>
                 </TableCell>
               </TableRow>
            ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-gray-500">
                    No users found.
                  </TableCell>
                </TableRow>
            ) : (
                users.map((user, idx) => (
                <TableRow key={user.user_id}>
                    <TableCell className="font-medium">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-xs font-bold text-gray-700">
                             {offset + idx + 1}
                        </span>
                    </TableCell>
                    <TableCell>{user.user_id}</TableCell>
                    <TableCell className="font-bold text-green-600">
                        ${parseFloat(user.total_revenue).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right text-gray-500">
                        {user.last_seen ? new Date(user.last_seen).toLocaleDateString() : 'N/A'}
                    </TableCell>
                </TableRow>
                ))
            )}
          </TableBody>
        </Table>
      </div>

      <Pagination 
        limit={limit}
        offset={offset}
        hasMore={hasMore}
        isLoading={loading}
        onPrevious={() => setOffset(Math.max(0, offset - limit))}
        onNext={() => setOffset(offset + limit)}
      />
    </div>
  )
}
