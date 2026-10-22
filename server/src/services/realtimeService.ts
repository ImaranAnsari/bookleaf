import { Response } from 'express';

interface SSEClient {
  id: string;
  res: Response;
  role: 'author' | 'admin';
  authorId?: string;
}

class RealtimeService {
  private clients: Map<string, SSEClient> = new Map();

  addClient(id: string, res: Response, role: 'author' | 'admin', authorId?: string) {
    this.clients.set(id, { id, res, role, authorId });

    // Send initial ping
    res.write(`data: ${JSON.stringify({ type: 'CONNECTED', clientId: id, timestamp: new Date().toISOString() })}\n\n`);

    res.on('close', () => {
      this.clients.delete(id);
    });
  }

  broadcast(event: string, payload: any, targetAuthorId?: string) {
    const data = JSON.stringify({ type: event, payload, timestamp: new Date().toISOString() });

    for (const client of this.clients.values()) {
      // Admins receive all events; Authors receive events intended for them or global
      if (client.role === 'admin' || (targetAuthorId && client.authorId === targetAuthorId) || !targetAuthorId) {
        try {
          client.res.write(`event: ${event}\ndata: ${data}\n\n`);
        } catch (err) {
          console.error('[RealtimeService] Error writing to client', client.id, err);
          this.clients.delete(client.id);
        }
      }
    }
  }

  // Heartbeat to keep connections alive
  startHeartbeat() {
    setInterval(() => {
      const ping = `: ping\n\n`;
      for (const client of this.clients.values()) {
        try {
          client.res.write(ping);
        } catch {
          this.clients.delete(client.id);
        }
      }
    }, 30000);
  }
}

export const realtimeService = new RealtimeService();
realtimeService.startHeartbeat();
