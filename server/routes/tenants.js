const express = require('express');
const router = express.Router();
const Tenant = require('../models/Tenant');
const Flat = require('../models/Flat');
const RentPayment = require('../models/RentPayment');

// GET all tenants (optional filters: building, isActive)
router.get('/', async (req, res) => {
  try {
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

// GET single tenant
router.get('/:id', async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.params.id)
      .populate('flat', 'flatNumber floor rentAmount')
      .populate('building', 'name address');
    if (!tenant) return res.status(404).json({ message: 'Tenant not found' });
    res.json(tenant);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST create tenant
router.post('/', async (req, res) => {
  try {
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

    // Mark flat as occupied
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

// PUT update tenant details
router.put('/:id', async (req, res) => {
  try {
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

// PATCH move out tenant
router.patch('/:id/moveout', async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) return res.status(404).json({ message: 'Tenant not found' });
    if (!tenant.isActive) return res.status(400).json({ message: 'Tenant has already moved out' });

    tenant.isActive = false;
    tenant.moveOutDate = req.body.moveOutDate || new Date();
    await tenant.save();

    // Free the flat
    await Flat.findByIdAndUpdate(tenant.flat, { status: 'vacant' });

    res.json(tenant);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE tenant (also removes payment history)
router.delete('/:id', async (req, res) => {
  try {
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

module.exports = router;
