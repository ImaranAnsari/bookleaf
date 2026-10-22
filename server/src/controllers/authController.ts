import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '../db/database.js';
import { generateToken, AuthUser } from '../middleware/auth.js';

const loginSchema = z.object({
  email: z.string().email('Please provide a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const login = (req: Request, res: Response): void => {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({
      success: false,
      error: result.error.issues[0]?.message || 'Invalid login details',
    });
    return;
  }

  const { email, password } = result.data;

  // 1. Check in admins table first
  const admin = db.prepare('SELECT * FROM admins WHERE email = ?').get(email) as any;
  if (admin) {
    const isMatch = bcrypt.compareSync(password, admin.password_hash) || password === 'admin123' || password === 'support123';
    if (!isMatch) {
      res.status(401).json({ success: false, error: 'Invalid password. For demo, use: admin123' });
      return;
    }

    const authUser: AuthUser = {
      id: admin.admin_id,
      admin_id: admin.admin_id,
      email: admin.email,
      name: admin.name,
      role: 'admin',
    };

    const token = generateToken(authUser);
    res.json({
      success: true,
      token,
      user: authUser,
      details: { title: admin.title },
    });
    return;
  }

  // 2. Check in authors table
  const author = db.prepare('SELECT * FROM authors WHERE email = ?').get(email) as any;
  if (author) {
    const isMatch = bcrypt.compareSync(password, author.password_hash) || password === 'author123';
    if (!isMatch) {
      res.status(401).json({ success: false, error: 'Invalid password. For demo, use: author123' });
      return;
    }

    const authUser: AuthUser = {
      id: author.author_id,
      author_id: author.author_id,
      email: author.email,
      name: author.name,
      role: 'author',
    };

    const token = generateToken(authUser);
    res.json({
      success: true,
      token,
      user: authUser,
      details: { city: author.city, phone: author.phone },
    });
    return;
  }

  res.status(404).json({
    success: false,
    error: 'Account not found. Please check your email or select one of the test accounts.',
  });
};

export const getMe = (req: Request, res: Response): void => {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Not authenticated' });
    return;
  }

  if (req.user.role === 'admin') {
    const admin = db.prepare('SELECT admin_id, name, email, role, title, created_at FROM admins WHERE admin_id = ?').get(req.user.id);
    res.json({ success: true, user: admin });
    return;
  }

  const author = db.prepare('SELECT author_id, name, email, phone, city, role, joined_date, created_at FROM authors WHERE author_id = ?').get(req.user.id);
  res.json({ success: true, user: author });
};

export const getDemoAccounts = (_req: Request, res: Response): void => {
  const authors = db.prepare('SELECT author_id, name, email, city FROM authors ORDER BY author_id ASC').all();
  const admins = db.prepare('SELECT admin_id, name, email, title FROM admins ORDER BY admin_id ASC').all();

  res.json({
    success: true,
    data: {
      admins,
      authors,
      defaultPasswords: {
        admin: 'admin123',
        author: 'author123',
      },
    },
  });
};

export const quickSwitch = (req: Request, res: Response): void => {
  const { id } = req.body;
  if (!id) {
    res.status(400).json({ success: false, error: 'User ID is required' });
    return;
  }

  // Check admin
  const admin = db.prepare('SELECT * FROM admins WHERE admin_id = ?').get(id) as any;
  if (admin) {
    const authUser: AuthUser = {
      id: admin.admin_id,
      admin_id: admin.admin_id,
      email: admin.email,
      name: admin.name,
      role: 'admin',
    };
    const token = generateToken(authUser);
    res.json({ success: true, token, user: authUser });
    return;
  }

  // Check author
  const author = db.prepare('SELECT * FROM authors WHERE author_id = ?').get(id) as any;
  if (author) {
    const authUser: AuthUser = {
      id: author.author_id,
      author_id: author.author_id,
      email: author.email,
      name: author.name,
      role: 'author',
    };
    const token = generateToken(authUser);
    res.json({ success: true, token, user: authUser });
    return;
  }

  res.status(404).json({ success: false, error: 'Account not found' });
};
