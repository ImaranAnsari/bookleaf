import { Book, BookSummary, Ticket, TicketMessage, TicketInternalNote, AdminStats, User } from '../types';

const API_BASE = '/api';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('bookleaf_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(data.error || `HTTP error ${response.status}`, response.status);
  }

  return data;
}

export const api = {
  // Auth
  async login(email: string, password: string): Promise<{ success: boolean; token: string; user: User }> {
    return request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  async getMe(): Promise<{ success: boolean; user: User }> {
    return request('/auth/me');
  },

  async getDemoAccounts(): Promise<{
    success: boolean;
    data: {
      admins: { admin_id: string; name: string; email: string; title: string }[];
      authors: { author_id: string; name: string; email: string; city: string }[];
      defaultPasswords: { admin: string; author: string };
    };
  }> {
    return request('/auth/demo-accounts');
  },

  async switchAccount(id: string): Promise<{ success: boolean; token: string; user: User }> {
    return request('/auth/switch', {
      method: 'POST',
      body: JSON.stringify({ id }),
    });
  },

  // Author Books
  async getMyBooks(): Promise<{ success: boolean; data: { books: Book[]; summary: BookSummary } }> {
    return request('/authors/me/books');
  },

  // Tickets
  async getTickets(params: {
    status?: string;
    category?: string;
    priority?: string;
    search?: string;
    sort?: string;
  } = {}): Promise<{ success: boolean; data: Ticket[]; count: number }> {
    const query = new URLSearchParams();
    if (params.status) query.set('status', params.status);
    if (params.category) query.set('category', params.category);
    if (params.priority) query.set('priority', params.priority);
    if (params.search) query.set('search', params.search);
    if (params.sort) query.set('sort', params.sort);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    return request(`/tickets${queryString}`);
  },

  async getTicketById(id: string): Promise<{ success: boolean; data: Ticket }> {
    return request(`/tickets/${id}`);
  },

  async createTicket(payload: {
    subject: string;
    description: string;
    book_id?: string | null;
    attachment_name?: string | null;
    attachment_url?: string | null;
  }): Promise<{ success: boolean; data: Ticket; meta: any }> {
    return request('/tickets', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateTicket(
    id: string,
    updates: {
      status?: string;
      category?: string;
      priority?: string;
      assigned_to?: string | null;
    }
  ): Promise<{ success: boolean; data: Ticket }> {
    return request(`/tickets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  async addMessage(id: string, content: string): Promise<{ success: boolean; data: TicketMessage }> {
    return request(`/tickets/${id}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  },

  async addInternalNote(id: string, content: string): Promise<{ success: boolean; data: TicketInternalNote }> {
    return request(`/tickets/${id}/notes`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  },

  async getAIDraft(id: string, force = false): Promise<{ success: boolean; data: { draft: string; cached: boolean; provider?: string } }> {
    return request(`/tickets/${id}/ai-draft${force ? '?force=true' : ''}`);
  },

  async regenerateAIDraft(id: string, customInstructions?: string): Promise<{ success: boolean; data: { draft: string; provider: string } }> {
    return request(`/tickets/${id}/ai-draft/regenerate`, {
      method: 'POST',
      body: JSON.stringify({ custom_instructions: customInstructions }),
    });
  },

  // Admin Stats
  async getAdminStats(): Promise<{ success: boolean; data: AdminStats }> {
    return request('/admin/stats');
  },
};
