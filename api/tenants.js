import mongoose from 'mongoose';
import { Flat, Tenant, RentPayment } from '../lib/models.js';
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
    let isMoveout = false;

    if (lastPart === 'moveout' && mongoose.Types.ObjectId.isValid(secondLast)) {
      id = secondLast;
      isMoveout = true;
    } else if (lastPart !== 'tenants' && mongoose.Types.ObjectId.isValid(lastPart)) {
      id = lastPart;
    }

    if (req.method === 'GET') {
      if (id) {
        const tenant = await Tenant.findOne({ _id: id, owner: ownerId })
          .populate('flat', 'flatNumber floor rentAmount')
          .populate('building', 'name address');
        if (!tenant) return res.status(404).json({ message: 'Tenant not found' });
        return res.status(200).json(tenant);
      }

      const query = { owner: ownerId };
      if (req.query.building) query.building = req.query.building;
      if (req.query.isActive !== undefined) query.isActive = req.query.isActive === 'true';

      const tenants = await Tenant.find(query)
        .populate('flat', 'flatNumber floor rentAmount')
        .populate('building', 'name address')
        .sort({ createdAt: -1 });
      return res.status(200).json(tenants);
    }

    if (req.method === 'POST') {
      const flat = await Flat.findOne({ _id: req.body.flat, owner: ownerId });
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
        owner: ownerId,
      });

      const newTenant = await tenant.save();
      await Flat.findOneAndUpdate({ _id: req.body.flat, owner: ownerId }, { status: 'occupied' });

      return res.status(201).json(
        await newTenant.populate([
          { path: 'flat', select: 'flatNumber floor rentAmount' },
          { path: 'building', select: 'name address' },
        ])
      );
    }

    if (req.method === 'PUT') {
      if (!id) return res.status(400).json({ message: 'Tenant ID required' });
      const updateData = { ...req.body };
      delete updateData.owner;
      const tenant = await Tenant.findOneAndUpdate(
        { _id: id, owner: ownerId },
        updateData,
        { new: true, runValidators: true }
      )
        .populate('flat', 'flatNumber floor')
        .populate('building', 'name address');
      if (!tenant) return res.status(404).json({ message: 'Tenant not found' });
      return res.status(200).json(tenant);
    }

    if (req.method === 'PATCH') {
      if (!id) return res.status(400).json({ message: 'Tenant ID required' });
      if (isMoveout) {
        const tenant = await Tenant.findOne({ _id: id, owner: ownerId });
        if (!tenant) return res.status(404).json({ message: 'Tenant not found' });
        if (!tenant.isActive) return res.status(400).json({ message: 'Tenant has already moved out' });

        tenant.isActive = false;
        tenant.moveOutDate = req.body.moveOutDate || new Date();
        await tenant.save();

        await Flat.findOneAndUpdate({ _id: tenant.flat, owner: ownerId }, { status: 'vacant' });

        return res.status(200).json(tenant);
      }
      return res.status(400).json({ message: 'Invalid PATCH request' });
    }

    if (req.method === 'DELETE') {
      if (!id) return res.status(400).json({ message: 'Tenant ID required' });
      const tenant = await Tenant.findOne({ _id: id, owner: ownerId });
      if (!tenant) return res.status(404).json({ message: 'Tenant not found' });

      if (tenant.isActive) {
        await Flat.findOneAndUpdate({ _id: tenant.flat, owner: ownerId }, { status: 'vacant' });
      }

      await RentPayment.deleteMany({ tenant: id, owner: ownerId });
      await tenant.deleteOne();
      return res.status(200).json({ message: 'Tenant deleted successfully' });
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (err) {
    console.error('API Error:', err);
    return res.status(500).json({ message: err.message });
  }
}
