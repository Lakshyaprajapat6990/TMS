const express = require('express');
const router = express.Router();
const Flat = require('../models/Flat');
const Tenant = require('../models/Tenant');

// GET all flats (optional filters: building, status)
router.get('/', async (req, res) => {
  try {
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

// GET single flat
router.get('/:id', async (req, res) => {
  try {
    const flat = await Flat.findById(req.params.id).populate('building', 'name address');
    if (!flat) return res.status(404).json({ message: 'Flat not found' });
    res.json(flat);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST create flat
router.post('/', async (req, res) => {
  try {
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

// PUT update flat
router.put('/:id', async (req, res) => {
  try {
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

// PATCH update flat status only
router.patch('/:id/status', async (req, res) => {
  try {
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

// DELETE flat
router.delete('/:id', async (req, res) => {
  try {
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

module.exports = router;
