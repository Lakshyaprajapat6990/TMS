const express = require('express');
const router = express.Router();
const Building = require('../models/Building');
const Flat = require('../models/Flat');
const Tenant = require('../models/Tenant');
const RentPayment = require('../models/RentPayment');

router.get('/', async (req, res) => {
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

    res.json({
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
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
