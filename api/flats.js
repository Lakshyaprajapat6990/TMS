import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import Flat from '../server/models/Flat.js';
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

app.get('/api/flats', async (req, res) => {
  try {
    await connectDB();
    const query = {};
    if (req.query.building) query.building = req.query.building;
    if (req.query.status) query.status = req.query.status;

    const flats = await Flat.find(query)
      .populate('building', 'name address')
      .sort({ flatNumber: 1 });
    res.json(flats);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/flats/:id', async (req, res) => {
  try {
    await connectDB();
    const flat = await Flat.findById(req.params.id).populate('building', 'name address');
    if (!flat) return res.status(404).json({ message: 'Flat not found' });
    res.json(flat);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/flats', async (req, res) => {
  try {
    await connectDB();
    const flat = new Flat({
      flatNumber: req.body.flatNumber,
      floor: req.body.floor,
      building: req.body.building,
      rentAmount: req.body.rentAmount,
      bedrooms: req.body.bedrooms,
      bathrooms: req.body.bathrooms,
      area: req.body.area,
    });
    const newFlat = await flat.save();
    res.status(201).json(await newFlat.populate('building', 'name address'));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.put('/api/flats/:id', async (req, res) => {
  try {
    await connectDB();
    const flat = await Flat.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate('building', 'name address');
    if (!flat) return res.status(404).json({ message: 'Flat not found' });
    res.json(flat);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.patch('/api/flats/:id/status', async (req, res) => {
  try {
    await connectDB();
    const flat = await Flat.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    ).populate('building', 'name address');
    if (!flat) return res.status(404).json({ message: 'Flat not found' });
    res.json(flat);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.delete('/api/flats/:id', async (req, res) => {
  try {
    await connectDB();
    const flat = await Flat.findById(req.params.id);
    if (!flat) return res.status(404).json({ message: 'Flat not found' });

    const activeTenant = await Tenant.findOne({ flat: req.params.id, isActive: true });
    if (activeTenant) {
      return res
        .status(400)
        .json({ message: 'Cannot delete a flat with an active tenant. Move out the tenant first.' });
    }

    await flat.deleteOne();
    res.json({ message: 'Flat deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default app;
