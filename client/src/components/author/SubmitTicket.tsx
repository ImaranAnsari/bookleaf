import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Book } from '../../types';
import {
  Send,
  Upload,
  FileText,
  X,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Sparkles,
  BookOpen,
} from 'lucide-react';

interface SubmitTicketProps {
  initialBookId?: string | null;
  onTicketSubmitted: (ticket: any) => void;
}

export const SubmitTicket: React.FC<SubmitTicketProps> = ({ initialBookId, onTicketSubmitted }) => {
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<string>(initialBookId || 'general');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [attachment, setAttachment] = useState<{ name: string; size: number } | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<any | null>(null);

  useEffect(() => {
    api.getMyBooks().then((res) => {
      if (res.success) {
        setBooks(res.data.books);
      }
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (initialBookId) {
      setSelectedBookId(initialBookId);
    }
  }, [initialBookId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be under 10MB');
        return;
      }
      setAttachment({ name: file.name, size: file.size });
      setError(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be under 10MB');
        return;
      }
      setAttachment({ name: file.name, size: file.size });
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (subject.trim().length < 3) {
      setError('Subject must be at least 3 characters long');
      return;
    }

    if (description.trim().length < 10) {
      setError('Please provide a detailed description (at least 10 characters)');
      return;
    }

    setLoading(true);

    try {
      const res = await api.createTicket({
        subject: subject.trim(),
        description: description.trim(),
        book_id: selectedBookId === 'general' ? null : selectedBookId,
        attachment_name: attachment?.name || null,
        attachment_url: attachment ? `https://storage.bookleafpub.com/uploads/${attachment.name}` : null,
      });

      if (res.success) {
        setSuccessResult(res.data);
        onTicketSubmitted(res.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit support query');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSubject('');
    setDescription('');
    setSelectedBookId('general');
    setAttachment(null);
    setSuccessResult(null);
    setError(null);
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Submit a Support Query</h2>
        <p className="text-slate-600 text-sm mt-1">
          Reach our dedicated author success desk regarding royalties, print quality, ISBN, or distribution.
        </p>
      </div>

      {successResult ? (
        <div className="bg-white border border-emerald-200 rounded-2xl p-8 shadow-sm text-center">
          <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">Query Raised Successfully!</h3>
          <p className="text-slate-600 text-sm mt-1">
            Ticket ID: <span className="font-mono font-bold text-slate-900">{successResult.ticket_id}</span>
          </p>

          <div className="mt-5 p-4 bg-slate-50 border border-slate-200 rounded-xl max-w-md mx-auto text-left text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Auto-Classification:</span>
              <span className="font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                {successResult.category}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Assigned Priority:</span>
              <span className={`font-semibold px-2 py-0.5 rounded ${
                successResult.priority === 'Critical'
                  ? 'bg-rose-100 text-rose-800'
                  : successResult.priority === 'High'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-emerald-100 text-emerald-800'
              }`}>
                {successResult.priority}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200">
              ⚡ Our operations team and AI support assistant have been notified. Tickets update in real time.
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={resetForm}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition"
            >
              Submit Another Query
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Book Dropdown */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Which book is this query about?
            </label>
            <div className="relative">
              <select
                value={selectedBookId}
                onChange={(e) => setSelectedBookId(e.target.value)}
                className="w-full py-2.5 pl-3.5 pr-8 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition"
              >
                <option value="general">🏢 General / Account Level (Not book-specific)</option>
                {books.map((b) => (
                  <option key={b.book_id} value={b.book_id}>
                    📖 {b.title} ({b.status})
                  </option>
                ))}
              </select>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Selecting a book allows our team and AI assistant to automatically reference sales and print data.
            </p>
          </div>

          {/* Subject Line */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Subject Line
            </label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Question about quarterly royalty payout calculation"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition"
            />
          </div>

          {/* Description Field */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Detailed Description
            </label>
            <textarea
              required
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please describe your concern in detail. If this is regarding royalties, please mention the platform or amount. If this is a print defect, please describe the issue."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition"
            />
          </div>

          {/* Optional File Attachment UI */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Supporting Attachments (Optional)
            </label>

            {attachment ? (
              <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                <div className="flex items-center space-x-2 text-slate-700 font-medium truncate">
                  <FileText className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span className="truncate">{attachment.name}</span>
                  <span className="text-slate-400 text-[11px]">
                    ({(attachment.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setAttachment(null)}
                  className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-rose-600 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className="border-2 border-dashed border-slate-300 hover:border-amber-400 rounded-xl p-6 text-center bg-slate-50/60 hover:bg-amber-50/20 transition cursor-pointer"
                onClick={() => document.getElementById('file-upload-input')?.click()}
              >
                <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                <div className="text-xs font-semibold text-slate-700">
                  Click to upload or drag & drop files
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Photos of defective author copies, royalty statement receipts, or screenshots (Max 10MB)
                </p>
                <input
                  id="file-upload-input"
                  type="file"
                  className="hidden"
                  onChange={handleFileChange}
                  accept="image/*,.pdf,.doc,.docx"
                />
              </div>
            )}
          </div>

          {/* AI Notice Badge */}
          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-start space-x-2 text-xs text-blue-900">
            <Sparkles className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <span>
              <strong>AI-Assisted Triage: </strong>
              Your query will be automatically classified into BookLeaf operations categories and evaluated for urgency to route to the appropriate desk.
            </span>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-6 py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 shadow-md hover:shadow-lg flex items-center justify-center space-x-2 transition disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{loading ? 'Submitting & Classifying...' : 'Submit Support Query'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
