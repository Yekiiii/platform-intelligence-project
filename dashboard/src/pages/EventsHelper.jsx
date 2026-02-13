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

export default function EventsHelper() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const limit = 20;

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const res = await analytics.getEvents({ limit, offset });
        setEvents(res.data.data || []);
      } catch (err) {
        console.error("Failed to fetch events", err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [offset]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
           <h1 className="text-3xl font-bold tracking-tight text-gray-900">Events Explorer</h1>
           <p className="mt-2 text-sm text-gray-500">Live feed of raw event data ingestion.</p>
        </div>
      </div>

      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Event Name</TableHead>
              <TableHead>Timestamp</TableHead>
              <TableHead>User ID</TableHead>
              <TableHead>Properties</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    <div className="flex justify-center items-center space-x-2">
                        <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></span>
                        <span>Loading events...</span>
                    </div>
                  </TableCell>
              </TableRow>
            ) : events.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-gray-500">
                    No events found.
                  </TableCell>
                </TableRow>
            ) : (
                events.map((event, idx) => (
                <TableRow key={event.event_id || idx}>
                    <TableCell className="font-medium">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {event.event_name}
                        </span>
                    </TableCell>
                    <TableCell className="text-gray-500">
                         {new Date(event.timestamp).toLocaleString()}
                    </TableCell>
                    <TableCell>{event.user_id}</TableCell>
                    <TableCell className="text-gray-500 max-w-xs truncate font-mono text-xs">
                        {JSON.stringify(event.payload)}
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
        hasMore={events.length === limit}
        isLoading={loading}
        onPrevious={() => setOffset(Math.max(0, offset - limit))}
        onNext={() => setOffset(offset + limit)}
      />
    </div>
  )
}
