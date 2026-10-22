import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export interface RealtimeHandlers {
  onTicketCreated?: (ticket: any) => void;
  onTicketUpdated?: (ticket: any) => void;
  onMessageCreated?: (message: any) => void;
  onNoteCreated?: (note: any) => void;
}

export function useRealtime(handlers: RealtimeHandlers) {
  const { token, user } = useAuth();

  useEffect(() => {
    if (!token || !user) return;

    const eventSource = new EventSource(`/api/realtime/events?token=${encodeURIComponent(token)}`);

    eventSource.addEventListener('ticket:created', (e) => {
      try {
        const parsed = JSON.parse(e.data);
        handlers.onTicketCreated?.(parsed.payload);
      } catch (err) {
        console.error('[SSE] Failed to parse ticket:created', err);
      }
    });

    eventSource.addEventListener('ticket:updated', (e) => {
      try {
        const parsed = JSON.parse(e.data);
        handlers.onTicketUpdated?.(parsed.payload);
      } catch (err) {
        console.error('[SSE] Failed to parse ticket:updated', err);
      }
    });

    eventSource.addEventListener('message:created', (e) => {
      try {
        const parsed = JSON.parse(e.data);
        handlers.onMessageCreated?.(parsed.payload);
      } catch (err) {
        console.error('[SSE] Failed to parse message:created', err);
      }
    });

    eventSource.addEventListener('note:created', (e) => {
      try {
        const parsed = JSON.parse(e.data);
        handlers.onNoteCreated?.(parsed.payload);
      } catch (err) {
        console.error('[SSE] Failed to parse note:created', err);
      }
    });

    eventSource.onerror = (err) => {
      // EventSource automatically attempts reconnection
      console.warn('[SSE] EventSource connection issue:', err);
    };

    return () => {
      eventSource.close();
    };
  }, [token, user?.id]);
}
