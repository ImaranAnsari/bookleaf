import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  Users,
  BookOpen,
  DollarSign,
  MapPin,
  Mail,
  Phone,
  ExternalLink,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';

export const AuthorCatalog: React.FC = () => {
  const { quickSwitch } = useAuth();
  const [authors, setAuthors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAuthors();
  }, []);

  const loadAuthors = async () => {
    setLoading(true);
    try {
      const res = await api.getDemoAccounts();
      if (res.success) {
        // Also fetch rich author metrics
        const list = await fetch('/api/authors', {
          headers: { Authorization: `Bearer ${localStorage.getItem('bookleaf_token')}` },
        }).then((r) => r.json());

        if (list.success) {
          setAuthors(list.data);
        } else {
          setAuthors(res.data.authors);
        }
      }
    } catch (err) {
      console.error('Failed to load authors', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">BookLeaf Author Catalog</h2>
        <p className="text-slate-600 text-sm mt-1">
          Master directory of 10 publishing partners, book sales, and royalty exposure across India.
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-slate-200">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-xs text-slate-500 font-medium">Loading authors directory...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {authors.map((author) => (
            <div
              key={author.author_id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                    {author.author_id}
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {author.joined_date ? `Joined ${new Date(author.joined_date).toLocaleDateString()}` : ''}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900">{author.name}</h3>

                <div className="mt-2 space-y-1 text-xs text-slate-600">
                  <div className="flex items-center">
                    <Mail className="w-3.5 h-3.5 mr-2 text-slate-400" />
                    <span>{author.email}</span>
                  </div>
                  {author.phone && (
                    <div className="flex items-center">
                      <Phone className="w-3.5 h-3.5 mr-2 text-slate-400" />
                      <span>{author.phone}</span>
                    </div>
                  )}
                  {author.city && (
                    <div className="flex items-center">
                      <MapPin className="w-3.5 h-3.5 mr-2 text-slate-400" />
                      <span>{author.city}</span>
                    </div>
                  )}
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-100 text-center text-xs">
                  <div className="bg-slate-50 p-2 rounded-lg">
                    <div className="text-[10px] text-slate-500 font-semibold uppercase">Books</div>
                    <div className="font-bold text-slate-800 mt-0.5">{author.book_count || 1}</div>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-lg">
                    <div className="text-[10px] text-slate-500 font-semibold uppercase">Copies</div>
                    <div className="font-bold text-slate-800 mt-0.5">{author.total_sales || 0}</div>
                  </div>
                  <div className="bg-amber-50 p-2 rounded-lg border border-amber-200">
                    <div className="text-[10px] text-amber-800 font-semibold uppercase">Pending</div>
                    <div className="font-bold text-amber-700 mt-0.5">₹{author.total_pending_royalty || 0}</div>
                  </div>
                </div>
              </div>

              {/* Impersonate / Switch to Author View */}
              <div className="mt-4 pt-3 border-t border-slate-100">
                <button
                  onClick={() => quickSwitch(author.author_id)}
                  className="w-full py-2 px-3 bg-slate-50 hover:bg-amber-50 text-slate-700 hover:text-amber-900 border border-slate-200 hover:border-amber-300 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition"
                >
                  <span>View Author Portal as {author.name.split(' ')[0]}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
