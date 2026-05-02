import mongoose from 'mongoose';
import { Tenant, RentPayment } from '../lib/models.js';
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
    const ownerId = authUser._id;

    const urlParts = req.url.split('/');
    const lastPart = urlParts[urlParts.length - 1].split('?')[0];
    const secondLast = urlParts[urlParts.length - 2];

    let id = null;
    let isPay = false;
    let isGenerate = false;
    let isTenantPayments = false;
    let tenantId = null;

    if (lastPart === 'pay' && mongoose.Types.ObjectId.isValid(secondLast)) {
      id = secondLast;
      isPay = true;
    } else if (lastPart === 'generate') {
      isGenerate = true;
    } else if (secondLast === 'tenant' && mongoose.Types.ObjectId.isValid(lastPart)) {
      tenantId = lastPart;
      isTenantPayments = true;
    } else if (lastPart !== 'rent' && mongoose.Types.ObjectId.isValid(lastPart)) {
      id = lastPart;
    }

    if (req.method === 'GET') {
      if (isTenantPayments) {
        const payments = await RentPayment.find({ tenant: tenantId, owner: ownerId })
          .populate('flat', 'flatNumber')
          .populate('building', 'name')
          .sort({ year: -1, month: -1 });
        return res.status(200).json(payments);
      }

      const query = { owner: ownerId };
      if (req.query.tenant) query.tenant = req.query.tenant;
      if (req.query.building) query.building = req.query.building;
      if (req.query.status) query.status = req.query.status;
      if (req.query.month) query.month = Number(req.query.month);
      if (req.query.year) query.year = Number(req.query.year);

      const payments = await RentPayment.find(query)
        .populate('tenant', 'name phone')
        .populate('flat', 'flatNumber')
        .populate('building', 'name')
        .sort({ dueDate: -1 });
      return res.status(200).json(payments);
    }

    if (req.method === 'POST') {
      if (isGenerate) {
        const { month, year } = req.body;
        if (!month || !year) {
          return res.status(400).json({ message: 'month and year are required' });
        }

        const activeTenants = await Tenant.find({ isActive: true, owner: ownerId });
        const createdPayments = [];

        for (const tenant of activeTenants) {
          const existing = await RentPayment.findOne({ tenant: tenant._id, month, year, owner: ownerId });
          if (!existing) {
            const dueDate = new Date(year, month - 1, tenant.rentDueDay || 1);
            const now = new Date();
            const status = dueDate < now ? 'overdue' : 'pending';

            const payment = await RentPayment.create({
              tenant: tenant._id,
              flat: tenant.flat,
              building: tenant.building,
              amount: tenant.rentAmount,
              dueDate,
              status,
              month,
              year,
              owner: ownerId,
            });
            createdPayments.push(payment);
          }
        }

        return res.status(201).json({
          created: createdPayments.length,
          skipped: activeTenants.length - createdPayments.length,
          payments: createdPayments,
        });
      }

      const payment = new RentPayment({
        tenant: req.body.tenant,
        flat: req.body.flat,
        building: req.body.building,
        amount: req.body.amount,
        dueDate: req.body.dueDate,
        paidDate: req.body.paidDate,
        status: req.body.status || 'pending',
        month: req.body.month,
        year: req.body.year,
        notes: req.body.notes,
        owner: ownerId,
      });

      const newPayment = await payment.save();
      return res.status(201).json(
        await newPayment.populate([
          { path: 'tenant', select: 'name phone' },
          { path: 'flat', select: 'flatNumber' },
          { path: 'building', select: 'name' },
        ])
      );
    }

    if (req.method === 'PUT') {
      if (!id) return res.status(400).json({ message: 'Payment ID required' });
      const updateData = { ...req.body };
      delete updateData.owner;
      const payment = await RentPayment.findOneAndUpdate(
        { _id: id, owner: ownerId },
        updateData,
        { new: true }
      )
        .populate('tenant', 'name')
        .populate('flat', 'flatNumber')
        .populate('building', 'name');
      if (!payment) return res.status(404).json({ message: 'Payment not found' });
      return res.status(200).json(payment);
    }

    if (req.method === 'PATCH') {
      if (!id) return res.status(400).json({ message: 'Payment ID required' });
      if (isPay) {
        const payment = await RentPayment.findOneAndUpdate(
          { _id: id, owner: ownerId },
          {
            status: 'paid',
            paidDate: req.body.paidDate || new Date(),
            amount: req.body.amount,
          },
          { new: true }
        )
          .populate('tenant', 'name')
          .populate('flat', 'flatNumber')
          .populate('building', 'name');

        if (!payment) return res.status(404).json({ message: 'Payment not found' });
        return res.status(200).json(payment);
      }
      return res.status(400).json({ message: 'Invalid PATCH request' });
    }

    if (req.method === 'DELETE') {
      if (!id) return res.status(400).json({ message: 'Payment ID required' });
      const payment = await RentPayment.findOneAndDelete({ _id: id, owner: ownerId });
      if (!payment) return res.status(404).json({ message: 'Payment not found' });
      return res.status(200).json({ message: 'Payment deleted successfully' });
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (err) {
    console.error('API Error:', err);
    return res.status(500).json({ message: err.message });
  }
}
