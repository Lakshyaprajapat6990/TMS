import mongoose from 'mongoose';
import { Building, Flat } from '../lib/models.js';
import { requireAuth, resolveOwner } from '../lib/auth.js';

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
    const ownerId = resolveOwner(authUser, req);

    const urlParts = req.url.split('/');
    const lastPart = urlParts[urlParts.length - 1].split('?')[0];
    const id = lastPart !== 'buildings' && mongoose.Types.ObjectId.isValid(lastPart) ? lastPart : null;

    if (req.method === 'GET') {
      if (id) {
        const building = await Building.findOne({ _id: id, owner: ownerId });
        if (!building) return res.status(404).json({ message: 'Building not found' });
        return res.status(200).json(building);
      }

      const buildings = await Building.find({ owner: ownerId }).sort({ createdAt: -1 });
      const buildingsWithCounts = await Promise.all(
        buildings.map(async (building) => {
          const totalFlats = await Flat.countDocuments({ building: building._id, owner: ownerId });
          const occupiedFlats = await Flat.countDocuments({ building: building._id, owner: ownerId, status: 'occupied' });
          return {
            ...building.toObject(),
            totalFlats,
            occupiedFlats,
            vacantFlats: totalFlats - occupiedFlats,
          };
        })
      );
      return res.status(200).json(buildingsWithCounts);
    }

    if (req.method === 'POST') {
      const building = new Building({
        name: req.body.name,
        address: req.body.address,
        description: req.body.description,
        owner: ownerId,
      });
      const newBuilding = await building.save();
      return res.status(201).json(newBuilding);
    }

    if (req.method === 'PUT') {
      if (!id) return res.status(400).json({ message: 'Building ID required' });
      const building = await Building.findOneAndUpdate(
        { _id: id, owner: ownerId },
        { name: req.body.name, address: req.body.address, description: req.body.description },
        { new: true, runValidators: true }
      );
      if (!building) return res.status(404).json({ message: 'Building not found' });
      return res.status(200).json(building);
    }

    if (req.method === 'DELETE') {
      if (!id) return res.status(400).json({ message: 'Building ID required' });
      const building = await Building.findOne({ _id: id, owner: ownerId });
      if (!building) return res.status(404).json({ message: 'Building not found' });

      const flatsCount = await Flat.countDocuments({ building: id, owner: ownerId });
      if (flatsCount > 0) {
        return res.status(400).json({ message: 'Cannot delete a building that still has flats. Remove the flats first.' });
      }

      await building.deleteOne();
      return res.status(200).json({ message: 'Building deleted successfully' });
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (err) {
    console.error('API Error:', err);
    return res.status(500).json({ message: err.message });
  }
}
