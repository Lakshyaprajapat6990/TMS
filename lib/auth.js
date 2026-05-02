import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

export function verifyToken(req) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

export function requireAuth(req, res) {
  const user = verifyToken(req);
  if (!user) {
    res.status(401).json({ message: 'Unauthorized. Please log in.' });
    return null;
  }
  return user;
}

export function requireSuperAdmin(req, res) {
  const user = verifyToken(req);
  if (!user) {
    res.status(401).json({ message: 'Unauthorized. Please log in.' });
    return null;
  }
  if (user.role !== 'superadmin') {
    res.status(403).json({ message: 'Forbidden. Super admin access required.' });
    return null;
  }
  return user;
}

/**
 * Returns the effective owner ID for a query.
 * - Regular users: always their own _id
 * - Superadmin: uses ?userId query param if provided, otherwise their own _id
 * Returns a string suitable for Mongoose queries (Mongoose auto-casts to ObjectId).
 * Returns null if superadmin and no userId param (caller should handle: show all or restrict).
 */
export function resolveOwner(authUser, req) {
  if (authUser.role !== 'superadmin') {
    return authUser._id;
  }
  // Superadmin with a specific user selected
  const userId = req.query?.userId;
  if (userId && mongoose.Types.ObjectId.isValid(userId)) {
    return userId;
  }
  // Superadmin with no user selected — return own id (they have no data, but keeps things safe)
  return authUser._id;
}
