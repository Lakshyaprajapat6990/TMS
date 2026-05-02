import mongoose from 'mongoose';
import { Building, Flat, Tenant, RentPayment } from '../lib/models.js';
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

    const authUser = requireAuth(req, res);
    if (!authUser) return;

    // Superadmin sees platform-wide stats; regular users see only their own data
    const ownerFilter = authUser.role === 'superadmin' ? {} : { owner: authUser._id };
    const ownerObjectId = authUser.role === 'superadmin' ? null : new mongoose.Types.ObjectId(authUser._id);

    if (req.method === 'GET') {
      const now = new Date();
      const thisMonth = now.getMonth() + 1;
      const thisYear = now.getFullYear();
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const [
        totalBuildings,
        totalFlats,
        occupiedFlats,
        vacantFlats,
        totalTenants,
        pendingRents,
        overdueRents,
        paidThisMonth,
      ] = await Promise.all([
        Building.countDocuments(ownerFilter),
        Flat.countDocuments(ownerFilter),
        Flat.countDocuments({ ...ownerFilter, status: 'occupied' }),
        Flat.countDocuments({ ...ownerFilter, status: 'vacant' }),
        Tenant.countDocuments({ ...ownerFilter, isActive: true }),
        RentPayment.countDocuments({ ...ownerFilter, status: 'pending' }),
        RentPayment.countDocuments({ ...ownerFilter, status: 'overdue' }),
        RentPayment.countDocuments({ ...ownerFilter, status: 'paid', month: thisMonth, year: thisYear }),
      ]);

      const aggMatch = ownerObjectId
        ? { status: { $in: ['pending', 'overdue'] }, owner: ownerObjectId }
        : { status: { $in: ['pending', 'overdue'] } };

      const pendingAgg = await RentPayment.aggregate([
        { $match: aggMatch },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]);

      const recentPayments = await RentPayment.find({ ...ownerFilter, status: 'paid' })
        .sort({ paidDate: -1 })
        .limit(5)
        .populate('tenant', 'name')
        .populate('flat', 'flatNumber')
        .populate('building', 'name');

      const upcomingDue = await RentPayment.find({
        ...ownerFilter,
        status: 'pending',
        dueDate: { $gte: now, $lte: sevenDaysFromNow },
      })
        .sort({ dueDate: 1 })
        .limit(5)
        .populate('tenant', 'name')
        .populate('flat', 'flatNumber')
        .populate('building', 'name');

      return res.status(200).json({
        totalBuildings,
        totalFlats,
        occupiedFlats,
        vacantFlats,
        totalTenants,
        pendingRents,
        overdueRents,
        paidThisMonth,
        pendingAmount: pendingAgg[0]?.total || 0,
        recentPayments,
        upcomingDue,
      });
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (err) {
    console.error('API Error:', err);
    return res.status(500).json({ message: err.message });
  }
}
