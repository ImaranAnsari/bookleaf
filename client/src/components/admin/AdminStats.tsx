import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { AdminStats as AdminStatsType } from '../../types';
import {
  BarChart3,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Users,
  BookOpen,
  DollarSign,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface AdminStatsProps {
  onOpenTicket: (ticketId: string) => void;
}

export const AdminStats: React.FC<AdminStatsProps> = ({ onOpenTicket }) => {
  const [stats, setStats] = useState<AdminStatsType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const res = await api.getAdminStats();
      if (res.success) {
        setStats(res.data);
      }
    } catch (err) {
      console.error('Failed to load admin stats', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !stats) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-slate-200">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-slate-500 text-xs font-medium">Computing queue analytics & SLA health...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Operations & SLA Analytics</h2>
        <p className="text-slate-600 text-sm mt-1">
          Real-time author support performance, response SLAs, category bottlenecks, and catalog financial exposure.
        </p>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase">
            <span>Total Inbound Tickets</span>
            <BarChart3 className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{stats.tickets.total}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            {stats.tickets.open} open • {stats.tickets.inProgress} in progress
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-rose-200 shadow-sm bg-gradient-to-br from-rose-50/40 to-white">
          <div className="flex items-center justify-between text-xs font-semibold text-rose-800 uppercase">
            <span>Critical Unresolved</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-600">{stats.tickets.criticalUnresolved}</div>
          <div className="text-[11px] text-rose-800/80 mt-1">Requiring immediate 48-hr SLA resolution</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase">
            <span>Resolved Queries</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600">{stats.tickets.resolved}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            {stats.tickets.total > 0
              ? `${Math.round((stats.tickets.resolved / stats.tickets.total) * 100)}% resolution rate`
              : '0%'}
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-amber-200 shadow-sm bg-gradient-to-br from-amber-50/40 to-white">
          <div className="flex items-center justify-between text-xs font-semibold text-amber-800 uppercase">
            <span>Total Catalog Royalty Pending</span>
            <DollarSign className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-700">
            ₹{stats.catalog.totalPendingRoyalties.toLocaleString()}
          </div>
          <div className="text-[11px] text-amber-800/80 mt-1">Across 10 registered authors</div>
        </div>
      </div>

      {/* Oldest Unresolved Ticket Alert (Assignment Requirement B) */}
      {stats.oldestUnresolved && (
        <div className="p-5 bg-amber-50 border border-amber-300 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start space-x-3">
            <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                Oldest Unresolved Backlog Item
              </div>
              <div className="text-sm font-bold text-slate-900 mt-0.5">
                {stats.oldestUnresolved.subject}
              </div>
              <div className="text-xs text-slate-600 mt-1">
                Ticket <span className="font-mono font-semibold">{stats.oldestUnresolved.ticket_id}</span> • Open for{' '}
                <strong>{stats.oldestUnresolved.days_open} days</strong> • Priority:{' '}
                <span className="font-bold text-rose-700">{stats.oldestUnresolved.priority}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => onOpenTicket(stats.oldestUnresolved!.ticket_id)}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition whitespace-nowrap self-stretch sm:self-auto justify-center"
          >
            <span>Address Ticket</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Grid: Category Breakdown + Priority Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Category Distribution */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center">
            <Layers className="w-4 h-4 mr-2 text-blue-600" />
            Ticket Volume by Category
          </h3>

          <div className="space-y-3">
            {stats.categoryBreakdown.map((item) => {
              const pct = stats.tickets.total > 0 ? (item.count / stats.tickets.total) * 100 : 0;
              return (
                <div key={item.category} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium text-slate-700">
                    <span>{item.category}</span>
                    <span className="font-bold text-slate-900">
                      {item.count} ({Math.round(pct)}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Priority Breakdown */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center">
            <AlertTriangle className="w-4 h-4 mr-2 text-amber-500" />
            Tickets by Priority Level
          </h3>

          <div className="space-y-3">
            {stats.priorityBreakdown.map((item) => {
              const pct = stats.tickets.total > 0 ? (item.count / stats.tickets.total) * 100 : 0;
              const color =
                item.priority === 'Critical'
                  ? 'bg-rose-500'
                  : item.priority === 'High'
                  ? 'bg-amber-500'
                  : item.priority === 'Medium'
                  ? 'bg-blue-500'
                  : 'bg-slate-400';

              return (
                <div key={item.priority} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium text-slate-700">
                    <span className="font-semibold">{item.priority}</span>
                    <span className="font-bold text-slate-900">
                      {item.count} ({Math.round(pct)}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`${color} h-2 rounded-full transition-all`}
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
