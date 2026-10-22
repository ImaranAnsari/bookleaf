import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  BookOpen,
  HelpCircle,
  ListTodo,
  Shield,
  BarChart3,
  Users,
  LogOut,
  ChevronDown,
  Sparkles,
  Radio,
} from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  openTicketCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onTabChange, openTicketCount = 0 }) => {
  const { user, logout, quickSwitch } = useAuth();
  const [demoAccounts, setDemoAccounts] = useState<any>({ admins: [], authors: [] });
  const [showSwitchMenu, setShowSwitchMenu] = useState(false);

  useEffect(() => {
    api.getDemoAccounts().then((res) => {
      if (res.success) {
        setDemoAccounts(res.data);
      }
    }).catch(console.error);
  }, []);

  const isAuthor = user?.role === 'author';
  const isAdmin = user?.role === 'admin';

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Title */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onTabChange(isAuthor ? 'books' : 'queue')}>
            <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-slate-950 font-black shadow-inner">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold tracking-tight text-lg text-white">BOOKLEAF</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-400/30">
                  {isAdmin ? 'OPERATIONS' : 'AUTHOR PORTAL'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Author Support & Communication System</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1">
            {isAuthor ? (
              <>
                <button
                  onClick={() => onTabChange('books')}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition ${
                    currentTab === 'books'
                      ? 'bg-amber-500 text-slate-950 font-semibold shadow'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  <span>My Books</span>
                </button>
                <button
                  onClick={() => onTabChange('new-ticket')}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition ${
                    currentTab === 'new-ticket'
                      ? 'bg-amber-500 text-slate-950 font-semibold shadow'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <HelpCircle className="w-4 h-4" />
                  <span>Submit Support Query</span>
                </button>
                <button
                  onClick={() => onTabChange('my-tickets')}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition relative ${
                    currentTab === 'my-tickets'
                      ? 'bg-amber-500 text-slate-950 font-semibold shadow'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <ListTodo className="w-4 h-4" />
                  <span>My Tickets</span>
                  {openTicketCount > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs bg-rose-500 text-white rounded-full font-bold">
                      {openTicketCount}
                    </span>
                  )}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => onTabChange('queue')}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition ${
                    currentTab === 'queue'
                      ? 'bg-blue-600 text-white font-semibold shadow'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <ListTodo className="w-4 h-4" />
                  <span>Ticket Queue</span>
                </button>
                <button
                  onClick={() => onTabChange('stats')}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition ${
                    currentTab === 'stats'
                      ? 'bg-blue-600 text-white font-semibold shadow'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>Queue Analytics</span>
                </button>
                <button
                  onClick={() => onTabChange('authors')}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition ${
                    currentTab === 'authors'
                      ? 'bg-blue-600 text-white font-semibold shadow'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Authors Directory</span>
                </button>
              </>
            )}
          </nav>

          {/* User Info & Quick Demo Switcher */}
          <div className="flex items-center space-x-3">
            {/* Live SSE Status Pill */}
            <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>LIVE SYNC</span>
            </div>

            {/* Quick Demo Switcher Button */}
            <div className="relative">
              <button
                onClick={() => setShowSwitchMenu(!showSwitchMenu)}
                className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs px-3 py-1.5 rounded-lg text-slate-200 transition"
                title="Switch demo account to test author & admin views"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-semibold text-white truncate max-w-[120px]">{user?.name}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 uppercase">
                  {user?.role}
                </span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {/* Demo Account Switcher Dropdown */}
              {showSwitchMenu && (
                <div
                  className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-2 z-50 text-slate-200"
                  onMouseLeave={() => setShowSwitchMenu(false)}
                >
                  <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                    Switch Test Account (1-Click)
                  </div>

                  {/* Admins */}
                  <div className="px-3 pt-2 text-[10px] font-bold text-blue-400 uppercase">Admin Team</div>
                  {demoAccounts.admins?.map((admin: any) => (
                    <button
                      key={admin.admin_id}
                      onClick={() => {
                        quickSwitch(admin.admin_id);
                        setShowSwitchMenu(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-slate-800 ${
                        user?.id === admin.admin_id ? 'bg-blue-950/60 text-blue-300 font-semibold' : ''
                      }`}
                    >
                      <div>
                        <div className="font-medium text-white">{admin.name}</div>
                        <div className="text-[10px] text-slate-400">{admin.title}</div>
                      </div>
                      <Shield className="w-3.5 h-3.5 text-blue-400" />
                    </button>
                  ))}

                  {/* Authors */}
                  <div className="px-3 pt-2.5 text-[10px] font-bold text-amber-400 uppercase">Sample Authors</div>
                  <div className="max-h-48 overflow-y-auto">
                    {demoAccounts.authors?.map((author: any) => (
                      <button
                        key={author.author_id}
                        onClick={() => {
                          quickSwitch(author.author_id);
                          setShowSwitchMenu(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-slate-800 ${
                          user?.id === author.author_id ? 'bg-amber-950/60 text-amber-300 font-semibold' : ''
                        }`}
                      >
                        <div>
                          <div className="font-medium text-white">{author.name}</div>
                          <div className="text-[10px] text-slate-400">{author.city} • {author.author_id}</div>
                        </div>
                        <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                      </button>
                    ))}
                  </div>

                  <div className="border-t border-slate-800 mt-2 pt-1 px-3">
                    <button
                      onClick={() => {
                        logout();
                        setShowSwitchMenu(false);
                      }}
                      className="w-full text-left py-1.5 text-xs text-rose-400 hover:text-rose-300 flex items-center space-x-1.5"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Log Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
