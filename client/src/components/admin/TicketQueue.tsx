import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Ticket, TicketCategory, TicketPriority, TicketStatus } from '../../types';
import { useRealtime } from '../../services/realtime';
import {
  ListTodo,
  Search,
  Filter,
  ArrowUpDown,
  AlertTriangle,
  Clock,
  User,
  BookOpen,
  Calendar,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

interface TicketQueueProps {
  onSelectTicket: (ticketId: string) => void;
  selectedTicketId?: string | null;
}

export const TicketQueue: React.FC<TicketQueueProps> = ({ onSelectTicket, selectedTicketId }) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<string>('urgent_first');

  useEffect(() => {
    fetchTickets();
  }, [statusFilter, categoryFilter, priorityFilter, sortOption]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await api.getTickets({
        status: statusFilter === 'all' ? undefined : statusFilter,
        category: categoryFilter === 'all' ? undefined : categoryFilter,
        priority: priorityFilter === 'all' ? undefined : priorityFilter,
        search: searchQuery.trim() || undefined,
        sort: sortOption,
      });
      if (res.success) {
        setTickets(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch admin ticket queue', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTickets();
  };

  // Real-Time SSE listener
  useRealtime({
    onTicketCreated: (newTicket) => {
      setTickets((prev) => [newTicket, ...prev.filter((t) => t.ticket_id !== newTicket.ticket_id)]);
    },
    onTicketUpdated: (updatedTicket) => {
      setTickets((prev) =>
        prev.map((t) => (t.ticket_id === updatedTicket.ticket_id ? { ...t, ...updatedTicket } : t))
      );
    },
    onMessageCreated: (msg) => {
      setTickets((prev) =>
        prev.map((t) =>
          t.ticket_id === msg.ticket_id
            ? { ...t, message_count: (t.message_count || 1) + 1, last_message_at: msg.created_at }
            : t
        )
      );
    },
  });

  const getPriorityBadge = (priority: TicketPriority) => {
    switch (priority) {
      case 'Critical':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
            <span className="w-2 h-2 rounded-full bg-rose-600 mr-1.5 animate-ping"></span>
            Critical
          </span>
        );
      case 'High':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <AlertTriangle className="w-3 h-3 mr-1 text-amber-600" />
            High
          </span>
        );
      case 'Medium':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-100 text-blue-800 border border-blue-200">
            Medium
          </span>
        );
      case 'Low':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
            Low
          </span>
        );
    }
  };

  const getStatusBadge = (status: TicketStatus) => {
    switch (status) {
      case 'Open':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            Open
          </span>
        );
      case 'In Progress':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
            In Progress
          </span>
        );
      case 'Resolved':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
            Resolved
          </span>
        );
      case 'Closed':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
            Closed
          </span>
        );
    }
  };

  const calculateDaysOpen = (createdAt: string) => {
    const diffMs = Date.now() - new Date(createdAt).getTime();
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) return `${days}d ${hours}h ago`;
    return `${hours}h ago`;
  };

  return (
    <div className="space-y-5">
      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search form */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by author name, book title, or subject..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </form>

          {/* Sort Dropdown (Urgent First requirement) */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-500 font-semibold flex items-center">
              <ArrowUpDown className="w-3.5 h-3.5 mr-1" />
              Sort:
            </span>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="py-1.5 px-3 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="urgent_first">🚨 Most Urgent & Oldest Unresolved</option>
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="py-1 px-2.5 bg-slate-50 border border-slate-300 rounded-md text-xs font-medium text-slate-700"
          >
            <option value="all">All Statuses</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="py-1 px-2.5 bg-slate-50 border border-slate-300 rounded-md text-xs font-medium text-slate-700"
          >
            <option value="all">All Priorities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="py-1 px-2.5 bg-slate-50 border border-slate-300 rounded-md text-xs font-medium text-slate-700 max-w-[200px]"
          >
            <option value="all">All Categories</option>
            <option value="Royalty & Payments">Royalty & Payments</option>
            <option value="ISBN & Metadata Issues">ISBN & Metadata Issues</option>
            <option value="Printing & Quality">Printing & Quality</option>
            <option value="Distribution & Availability">Distribution & Availability</option>
            <option value="Book Status & Production Updates">Book Status & Production Updates</option>
            <option value="General Inquiry">General Inquiry</option>
          </select>

          {(statusFilter !== 'all' || categoryFilter !== 'all' || priorityFilter !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setStatusFilter('all');
                setCategoryFilter('all');
                setPriorityFilter('all');
                setSearchQuery('');
              }}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold underline ml-2"
            >
              Reset Filters
            </button>
          )}

          <div className="ml-auto text-[11px] font-semibold text-slate-500">
            Showing {tickets.length} ticket{tickets.length === 1 ? '' : 's'}
          </div>
        </div>
      </div>

      {/* Ticket Queue Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading && tickets.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-xs text-slate-500 font-medium">Loading ticket queue...</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-16 p-6">
            <ListTodo className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-slate-800">No matching tickets in queue</h4>
            <p className="text-xs text-slate-500 mt-1">Try clearing filters or search queries.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Ticket / Author</th>
                  <th className="py-3 px-4">Subject & Query</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Queue Age / SLA</th>
                  <th className="py-3 px-4">Assignee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tickets.map((t) => {
                  const isSelected = selectedTicketId === t.ticket_id;
                  const isUnresolved = !['Resolved', 'Closed'].includes(t.status);
                  const isCritical = t.priority === 'Critical';

                  return (
                    <tr
                      key={t.ticket_id}
                      onClick={() => onSelectTicket(t.ticket_id)}
                      className={`cursor-pointer transition hover:bg-slate-50/80 ${
                        isSelected
                          ? 'bg-blue-50/80 font-medium'
                          : isCritical && isUnresolved
                          ? 'bg-rose-50/30'
                          : ''
                      }`}
                    >
                      {/* Ticket & Author */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-slate-900">{t.ticket_id}</span>
                        </div>
                        <div className="text-slate-700 font-medium mt-0.5">{t.author_name}</div>
                        <div className="text-[10px] text-slate-400">{t.author_email}</div>
                      </td>

                      {/* Subject & Query */}
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-bold text-slate-900 line-clamp-1">{t.subject}</div>
                        <div className="text-slate-500 text-[11px] line-clamp-1 mt-0.5">{t.description}</div>
                        {t.book_title && (
                          <div className="flex items-center text-[10px] text-slate-400 mt-1">
                            <BookOpen className="w-3 h-3 mr-1 text-slate-400" />
                            <span className="truncate">{t.book_title}</span>
                          </div>
                        )}
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[11px]">
                          {t.category}
                        </span>
                      </td>

                      {/* Priority */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getPriorityBadge(t.priority)}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getStatusBadge(t.status)}
                      </td>

                      {/* Queue Age */}
                      <td className="py-3 px-4 whitespace-nowrap text-slate-500 text-[11px]">
                        <div className="flex items-center">
                          <Clock className="w-3 h-3 mr-1 text-slate-400" />
                          <span>{calculateDaysOpen(t.created_at)}</span>
                        </div>
                      </td>

                      {/* Assignee */}
                      <td className="py-3 px-4 whitespace-nowrap text-slate-600 text-[11px]">
                        {t.assigned_to ? (
                          <span className="font-medium text-blue-900 bg-blue-50 px-2 py-0.5 rounded">
                            {t.assigned_to}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
