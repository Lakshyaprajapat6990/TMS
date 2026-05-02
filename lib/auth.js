import jwt from 'jsonwebtoken';

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
