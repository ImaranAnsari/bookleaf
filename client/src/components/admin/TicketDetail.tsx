import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  Ticket,
  TicketCategory,
  TicketPriority,
  TicketStatus,
  TicketMessage,
  TicketInternalNote,
} from '../../types';
import {
  Sparkles,
  Edit3,
  Send,
  Save,
  CheckCircle2,
  Clock,
  AlertTriangle,
  User,
  BookOpen,
  DollarSign,
  FileText,
  Lock,
  RefreshCw,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Layers,
  ArrowLeft,
} from 'lucide-react';

interface TicketDetailProps {
  ticketId: string;
  onBack: () => void;
  onTicketUpdated?: () => void;
}

export const TicketDetail: React.FC<TicketDetailProps> = ({ ticketId, onBack, onTicketUpdated }) => {
  const { user } = useAuth();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);

  // Overrides & Management State
  const [overrideCategory, setOverrideCategory] = useState<TicketCategory>('General Inquiry');
  const [overridePriority, setOverridePriority] = useState<TicketPriority>('Medium');
  const [currentStatus, setCurrentStatus] = useState<TicketStatus>('Open');
  const [assignee, setAssignee] = useState<string>('');
  const [savingOverrides, setSavingOverrides] = useState(false);

  // Response & AI Draft State
  const [aiDraft, setAiDraft] = useState<string>('');
  const [draftLoading, setDraftLoading] = useState(false);
  const [customInstructions, setCustomInstructions] = useState('');
  const [showRegenModal, setShowRegenModal] = useState(false);

  // Send Message State
  const [messageContent, setMessageContent] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  // Internal Note State
  const [noteContent, setNoteContent] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  // Active Tab for interaction
  const [activeTab, setActiveTab] = useState<'reply' | 'notes'>('reply');

  useEffect(() => {
    loadTicket();
  }, [ticketId]);

  const loadTicket = async () => {
    setLoading(true);
    try {
      const res = await api.getTicketById(ticketId);
      if (res.success) {
        setTicket(res.data);
        setOverrideCategory(res.data.category);
        setOverridePriority(res.data.priority);
        setCurrentStatus(res.data.status);
        setAssignee(res.data.assigned_to || '');

        // Fetch or load AI draft
        if (res.data.ai_draft_response) {
          setAiDraft(res.data.ai_draft_response);
        } else {
          fetchAIDraft();
        }
      }
    } catch (err) {
      console.error('Failed to load ticket detail', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAIDraft = async (force = false) => {
    setDraftLoading(true);
    try {
      const res = await api.getAIDraft(ticketId, force);
      if (res.success) {
        setAiDraft(res.data.draft);
      }
    } catch (err) {
      console.error('Failed to fetch AI draft', err);
    } finally {
      setDraftLoading(false);
    }
  };

  const handleRegenerateDraft = async () => {
    setDraftLoading(true);
    setShowRegenModal(false);
    try {
      const res = await api.regenerateAIDraft(ticketId, customInstructions);
      if (res.success) {
        setAiDraft(res.data.draft);
      }
    } catch (err) {
      console.error('Failed to regenerate draft', err);
    } finally {
      setDraftLoading(false);
    }
  };

  const handleSaveOverrides = async () => {
    setSavingOverrides(true);
    try {
      const res = await api.updateTicket(ticketId, {
        category: overrideCategory,
        priority: overridePriority,
        status: currentStatus,
        assigned_to: assignee || null,
      });
      if (res.success) {
        setTicket((prev) => (prev ? { ...prev, ...res.data } : null));
        onTicketUpdated?.();
      }
    } catch (err) {
      console.error('Failed to update ticket', err);
    } finally {
      setSavingOverrides(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageContent.trim()) return;

    setSendingMessage(true);
    try {
      const res = await api.addMessage(ticketId, messageContent.trim());
      if (res.success) {
        setMessageContent('');
        setTicket((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            status: prev.status === 'Open' ? 'In Progress' : prev.status,
            messages: [...(prev.messages || []), res.data],
          };
        });
        setCurrentStatus((prev) => (prev === 'Open' ? 'In Progress' : prev));
        onTicketUpdated?.();
      }
    } catch (err) {
      console.error('Failed to send message', err);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim()) return;

    setSavingNote(true);
    try {
      const res = await api.addInternalNote(ticketId, noteContent.trim());
      if (res.success) {
        setNoteContent('');
        setTicket((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            internal_notes: [...(prev.internal_notes || []), res.data],
          };
        });
      }
    } catch (err) {
      console.error('Failed to save internal note', err);
    } finally {
      setSavingNote(false);
    }
  };

  const handleUseDraftInReply = () => {
    setMessageContent(aiDraft);
    setActiveTab('reply');
  };

  if (loading || !ticket) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-slate-200">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 text-sm font-medium">Loading ticket intelligence & author record...</p>
      </div>
    );
  }

  const categoryOptions: TicketCategory[] = [
    'Royalty & Payments',
    'ISBN & Metadata Issues',
    'Printing & Quality',
    'Distribution & Availability',
    'Book Status & Production Updates',
    'General Inquiry',
  ];

  const priorityOptions: TicketPriority[] = ['Critical', 'High', 'Medium', 'Low'];
  const statusOptions: TicketStatus[] = ['Open', 'In Progress', 'Resolved', 'Closed'];

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-slate-900 transition flex items-center text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            <span>Back to Queue</span>
          </button>
          <div className="h-4 w-px bg-slate-300"></div>
          <span className="font-mono text-sm font-bold text-slate-900">{ticket.ticket_id}</span>
          <span className="text-xs text-slate-500">• Created {new Date(ticket.created_at).toLocaleDateString()}</span>
        </div>

        {/* Quick Assign to Self */}
        <div className="flex items-center space-x-2">
          {ticket.assigned_to ? (
            <span className="text-xs text-slate-600 font-medium">
              Assigned to: <strong className="text-blue-900">{ticket.assigned_to}</strong>
            </span>
          ) : (
            <button
              onClick={() => {
                setAssignee(user?.name || 'Operations Lead');
                handleSaveOverrides();
              }}
              className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg text-xs font-semibold transition"
            >
              Assign to Me
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Left = Conversation & AI Assistance, Right = Author & Book Intelligence */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols): Query, AI Draft, Management & Responses */}
        <div className="lg:col-span-8 space-y-6">
          {/* Ticket Header & Original Query Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h2 className="text-xl font-bold text-slate-900">{ticket.subject}</h2>
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                ticket.priority === 'Critical'
                  ? 'bg-rose-100 text-rose-800'
                  : ticket.priority === 'High'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {ticket.priority} Priority
              </span>
            </div>

            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap bg-slate-50 p-4 rounded-xl border border-slate-100">
              {ticket.description}
            </p>

            {/* Optional attachment link */}
            {ticket.attachment_name && (
              <div className="mt-3 flex items-center space-x-2 text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded-lg border border-blue-100">
                <FileText className="w-4 h-4 text-blue-500" />
                <span className="font-medium">Attached File: {ticket.attachment_name}</span>
              </div>
            )}
          </div>

          {/* AI Auto-Classification & Override Controls Panel (Requirement B) */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-6 shadow-md border border-slate-700">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-700">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center font-bold">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">AI Classification & Ops Triage</h4>
                  <p className="text-[11px] text-slate-400">Review and override AI classifications</p>
                </div>
              </div>

              <button
                onClick={handleSaveOverrides}
                disabled={savingOverrides}
                className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg shadow flex items-center space-x-1.5 transition disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{savingOverrides ? 'Saving...' : 'Save Triage'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              {/* Category Dropdown (with AI override) */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Category (AI: {ticket.ai_category})
                </label>
                <select
                  value={overrideCategory}
                  onChange={(e) => setOverrideCategory(e.target.value as TicketCategory)}
                  className="w-full p-2 bg-slate-800 border border-slate-600 rounded-lg text-white font-medium focus:ring-2 focus:ring-amber-400"
                >
                  {categoryOptions.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat} {cat === ticket.ai_category ? '⭐ (AI pick)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority Dropdown (with AI override) */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Priority (AI: {ticket.ai_priority})
                </label>
                <select
                  value={overridePriority}
                  onChange={(e) => setOverridePriority(e.target.value as TicketPriority)}
                  className="w-full p-2 bg-slate-800 border border-slate-600 rounded-lg text-white font-medium focus:ring-2 focus:ring-amber-400"
                >
                  {priorityOptions.map((pri) => (
                    <option key={pri} value={pri}>
                      {pri} {pri === ticket.ai_priority ? '⭐ (AI pick)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Dropdown */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Ticket Status
                </label>
                <select
                  value={currentStatus}
                  onChange={(e) => setCurrentStatus(e.target.value as TicketStatus)}
                  className="w-full p-2 bg-slate-800 border border-slate-600 rounded-lg text-white font-medium focus:ring-2 focus:ring-amber-400"
                >
                  {statusOptions.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* AI Reasoning display */}
            {ticket.ai_reasoning && (
              <div className="mt-3.5 pt-3 border-t border-slate-800 text-[11px] text-slate-300 flex items-start space-x-2">
                <span className="font-bold text-amber-300 flex-shrink-0">AI Reasoning:</span>
                <span className="italic">{ticket.ai_reasoning}</span>
              </div>
            )}
          </div>

          {/* AI-Drafted Response Panel (Requirement B: Editable draft before sending) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <h4 className="text-sm font-bold text-slate-900">AI-Drafted Response (Knowledge-Base Calibrated)</h4>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowRegenModal(true)}
                  disabled={draftLoading}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center space-x-1 transition"
                >
                  <RefreshCw className={`w-3 h-3 ${draftLoading ? 'animate-spin' : ''}`} />
                  <span>Regenerate Draft</span>
                </button>

                <button
                  onClick={handleUseDraftInReply}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 shadow transition"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Insert into Reply</span>
                </button>
              </div>
            </div>

            {draftLoading ? (
              <div className="py-8 text-center text-xs text-slate-500">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                Generating response tailored to author data & BookLeaf policy...
              </div>
            ) : (
              <textarea
                rows={6}
                value={aiDraft}
                onChange={(e) => setAiDraft(e.target.value)}
                placeholder="AI draft response..."
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-normal text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed font-sans"
              />
            )}
            <p className="text-[11px] text-slate-400">
              💡 Draft follows BookLeaf tone guidelines (empathetic, specific numbers, owning mistakes directly, 48-hr timelines).
            </p>
          </div>

          {/* Conversation History & Reply Box */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Tab Header (Reply vs Internal Notes) */}
            <div className="flex border-b border-slate-200 bg-slate-50 px-4">
              <button
                onClick={() => setActiveTab('reply')}
                className={`py-3 px-4 font-bold text-xs border-b-2 flex items-center space-x-1.5 transition ${
                  activeTab === 'reply'
                    ? 'border-blue-600 text-blue-700 bg-white'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>Author Conversation ({ticket.messages?.length || 0})</span>
              </button>

              <button
                onClick={() => setActiveTab('notes')}
                className={`py-3 px-4 font-bold text-xs border-b-2 flex items-center space-x-1.5 transition ${
                  activeTab === 'notes'
                    ? 'border-amber-500 text-amber-800 bg-white'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Lock className="w-3.5 h-3.5 text-amber-600" />
                <span>Internal Notes ({ticket.internal_notes?.length || 0})</span>
                <span className="text-[10px] bg-amber-100 text-amber-800 px-1 rounded font-normal">Private</span>
              </button>
            </div>

            {/* Tab 1: Conversation Messages */}
            {activeTab === 'reply' && (
              <div>
                <div className="p-6 space-y-4 max-h-[450px] overflow-y-auto bg-slate-50/40">
                  {ticket.messages && ticket.messages.length > 0 ? (
                    ticket.messages.map((msg) => {
                      const isAdmin = msg.sender_type === 'admin';
                      return (
                        <div
                          key={msg.message_id}
                          className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}
                        >
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="text-[11px] font-bold text-slate-700">
                              {msg.sender_name}
                            </span>
                            {isAdmin && (
                              <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded font-semibold">
                                Operations Team
                              </span>
                            )}
                            <span className="text-[10px] text-slate-400">
                              {new Date(msg.created_at).toLocaleString()}
                            </span>
                          </div>

                          <div
                            className={`p-4 rounded-2xl max-w-xl text-xs sm:text-sm whitespace-pre-wrap leading-relaxed shadow-xs ${
                              isAdmin
                                ? 'bg-blue-600 text-white rounded-tr-none'
                                : 'bg-white border border-slate-200 text-slate-900 rounded-tl-none'
                            }`}
                          >
                            {msg.content}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-6 text-slate-400 text-xs">No messages in thread yet.</div>
                  )}
                </div>

                {/* Reply Form */}
                <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-slate-200 space-y-3">
                  <textarea
                    rows={4}
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                    placeholder="Write a response to the author (or click 'Insert into Reply' from AI draft above)..."
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans leading-relaxed"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      ⚡ Sending automatically pushes real-time update to the author's screen.
                    </span>
                    <button
                      type="submit"
                      disabled={sendingMessage || !messageContent.trim()}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow transition disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{sendingMessage ? 'Sending...' : 'Send Response to Author'}</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Tab 2: Internal Ops Notes (Requirement B: not visible to the author) */}
            {activeTab === 'notes' && (
              <div className="p-6 space-y-4">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start space-x-2">
                  <Lock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>Internal Operations Notes: </strong>
                    These notes are strictly private to the BookLeaf publishing & finance team and are NEVER exposed to the author.
                  </span>
                </div>

                <div className="space-y-3">
                  {ticket.internal_notes && ticket.internal_notes.length > 0 ? (
                    ticket.internal_notes.map((note) => (
                      <div
                        key={note.note_id}
                        className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-slate-800"
                      >
                        <div className="flex items-center justify-between mb-1 font-bold text-amber-900">
                          <span>{note.admin_name}</span>
                          <span className="text-[10px] text-slate-500 font-normal">
                            {new Date(note.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap">{note.content}</p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-slate-400 text-xs">
                      No internal notes recorded for this ticket yet.
                    </div>
                  )}
                </div>

                {/* Add Note Form */}
                <form onSubmit={handleAddNote} className="pt-2 border-t border-slate-200 space-y-3">
                  <textarea
                    rows={3}
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder="Add an internal note (e.g. escalated to Repro India for print verification, or bank IFSC confirmation pending)..."
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={savingNote || !noteContent.trim()}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
                    >
                      {savingNote ? 'Saving...' : 'Add Internal Note'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (4 cols): Context Sidebar (Author Info & Book Stats) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Author Profile Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="text-sm font-bold text-slate-900 flex items-center">
                <User className="w-4 h-4 mr-1.5 text-blue-600" />
                Author Details
              </h4>
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                {ticket.author_id}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="text-base font-bold text-slate-900">{ticket.author_name}</div>
              <div className="flex items-center text-slate-600">
                <Mail className="w-3.5 h-3.5 mr-2 text-slate-400" />
                <span>{ticket.author_email}</span>
              </div>
              {ticket.author_phone && (
                <div className="flex items-center text-slate-600">
                  <Phone className="w-3.5 h-3.5 mr-2 text-slate-400" />
                  <span>{ticket.author_phone}</span>
                </div>
              )}
              {ticket.author_city && (
                <div className="flex items-center text-slate-600">
                  <MapPin className="w-3.5 h-3.5 mr-2 text-slate-400" />
                  <span>{ticket.author_city}</span>
                </div>
              )}
              {ticket.author_joined_date && (
                <div className="flex items-center text-slate-600">
                  <Calendar className="w-3.5 h-3.5 mr-2 text-slate-400" />
                  <span>Partner since {new Date(ticket.author_joined_date).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Book Financial & Catalog Context */}
          {ticket.book_id ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h4 className="text-sm font-bold text-slate-900 flex items-center">
                  <BookOpen className="w-4 h-4 mr-1.5 text-amber-600" />
                  Associated Book Record
                </h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                  {ticket.book_status}
                </span>
              </div>

              <div>
                <h5 className="font-bold text-slate-900 text-sm">{ticket.book_title}</h5>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">ISBN: {ticket.book_isbn || 'Pending'}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-center text-xs">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Copies Sold</div>
                  <div className="font-bold text-slate-800 mt-0.5">{ticket.book_total_copies_sold || 0}</div>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Earned (80%)</div>
                  <div className="font-bold text-slate-800 mt-0.5">₹{ticket.book_total_royalty_earned || 0}</div>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Royalty Paid</div>
                  <div className="font-bold text-emerald-600 mt-0.5">₹{ticket.book_royalty_paid || 0}</div>
                </div>

                <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                  <div className="text-[10px] text-amber-800 uppercase font-semibold">Pending Balance</div>
                  <div className="font-bold text-amber-700 mt-0.5">₹{ticket.book_royalty_pending || 0}</div>
                </div>
              </div>

              {ticket.book_print_partner && (
                <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                  <strong>Print Partner:</strong> {ticket.book_print_partner}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-xs text-slate-500">
              <div className="font-bold text-slate-800 mb-1">General Inquiry</div>
              This query is not tied to a specific book title.
            </div>
          )}

          {/* Other Books by Author */}
          {ticket.author_books && ticket.author_books.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                All Books by Author ({ticket.author_books.length})
              </h4>
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {ticket.author_books.map((b) => (
                  <div
                    key={b.book_id}
                    className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg text-xs"
                  >
                    <div className="font-bold text-slate-800 line-clamp-1">{b.title}</div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                      <span>{b.status}</span>
                      <span className="font-semibold text-slate-700">₹{b.total_copies_sold} sold</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Regenerate AI Draft Custom Instructions Modal */}
      {showRegenModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h4 className="text-base font-bold text-slate-900 flex items-center">
              <Sparkles className="w-4 h-4 mr-2 text-amber-500" />
              Regenerate Draft with Custom Instructions
            </h4>
            <p className="text-xs text-slate-600">
              Provide extra guidance to the AI model (e.g. "Mention we initiated a free reprint with tracking number", "Include 48h escalation confirmation").
            </p>
            <textarea
              rows={4}
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              placeholder="e.g. Apologize for delay and inform author that finance approved ₹3,570 payout for tomorrow."
              className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRegenModal(false)}
                className="px-4 py-2 rounded-xl text-xs text-slate-600 hover:bg-slate-100 font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRegenerateDraft}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition"
              >
                Regenerate Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
