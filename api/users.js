import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User, Building, Flat, Tenant, RentPayment } from '../lib/models.js';
import { requireSuperAdmin } from '../lib/auth.js';

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

  const admin = requireSuperAdmin(req, res);
  if (!admin) return;

  try {
    await connectDB();

    const urlParts = req.url.split('/');
    const lastPart = urlParts[urlParts.length - 1].split('?')[0];
    const id = lastPart !== 'users' && mongoose.Types.ObjectId.isValid(lastPart) ? lastPart : null;

    if (req.method === 'GET') {
      const users = await User.find({ role: 'user' })
        .select('-passwordHash')
        .sort({ createdAt: -1 });
      return res.status(200).json(users);
    }

    if (req.method === 'POST') {
      const { name, email, password } = req.body;
      if (!name || !email || !password) {
        return res.status(400).json({ message: 'name, email, and password are required' });
      }
      const existing = await User.findOne({ email: email.toLowerCase() });
      if (existing) return res.status(400).json({ message: 'Email already in use' });
      const passwordHash = await bcrypt.hash(password, 12);
      const user = await User.create({ name, email, passwordHash, role: 'user' });
      const { passwordHash: _, ...safeUser } = user.toObject();
      return res.status(201).json(safeUser);
    }

    if (req.method === 'PUT') {
      if (!id) return res.status(400).json({ message: 'User ID required' });
      const { name, isActive } = req.body;
      const updateFields = {};
      if (name !== undefined) updateFields.name = name;
      if (isActive !== undefined) updateFields.isActive = isActive;
      const user = await User.findByIdAndUpdate(id, updateFields, { new: true, runValidators: true })
        .select('-passwordHash');
      if (!user) return res.status(404).json({ message: 'User not found' });
      return res.status(200).json(user);
    }

    if (req.method === 'DELETE') {
      if (!id) return res.status(400).json({ message: 'User ID required' });
      await Promise.all([
        RentPayment.deleteMany({ owner: id }),
        Tenant.deleteMany({ owner: id }),
        Flat.deleteMany({ owner: id }),
        Building.deleteMany({ owner: id }),
      ]);
      await User.findByIdAndDelete(id);
      return res.status(200).json({ message: 'User and all their data deleted' });
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (err) {
    console.error('Users API Error:', err);
    return res.status(500).json({ message: err.message });
  }
}
