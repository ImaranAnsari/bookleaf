import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Ticket, TicketMessage, TicketStatus } from '../../types';
import { useRealtime } from '../../services/realtime';
import {
  ListTodo,
  Clock,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Send,
  BookOpen,
  Calendar,
  Sparkles,
  Paperclip,
  Radio,
} from 'lucide-react';

export const MyTickets: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [replyContent, setReplyContent] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);

  useEffect(() => {
    loadTickets();
  }, [statusFilter]);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const res = await api.getTickets({
        status: statusFilter === 'all' ? undefined : statusFilter,
        sort: 'newest',
      });
      if (res.success) {
        setTickets(res.data);
        if (selectedTicket) {
          const updated = res.data.find((t) => t.ticket_id === selectedTicket.ticket_id);
          if (updated) {
            loadTicketDetail(updated.ticket_id);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load tickets', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTicketDetail = async (id: string) => {
    try {
      const res = await api.getTicketById(id);
      if (res.success) {
        setSelectedTicket(res.data);
      }
    } catch (err) {
      console.error('Failed to load ticket detail', err);
    }
  };

  // Real-Time SSE Listener (Requirement A: "Tickets should update in real time without refreshing the page")
  useRealtime({
    onTicketCreated: (newTicket) => {
      setTickets((prev) => [newTicket, ...prev.filter((t) => t.ticket_id !== newTicket.ticket_id)]);
    },
    onTicketUpdated: (updatedTicket) => {
      setTickets((prev) =>
        prev.map((t) => (t.ticket_id === updatedTicket.ticket_id ? { ...t, ...updatedTicket } : t))
      );
      if (selectedTicket && selectedTicket.ticket_id === updatedTicket.ticket_id) {
        setSelectedTicket((prev) => (prev ? { ...prev, ...updatedTicket } : null));
      }
    },
    onMessageCreated: (msg: TicketMessage) => {
      if (selectedTicket && selectedTicket.ticket_id === msg.ticket_id) {
        setSelectedTicket((prev) => {
          if (!prev) return null;
          const messages = prev.messages || [];
          if (messages.some((m) => m.message_id === msg.message_id)) return prev;
          return {
            ...prev,
            messages: [...messages, msg],
          };
        });
      }
      // Update ticket message count in list
      setTickets((prev) =>
        prev.map((t) =>
          t.ticket_id === msg.ticket_id
            ? { ...t, message_count: (t.message_count || 1) + 1, last_message_at: msg.created_at }
            : t
        )
      );
    },
  });

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim() || !selectedTicket) return;

    setSubmittingReply(true);
    try {
      const res = await api.addMessage(selectedTicket.ticket_id, replyContent.trim());
      if (res.success) {
        setReplyContent('');
        // Immediately add to messages if not already added by SSE
        setSelectedTicket((prev) => {
          if (!prev) return null;
          const messages = prev.messages || [];
          if (messages.some((m) => m.message_id === res.data.message_id)) return prev;
          return {
            ...prev,
            messages: [...messages, res.data],
          };
        });
      }
    } catch (err) {
      console.error('Failed to send reply', err);
    } finally {
      setSubmittingReply(false);
    }
  };

  const getStatusBadge = (status: TicketStatus) => {
    switch (status) {
      case 'Open':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5"></span>
            Open
          </span>
        );
      case 'In Progress':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
            <Clock className="w-3 h-3 mr-1 text-amber-600 animate-spin" />
            In Progress
          </span>
        );
      case 'Resolved':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">My Support Tickets</h2>
          <p className="text-slate-600 text-sm mt-1">
            Track real-time responses and resolutions from the BookLeaf operations team.
          </p>
        </div>

        {/* Real-time SSE indicator */}
        <div className="inline-flex items-center space-x-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-full text-xs font-medium self-start sm:self-auto">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Live Real-Time Sync Active</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-1 border-b border-slate-200 pb-2 overflow-x-auto">
        {['all', 'Open', 'In Progress', 'Resolved', 'Closed'].map((tab) => (
          <button
            key={tab}
            onClick={() => setStatusFilter(tab)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
              statusFilter === tab
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {tab === 'all' ? 'All Tickets' : tab}
          </button>
        ))}
      </div>

      {/* Main Layout: Split List + Detail View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Tickets List */}
        <div className="lg:col-span-5 space-y-3">
          {loading && tickets.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
              <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-xs text-slate-500 font-medium">Fetching your tickets...</p>
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-slate-200 p-6">
              <ListTodo className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-slate-800">No tickets found</h4>
              <p className="text-xs text-slate-500 mt-1">
                {statusFilter === 'all'
                  ? 'You have not submitted any support queries yet.'
                  : `No tickets with status "${statusFilter}".`}
              </p>
            </div>
          ) : (
            tickets.map((ticket) => {
              const isSelected = selectedTicket?.ticket_id === ticket.ticket_id;

              return (
                <div
                  key={ticket.ticket_id}
                  onClick={() => loadTicketDetail(ticket.ticket_id)}
                  className={`p-4 rounded-xl border cursor-pointer transition text-left ${
                    isSelected
                      ? 'bg-amber-50/60 border-amber-400 shadow-sm'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-[11px] font-bold text-slate-500">
                      {ticket.ticket_id}
                    </span>
                    {getStatusBadge(ticket.status)}
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 line-clamp-1 mb-1">
                    {ticket.subject}
                  </h4>

                  <p className="text-xs text-slate-600 line-clamp-2 mb-3">
                    {ticket.description}
                  </p>

                  <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                    <span className="flex items-center text-slate-500 font-medium">
                      <BookOpen className="w-3 h-3 mr-1 text-slate-400" />
                      {ticket.book_title || 'General Account'}
                    </span>
                    <span className="flex items-center">
                      <Calendar className="w-3 h-3 mr-1 text-slate-400" />
                      {new Date(ticket.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Ticket Conversation Thread */}
        <div className="lg:col-span-7">
          {selectedTicket ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Ticket Header Banner */}
              <div className="p-6 bg-slate-50 border-b border-slate-200">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-800">
                      {selectedTicket.ticket_id}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                      {selectedTicket.category}
                    </span>
                  </div>
                  {getStatusBadge(selectedTicket.status)}
                </div>

                <h3 className="text-lg font-bold text-slate-900">{selectedTicket.subject}</h3>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-2">
                  <span>
                    <strong className="text-slate-700">Topic:</strong>{' '}
                    {selectedTicket.book_title ? `Book: ${selectedTicket.book_title}` : 'General / Account'}
                  </span>
                  <span>•</span>
                  <span>
                    <strong className="text-slate-700">Submitted:</strong>{' '}
                    {new Date(selectedTicket.created_at).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Conversation Messages Thread */}
              <div className="p-6 space-y-4 max-h-[500px] overflow-y-auto bg-slate-50/30">
                {selectedTicket.messages && selectedTicket.messages.length > 0 ? (
                  selectedTicket.messages.map((msg) => {
                    const isAdmin = msg.sender_type === 'admin';

                    return (
                      <div
                        key={msg.message_id}
                        className={`flex flex-col ${isAdmin ? 'items-start' : 'items-end'}`}
                      >
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-[11px] font-bold text-slate-600">
                            {msg.sender_name}
                          </span>
                          {isAdmin && (
                            <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded font-semibold">
                              BookLeaf Team
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400">
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <div
                          className={`p-4 rounded-2xl max-w-xl text-xs sm:text-sm whitespace-pre-wrap leading-relaxed shadow-xs ${
                            isAdmin
                              ? 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
                              : 'bg-amber-500 text-slate-950 font-medium rounded-tr-none'
                          }`}
                        >
                          {msg.content}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-6 text-slate-400 text-xs">
                    No replies yet. Our author success team will respond shortly.
                  </div>
                )}
              </div>

              {/* Reply Box */}
              <div className="p-4 bg-white border-t border-slate-200">
                <form onSubmit={handleSendReply} className="space-y-3">
                  <textarea
                    rows={3}
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="Type your reply to BookLeaf support..."
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      ⚡ Replies sync in real time directly to operations desk.
                    </span>
                    <button
                      type="submit"
                      disabled={submittingReply || !replyContent.trim()}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{submittingReply ? 'Sending...' : 'Send Reply'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
              <MessageSquare className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <h4 className="text-sm font-bold text-slate-700">No Ticket Selected</h4>
              <p className="text-xs text-slate-500 mt-1">
                Select a ticket from the left column to view the live conversation thread and responses.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
