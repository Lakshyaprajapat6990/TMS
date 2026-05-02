import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../lib/models.js';
import { requireAuth } from '../lib/auth.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
  'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization',
};

let isConnected = false;
async function connectDB() {
  if (isConnected && mongoose.connection.readyState === 1) return;
  await mongoose.connect(process.env.MONGO_URI);
  isConnected = true;
}

export default async function handler(req, res) {
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    await connectDB();

    const urlParts = req.url.split('/');
    const lastPart = urlParts[urlParts.length - 1].split('?')[0];

    // POST /api/auth/login
    if (req.method === 'POST' && lastPart === 'login') {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
      }
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user || !user.isActive) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      const token = jwt.sign(
        { _id: user._id.toString(), email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      return res.status(200).json({
        token,
        user: { _id: user._id, name: user.name, email: user.email, role: user.role },
      });
    }

    // POST /api/auth/change-password
    if (req.method === 'POST' && lastPart === 'change-password') {
      const authUser = requireAuth(req, res);
      if (!authUser) return;
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'currentPassword and newPassword are required' });
      }
      const user = await User.findById(authUser._id);
      if (!user) return res.status(404).json({ message: 'User not found' });
      const valid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!valid) return res.status(400).json({ message: 'Current password is incorrect' });
      user.passwordHash = await bcrypt.hash(newPassword, 12);
      await user.save();
      return res.status(200).json({ message: 'Password changed successfully' });
    }

    return res.status(404).json({ message: 'Not found' });
  } catch (err) {
    console.error('Auth API Error:', err);
    return res.status(500).json({ message: err.message });
  }
}
