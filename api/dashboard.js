import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import Building from '../server/models/Building.js';
import Flat from '../server/models/Flat.js';
import Tenant from '../server/models/Tenant.js';
import RentPayment from '../server/models/RentPayment.js';

const app = express();
app.use(cors());
app.use(express.json());

let isConnected = false;

async function connectDB() {
  if (isConnected) return;
  try {
    await mongoose.connect(process.env.MONGO_URI);
    isConnected = true;
  } catch (err) {
    console.error('MongoDB connection error:', err);
    throw err;
  }
}

app.get('/api/dashboard', async (req, res) => {
  try {
    await connectDB();
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

    const pendingAgg = await RentPayment.aggregate([
      { $match: { status: { $in: ['pending', 'overdue'] } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    const recentPayments = await RentPayment.find({ status: 'paid' })
      .sort({ paidDate: -1 })
      .limit(5)
      .populate('tenant', 'name')
      .populate('flat', 'flatNumber')
      .populate('building', 'name');

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

export default app;
