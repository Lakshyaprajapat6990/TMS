import mongoose from 'mongoose';
import { Flat, Tenant } from '../lib/models.js';
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
    let isStatusUpdate = false;

    if (lastPart === 'status' && mongoose.Types.ObjectId.isValid(secondLast)) {
      id = secondLast;
      isStatusUpdate = true;
    } else if (lastPart !== 'flats' && mongoose.Types.ObjectId.isValid(lastPart)) {
      id = lastPart;
    }

    if (req.method === 'GET') {
      if (id) {
        const flat = await Flat.findOne({ _id: id, owner: ownerId }).populate('building', 'name address');
        if (!flat) return res.status(404).json({ message: 'Flat not found' });
        return res.status(200).json(flat);
      }

      const query = { owner: ownerId };
      if (req.query.building) query.building = req.query.building;
      if (req.query.status) query.status = req.query.status;

      const flats = await Flat.find(query).populate('building', 'name address').sort({ flatNumber: 1 });
      return res.status(200).json(flats);
    }

    if (req.method === 'POST') {
      const flat = new Flat({
        flatNumber: req.body.flatNumber,
        floor: req.body.floor,
        building: req.body.building,
        rentAmount: req.body.rentAmount,
        bedrooms: req.body.bedrooms,
        bathrooms: req.body.bathrooms,
        area: req.body.area,
        owner: ownerId,
      });
      const newFlat = await flat.save();
      return res.status(201).json(await newFlat.populate('building', 'name address'));
    }

    if (req.method === 'PUT') {
      if (!id) return res.status(400).json({ message: 'Flat ID required' });
      const updateData = { ...req.body };
      delete updateData.owner;
      const flat = await Flat.findOneAndUpdate(
        { _id: id, owner: ownerId },
        updateData,
        { new: true, runValidators: true }
      ).populate('building', 'name address');
      if (!flat) return res.status(404).json({ message: 'Flat not found' });
      return res.status(200).json(flat);
    }

    if (req.method === 'PATCH') {
      if (!id) return res.status(400).json({ message: 'Flat ID required' });
      if (isStatusUpdate) {
        const flat = await Flat.findOneAndUpdate(
          { _id: id, owner: ownerId },
          { status: req.body.status },
          { new: true }
        ).populate('building', 'name address');
        if (!flat) return res.status(404).json({ message: 'Flat not found' });
        return res.status(200).json(flat);
      }
      return res.status(400).json({ message: 'Invalid PATCH request' });
    }

    if (req.method === 'DELETE') {
      if (!id) return res.status(400).json({ message: 'Flat ID required' });
      const flat = await Flat.findOne({ _id: id, owner: ownerId });
      if (!flat) return res.status(404).json({ message: 'Flat not found' });

      const activeTenant = await Tenant.findOne({ flat: id, owner: ownerId, isActive: true });
      if (activeTenant) {
        return res.status(400).json({ message: 'Cannot delete a flat with an active tenant. Move out the tenant first.' });
      }

      await flat.deleteOne();
      return res.status(200).json({ message: 'Flat deleted successfully' });
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (err) {
    console.error('API Error:', err);
    return res.status(500).json({ message: err.message });
  }
}
