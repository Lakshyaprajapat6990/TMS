import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import Tenant from '../server/models/Tenant.js';
import Flat from '../server/models/Flat.js';
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

app.get('/api/tenants', async (req, res) => {
  try {
    await connectDB();
    const query = {};
    if (req.query.building) query.building = req.query.building;
    if (req.query.isActive !== undefined) query.isActive = req.query.isActive === 'true';

    const tenants = await Tenant.find(query)
      .populate('flat', 'flatNumber floor rentAmount')
      .populate('building', 'name address')
      .sort({ createdAt: -1 });
    res.json(tenants);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/tenants/:id', async (req, res) => {
  try {
    await connectDB();
    const tenant = await Tenant.findById(req.params.id)
      .populate('flat', 'flatNumber floor rentAmount')
      .populate('building', 'name address');
    if (!tenant) return res.status(404).json({ message: 'Tenant not found' });
    res.json(tenant);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/tenants', async (req, res) => {
  try {
    await connectDB();
    const flat = await Flat.findById(req.body.flat);
    if (!flat) return res.status(404).json({ message: 'Flat not found' });
    if (flat.status === 'occupied') {
      return res.status(400).json({ message: 'This flat is already occupied' });
    }

    const tenant = new Tenant({
      name: req.body.name,
      phone: req.body.phone,
      email: req.body.email,
      address: req.body.address,
      idType: req.body.idType,
      idNumber: req.body.idNumber,
      flat: req.body.flat,
      building: req.body.building,
      moveInDate: req.body.moveInDate,
      securityDeposit: req.body.securityDeposit || 0,
      rentAmount: req.body.rentAmount || flat.rentAmount,
      rentDueDay: req.body.rentDueDay || 1,
    });

    const newTenant = await tenant.save();
    await Flat.findByIdAndUpdate(req.body.flat, { status: 'occupied' });

    res.status(201).json(
      await newTenant.populate([
        { path: 'flat', select: 'flatNumber floor rentAmount' },
        { path: 'building', select: 'name address' },
      ])
    );
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.put('/api/tenants/:id', async (req, res) => {
  try {
    await connectDB();
    const tenant = await Tenant.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
      .populate('flat', 'flatNumber floor')
      .populate('building', 'name address');
    if (!tenant) return res.status(404).json({ message: 'Tenant not found' });
    res.json(tenant);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.patch('/api/tenants/:id/moveout', async (req, res) => {
  try {
    await connectDB();
    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) return res.status(404).json({ message: 'Tenant not found' });
    if (!tenant.isActive) return res.status(400).json({ message: 'Tenant has already moved out' });

    tenant.isActive = false;
    tenant.moveOutDate = req.body.moveOutDate || new Date();
    await tenant.save();

    await Flat.findByIdAndUpdate(tenant.flat, { status: 'vacant' });

    res.json(tenant);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.delete('/api/tenants/:id', async (req, res) => {
  try {
    await connectDB();
    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) return res.status(404).json({ message: 'Tenant not found' });

    if (tenant.isActive) {
      await Flat.findByIdAndUpdate(tenant.flat, { status: 'vacant' });
    }

    await RentPayment.deleteMany({ tenant: req.params.id });
    await tenant.deleteOne();
    res.json({ message: 'Tenant deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default app;
