import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import Building from '../server/models/Building.js';
import Flat from '../server/models/Flat.js';

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

app.get('/api/buildings', async (req, res) => {
  try {
    await connectDB();
    const buildings = await Building.find().sort({ createdAt: -1 });

    const buildingsWithCounts = await Promise.all(
      buildings.map(async (building) => {
        const totalFlats = await Flat.countDocuments({ building: building._id });
        const occupiedFlats = await Flat.countDocuments({
          building: building._id,
          status: 'occupied',
        });
        return {
          ...building.toObject(),
          totalFlats,
          occupiedFlats,
          vacantFlats: totalFlats - occupiedFlats,
        };
      })
    );

    res.json(buildingsWithCounts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/buildings/:id', async (req, res) => {
  try {
    await connectDB();
    const building = await Building.findById(req.params.id);
    if (!building) return res.status(404).json({ message: 'Building not found' });
    res.json(building);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/buildings', async (req, res) => {
  try {
    await connectDB();
    const building = new Building({
      name: req.body.name,
      address: req.body.address,
      description: req.body.description,
    });
    const newBuilding = await building.save();
    res.status(201).json(newBuilding);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.put('/api/buildings/:id', async (req, res) => {
  try {
    await connectDB();
    const building = await Building.findByIdAndUpdate(
      req.params.id,
      { name: req.body.name, address: req.body.address, description: req.body.description },
      { new: true, runValidators: true }
    );
    if (!building) return res.status(404).json({ message: 'Building not found' });
    res.json(building);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.delete('/api/buildings/:id', async (req, res) => {
  try {
    await connectDB();
    const building = await Building.findById(req.params.id);
    if (!building) return res.status(404).json({ message: 'Building not found' });

    const flatsCount = await Flat.countDocuments({ building: req.params.id });
    if (flatsCount > 0) {
      return res
        .status(400)
        .json({ message: 'Cannot delete a building that still has flats. Remove the flats first.' });
    }

    await building.deleteOne();
    res.json({ message: 'Building deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default app;
