import dbConnect from '../lib/mongodb';
import Building from '../server/models/Building.js';
import Flat from '../server/models/Flat.js';
import Tenant from '../server/models/Tenant.js';
import RentPayment from '../server/models/RentPayment.js';

export default async function handler(req, res) {
  await dbConnect();

  const { method } = req;

  if (method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${method} Not Allowed`);
  }

  try {
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
      Building.countDocuments(),
      Flat.countDocuments(),
      Flat.countDocuments({ status: 'occupied' }),
      Flat.countDocuments({ status: 'vacant' }),
      Tenant.countDocuments({ isActive: true }),
      RentPayment.countDocuments({ status: 'pending' }),
      RentPayment.countDocuments({ status: 'overdue' }),
      RentPayment.countDocuments({ status: 'paid', month: thisMonth, year: thisYear }),
    ]);

    // Total pending amount
    const pendingAgg = await RentPayment.aggregate([
      { $match: { status: { $in: ['pending', 'overdue'] } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    // Recent 5 paid payments
    const recentPayments = await RentPayment.find({ status: 'paid' })
      .sort({ paidDate: -1 })
      .limit(5)
      .populate('tenant', 'name')
      .populate('flat', 'flatNumber')
      .populate('building', 'name');

    // Due in next 7 days
    const upcomingDue = await RentPayment.find({
      status: 'pending',
      dueDate: { $gte: now, $lte: sevenDaysFromNow },
    })
      .sort({ dueDate: 1 })
      .limit(5)
      .populate('tenant', 'name')
      .populate('flat', 'flatNumber')
      .populate('building', 'name');

    return res.json({
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
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

