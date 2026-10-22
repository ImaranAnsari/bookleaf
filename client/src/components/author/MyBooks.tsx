import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Book, BookSummary } from '../../types';
import {
  BookOpen,
  DollarSign,
  TrendingUp,
  Clock,
  Layers,
  ShoppingBag,
  Printer,
  Calendar,
  AlertCircle,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';

interface MyBooksProps {
  onRaiseTicketForBook: (bookId: string) => void;
}

export const MyBooks: React.FC<MyBooksProps> = ({ onRaiseTicketForBook }) => {
  const [books, setBooks] = useState<Book[]>([]);
  const [summary, setSummary] = useState<BookSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBooks();
  }, []);

  const loadBooks = async () => {
    setLoading(true);
    try {
      const res = await api.getMyBooks();
      if (res.success) {
        setBooks(res.data.books);
        setSummary(res.data.summary);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load books');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'Published & Live') {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
          Published & Live
        </span>
      );
    }
    if (status.includes('Cover Design')) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-300">
          <Layers className="w-3 h-3 mr-1 text-indigo-600" />
          Production: Cover Design
        </span>
      );
    }
    if (status.includes('Typesetting')) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
          <Clock className="w-3 h-3 mr-1 text-amber-600" />
          Production: Typesetting
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-300">
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 text-sm font-medium">Loading your catalog and royalty records...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-center space-x-3">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Title & Intro */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">My Published Books & Royalties</h2>
        <p className="text-slate-600 text-sm mt-1">
          Track sales volumes, retail availability, and pending royalty disbursements across your titles.
        </p>
      </div>

      {/* Summary KPI Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
              <span>Catalog Size</span>
              <BookOpen className="w-4 h-4 text-blue-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{summary.totalBooks}</div>
            <div className="text-[11px] text-slate-500 mt-1">Titles under BookLeaf imprint</div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
              <span>Total Copies Sold</span>
              <ShoppingBag className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              {summary.totalCopiesSold.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Across all retail platforms</div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
              <span>Royalty Earned</span>
              <TrendingUp className="w-4 h-4 text-purple-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              ₹{summary.totalRoyaltyEarned.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">80% author share of net profit</div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
              <span>Royalty Paid</span>
              <DollarSign className="w-4 h-4 text-slate-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-emerald-600">
              ₹{summary.totalRoyaltyPaid.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Disbursed via bank transfer</div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm bg-gradient-to-br from-amber-50/50 to-white">
            <div className="flex items-center justify-between text-amber-800 text-xs font-semibold uppercase tracking-wider">
              <span>Pending Payout</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-amber-700">
              ₹{summary.totalRoyaltyPending.toLocaleString()}
            </div>
            <div className="text-[11px] text-amber-800/80 mt-1">
              {summary.totalRoyaltyPending >= 1000
                ? 'Eligible for next quarterly run'
                : 'Below ₹1,000 rollover threshold'}
            </div>
          </div>
        </div>
      )}

      {/* Threshold / Rollover Policy Alert (Assignment Edge Case) */}
      {summary && summary.totalRoyaltyPending > 0 && summary.totalRoyaltyPending < 1000 && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900">
            <span className="font-bold">BookLeaf Royalty Payout Policy Note: </span>
            Your pending accumulated royalty (₹{summary.totalRoyaltyPending.toLocaleString()}) is currently below the
            standard minimum payout threshold of ₹1,000. Under BookLeaf policy, balances below ₹1,000 automatically roll
            over and accumulate into your next quarterly payout cycle without expiring.
          </div>
        </div>
      )}

      {/* Books List Cards */}
      <div className="space-y-4">
        {books.map((book) => {
          const isProduction = book.status.includes('Production');

          return (
            <div
              key={book.book_id}
              className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow transition overflow-hidden"
            >
              <div className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left Column: Book Details */}
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-bold text-slate-900">{book.title}</h3>
                      {getStatusBadge(book.status)}
                    </div>

                    <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500">
                      <span>
                        <strong className="text-slate-700">ISBN:</strong> {book.isbn || 'Pending Assignment'}
                      </span>
                      <span>•</span>
                      <span>
                        <strong className="text-slate-700">Genre:</strong> {book.genre}
                      </span>
                      {book.publication_date && (
                        <>
                          <span>•</span>
                          <span className="flex items-center">
                            <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" />
                            {new Date(book.publication_date).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </>
                      )}
                      {book.print_partner && (
                        <>
                          <span>•</span>
                          <span className="flex items-center">
                            <Printer className="w-3.5 h-3.5 mr-1 text-slate-400" />
                            {book.print_partner}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Retail Distribution Badges */}
                    {book.available_on && book.available_on.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-2">
                        <span className="text-[11px] text-slate-500 font-medium">Available on:</span>
                        {book.available_on.map((channel, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200"
                          >
                            {channel}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right Column: Financial Figures or Production Stage */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 lg:gap-6 border-t lg:border-t-0 pt-4 lg:pt-0 border-slate-100">
                    {isProduction ? (
                      <div className="bg-indigo-50/60 border border-indigo-200 rounded-lg p-3 text-xs text-indigo-900 max-w-sm">
                        <div className="font-bold flex items-center mb-1">
                          <Layers className="w-3.5 h-3.5 mr-1 text-indigo-600" />
                          Pre-Launch Production Phase
                        </div>
                        <p className="text-[11px] text-indigo-700">
                          MRP and royalty rates are assigned following final proof sign-off and distribution listing.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                        <div className="bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                          <div className="text-[10px] uppercase font-semibold text-slate-500">MRP / Royalty</div>
                          <div className="font-bold text-slate-800 text-sm mt-0.5">
                            ₹{book.mrp} <span className="text-xs text-slate-500">/ ₹{book.author_royalty_per_copy}</span>
                          </div>
                        </div>

                        <div className="bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                          <div className="text-[10px] uppercase font-semibold text-slate-500">Copies Sold</div>
                          <div className="font-bold text-slate-800 text-sm mt-0.5">
                            {book.total_copies_sold.toLocaleString()}
                          </div>
                        </div>

                        <div className="bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                          <div className="text-[10px] uppercase font-semibold text-slate-500">Earned / Paid</div>
                          <div className="font-bold text-slate-800 text-sm mt-0.5">
                            ₹{book.total_royalty_earned.toLocaleString()}
                          </div>
                        </div>

                        <div className="bg-amber-50/80 px-3 py-2 rounded-lg border border-amber-200">
                          <div className="text-[10px] uppercase font-semibold text-amber-800">Pending</div>
                          <div className="font-bold text-amber-700 text-sm mt-0.5">
                            ₹{book.royalty_pending.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Action Button: Raise Query About Book */}
                    <button
                      onClick={() => onRaiseTicketForBook(book.book_id)}
                      className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-amber-100 hover:text-amber-900 border border-slate-200 hover:border-amber-300 flex items-center space-x-1.5 transition whitespace-nowrap self-stretch sm:self-auto justify-center"
                      title="Raise a support query specifically for this book"
                    >
                      <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                      <span>Ask Support</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
