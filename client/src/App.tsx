import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { LoginModal } from './components/LoginModal';
import { MyBooks } from './components/author/MyBooks';
import { SubmitTicket } from './components/author/SubmitTicket';
import { MyTickets } from './components/author/MyTickets';
import { TicketQueue } from './components/admin/TicketQueue';
import { TicketDetail } from './components/admin/TicketDetail';
import { AdminStats } from './components/admin/AdminStats';
import { AuthorCatalog } from './components/admin/AuthorCatalog';

function MainApp() {
  const { user, loading } = useAuth();
  const [authorTab, setAuthorTab] = useState<'books' | 'new-ticket' | 'my-tickets'>('books');
  const [adminTab, setAdminTab] = useState<'queue' | 'stats' | 'authors'>('queue');
  const [selectedBookForTicket, setSelectedBookForTicket] = useState<string | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-400 text-sm font-semibold tracking-wide">
          Initializing BookLeaf Publishing Portal...
        </p>
      </div>
    );
  }

  if (!user) {
    return <LoginModal />;
  }

  const isAuthor = user.role === 'author';

  const handleTabChange = (tab: string) => {
    if (isAuthor) {
      setAuthorTab(tab as any);
    } else {
      setAdminTab(tab as any);
      if (tab !== 'queue') {
        setSelectedTicketId(null);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans">
      {/* Top Navigation */}
      <Navbar
        currentTab={isAuthor ? authorTab : adminTab}
        onTabChange={handleTabChange}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isAuthor ? (
          <>
            {authorTab === 'books' && (
              <MyBooks
                onRaiseTicketForBook={(bookId) => {
                  setSelectedBookForTicket(bookId);
                  setAuthorTab('new-ticket');
                }}
              />
            )}

            {authorTab === 'new-ticket' && (
              <SubmitTicket
                initialBookId={selectedBookForTicket}
                onTicketSubmitted={() => {
                  setSelectedBookForTicket(null);
                  setAuthorTab('my-tickets');
                }}
              />
            )}

            {authorTab === 'my-tickets' && <MyTickets />}
          </>
        ) : (
          <>
            {adminTab === 'queue' && (
              selectedTicketId ? (
                <TicketDetail
                  ticketId={selectedTicketId}
                  onBack={() => setSelectedTicketId(null)}
                />
              ) : (
                <TicketQueue
                  onSelectTicket={(ticketId) => setSelectedTicketId(ticketId)}
                  selectedTicketId={selectedTicketId}
                />
              )
            )}

            {adminTab === 'stats' && (
              <AdminStats
                onOpenTicket={(ticketId) => {
                  setSelectedTicketId(ticketId);
                  setAdminTab('queue');
                }}
              />
            )}

            {adminTab === 'authors' && <AuthorCatalog />}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© 2026 BookLeaf Publishing. Author Support & Communication Portal.</p>
          <div className="flex items-center space-x-4">
            <a href="/api/docs" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline font-semibold">
              📚 Swagger API Docs
            </a>
            <span>•</span>
            <span className="font-mono text-slate-400">Node v22 • React 19 • TypeScript</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
