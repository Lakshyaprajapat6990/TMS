const express = require('express');
const router = express.Router();
const Building = require('../models/Building');
const Flat = require('../models/Flat');

// GET all buildings with flat counts
router.get('/', async (req, res) => {
  try {
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

// GET single building
router.get('/:id', async (req, res) => {
  try {
    const building = await Building.findById(req.params.id);
    if (!building) return res.status(404).json({ message: 'Building not found' });
    res.json(building);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST create building
router.post('/', async (req, res) => {
  try {
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

// PUT update building
router.put('/:id', async (req, res) => {
  try {
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

// DELETE building
router.delete('/:id', async (req, res) => {
  try {
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

module.exports = router;
