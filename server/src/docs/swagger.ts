export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'BookLeaf Publishing — Author Support & Communication API',
    version: '1.0.0',
    description: `Production-ready REST API for BookLeaf Publishing's Author Support & Communication Portal.
Features role-based access control (RBAC), AI-powered auto-classification, priority scoring, automated knowledge-base response drafting, real-time Server-Sent Events (SSE), and author book/royalty analytics.`,
    contact: {
      name: 'BookLeaf Engineering Team',
      email: 'support@bookleafpub.com',
    },
  },
  servers: [
    {
      url: '/api',
      description: 'Default API Server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Provide JWT token obtained from /api/auth/login or /api/auth/switch',
      },
    },
    schemas: {
      Author: {
        type: 'object',
        properties: {
          author_id: { type: 'string', example: 'AUTH001' },
          name: { type: 'string', example: 'Priya Sharma' },
          email: { type: 'string', example: 'priya.sharma@email.com' },
          phone: { type: 'string', example: '+91-98765-43210' },
          city: { type: 'string', example: 'Mumbai' },
          role: { type: 'string', example: 'author' },
          joined_date: { type: 'string', example: '2023-03-15' },
        },
      },
      Book: {
        type: 'object',
        properties: {
          book_id: { type: 'string', example: 'BK001' },
          author_id: { type: 'string', example: 'AUTH001' },
          title: { type: 'string', example: 'Whispers of the Ganges' },
          isbn: { type: 'string', example: '978-93-5XXXX-01-1' },
          genre: { type: 'string', example: 'Literary Fiction' },
          publication_date: { type: 'string', example: '2023-06-20' },
          status: { type: 'string', example: 'Published & Live' },
          mrp: { type: 'number', example: 399 },
          author_royalty_per_copy: { type: 'number', example: 35 },
          total_copies_sold: { type: 'integer', example: 342 },
          total_royalty_earned: { type: 'number', example: 11970 },
          royalty_paid: { type: 'number', example: 8400 },
          royalty_pending: { type: 'number', example: 3570 },
          last_royalty_payout_date: { type: 'string', example: '2025-10-15' },
          print_partner: { type: 'string', example: 'In-House' },
          available_on: {
            type: 'array',
            items: { type: 'string' },
            example: ['Amazon India', 'Flipkart', 'BookLeaf Store'],
          },
        },
      },
      Ticket: {
        type: 'object',
        properties: {
          ticket_id: { type: 'string', example: 'TCK-1001' },
          author_id: { type: 'string', example: 'AUTH001' },
          book_id: { type: 'string', nullable: true, example: 'BK001' },
          subject: { type: 'string', example: 'Discrepancy in quarterly royalty payout' },
          description: { type: 'string', example: 'I published my book 4 months ago and have not received royalty...' },
          category: {
            type: 'string',
            enum: [
              'Royalty & Payments',
              'ISBN & Metadata Issues',
              'Printing & Quality',
              'Distribution & Availability',
              'Book Status & Production Updates',
              'General Inquiry',
            ],
            example: 'Royalty & Payments',
          },
          ai_category: { type: 'string', example: 'Royalty & Payments' },
          priority: {
            type: 'string',
            enum: ['Critical', 'High', 'Medium', 'Low'],
            example: 'Critical',
          },
          ai_priority: { type: 'string', example: 'Critical' },
          ai_reasoning: { type: 'string', example: 'Author reports delayed royalty payout > 4 months' },
          ai_draft_response: { type: 'string' },
          status: {
            type: 'string',
            enum: ['Open', 'In Progress', 'Resolved', 'Closed'],
            example: 'Open',
          },
          assigned_to: { type: 'string', nullable: true },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
        },
      },
      Message: {
        type: 'object',
        properties: {
          message_id: { type: 'string' },
          ticket_id: { type: 'string' },
          sender_type: { type: 'string', enum: ['author', 'admin', 'system'] },
          sender_name: { type: 'string' },
          content: { type: 'string' },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      InternalNote: {
        type: 'object',
        properties: {
          note_id: { type: 'string' },
          ticket_id: { type: 'string' },
          admin_id: { type: 'string' },
          admin_name: { type: 'string' },
          content: { type: 'string' },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
  paths: {
    '/auth/login': {
      post: {
        summary: 'User Login (Email & Password)',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', example: 'priya.sharma@email.com' },
                  password: { type: 'string', example: 'author123' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Authenticated successfully with JWT token' },
          400: { description: 'Validation error' },
          401: { description: 'Invalid credentials' },
        },
      },
    },
    '/auth/me': {
      get: {
        summary: 'Get Current Authenticated Profile',
        tags: ['Authentication'],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Current user profile data' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/auth/switch': {
      post: {
        summary: 'Demo Account Switcher (Evaluator 1-Click Login)',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['id'],
                properties: {
                  id: { type: 'string', example: 'AUTH001' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Switched account and returned JWT token' },
        },
      },
    },
    '/authors/me/books': {
      get: {
        summary: 'Get Authenticated Author Published Books & Royalty Metrics',
        tags: ['Author Portal'],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'List of author books and financial calculations' },
          403: { description: 'Author role required' },
        },
      },
    },
    '/tickets': {
      get: {
        summary: 'List Tickets (Filtered & Sorted)',
        description: 'Authors retrieve their tickets; Admins retrieve all tickets across authors with priority/status filtering.',
        tags: ['Tickets'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'category', in: 'query', schema: { type: 'string' } },
          { name: 'priority', in: 'query', schema: { type: 'string' } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'sort', in: 'query', schema: { type: 'string', enum: ['urgent_first', 'newest', 'oldest'] } },
        ],
        responses: {
          200: { description: 'List of matching tickets' },
        },
      },
      post: {
        summary: 'Raise New Support Ticket (Triggers AI Classification & Priority)',
        tags: ['Tickets'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['subject', 'description'],
                properties: {
                  subject: { type: 'string', example: 'I sold 200 copies but received only ₹3,000' },
                  description: { type: 'string', example: 'My royalty amount seems lower than expected. Could you explain the calculation?' },
                  book_id: { type: 'string', example: 'BK001' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Ticket created and AI-classified' },
          400: { description: 'Input validation failed' },
        },
      },
    },
    '/tickets/{id}': {
      get: {
        summary: 'Get Ticket Details & Conversation Thread',
        tags: ['Tickets'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Ticket details, message thread, author details, and internal notes (if admin)' },
          403: { description: 'Forbidden (Authors cannot view other authors tickets)' },
          404: { description: 'Ticket not found' },
        },
      },
      patch: {
        summary: 'Update Ticket (Status, Assignee, Category & Priority Override)',
        tags: ['Admin Management'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', enum: ['Open', 'In Progress', 'Resolved', 'Closed'] },
                  category: { type: 'string' },
                  priority: { type: 'string', enum: ['Critical', 'High', 'Medium', 'Low'] },
                  assigned_to: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Ticket updated successfully' },
        },
      },
    },
    '/tickets/{id}/messages': {
      post: {
        summary: 'Add Message to Ticket Thread (Real-Time Push to Author/Admin)',
        tags: ['Tickets'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['content'],
                properties: {
                  content: { type: 'string', example: 'We have verified your query and escalated to finance.' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Message added and broadcast via SSE' },
        },
      },
    },
    '/tickets/{id}/notes': {
      post: {
        summary: 'Add Internal Ops Note (Admin Only - Hidden from Author)',
        tags: ['Admin Management'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['content'],
                properties: {
                  content: { type: 'string', example: 'Author bank IFSC was mismatched on Axis Bank portal. Finance re-queuing.' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Internal note saved' },
        },
      },
    },
    '/tickets/{id}/ai-draft': {
      get: {
        summary: 'Fetch AI-Generated Response Draft',
        tags: ['AI Assistance'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'AI drafted response based on Knowledge Base & Author record' },
        },
      },
    },
    '/tickets/{id}/ai-draft/regenerate': {
      post: {
        summary: 'Regenerate AI Draft with Admin Guidance',
        tags: ['AI Assistance'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  custom_instructions: { type: 'string', example: 'Include coupon code REPRINTFREE' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Regenerated draft response' },
        },
      },
    },
    '/realtime/events': {
      get: {
        summary: 'Server-Sent Events (SSE) Real-Time Stream',
        description: 'Establishes continuous SSE channel for instant ticket updates and messages without polling.',
        tags: ['Real-Time'],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'text/event-stream open' },
        },
      },
    },
    '/admin/stats': {
      get: {
        summary: 'Admin Executive Metrics & SLA Health',
        tags: ['Admin Management'],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Ticket volume, categories, SLA compliance, pending royalties' },
        },
      },
    },
  },
};
