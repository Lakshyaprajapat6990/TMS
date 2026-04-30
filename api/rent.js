import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import RentPayment from '../server/models/RentPayment.js';
import Tenant from '../server/models/Tenant.js';

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

app.get('/api/rent', async (req, res) => {
  try {
    await connectDB();
    const query = {};
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
    res.json(payments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/rent/tenant/:tenantId', async (req, res) => {
  try {
    await connectDB();
    const payments = await RentPayment.find({ tenant: req.params.tenantId })
      .populate('flat', 'flatNumber')
      .populate('building', 'name')
      .sort({ year: -1, month: -1 });
    res.json(payments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/rent/generate', async (req, res) => {
  try {
    await connectDB();
    const { month, year } = req.body;
    if (!month || !year) {
      return res.status(400).json({ message: 'month and year are required' });
    }

    const activeTenants = await Tenant.find({ isActive: true });
    const createdPayments = [];

    for (const tenant of activeTenants) {
      const existing = await RentPayment.findOne({ tenant: tenant._id, month, year });
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
        });
        createdPayments.push(payment);
      }
    }

    res.status(201).json({
      created: createdPayments.length,
      skipped: activeTenants.length - createdPayments.length,
      payments: createdPayments,
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.post('/api/rent', async (req, res) => {
  try {
    await connectDB();
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
    });

    const newPayment = await payment.save();
    res.status(201).json(
      await newPayment.populate([
        { path: 'tenant', select: 'name phone' },
        { path: 'flat', select: 'flatNumber' },
        { path: 'building', select: 'name' },
      ])
    );
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.patch('/api/rent/:id/pay', async (req, res) => {
  try {
    await connectDB();
    const payment = await RentPayment.findByIdAndUpdate(
      req.params.id,
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
    res.json(payment);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.put('/api/rent/:id', async (req, res) => {
  try {
    await connectDB();
    const payment = await RentPayment.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('tenant', 'name')
      .populate('flat', 'flatNumber')
      .populate('building', 'name');
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    res.json(payment);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.delete('/api/rent/:id', async (req, res) => {
  try {
    await connectDB();
    const payment = await RentPayment.findByIdAndDelete(req.params.id);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    res.json({ message: 'Payment deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default app;
